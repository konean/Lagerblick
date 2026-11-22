-- Lagerbewegungen und Bestand.
-- Der Bestand wird nicht gespeichert, sondern aus den Bewegungen summiert.
-- Bewegungen sind unveränderlich (append-only); Fehler werden später per Gegenbuchung korrigiert.
-- Geschrieben wird ausschließlich über Datenbankfunktionen wie buche_eingang.

create type public.bewegungsart as enum ('eingang', 'entnahme', 'korrektur', 'storno');

create table public.bewegungen (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materialien (id) on delete restrict,
  art          public.bewegungsart not null,
  -- Mit Vorzeichen: Zugänge positiv, Abgänge negativ. So ist der Bestand einfach die Summe.
  menge        numeric(12, 3) not null,
  kommentar    text check (kommentar = btrim(kommentar) and char_length(kommentar) between 1 and 500),
  erstellt_von uuid not null references public.profiles (id) on delete restrict,
  erstellt_am  timestamptz not null default now(),

  constraint bewegungen_vorzeichen check (
    case art
      when 'eingang'  then menge > 0
      when 'entnahme' then menge < 0
      else menge <> 0
    end
  )
);

comment on table public.bewegungen is 'Unveränderliche Lagerbewegungen. Schreiben nur über Datenbankfunktionen.';

create index bewegungen_material_zeit_idx on public.bewegungen (material_id, erstellt_am desc);
create index bewegungen_zeit_idx on public.bewegungen (erstellt_am desc);

-- Unveränderlichkeit ---------------------------------------------------------
-- Greift auch für Rollen, die RLS umgehen (z. B. Funktionen mit security definer).

create function public.bewegungen_unveraenderlich()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Bewegungen können nicht geändert oder gelöscht werden.'
    using errcode = '42501';
end;
$$;

revoke execute on function public.bewegungen_unveraenderlich() from public, anon, authenticated;

create trigger bewegungen_kein_update_delete
  before update or delete on public.bewegungen
  for each row execute function public.bewegungen_unveraenderlich();

create trigger bewegungen_kein_truncate
  before truncate on public.bewegungen
  for each statement execute function public.bewegungen_unveraenderlich();

-- Rechte ----------------------------------------------------------------------
-- Angemeldete dürfen lesen. Direkte Schreibrechte bekommt niemand.

revoke all on table public.bewegungen from anon, authenticated;
grant select on table public.bewegungen to authenticated;

alter table public.bewegungen enable row level security;

create policy "Angemeldete lesen Bewegungen" on public.bewegungen
  for select to authenticated using (true);

-- Bestand ---------------------------------------------------------------------
-- security_invoker: Die View prüft die Rechte des abfragenden Benutzers, nicht des Eigentümers.

create view public.material_bestand
with (security_invoker = true)
as
select
  m.id                                   as material_id,
  coalesce(sum(b.menge), 0)::numeric(12, 3) as bestand
from public.materialien m
left join public.bewegungen b on b.material_id = m.id
group by m.id;

comment on view public.material_bestand is 'Physischer Bestand je Material als Summe aller Bewegungen.';

revoke all on table public.material_bestand from anon, authenticated;
grant select on table public.material_bestand to authenticated;

-- Wareneingang ----------------------------------------------------------------
-- security definer: läuft mit den Rechten des Eigentümers, weil Benutzer selbst
-- nicht in bewegungen schreiben dürfen. Deshalb prüft die Funktion alles selbst.

create function public.buche_eingang(
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
  v_id uuid;
begin
  if v_benutzer is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;

  -- Sperrt die Materialzeile bis zum Ende der Transaktion. Gleichzeitige Buchungen
  -- auf dasselbe Material laufen so nacheinander statt durcheinander.
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
  if p_menge is null or p_menge <= 0 then
    raise exception 'Die Menge muss größer als 0 sein.' using errcode = '23514';
  end if;
  if p_menge <> round(p_menge, 3) then
    raise exception 'Höchstens drei Nachkommastellen.' using errcode = '23514';
  end if;
  if v_einheit not in ('meter', 'kg') and p_menge <> trunc(p_menge) then
    raise exception 'Diese Einheit erlaubt nur ganze Zahlen.' using errcode = '23514';
  end if;

  insert into public.bewegungen (material_id, art, menge, kommentar, erstellt_von)
  values (p_material_id, 'eingang', p_menge, v_kommentar, v_benutzer)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.buche_eingang(uuid, numeric, text) from public, anon;
grant execute on function public.buche_eingang(uuid, numeric, text) to authenticated;

-- Einheit sperren -------------------------------------------------------------
-- Sobald gebucht wurde, darf sich die Einheit nicht mehr ändern,
-- sonst würden aus 2,5 m plötzlich 2,5 Stück.

create function public.einheit_nach_buchung_sperren()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.einheit <> old.einheit
     and exists (select 1 from public.bewegungen where material_id = old.id) then
    raise exception 'Die Einheit kann nach der ersten Buchung nicht mehr geändert werden.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.einheit_nach_buchung_sperren() from public, anon, authenticated;

create trigger materialien_einheit_sperren
  before update of einheit on public.materialien
  for each row execute function public.einheit_nach_buchung_sperren();

comment on table public.materialien is 'Materialstammdaten. Der Bestand ergibt sich aus den Bewegungen (View material_bestand).';
