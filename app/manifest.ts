import type { MetadataRoute } from "next";

// Permite "Adicionar à tela de início" no celular e abrir como um app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meu Look",
    short_name: "Meu Look",
    description: "Seu guarda-roupa com um stylist de IA",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#f7f4ef",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
