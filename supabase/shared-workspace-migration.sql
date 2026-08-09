-- Expédition Mono 1.15.5 — état partagé entre plusieurs utilisateurs.
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Résultat : tous les utilisateurs authentifiés lisent le même workspace expedition-main.
-- Seuls les comptes Créateur peuvent modifier l'état partagé.

begin;

-- Conserver une seule ligne pour le workspace partagé : la plus récente.
with ranked as (
  select
    id,
    row_number() over (
      partition by workspace_key
      order by updated_at desc nulls last, id desc
    ) as rn
  from public.app_state
  where workspace_key = 'expedition-main'
)
delete from public.app_state a
using ranked r
where a.id = r.id
  and r.rn > 1;

-- Garantit qu'il ne peut exister qu'une seule ligne par workspace.
create unique index if not exists app_state_workspace_key_unique
  on public.app_state (workspace_key);

alter table public.app_state enable row level security;

-- Remplacer les anciennes policies basées sur user_id.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_state'
  loop
    execute format('drop policy if exists %I on public.app_state', p.policyname);
  end loop;
end $$;

-- Tous les utilisateurs connectés voient le même état Expédition.
create policy "expedition_shared_state_read"
  on public.app_state
  for select
  to authenticated
  using (workspace_key = 'expedition-main');

-- Seuls les Créateurs peuvent créer l'état partagé.
create policy "expedition_shared_state_insert_creator"
  on public.app_state
  for insert
  to authenticated
  with check (
    workspace_key = 'expedition-main'
    and coalesce(auth.jwt()->'user_metadata'->>'role', 'creator') = 'creator'
  );

-- Seuls les Créateurs peuvent modifier l'état partagé, peu importe quel Créateur
-- a créé la ligne à l'origine.
create policy "expedition_shared_state_update_creator"
  on public.app_state
  for update
  to authenticated
  using (
    workspace_key = 'expedition-main'
    and coalesce(auth.jwt()->'user_metadata'->>'role', 'creator') = 'creator'
  )
  with check (
    workspace_key = 'expedition-main'
    and coalesce(auth.jwt()->'user_metadata'->>'role', 'creator') = 'creator'
  );

create policy "expedition_shared_state_delete_creator"
  on public.app_state
  for delete
  to authenticated
  using (
    workspace_key = 'expedition-main'
    and coalesce(auth.jwt()->'user_metadata'->>'role', 'creator') = 'creator'
  );

-- S'assurer que Realtime publie app_state. Ignore l'erreur si elle est déjà publiée.
do $$
begin
  begin
    alter publication supabase_realtime add table public.app_state;
  exception
    when duplicate_object then null;
  end;
end $$;

commit;

notify pgrst, 'reload schema';
