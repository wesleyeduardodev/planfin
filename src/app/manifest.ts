import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlanFin - Planejamento Financeiro",
    short_name: "PlanFin",
    description: "Sistema de Planejamento Financeiro Mensal",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#5b4cc4",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
