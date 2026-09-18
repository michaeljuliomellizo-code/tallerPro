"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  LayoutDashboard,
  Users,
  Bike,
  CalendarDays,
  ClipboardCheck,
  Wrench,
  FileText,
  Package,
  Truck,
  HardHat,
  ReceiptText,
  BellRing,
  MessageCircle,
  BarChart3,
  UserRound,
  ShoppingCart,
  WalletCards,
  Settings,
  Menu,
  LogOut,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/tallerpro/config";
import { getWorkshopBranding } from "@/lib/tallerpro/workshop-branding";
import MobileBottomNav from "@/components/mobile-bottom-nav";

const groups = [
  {
    label: "Operación",
    items: [
      ["Dashboard", "/dashboard", LayoutDashboard],
      ["Clientes", "/clientes", Users],
      ["Motocicletas", "/motocicletas", Bike],
      ["Agenda", "/agenda", CalendarDays],
      ["Recepción", "/recepcion", ClipboardCheck],
      ["Órdenes de servicio", "/ordenes", Wrench],
      ["Cotizaciones", "/cotizaciones", FileText],
    ],
  },
  {
    label: "Gestión",
    items: [
      ["Inventario", "/inventario", Package],
      ["Proveedores", "/proveedores", Truck],
      ["Mecánicos", "/mecanicos", HardHat],
      ["Facturación y pagos", "/facturacion", ReceiptText],
      ["Mantenimiento", "/mantenimiento", BellRing],
    ],
  },
  {
    label: "Comercial & análisis",
    items: [
      ["CRM / WhatsApp", "/crm", MessageCircle],
      ["Reportes", "/reportes", BarChart3],
      ["Portal cliente", "/portal", UserRound],
      ["POS / repuestos", "/pos", ShoppingCart],
      ["Venta Express", "/pos/rapido", ReceiptText],
      ["Finanzas", "/finanzas", WalletCards],
      ["Periodos", "/periodos", CalendarDays],
    ],
  },
  {
    label: "Plataforma",
    items: [["Configuración", "/configuracion", Settings]],
  },
] as const;

function getInitials(value: string) {
  const clean = value.trim().split(/\s+/).filter(Boolean);
  if (!clean.length) return "TP";
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase();
  return `${clean[0][0]}${clean[1][0]}`.toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [workshopName, setWorkshopName] = useState("");
  const [workshopCity, setWorkshopCity] = useState("");
  const [workshopLogo, setWorkshopLogo] = useState<string | null>(null);
  const [workshopInitials, setWorkshopInitials] = useState("TP");

  useEffect(() => {
    let mounted = true;

    async function loadBranding() {
      try {
        const branding = await getWorkshopBranding(supabase);
        if (!mounted) return;

        const name = branding.name || "Mi taller";
        setWorkshopName(name);
        setWorkshopCity(branding.city ?? "");
        setWorkshopLogo(branding.logoUrl);
        setWorkshopInitials(getInitials(name));
      } catch (error) {
        console.error("No fue posible cargar el branding del taller:", error);
      }
    }

    void loadBranding();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function logout() {
    const hasSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );

    if (hasSupabase) {
      await supabase.auth.signOut();
    }

    window.location.href = "/login";
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>

          {workshopLogo ? (
            <img src={workshopLogo} alt={workshopName || "Logo del taller"} />
          ) : (
            <Image
              src={APP_CONFIG.logo}
              alt={APP_CONFIG.name}
              width={180}
              height={60}
            />
          )}

          <div>
            <strong>{APP_CONFIG.name}</strong>
            <span>{workshopName || "Gestión del taller"}</span>
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.label}>
            <div className="nav-label">{group.label}</div>

            {group.items.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`nav-item ${
                  pathname.startsWith(href) ? "active" : ""
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 20, padding: 10 }}>
          <button
            type="button"
            onClick={logout}
            className="nav-item"
            style={{
              border: 0,
              background: "transparent",
              width: "100%",
              cursor: "pointer",
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <button
              type="button"
              className="btn btn-ghost mobile-menu"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div style={{ minWidth: 0 }}>
              <h1>{workshopName || APP_CONFIG.name}</h1>
              <div
                style={{
                  fontSize: 10,
                  color: "#7c8583",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {APP_CONFIG.name}
                {" · "}
                {workshopCity || "Panel de gestión"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#51e6c2",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 800,
                color: "#062b24",
              }}
            >
              {workshopInitials}
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
