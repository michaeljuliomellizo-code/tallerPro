// Patrón para integrar en el formulario CRUD existente de mechanics.
// No reemplaza automáticamente el componente actual.

const createMechanicPayload = ({
  organizationId,
  fullName,
  phone,
  specialty,
  hourlyCost,
}: {
  organizationId: string;
  fullName: string;
  phone: string;
  specialty: string;
  hourlyCost: number;
}) => ({
  organization_id: organizationId,
  full_name: fullName.trim(),
  phone: phone.trim() || null,
  specialty: specialty.trim() || null,
  hourly_cost: Number.isFinite(hourlyCost) ? hourlyCost : 0,
  active: true,
});

export async function createMechanic(
  supabase: any,
  payload: Parameters<typeof createMechanicPayload>[0]
) {
  const { data, error } = await supabase
    .from("mechanics")
    .insert(createMechanicPayload(payload))
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setMechanicActive(
  supabase: any,
  mechanicId: string,
  active: boolean
) {
  const { data, error } = await supabase
    .from("mechanics")
    .update({ active })
    .eq("id", mechanicId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
