import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no está configurada");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada");
  }

  return createSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sesión no válida.");

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id,role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member?.organization_id || !member.active || !["owner", "admin"].includes(String(member.role))) {
    throw new Error("No tienes permisos de administrador para gestionar usuarios.");
  }
  return { supabase, user, organizationId: member.organization_id };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const adminClient = getAdminClient();

    // Mantén aquí el resto de tu lógica actual.
    const { data, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en /api/admin/users:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, organizationId } = await getContext();
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const roleId = String(body.role_id ?? "").trim();
    const branchId = body.branch_id ? String(body.branch_id) : null;

    if (!email) throw new Error("El correo es obligatorio.");
    if (!roleId) throw new Error("El rol es obligatorio.");

    const { data: role, error: re } = await supabase
      .from("app_roles")
      .select("id,base_role,active")
      .eq("id", roleId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (re) throw re;
    if (!role?.active) throw new Error("El rol seleccionado no está activo.");

    if (branchId) {
      const { data: branch, error: be } = await supabase
        .from("branches").select("id").eq("id", branchId).eq("organization_id", organizationId).maybeSingle();
      if (be) throw be;
      if (!branch) throw new Error("La sucursal seleccionada no pertenece al taller.");
    }

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });
    if (inviteError) throw inviteError;

    const { error: memberError } = await adminClient.from("organization_members").upsert({
      user_id: invited.user.id,
      organization_id: organizationId,
      role: role.base_role,
      role_id: role.id,
      branch_id: branchId,
      active: true,
    }, { onConflict: "organization_id,user_id" });
    if (memberError) throw memberError;

    return NextResponse.json({ ok: true, user_id: invited.user.id, message: "Usuario creado e invitación enviada." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible crear el usuario." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, organizationId } = await getContext();
    const body = await request.json();
    const userId = String(body.user_id ?? "").trim();
    const roleId = String(body.role_id ?? "").trim();
    const branchId = body.branch_id ? String(body.branch_id) : null;
    const active = Boolean(body.active);
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const fullName = body.full_name ? String(body.full_name).trim() : null;
    if (!userId || !roleId) throw new Error("Usuario y rol son obligatorios.");

    const { data: role, error: re } = await supabase.from("app_roles").select("id,base_role,active").eq("id", roleId).eq("organization_id", organizationId).maybeSingle();
    if (re) throw re;
    if (!role?.active) throw new Error("El rol no está activo.");

    const patch: Record<string, unknown> = { role: role.base_role, role_id: role.id, branch_id: branchId, active, updated_at: new Date().toISOString() };
    const { error: memberError } = await adminClient.from("organization_members").update(patch).eq("organization_id", organizationId).eq("user_id", userId);
    if (memberError) throw memberError;

    const userPatch: Record<string, unknown> = {};
    if (email) userPatch.email = email;
    if (fullName !== null) userPatch.user_metadata = { full_name: fullName };
    userPatch.ban_duration = active ? "none" : "10000d";
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, userPatch);
    if (authError) throw authError;

    return NextResponse.json({ ok: true, message: active ? "Usuario activado." : "Usuario desactivado." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible actualizar el usuario." }, { status: 400 });
  }
}
