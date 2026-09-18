import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TallerPro",
    short_name: "TallerPro",
    description:
      "Plataforma integral de gestión para talleres de motocicletas",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f7f6",
    theme_color: "#090b0c",
    lang: "es",
    dir: "ltr",
  };
}
