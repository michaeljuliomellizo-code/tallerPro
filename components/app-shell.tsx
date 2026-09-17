"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
    Code2,
    Smartphone,
    Sparkles,
    Settings,
    Menu,
    LogOut,
    CircleHelp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/tallerpro/config";

const groups = [
    {
        label: "Operación",
        items: [
            [
                "Dashboard",
                "/dashboard",
                LayoutDashboard,
            ],
            ["Clientes", "/clientes", Users],
            [
                "Motocicletas",
                "/motocicletas",
                Bike,
            ],
            ["Agenda", "/agenda", CalendarDays],
            [
                "Recepción",
                "/recepcion",
                ClipboardCheck,
            ],
            [
                "Órdenes de servicio",
                "/ordenes",
                Wrench,
            ],
            [
                "Cotizaciones",
                "/cotizaciones",
                FileText,
            ],
        ],
    },

    {
        label: "Gestión",
        items: [
            [
                "Inventario",
                "/inventario",
                Package,
            ],
            [
                "Proveedores",
                "/proveedores",
                Truck,
            ],
            [
                "Mecánicos",
                "/mecanicos",
                HardHat,
            ],
            [
                "Facturación y pagos",
                "/facturacion",
                ReceiptText,
            ],
            [
                "Mantenimiento",
                "/mantenimiento",
                BellRing,
            ],
        ],
    },

    {
        label: "Comercial & análisis",
        items: [
            [
                "CRM / WhatsApp",
                "/crm",
                MessageCircle,
            ],
            [
                "Reportes",
                "/reportes",
                BarChart3,
            ],
            [
                "Portal cliente",
                "/portal",
                UserRound,
            ],
            [
                "POS / repuestos",
                "/pos",
                ShoppingCart,
            ],
            [
                "Venta Express",
                "/pos/rapido",
                ReceiptText,
            ],
            [
                "Finanzas",
                "/finanzas",
                WalletCards,
            ],
            [
                "Periodos",
                "/periodos",
                CalendarDays,
            ],
        ],
    },

    {
        label: "Plataforma",
        items: [
            // ["API", "/api-docs", Code2],
            // [
            //     "Aplicación móvil",
            //     "/movil",
            //     Smartphone,
            // ],
            // [
            //     "Automatizaciones",
            //     "/automatizaciones",
            //     Sparkles,
            // ],
            [
                "Configuración",
                "/configuracion",
                Settings,
            ],
        ],
    },
] as const;

export function AppShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const [open, setOpen] =
        useState(false);

    async function logout() {
        const has = Boolean(
            process.env
                .NEXT_PUBLIC_SUPABASE_URL &&
                process.env
                    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        );

        if (has) {
            await createClient()
                .auth
                .signOut();
        }

        window.location.href = "/login";
    }

    return (
        <div className="shell">
            <aside
                className={`sidebar ${
                    open ? "open" : ""
                }`}
            >
                <div className="brand">
                    <Image
                      src={APP_CONFIG.logo}
                      alt={APP_CONFIG.name}
                      width={180}
                      height={60}
                    />

                    <div>
                        <strong>
                          <span>{APP_CONFIG.name}</span>
                        </strong>

                        <span>
                            Plataforma de gestión
                        </span>
                    </div>
                </div>

                {groups.map((g) => (
                    <div key={g.label}>
                        <div className="nav-label">
                            {g.label}
                        </div>

                        {g.items.map(
                            ([
                                label,
                                href,
                                Icon,
                            ]) => (
                                <Link
                                    onClick={() =>
                                        setOpen(
                                            false
                                        )
                                    }
                                    className={`nav-item ${
                                        pathname.startsWith(
                                            href
                                        )
                                            ? "active"
                                            : ""
                                    }`}
                                    href={href}
                                    key={href}
                                >
                                    <Icon size={16} />
                                    {label}
                                </Link>
                            )
                        )}
                    </div>
                ))}

                <div
                    style={{
                        marginTop: 20,
                        padding: 10,
                    }}
                >
                    <button
                        onClick={logout}
                        className="nav-item"
                        style={{
                            border: 0,
                            background:
                                "transparent",
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
                        }}
                    >
                        <button
                            className="btn btn-ghost mobile-menu"
                            onClick={() =>
                                setOpen(!open)
                            }
                        >
                            <Menu size={16} />
                        </button>

                        <div>
                            <h1>
                                MotoMil Taller
                            </h1>

                            <div
                                style={{
                                    fontSize: 10,
                                    color: "#7c8583",
                                }}
                            >
                                Operación central ·
                                Bogotá
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background:
                                    "#51e6c2",
                                display: "grid",
                                placeItems:
                                    "center",
                                fontSize: 11,
                                fontWeight: 800,
                            }}
                        >
                            MM
                        </div>
                    </div>
                </header>

                <main className="content">
                    {children}
                </main>
            </div>
        </div>
    );
}