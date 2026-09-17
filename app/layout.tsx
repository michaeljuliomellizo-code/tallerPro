import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { APP_CONFIG } from "@/lib/tallerpro/config";

export const metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><Analytics />{children}</body></html>;
}
