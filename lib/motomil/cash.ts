import { createClient } from "@/lib/supabase/client";

export type OpenCashRegister = {
  id: string;
  organization_id: string;
  opened_by: string;
  opened_at: string;
  opening_amount: number | string;
  closed_at: string | null;
  closed_by: string | null;
  expected_amount: number | string | null;
  counted_amount: number | string | null;
  difference: number | string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Obtiene la caja abierta de la organización actual.
 *
 * Retorna null cuando no existe una caja abierta.
 */
export async function getOpenCashRegister(
  organizationId: string
): Promise<OpenCashRegister | null> {
  const supabase = createClient();

  const {
    data,
    error,
  } = await supabase
    .from("cash_registers")
    .select("*")
    .eq(
      "organization_id",
      organizationId
    )
    .eq("status", "open")
    .order("opened_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as
    | OpenCashRegister
    | null;
}

/**
 * Exige que exista una caja abierta.
 *
 * Se utiliza antes de ejecutar operaciones
 * financieras desde el frontend.
 */
export async function requireOpenCashRegister(
  organizationId: string
): Promise<OpenCashRegister> {
  const register =
    await getOpenCashRegister(
      organizationId
    );

  if (!register) {
    throw new Error(
      "No existe una caja abierta. Debes abrir una caja antes de realizar esta operación."
    );
  }

  return register;
}