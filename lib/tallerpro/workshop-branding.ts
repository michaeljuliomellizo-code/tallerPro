import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { createWorkshopLogoSignedUrl } from "@/lib/tallerpro/workshop-storage";

export type WorkshopBranding = {
  id: string;

  name: string;
  legalName: string | null;

  taxId: string | null;
  nit: string | null;

  phone: string | null;
  email: string | null;

  address: string | null;
  city: string | null;

  country: string;
  currency: string;

  taxRate: number;

  /**
   * Ruta del archivo en Supabase Storage.
   *
   * Ejemplo:
   * 6ef9548d-10fc-489a-b237-d4cd2123cb21/logo.png
   *
   * No es una URL pública permanente.
   */
  logoPath: string | null;

  /**
   * URL firmada temporal generada para mostrar el logo.
   */
  logoUrl: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  nit: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  currency: string;
  tax_rate: number;
  logo_url: string | null;
};

export async function getWorkshopBranding(
  supabase: SupabaseClient
): Promise<WorkshopBranding> {
  const organizationId = await getCurrentOrganizationId();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
        id,
        name,
        legal_name,
        tax_id,
        nit,
        phone,
        email,
        address,
        city,
        country,
        currency,
        tax_rate,
        logo_url
      `
    )
    .eq("id", organizationId)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "No fue posible encontrar la organización actual."
    );
  }

  const organization = data as OrganizationRow;

  let logoUrl: string | null = null;

  if (organization.logo_url) {
    logoUrl = await createWorkshopLogoSignedUrl(
      supabase,
      organization.logo_url
    );
  }

  return {
    id: organization.id,

    name: organization.name,
    legalName: organization.legal_name,

    taxId: organization.tax_id,
    nit: organization.nit,

    phone: organization.phone,
    email: organization.email,

    address: organization.address,
    city: organization.city,

    country: organization.country,
    currency: organization.currency,

    taxRate: Number(organization.tax_rate ?? 0),

    logoPath: organization.logo_url,
    logoUrl,
  };
}