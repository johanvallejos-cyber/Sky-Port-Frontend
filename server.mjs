import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve } from "node:path";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const directory = resolve(dirname(fileURLToPath(import.meta.url)), "dist");

export async function createApp({ target = process.env.API_PROXY_TARGET } = {}) {
  if (!target) throw new Error("Configura API_PROXY_TARGET con la URL pública HTTPS de la API.");
  const upstream = new URL(target);
  if (!["http:", "https:"].includes(upstream.protocol) || upstream.username || upstream.password || upstream.pathname !== "/" || upstream.search || upstream.hash) {
    throw new Error("API_PROXY_TARGET debe ser un origen HTTP/HTTPS sin credenciales, rutas ni parámetros.");
  }
  if (process.env.NODE_ENV === "production" && upstream.protocol !== "https:") {
    throw new Error("API_PROXY_TARGET debe usar HTTPS en producción.");
  }
  await access(resolve(directory, "index.html"));
  const app = express();
  app.disable("x-powered-by");
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  // Montado en la raíz para preservar /api en la petición al backend.
  // No parsear el cuerpo antes del proxy: conserva POST JSON, archivos y JWT.
  app.use(createProxyMiddleware({
    pathFilter: (pathname) => pathname === "/api" || pathname.startsWith("/api/"),
    target: upstream.origin,
    changeOrigin: true,
    secure: true,
    proxyTimeout: 20000,
    on: {
      proxyRes: (proxyRes) => { proxyRes.headers["cache-control"] = "no-store"; },
      proxyReq: (proxyReq) => {
        proxyReq.removeHeader("forwarded");
        proxyReq.removeHeader("x-forwarded-host");
        proxyReq.removeHeader("x-forwarded-for");
        proxyReq.removeHeader("x-forwarded-port");
        proxyReq.setHeader("x-forwarded-proto", upstream.protocol === "https:" ? "https" : "http");
      },
      error: (_error, _req, res) => {
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify({ error: "La API no está disponible. Inténtalo nuevamente." }));
        } else res.end();
      },
    },
  }));
  app.use((_req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); next(); });
  app.use(express.static(directory, { index: false, dotfiles: "deny" }));
  app.get("/{*path}", (req, res) => {
    if (extname(req.path)) { res.status(404).end(); return; }
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(resolve(directory, "index.html"));
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = await createApp();
  const port = Number(process.env.PORT || 10000);
  const server = app.listen(port, "0.0.0.0", () => console.log(`SkyPort Frontend listo en el puerto ${port}`));
  const shutdown = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref(); };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
