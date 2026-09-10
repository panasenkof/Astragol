import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const singleFile = process.env.SINGLEFILE === "1";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || "./",
  plugins: [
    react(),
    tailwindcss(),
    singleFile
      ? viteSingleFile()
      : VitePWA({
          registerType: "autoUpdate",
          injectRegister: "auto",
          includeAssets: [
            "favicon-32.png",
            "apple-touch-icon.png",
            "pwa-192x192.png",
            "pwa-512x512.png",
            "pwa-512x512-maskable.png",
          ],
          manifest: {
            name: "Nebula Arena",
            short_name: "Nebula",
            description:
              "A cosmic 2-player orb soccer game with elastic physics, juicy effects and customisable settings.",
            theme_color: "#04030d",
            background_color: "#04030d",
            display: "standalone",
            orientation: "any",
            start_url: "./",
            scope: "./",
            lang: "en",
            categories: ["games"],
            icons: [
              {
                src: "pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "pwa-512x512.png",
                sizes: "512x512",
                type: "image/png",
              },
              {
                src: "pwa-512x512-maskable.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
            navigateFallback: "index.html",
          },
        }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
