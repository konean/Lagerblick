-- Entnahme, Bestandskorrektur und Storno.
-- Alle drei folgen dem Muster von buche_eingang: security definer, Materialzeile
-- mit for update sperren, alles selbst prüfen, erstellt_von aus auth.uid().
-- Entnahme dürfen beide Rollen buchen, Korrektur und Storno nur Admins.

-- Storno-Verweis ---------------------------------------------------------------
-- Ein Storno verweist auf die stornierte Bewegung. Der Unique-Index stellt sicher,
-- dass jede Bewegung höchstens einmal storniert wird – auch bei gleichzeitigen Versuchen.

alter table public.bewegungen
  add column storno_von uuid references public.bewegungen (id) on delete restrict,
  add constraint bewegungen_storno_verweis check ((art = 'storno') = (storno_von is not null));

create unique index bewegungen_storno_von_idx on public.bewegungen (storno_von);

comment on column public.bewegungen.storno_von is 'Bei art = storno: die stornierte Bewegung. Jede Bewegung kann nur einmal storniert werden.';

-- Mengenprüfung ----------------------------------------------------------------
-- Gemeinsame Regeln für positive Mengen. Nur intern aus den Buchungsfunktionen aufrufbar.

create function public.pruefe_menge(p_einheit public.einheit, p_menge numeric)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_menge is null or p_menge <= 0 then
    raise exception 'Die Menge muss größer als 0 sein.' using errcode = '23514';
  end if;
  if p_menge <> round(p_menge, 3) then
    raise exception 'Höchstens drei Nachkommastellen.' using errcode = '23514';
  end if;
  if p_einheit not in ('meter', 'kg') and p_menge <> trunc(p_menge) then
    raise exception 'Diese Einheit erlaubt nur ganze Zahlen.' using errcode = '23514';
  end if;
end;
$$;

revoke execute on function public.pruefe_menge(public.einheit, numeric) from public, anon, authenticated;

-- Entnahme ---------------------------------------------------------------------
-- Die Menge wird positiv übergeben und negativ gespeichert.

