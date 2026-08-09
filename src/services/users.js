import { supabase } from "./supabase";

export async function listUsers() {
  const { data, error } = await supabase.rpc("expedition_list_users");
  if (error) throw error;
  return data || [];
}

export async function updateUserRole(userId, role) {
  const normalizedRole = role === "creator" ? "creator" : "readonly";
  const { data, error } = await supabase.rpc("expedition_update_user_role", {
    target_user_id: userId,
    new_role: normalizedRole,
  });
  if (error) throw error;
  if (data !== true) throw new Error("Supabase n’a pas confirmé la modification du rôle.");
  return data;
}

export async function deleteUser(userId) {
  const { data, error } = await supabase.rpc("expedition_delete_user", {
    target_user_id: userId,
  });
  if (error) throw error;
  if (data !== true) throw new Error("Supabase n’a pas confirmé la suppression de l’utilisateur.");
  return data;
}
