-- Expédition Mono 1.15.3 — liste des utilisateurs sans dépendre de public.profiles.
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- La fonction lit auth.users côté serveur et n'expose la liste qu'aux comptes Créateur.

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
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non connecté';
  end if;

  -- Expédition Mono considère les anciens comptes sans rôle explicite comme Créateur.
  if coalesce(auth.jwt()->'user_metadata'->>'role', 'creator') <> 'creator' then
    raise exception 'Accès réservé au Créateur';
  end if;

  return query
  select
    u.id,
    u.email::text,
    case
      when coalesce(u.raw_user_meta_data->>'role', 'creator') = 'readonly' then 'readonly'
      else 'creator'
    end::text as role,
    u.created_at
  from auth.users u
  order by u.created_at asc;
end;
$$;

revoke all on function public.expedition_list_users() from public;
grant execute on function public.expedition_list_users() to authenticated;

-- Force PostgREST à recharger son cache de schéma immédiatement.
notify pgrst, 'reload schema';
