-- Expédition Mono 1.15.2 - permettre au Créateur de voir la liste des utilisateurs.
-- À exécuter UNE FOIS dans Supabase > SQL Editor.

alter table public.profiles add column if not exists email text;

-- Harmonise les rôles déjà présents avec Expédition Mono.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('creator', 'readonly', 'administrateur', 'planificateur', 'lecture'));

-- Remplit/actualise automatiquement le profil lorsqu'un compte Auth est créé/modifié.
create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, updated_at)
  values (
    new.id,
    new.email,
    case
      when coalesce(new.raw_user_meta_data->>'role','') = 'creator' then 'creator'
      else 'readonly'
    end,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists expedition_sync_auth_user_profile on auth.users;
create trigger expedition_sync_auth_user_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

-- Ajoute les utilisateurs qui existaient déjà avant cette mise à jour.
insert into public.profiles (id, email, role, updated_at)
select
  u.id,
  u.email,
  case when coalesce(u.raw_user_meta_data->>'role','') = 'creator' then 'creator' else 'readonly' end,
  now()
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  role = excluded.role,
  updated_at = now();

-- Un Créateur peut voir tous les profils; les autres gardent seulement leur propre profil.
drop policy if exists "profiles_creator_read_all" on public.profiles;
create policy "profiles_creator_read_all"
on public.profiles
for select
to authenticated
using (
  coalesce(auth.jwt()->'user_metadata'->>'role', 'readonly') = 'creator'
);
