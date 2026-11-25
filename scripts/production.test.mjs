import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createApp } from "../server.mjs";

test("el servidor de producción sirve la interfaz y conserva las peticiones a la API", async (t) => {
  const received = [];
  const upstream = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push({ path: req.url, method: req.method, headers: req.headers, body });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/unauthorized") { res.writeHead(401).end('{"error":"sesión vencida"}'); return; }
    if (req.url === "/api/download") { res.setHeader("Content-Type", "application/pdf"); res.end(Buffer.from("%PDF-test")); return; }
    res.end(JSON.stringify({ received: true }));
  }).listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const app = await createApp({ target: `http://127.0.0.1:${upstream.address().port}` });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    upstream.closeAllConnections(); server.closeAllConnections();
    await Promise.all([new Promise((r) => upstream.close(r)), new Promise((r) => server.close(r))]);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { status: "ok" });
  const page = await fetch(base);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /SkyPort/);
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  assert.match((await fetch(base + asset)).headers.get("content-type"), /javascript/);
  assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
  assert.equal((await fetch(`${base}/.env.local`)).status, 404);
  const post = await fetch(`${base}/api/auth/login?source=render`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer example", "X-Forwarded-Host": "untrusted.example", "X-Forwarded-Proto": "fake" }, body: JSON.stringify({ username: "operador", password: "example" }) });
  assert.equal(post.status, 200);
  assert.equal(post.headers.get("cache-control"), "no-store");
  assert.equal(received[0].path, "/api/auth/login?source=render");
  assert.equal(received[0].method, "POST");
  assert.equal(received[0].headers.authorization, "Bearer example");
  assert.equal(received[0].headers["x-forwarded-host"], undefined);
  assert.equal(received[0].headers["x-forwarded-proto"], "http");
  assert.deepEqual(JSON.parse(received[0].body), { username: "operador", password: "example" });
  assert.equal((await fetch(`${base}/api/unauthorized`)).status, 401);
  assert.equal(await (await fetch(`${base}/api/download`)).text(), "%PDF-test");
  await new Promise((resolve) => upstream.close(resolve));
  const unavailable = await fetch(`${base}/api/flight-board`);
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).error, "La API no está disponible. Inténtalo nuevamente.");
});

test("el proxy rechaza destinos ambiguos y exige HTTPS en producción", async () => {
  for (const target of ["file:///tmp", "https://example.com/api", "https://user:pass@example.com", "https://example.com?token=abc"]) {
    await assert.rejects(createApp({ target }));
  }
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try { await assert.rejects(createApp({ target: "http://example.com" }), /HTTPS/); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
