import { createClient } from "@/lib/supabase/client";

export type CustomerPortalUser = {
  user_id: string;
  customer_id: string;
  created_at: string;
};

export async function getPortalCustomer(): Promise<CustomerPortalUser | null> {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("customer_portal_users")
    .select("user_id, customer_id, created_at")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as CustomerPortalUser | null;
}
