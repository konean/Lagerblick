-- Projekte und Projektbezug an Bewegungen.
-- Projekte sind Stammdaten: Lesen dürfen alle Angemeldeten, schreiben nur Admins.
-- Entnahmen können einem aktiven Projekt zugeordnet werden, ein Storno übernimmt den Bezug.

create type public.projekt_status as enum ('aktiv', 'abgeschlossen');

create table public.projekte (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (name = btrim(name) and char_length(name) between 1 and 200),
  nummer       text check (nummer = btrim(nummer) and char_length(nummer) between 1 and 64),
  hinweis      text check (char_length(hinweis) <= 2000),
  status       public.projekt_status not null default 'aktiv',
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);

comment on table public.projekte is 'Interne Projekte, denen Entnahmen und Reservierungen zugeordnet werden.';

-- Projektnummer eindeutig ohne Rücksicht auf Groß- und Kleinschreibung, sofern vorhanden.
create unique index projekte_nummer_eindeutig on public.projekte (lower(nummer)) where nummer is not null;
create index projekte_status_idx on public.projekte (status);

create trigger projekte_geaendert_am
  before update on public.projekte
  for each row execute function public.setze_geaendert_am();

-- Rechte ----------------------------------------------------------------------

revoke all on table public.projekte from anon, authenticated;

grant select, delete on table public.projekte to authenticated;
grant
  insert (name, nummer, hinweis, status),
  update (name, nummer, hinweis, status)
  on table public.projekte to authenticated;

alter table public.projekte enable row level security;

create policy "Angemeldete lesen Projekte" on public.projekte
  for select to authenticated using (true);
create policy "Admins legen Projekte an" on public.projekte
  for insert to authenticated with check ((select public.ist_admin()));
create policy "Admins ändern Projekte" on public.projekte
  for update to authenticated using ((select public.ist_admin())) with check ((select public.ist_admin()));
-- Löschen nur, solange keine Bewegungen darauf verweisen (Fremdschlüssel on delete restrict).
create policy "Admins löschen Projekte" on public.projekte
  for delete to authenticated using ((select public.ist_admin()));

-- Projektbezug an Bewegungen ---------------------------------------------------

alter table public.bewegungen
  add column projekt_id uuid references public.projekte (id) on delete restrict;

comment on column public.bewegungen.projekt_id is 'Optionaler Projektbezug. Bei Entnahmen frei wählbar, ein Storno übernimmt ihn.';

create index bewegungen_projekt_zeit_idx on public.bewegungen (projekt_id, erstellt_am desc)
  where projekt_id is not null;

-- Entnahme mit optionalem Projekt ----------------------------------------------
-- Neue Signatur, deshalb die alte Funktion ersetzen statt überschreiben.

drop function public.buche_entnahme(uuid, numeric, text);

create function public.buche_entnahme(
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

  if p_menge > v_bestand then
    raise exception 'Nicht genug Bestand für diese Entnahme.' using errcode = 'P0001';
  end if;

  insert into public.bewegungen (material_id, art, menge, kommentar, erstellt_von, projekt_id)
  values (p_material_id, 'entnahme', -p_menge, v_kommentar, v_benutzer, p_projekt_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.buche_entnahme(uuid, numeric, text, uuid) from public, anon;
grant execute on function public.buche_entnahme(uuid, numeric, text, uuid) to authenticated;

-- Storno übernimmt den Projektbezug ---------------------------------------------
-- Gleiche Signatur und Regeln wie bisher, nur projekt_id wird mitgeschrieben.
-- Ein Storno ist auch bei abgeschlossenem Projekt erlaubt: Es korrigiert die Vergangenheit.

create or replace function public.buche_storno(
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
  v_projekt_id uuid;
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

  select material_id, projekt_id, art, menge
    into v_material_id, v_projekt_id, v_art, v_menge
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

  insert into public.bewegungen (material_id, art, menge, kommentar, erstellt_von, storno_von, projekt_id)
  values (v_material_id, 'storno', -v_menge, v_kommentar, v_benutzer, p_bewegung_id, v_projekt_id)
  returning id into v_id;

  return v_id;
end;
$$;
