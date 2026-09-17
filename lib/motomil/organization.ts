import { createClient } from "@/lib/supabase/client";

export async function getCurrentOrganizationId(): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(
      `No fue posible obtener el usuario autenticado: ${authError.message}`
    );
  }

  if (!user) {
    throw new Error(
      "No existe una sesión autenticada."
    );
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("organization_id", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No fue posible obtener la organización del usuario: ${error.message}`
    );
  }

  if (!data?.organization_id) {
    throw new Error(
      "El usuario no tiene una organización asignada."
    );
  }

  return data.organization_id;
}