-- Benutzerprofile mit Rolle.
-- Jeder Benutzer aus auth.users erhält automatisch ein Profil mit der Rolle 'mitarbeiter'.
-- Die Rolle lässt sich nur per SQL (Supabase-Dashboard) ändern, nicht über die API.

create type public.rolle as enum ('admin', 'mitarbeiter');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  anzeigename text not null check (char_length(btrim(anzeigename)) between 1 and 100),
  rolle       public.rolle not null default 'mitarbeiter',
  erstellt_am timestamptz not null default now()
);

comment on table public.profiles is 'Ein Profil pro Benutzer; Rolle steuert die Berechtigungen.';

-- RLS: Angemeldete dürfen Profile lesen (Namen in der Buchungshistorie).
-- Es gibt bewusst keine Policies für insert, update oder delete.
alter table public.profiles enable row level security;

-- Supabase vergibt für neue Tabellen standardmäßig alle Rechte an anon und authenticated.
-- Wir entziehen sie und geben nur das Lesen für angemeldete Benutzer frei.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Angemeldete lesen Profile"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Legt beim Anlegen eines Benutzers das Profil an.
-- security definer: läuft mit den Rechten des Eigentümers, weil der Auth-Dienst
-- selbst keine Schreibrechte auf public.profiles hat.
create function public.neuer_benutzer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, anzeigename)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'anzeigename'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

revoke execute on function public.neuer_benutzer() from public, anon, authenticated;

create trigger benutzer_angelegt
  after insert on auth.users
  for each row execute function public.neuer_benutzer();

-- Profile für Benutzer nachtragen, die vor dieser Migration angelegt wurden.
insert into public.profiles (id, anzeigename)
select u.id, split_part(u.email, '@', 1)
from auth.users u
on conflict (id) do nothing;

-- Prüft, ob der aktuelle Benutzer Admin ist. Grundlage für spätere RLS-Policies.
create function public.ist_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and rolle = 'admin'
  );
$$;

revoke execute on function public.ist_admin() from public, anon;
grant execute on function public.ist_admin() to authenticated;
