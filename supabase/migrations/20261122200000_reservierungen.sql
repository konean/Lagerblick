-- Reservierungen: Material wird für ein Projekt vorgemerkt.
-- Eine Reservierung senkt die freie Menge, nicht den physischen Bestand.
-- Pro Material und Projekt gibt es höchstens eine Reservierung (die Gesamtmenge).
-- Geschrieben wird nur über setze_reservierung und buche_entnahme. Beide sperren
-- die Materialzeile, damit gleichzeitige Reservierungen und Entnahmen nacheinander laufen.

create table public.reservierungen (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materialien (id) on delete restrict,
  projekt_id   uuid not null references public.projekte (id) on delete restrict,
  menge        numeric(12, 3) not null check (menge > 0),
  geaendert_von uuid not null references public.profiles (id) on delete restrict,
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),

  constraint reservierungen_material_projekt_eindeutig unique (material_id, projekt_id)
);

comment on table public.reservierungen is 'Offene Reservierungen je Material und Projekt. Schreiben nur über Datenbankfunktionen.';

create index reservierungen_projekt_idx on public.reservierungen (projekt_id);

create trigger reservierungen_geaendert_am
  before update on public.reservierungen
  for each row execute function public.setze_geaendert_am();

-- Rechte ----------------------------------------------------------------------
-- Angemeldete dürfen lesen. Direkte Schreibrechte bekommt niemand.

revoke all on table public.reservierungen from anon, authenticated;
grant select on table public.reservierungen to authenticated;

alter table public.reservierungen enable row level security;

create policy "Angemeldete lesen Reservierungen" on public.reservierungen
  for select to authenticated using (true);

-- Bestand, reserviert und frei --------------------------------------------------
-- Neue Spalten werden hinten angefügt, die bestehenden bleiben unverändert.
-- frei kann negativ werden, wenn ein Admin per Korrektur oder Storno unter die
-- reservierte Menge bucht. Die Oberfläche zeigt das als „überreserviert“.

create or replace view public.material_bestand
with (security_invoker = true)
as
select
  m.id                                                          as material_id,
  coalesce(b.summe, 0)::numeric(12, 3)                          as bestand,
  coalesce(r.summe, 0)::numeric(12, 3)                          as reserviert,
  (coalesce(b.summe, 0) - coalesce(r.summe, 0))::numeric(12, 3) as frei
from public.materialien m
left join (
  select material_id, sum(menge) as summe from public.bewegungen group by material_id
) b on b.material_id = m.id
left join (
  select material_id, sum(menge) as summe from public.reservierungen group by material_id
) r on r.material_id = m.id;

comment on view public.material_bestand is 'Physischer Bestand, reservierte und freie Menge je Material.';

-- Reservierung setzen ------------------------------------------------------------
-- Setzt die reservierte Gesamtmenge eines Projekts für ein Material.
-- Menge 0 hebt die Reservierung auf. Beide Rollen dürfen reservieren.
-- Erhöhen geht nur bis zur freien Menge; Senken und Aufheben sind immer erlaubt,
-- damit sich eine Überreservierung auch wieder abbauen lässt.

