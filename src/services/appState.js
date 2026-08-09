import { supabase } from "./supabase";

export const EXPEDITION_WORKSPACE = "expedition-main";

// Tous les comptes autorisés d'Expédition Mono partagent le même état cloud.
// L'identité de l'utilisateur sert aux droits d'accès, pas à séparer les données.
export async function loadState(workspaceKey = EXPEDITION_WORKSPACE) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_state")
    .select("id, data, updated_at, workspace_key, user_id")
    .eq("workspace_key", workspaceKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveState(payload, workspaceKey = EXPEDITION_WORKSPACE) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) throw new Error("Utilisateur non connecté.");

  const { data: existing, error: findError } = await supabase
    .from("app_state")
    .select("id")
    .eq("workspace_key", workspaceKey)
    .maybeSingle();

  if (findError) throw findError;

  const values = {
    user_id: user.id,
    workspace_key: workspaceKey,
    data: payload,
    updated_at: new Date().toISOString(),
  };

  const query = existing?.id
    ? supabase.from("app_state").update(values).eq("id", existing.id)
    : supabase.from("app_state").insert(values);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export function subscribeToState(_userId, onChange, workspaceKey = EXPEDITION_WORKSPACE) {
  const channel = supabase
    .channel(`app-state:${workspaceKey}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "app_state",
        filter: `workspace_key=eq.${workspaceKey}`,
      },
      (payload) => {
        const row = payload.new;
        if (row?.workspace_key === workspaceKey) onChange?.(row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
