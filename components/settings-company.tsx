"use client";

import BusinessSettingsClient from "@/components/business-settings-client";

/**
 * Compatibilidad con una implementación antigua de configuración.
 * La configuración oficial se administra desde BusinessSettingsClient.
 */
export default function SettingsCompany() {
  return <BusinessSettingsClient />;
}
