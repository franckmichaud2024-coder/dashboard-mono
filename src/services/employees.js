import { supabase } from "./supabase";

export async function getEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addEmployee(employee) {
  const payload = {
    name: employee.name?.trim(),
    position: employee.position?.trim() || null,
    department: employee.department?.trim() || "Expédition",
    hire_date: employee.hireDate || null,
    status: employee.status || "Permanent",
    shift: employee.shift || "Jour",
    weekly_hours: Number(employee.weeklyHours || 40),
    weekly_days: Number(employee.weeklyDays || 5),
    vacation_group: employee.vacationGroup?.trim() || null,
    works_weekends: Boolean(employee.worksWeekends),
    active: employee.active !== false,
    comments: employee.comments?.trim() || null,
  };

  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEmployee(id, employee) {
  const { data, error } = await supabase
    .from("employees")
    .update(employee)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateEmployee(id) {
  const { error } = await supabase
    .from("employees")
    .update({ active: false })
    .eq("id", id);

  if (error) throw error;
}