create function public.setze_reservierung(
  p_material_id uuid,
  p_projekt_id uuid,
  p_menge numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_benutzer uuid := (select auth.uid());
  v_einheit public.einheit;
  v_status public.material_status;
  v_projekt_status public.projekt_status;
  v_bisher numeric;
  v_bestand numeric;
  v_andere numeric;
begin
  if v_benutzer is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;
  if p_menge is null or p_menge < 0 then
    raise exception 'Die Menge darf nicht negativ sein.' using errcode = '23514';
  end if;

  -- Dieselbe Sperre wie bei allen Buchungen auf dieses Material.
  select einheit, status
    into v_einheit, v_status
    from public.materialien
    where id = p_material_id
    for update;

  if not found then
    raise exception 'Material nicht gefunden.' using errcode = 'P0002';
  end if;

  -- for share: Das Projekt kann nicht gleichzeitig abgeschlossen werden.
  select status into v_projekt_status
    from public.projekte
    where id = p_projekt_id
    for share;

  if not found then
    raise exception 'Projekt nicht gefunden.' using errcode = 'P0002';
  end if;

  select menge into v_bisher
    from public.reservierungen
    where material_id = p_material_id and projekt_id = p_projekt_id;
  v_bisher := coalesce(v_bisher, 0);

  if p_menge = 0 then
    delete from public.reservierungen
      where material_id = p_material_id and projekt_id = p_projekt_id;
    return;
  end if;

  if v_status <> 'aktiv' then
    raise exception 'Archiviertes Material kann nicht reserviert werden.' using errcode = 'P0001';
  end if;
  if v_projekt_status <> 'aktiv' then
    raise exception 'Für abgeschlossene Projekte kann nicht reserviert werden.' using errcode = 'P0001';
  end if;
  perform public.pruefe_menge(v_einheit, p_menge);

  if p_menge > v_bisher then
    select coalesce(sum(menge), 0) into v_bestand
      from public.bewegungen
      where material_id = p_material_id;
    select coalesce(sum(menge), 0) into v_andere
      from public.reservierungen
      where material_id = p_material_id and projekt_id <> p_projekt_id;

    if p_menge > v_bestand - v_andere then
      raise exception 'Nicht genug freie Menge für diese Reservierung.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.reservierungen (material_id, projekt_id, menge, geaendert_von)
  values (p_material_id, p_projekt_id, p_menge, v_benutzer)
  on conflict (material_id, projekt_id)
    do update set menge = excluded.menge, geaendert_von = excluded.geaendert_von;
end;
$$;

revoke execute on function public.setze_reservierung(uuid, uuid, numeric) from public, anon;
grant execute on function public.setze_reservierung(uuid, uuid, numeric) to authenticated;

-- Entnahme mit Reservierungen ---------------------------------------------------
-- Ohne Projekt: nur aus der freien Menge.
-- Mit Projekt: aus der freien Menge plus der Reservierung dieses Projekts.
-- Die Reservierung des Projekts sinkt um die entnommene Menge, höchstens bis 0.

create or replace function public.buche_entnahme(
  p_material_id uuid,
  p_menge numeric,
  p_kommentar text default null,
  p_projekt_id uuid default null
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
  v_projekt_status public.projekt_status;
  v_kommentar text := nullif(btrim(p_kommentar), '');
  v_bestand numeric;
  v_reserviert numeric;
  v_eigene numeric := 0;
  v_id uuid;
begin
  if v_benutzer is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;

  -- Nach der Sperre sehen die folgenden Summen alle bereits abgeschlossenen Buchungen
  -- und Reservierungen.
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

  -- for share: Das Projekt kann nicht gleichzeitig abgeschlossen werden.
  if p_projekt_id is not null then
    select status into v_projekt_status
      from public.projekte
      where id = p_projekt_id
      for share;

    if not found then
      raise exception 'Projekt nicht gefunden.' using errcode = 'P0002';
    end if;
    if v_projekt_status <> 'aktiv' then
      raise exception 'Auf abgeschlossene Projekte kann nicht gebucht werden.' using errcode = 'P0001';
    end if;
  end if;

  perform public.pruefe_menge(v_einheit, p_menge);

  select coalesce(sum(menge), 0) into v_bestand
    from public.bewegungen
    where material_id = p_material_id;
  select coalesce(sum(menge), 0) into v_reserviert
    from public.reservierungen
    where material_id = p_material_id;
  if p_projekt_id is not null then
    select coalesce(sum(menge), 0) into v_eigene
      from public.reservierungen
      where material_id = p_material_id and projekt_id = p_projekt_id;
  end if;

  if p_menge > v_bestand then
    raise exception 'Nicht genug Bestand für diese Entnahme.' using errcode = 'P0001';
  end if;
  if p_menge > v_bestand - v_reserviert + v_eigene then
    if p_projekt_id is null then
      raise exception 'Ein Teil des Bestands ist reserviert. Bitte das Projekt angeben oder weniger entnehmen.'
        using errcode = 'P0001';
    end if;
    raise exception 'Ein Teil des Bestands ist für andere Projekte reserviert.' using errcode = 'P0001';
  end if;

  if v_eigene > 0 then
    if p_menge >= v_eigene then
      delete from public.reservierungen
        where material_id = p_material_id and projekt_id = p_projekt_id;
    else
      update public.reservierungen
        set menge = menge - p_menge, geaendert_von = v_benutzer
        where material_id = p_material_id and projekt_id = p_projekt_id;
    end if;
  end if;

  insert into public.bewegungen (material_id, art, menge, kommentar, erstellt_von, projekt_id)
  values (p_material_id, 'entnahme', -p_menge, v_kommentar, v_benutzer, p_projekt_id)
  returning id into v_id;

  return v_id;
end;
$$;

-- Abschließen und Archivieren bei offenen Reservierungen sperren -----------------
-- Die Trigger laufen erst, wenn die Zeile gesperrt ist. setze_reservierung und
-- buche_entnahme sperren dieselben Zeilen, deshalb gibt es keine Lücke dazwischen.

create function public.projekt_abschluss_pruefen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'abgeschlossen' and old.status <> 'abgeschlossen'
     and exists (select 1 from public.reservierungen where projekt_id = new.id) then
    raise exception 'Das Projekt hat noch offene Reservierungen. Bitte diese zuerst aufheben.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.projekt_abschluss_pruefen() from public, anon, authenticated;

create trigger projekte_abschluss_pruefen
  before update of status on public.projekte
  for each row execute function public.projekt_abschluss_pruefen();

create function public.material_archivierung_pruefen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'archiviert' and old.status <> 'archiviert'
     and exists (select 1 from public.reservierungen where material_id = new.id) then
    raise exception 'Für dieses Material gibt es noch offene Reservierungen. Bitte diese zuerst aufheben.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.material_archivierung_pruefen() from public, anon, authenticated;

create trigger materialien_archivierung_pruefen
  before update of status on public.materialien
  for each row execute function public.material_archivierung_pruefen();
