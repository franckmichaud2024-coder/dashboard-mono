import { supabase } from "./supabase";

export async function listUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}
