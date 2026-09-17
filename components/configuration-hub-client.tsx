"use client";

import Link from "next/link";
import { Building2, Cog, ShieldCheck, Store, Users, SlidersHorizontal } from "lucide-react";
import BusinessSettingsClient from "./business-settings-client";

const cards = [
  { href: "/configuracion/usuarios", title: "Usuarios", description: "Crear, editar, activar, desactivar, roles, sucursal y último acceso.", icon: Users },
  { href: "/configuracion/roles", title: "Roles y permisos", description: "Roles predeterminados, roles personalizados y permisos por módulo.", icon: ShieldCheck },
  { href: "/configuracion/sucursales", title: "Sucursales", description: "Administra sedes, códigos, dirección, teléfono y estado.", icon: Store },
  { href: "/configuracion/datos-taller", title: "Datos del taller", description: "Información comercial, identificación, contacto y datos usados en documentos.", icon: Building2 },
  { href: "/configuracion/parametros", title: "Parámetros generales", description: "Valores predeterminados para impuestos, citas, moneda y comisión sugerida.", icon: SlidersHorizontal },
];

export default function ConfigurationHubClient() {
  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">Administración</div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Parametriza el taller sin afectar la operación diaria.</p>
        </div>
        <Cog size={20} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="card" style={{ textDecoration: "none" }}>
            <div className="section-head">
              <div>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <div className="muted" style={{ marginTop: 6 }}>{description}</div>
              </div>
              <Icon size={18} />
            </div>
          </Link>
        ))}
      </div>

      <BusinessSettingsClient />
    </div>
  );
}
