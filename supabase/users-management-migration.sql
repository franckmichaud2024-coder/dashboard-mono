-- Expédition Mono 1.15.4 — gestion des rôles et suppression des utilisateurs.
-- À exécuter UNE FOIS dans Supabase > SQL Editor APRÈS users-list-migration.sql.
-- Les opérations sont réservées aux comptes Créateur.

create or replace function public.expedition_update_user_role(
  target_user_id uuid,
  new_role text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  target_exists boolean;
  target_role text;
  creator_count integer;
begin
  if caller_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select coalesce(raw_user_meta_data->>'role', 'creator')
    into caller_role
  from auth.users
  where id = caller_id;

  if caller_role <> 'creator' then
    raise exception 'Accès réservé au Créateur';
  end if;

  if new_role not in ('creator', 'readonly') then
    raise exception 'Rôle invalide';
  end if;

  if target_user_id = caller_id then
    raise exception 'Vous ne pouvez pas modifier votre propre rôle';
  end if;

  select true, coalesce(raw_user_meta_data->>'role', 'creator')
    into target_exists, target_role
  from auth.users
  where id = target_user_id;

  if coalesce(target_exists, false) = false then
    raise exception 'Utilisateur introuvable';
  end if;

  if target_role = 'creator' and new_role = 'readonly' then
    select count(*) into creator_count
    from auth.users
    where coalesce(raw_user_meta_data->>'role', 'creator') = 'creator';

    if creator_count <= 1 then
      raise exception 'Il doit rester au moins un Créateur';
    end if;
  end if;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', new_role)
  where id = target_user_id;

  return true;
end;
$$;

create or replace function public.expedition_delete_user(
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  target_role text;
  target_exists boolean;
  creator_count integer;
begin
  if caller_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select coalesce(raw_user_meta_data->>'role', 'creator')
    into caller_role
  from auth.users
  where id = caller_id;

  if caller_role <> 'creator' then
    raise exception 'Accès réservé au Créateur';
  end if;

  if target_user_id = caller_id then
    raise exception 'Vous ne pouvez pas supprimer votre propre compte';
  end if;

  select true, coalesce(raw_user_meta_data->>'role', 'creator')
    into target_exists, target_role
  from auth.users
  where id = target_user_id;

  if coalesce(target_exists, false) = false then
    raise exception 'Utilisateur introuvable';
  end if;

  if target_role = 'creator' then
    select count(*) into creator_count
    from auth.users
    where coalesce(raw_user_meta_data->>'role', 'creator') = 'creator';

    if creator_count <= 1 then
      raise exception 'Le dernier Créateur ne peut pas être supprimé';
    end if;
  end if;

  delete from auth.users where id = target_user_id;
  return true;
end;
$$;

revoke all on function public.expedition_update_user_role(uuid, text) from public;
revoke all on function public.expedition_delete_user(uuid) from public;
grant execute on function public.expedition_update_user_role(uuid, text) to authenticated;
grant execute on function public.expedition_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
