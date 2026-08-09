-- Expédition Mono 1.15.6 — correction complète de la gestion des utilisateurs.
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Cette migration remplace les fonctions de liste / rôle / suppression.

begin;

create or replace function public.expedition_list_users()
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role text;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select coalesce(
    nullif(raw_app_meta_data->>'role', ''),
    nullif(raw_user_meta_data->>'role', ''),
    'creator'
  ) into caller_role
  from auth.users
  where id = auth.uid();

  if caller_role <> 'creator' then
    raise exception 'Accès réservé au Créateur';
  end if;

  return query
  select
    u.id,
    u.email::text,
    case
      when coalesce(
        nullif(u.raw_app_meta_data->>'role', ''),
        nullif(u.raw_user_meta_data->>'role', ''),
        'creator'
      ) = 'readonly' then 'readonly'
      else 'creator'
    end::text,
    u.created_at
  from auth.users u
  order by u.created_at asc;
end;
$$;

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
  target_role text;
  creator_count integer;
begin
  if caller_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select coalesce(
    nullif(raw_app_meta_data->>'role', ''),
    nullif(raw_user_meta_data->>'role', ''),
    'creator'
  ) into caller_role
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

  select coalesce(
    nullif(raw_app_meta_data->>'role', ''),
    nullif(raw_user_meta_data->>'role', ''),
    'creator'
  ) into target_role
  from auth.users
  where id = target_user_id;

  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

  if target_role = 'creator' and new_role = 'readonly' then
    select count(*) into creator_count
    from auth.users
    where coalesce(
      nullif(raw_app_meta_data->>'role', ''),
      nullif(raw_user_meta_data->>'role', ''),
      'creator'
    ) = 'creator';

    if creator_count <= 1 then
      raise exception 'Il doit rester au moins un Créateur';
    end if;
  end if;

  -- On écrit dans les deux métadonnées pour que l'interface et le JWT
  -- utilisent la même valeur au prochain renouvellement de session.
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', new_role),
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', new_role),
      updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

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
  creator_count integer;
  fk record;
begin
  if caller_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select coalesce(
    nullif(raw_app_meta_data->>'role', ''),
    nullif(raw_user_meta_data->>'role', ''),
    'creator'
  ) into caller_role
  from auth.users
  where id = caller_id;

  if caller_role <> 'creator' then
    raise exception 'Accès réservé au Créateur';
  end if;

  if target_user_id = caller_id then
    raise exception 'Vous ne pouvez pas supprimer votre propre compte';
  end if;

  select coalesce(
    nullif(raw_app_meta_data->>'role', ''),
    nullif(raw_user_meta_data->>'role', ''),
    'creator'
  ) into target_role
  from auth.users
  where id = target_user_id;

  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

  if target_role = 'creator' then
    select count(*) into creator_count
    from auth.users
    where coalesce(
      nullif(raw_app_meta_data->>'role', ''),
      nullif(raw_user_meta_data->>'role', ''),
      'creator'
    ) = 'creator';

    if creator_count <= 1 then
      raise exception 'Le dernier Créateur ne peut pas être supprimé';
    end if;
  end if;

  -- Les anciennes données peuvent référencer l'utilisateur dans des colonnes
  -- UUID nullables (created_by, user_id, etc.). On les détache avant la suppression
  -- pour éviter qu'une contrainte FK bloque auth.users.
  for fk in
    select
      n.nspname as schema_name,
      c.relname as table_name,
      a.attname as column_name,
      a.attnotnull as is_not_null
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join unnest(con.conkey) with ordinality ck(attnum, ord) on true
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = ck.attnum
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
  loop
    if not fk.is_not_null then
      execute format('update %I.%I set %I = null where %I = $1',
        fk.schema_name, fk.table_name, fk.column_name, fk.column_name)
      using target_user_id;
    end if;
  end loop;

  delete from auth.users where id = target_user_id;

  if not found then
    raise exception 'La suppression de l’utilisateur a échoué';
  end if;

  return true;
end;
$$;

revoke all on function public.expedition_list_users() from public;
revoke all on function public.expedition_update_user_role(uuid, text) from public;
revoke all on function public.expedition_delete_user(uuid) from public;

grant execute on function public.expedition_list_users() to authenticated;
grant execute on function public.expedition_update_user_role(uuid, text) to authenticated;
grant execute on function public.expedition_delete_user(uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
