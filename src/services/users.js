import { supabase } from "./supabase";

export async function listUsers() {
  const { data, error } = await supabase.rpc("expedition_list_users");
  if (error) throw error;
  return data || [];
}
