import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./responsive.css";
import { Analytics } from "@/components/analytics";
import { APP_CONFIG } from "@/lib/tallerpro/config";

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
  applicationName: APP_CONFIG.name,
  appleWebApp: {
    capable: true,
    title: APP_CONFIG.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#090b0c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
