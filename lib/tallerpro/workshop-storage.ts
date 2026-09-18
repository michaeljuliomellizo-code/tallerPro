import type { SupabaseClient } from "@supabase/supabase-js";

export const WORKSHOP_ASSETS_BUCKET =
  "organization-assets";

export const MAX_WORKSHOP_LOGO_SIZE =
  2 * 1024 * 1024;

const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

type AllowedLogoType =
  (typeof ALLOWED_LOGO_TYPES)[number];

function extensionFromMimeType(
  mimeType: AllowedLogoType
) {
  switch (mimeType) {
    case "image/png":
      return "png";

    case "image/jpeg":
      return "jpg";

    case "image/webp":
      return "webp";

    default:
      return "png";
  }
}

export function validateWorkshopLogoFile(
  file: File
) {
  if (!ALLOWED_LOGO_TYPES.includes(file.type as AllowedLogoType)) {
    throw new Error(
      "El logo debe estar en formato PNG, JPG o WEBP."
    );
  }

  if (file.size > MAX_WORKSHOP_LOGO_SIZE) {
    throw new Error(
      "El logo no puede superar los 2 MB."
    );
  }
}

export function getWorkshopLogoPath(
  organizationId: string,
  file: File
) {
  validateWorkshopLogoFile(file);

  const extension = extensionFromMimeType(
    file.type as AllowedLogoType
  );

  return `${organizationId}/logo.${extension}`;
}

export async function uploadWorkshopLogo(
  supabase: SupabaseClient,
  organizationId: string,
  file: File
) {
  validateWorkshopLogoFile(file);

  const path = getWorkshopLogoPath(
    organizationId,
    file
  );

  const { error } = await supabase.storage
    .from(WORKSHOP_ASSETS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (error) {
    throw error;
  }

  return path;
}

export async function removeWorkshopLogo(
  supabase: SupabaseClient,
  logoPath: string | null
) {
  if (!logoPath) {
    return;
  }

  const { error } = await supabase.storage
    .from(WORKSHOP_ASSETS_BUCKET)
    .remove([logoPath]);

  if (error) {
    throw error;
  }
}

export async function createWorkshopLogoSignedUrl(
  supabase: SupabaseClient,
  logoPath: string
) {
  const { data, error } = await supabase.storage
    .from(WORKSHOP_ASSETS_BUCKET)
    .createSignedUrl(
      logoPath,
      60 * 60
    );

  if (error) {
    throw error;
  }

  return data?.signedUrl ?? null;
}