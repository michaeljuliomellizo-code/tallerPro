"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  Home,
  MoreHorizontal,
  Users,
  Wrench,
} from "lucide-react";

const items = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Motos", href: "/motocicletas", icon: Bike },
  { label: "Órdenes", href: "/ordenes", icon: Wrench },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        );
      })}

      <Link href="/configuracion">
        <MoreHorizontal size={18} />
        <span>Más</span>
      </Link>
    </nav>
  );
}
