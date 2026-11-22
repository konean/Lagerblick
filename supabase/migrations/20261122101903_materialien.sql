-- Kategorien und Materialstammdaten.
-- Lesen dürfen alle Angemeldeten, anlegen, ändern und löschen nur Admins.

create type public.einheit as enum ('stueck', 'meter', 'rolle', 'packung', 'kg');
create type public.material_status as enum ('aktiv', 'archiviert');

-- Hilfsfunktion: setzt geaendert_am bei jeder Änderung.
create function public.setze_geaendert_am()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.geaendert_am := now();
  return new;
end;
$$;

revoke execute on function public.setze_geaendert_am() from public, anon, authenticated;

-- Kategorien ------------------------------------------------------------------

create table public.kategorien (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (name = btrim(name) and char_length(name) between 1 and 60),
  erstellt_am timestamptz not null default now()
);

-- Eindeutig ohne Rücksicht auf Groß- und Kleinschreibung.
create unique index kategorien_name_eindeutig on public.kategorien (lower(name));

insert into public.kategorien (name) values
  ('PV-Module'),
  ('Wechselrichter'),
  ('Batteriespeicher'),
  ('Montagesysteme'),
  ('Elektromaterial'),
  ('Zubehör');

-- Materialien -----------------------------------------------------------------

create table public.materialien (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (name = btrim(name) and char_length(name) between 1 and 200),
  kategorie_id   uuid not null references public.kategorien (id) on delete restrict,
  hersteller     text not null check (hersteller = btrim(hersteller) and char_length(hersteller) between 1 and 100),
  modell         text not null check (modell = btrim(modell) and char_length(modell) between 1 and 100),
  sku            text check (sku = btrim(sku) and char_length(sku) between 1 and 64),
  einheit        public.einheit not null,
  mindestbestand numeric(12, 3) not null default 0 check (mindestbestand >= 0),
  beschreibung   text check (char_length(beschreibung) <= 2000),
  status         public.material_status not null default 'aktiv',
  erstellt_am    timestamptz not null default now(),
  geaendert_am   timestamptz not null default now(),

  -- Stückgut wird nur in ganzen Zahlen gezählt; Meter und kg dürfen Nachkommastellen haben.
  constraint materialien_mindestbestand_ganzzahlig
    check (einheit in ('meter', 'kg') or mindestbestand = trunc(mindestbestand))
);

comment on table public.materialien is 'Materialstammdaten. Der Bestand ergibt sich aus den Buchungen (ab Phase 3).';

create unique index materialien_sku_eindeutig on public.materialien (lower(sku)) where sku is not null;
create index materialien_kategorie_idx on public.materialien (kategorie_id);
create index materialien_status_idx on public.materialien (status);

create trigger materialien_geaendert_am
  before update on public.materialien
  for each row execute function public.setze_geaendert_am();

-- Rechte ----------------------------------------------------------------------
-- Supabase vergibt standardmäßig alle Rechte an anon und authenticated.
-- Wir geben nur frei, was gebraucht wird; RLS beschränkt Schreiben auf Admins.
-- Spalten wie id, erstellt_am und geaendert_am lassen sich nicht direkt setzen.

revoke all on table public.kategorien, public.materialien from anon, authenticated;

grant select, delete on table public.kategorien to authenticated;
grant insert (name), update (name) on table public.kategorien to authenticated;

grant select, delete on table public.materialien to authenticated;
grant
  insert (name, kategorie_id, hersteller, modell, sku, einheit, mindestbestand, beschreibung, status),
  update (name, kategorie_id, hersteller, modell, sku, einheit, mindestbestand, beschreibung, status)
  on table public.materialien to authenticated;

alter table public.kategorien enable row level security;
alter table public.materialien enable row level security;

-- (select public.ist_admin()) wird so pro Abfrage nur einmal ausgewertet, nicht pro Zeile.
create policy "Angemeldete lesen Kategorien" on public.kategorien
  for select to authenticated using (true);
create policy "Admins legen Kategorien an" on public.kategorien
  for insert to authenticated with check ((select public.ist_admin()));
create policy "Admins ändern Kategorien" on public.kategorien
  for update to authenticated using ((select public.ist_admin())) with check ((select public.ist_admin()));
create policy "Admins löschen Kategorien" on public.kategorien
  for delete to authenticated using ((select public.ist_admin()));

create policy "Angemeldete lesen Materialien" on public.materialien
  for select to authenticated using (true);
create policy "Admins legen Materialien an" on public.materialien
  for insert to authenticated with check ((select public.ist_admin()));
create policy "Admins ändern Materialien" on public.materialien
  for update to authenticated using ((select public.ist_admin())) with check ((select public.ist_admin()));
-- Löschen nur, solange keine Buchungen existieren. Das sichert ab Phase 3
-- der Fremdschlüssel der Buchungstabelle (on delete restrict).
create policy "Admins löschen Materialien" on public.materialien
  for delete to authenticated using ((select public.ist_admin()));
