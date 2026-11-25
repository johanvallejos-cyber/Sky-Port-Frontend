import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // HTTPS va del proxy a la API. El certificado local de .NET puede ser autofirmado.
  // No se modifica CORS ni ningún archivo del backend.
  const proxy = {
    "/api": {
      target: env.API_PROXY_TARGET || "https://localhost:7248",
      changeOrigin: true,
      secure: mode !== "development",
    },
  };
  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true },
  };
});