create function public.buche_entnahme(
  p_material_id uuid,
  p_menge numeric,
  p_kommentar text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_benutzer uuid := (select auth.uid());
  v_einheit public.einheit;
  v_status public.material_status;
  v_kommentar text := nullif(btrim(p_kommentar), '');
  v_bestand numeric;
  v_id uuid;
begin
  if v_benutzer is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;

  -- Nach der Sperre sieht die folgende Summe alle bereits abgeschlossenen Buchungen.
  select einheit, status
    into v_einheit, v_status
    from public.materialien
    where id = p_material_id
    for update;

  if not found then
    raise exception 'Material nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_status <> 'aktiv' then
    raise exception 'Auf archiviertes Material kann nicht gebucht werden.' using errcode = 'P0001';
  end if;
  perform public.pruefe_menge(v_einheit, p_menge);

  select coalesce(sum(menge), 0) into v_bestand
    from public.bewegungen
    where material_id = p_material_id;

  if p_menge > v_bestand then
    raise exception 'Nicht genug Bestand für diese Entnahme.' using errcode = 'P0001';
  end if;

  insert into public.bewegungen (material_id, art, menge, kommentar, erstellt_von)
  values (p_material_id, 'entnahme', -p_menge, v_kommentar, v_benutzer)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.buche_entnahme(uuid, numeric, text) from public, anon;
grant execute on function public.buche_entnahme(uuid, numeric, text) to authenticated;

-- Bestandskorrektur ------------------------------------------------------------
-- Übergeben wird der gezählte Bestand (Inventur). Gebucht wird die Differenz.

create function public.buche_korrektur(
  p_material_id uuid,
  p_gezaehlter_bestand numeric,
  p_kommentar text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_benutzer uuid := (select auth.uid());
  v_einheit public.einheit;
  v_status public.material_status;
  v_kommentar text := nullif(btrim(p_kommentar), '');
  v_bestand numeric;
  v_id uuid;
begin
  if v_benutzer is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;
  if not public.ist_admin() then
    raise exception 'Nur Admins dürfen Bestände korrigieren.' using errcode = '42501';
  end if;

  select einheit, status
    into v_einheit, v_status
    from public.materialien
    where id = p_material_id
    for update;

  if not found then
    raise exception 'Material nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_status <> 'aktiv' then
    raise exception 'Auf archiviertes Material kann nicht gebucht werden.' using errcode = 'P0001';
  end if;
  if p_gezaehlter_bestand is null or p_gezaehlter_bestand < 0 then
    raise exception 'Der gezählte Bestand darf nicht negativ sein.' using errcode = '23514';
  end if;
  if p_gezaehlter_bestand > 0 then
    perform public.pruefe_menge(v_einheit, p_gezaehlter_bestand);
  end if;
  if v_kommentar is null then
    raise exception 'Bitte einen Grund für die Korrektur angeben.' using errcode = '23514';
  end if;

  select coalesce(sum(menge), 0) into v_bestand
    from public.bewegungen
    where material_id = p_material_id;

  if p_gezaehlter_bestand = v_bestand then
    raise exception 'Der gezählte Bestand entspricht bereits dem aktuellen Bestand.' using errcode = 'P0001';
  end if;

  insert into public.bewegungen (material_id, art, menge, kommentar, erstellt_von)
  values (p_material_id, 'korrektur', p_gezaehlter_bestand - v_bestand, v_kommentar, v_benutzer)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.buche_korrektur(uuid, numeric, text) from public, anon;
grant execute on function public.buche_korrektur(uuid, numeric, text) to authenticated;

-- Storno -----------------------------------------------------------------------
-- Gegenbuchung mit umgekehrtem Vorzeichen. Ein Storno selbst kann nicht storniert werden.

create function public.buche_storno(
  p_bewegung_id uuid,
  p_kommentar text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_benutzer uuid := (select auth.uid());
  v_kommentar text := nullif(btrim(p_kommentar), '');
  v_material_id uuid;
  v_art public.bewegungsart;
  v_menge numeric;
  v_status public.material_status;
  v_bestand numeric;
  v_id uuid;
begin
  if v_benutzer is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;
  if not public.ist_admin() then
    raise exception 'Nur Admins dürfen Buchungen stornieren.' using errcode = '42501';
  end if;

  select material_id, art, menge
    into v_material_id, v_art, v_menge
    from public.bewegungen
    where id = p_bewegung_id;

  if not found then
    raise exception 'Buchung nicht gefunden.' using errcode = 'P0002';
  end if;

  -- Dieselbe Sperre wie bei allen Buchungen: Stornos und Buchungen auf dieses
  -- Material laufen nacheinander, auch zwei gleichzeitige Stornos derselben Bewegung.
  select status into v_status
    from public.materialien
    where id = v_material_id
    for update;

  if v_status <> 'aktiv' then
    raise exception 'Auf archiviertes Material kann nicht gebucht werden.' using errcode = 'P0001';
  end if;
  if v_art = 'storno' then
    raise exception 'Ein Storno kann nicht storniert werden.' using errcode = 'P0001';
  end if;
  if v_kommentar is null then
    raise exception 'Bitte einen Grund für das Storno angeben.' using errcode = '23514';
  end if;
  if exists (select 1 from public.bewegungen where storno_von = p_bewegung_id) then
    raise exception 'Diese Buchung wurde bereits storniert.' using errcode = 'P0001';
  end if;

  select coalesce(sum(menge), 0) into v_bestand
    from public.bewegungen
    where material_id = v_material_id;

  if v_bestand - v_menge < 0 then
    raise exception 'Das Storno würde den Bestand negativ machen.' using errcode = 'P0001';
  end if;

  insert into public.bewegungen (material_id, art, menge, kommentar, erstellt_von, storno_von)
  values (v_material_id, 'storno', -v_menge, v_kommentar, v_benutzer, p_bewegung_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.buche_storno(uuid, text) from public, anon;
grant execute on function public.buche_storno(uuid, text) to authenticated;
