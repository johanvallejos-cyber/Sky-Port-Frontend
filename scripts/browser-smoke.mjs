import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer as createViteServer } from "vite";

let rejectLogin = false;
let failFlights = false;
let expire = false;
let occupancyUnavailable = false;
let authorized = 0;
let calls = 0;
const flight = {
  flightId: 99,
  flightCode: "TEST 99",
  airlineName: "<img src=x onerror=alert(1)>",
  originIata: "LIM",
  destinationIata: "CUZ",
  scheduledDepartureUtc: new Date().toISOString(),
  scheduledArrivalUtc: new Date().toISOString(),
  flightStatus: "BOARDING",
  departureGate: "A01",
};
const api = createServer((req, res) => {
  calls++;
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/auth/login") {
    res.statusCode = rejectLogin ? 401 : 200;
    res.end(
      JSON.stringify(
        rejectLogin
          ? {}
          : {
              accessToken: "test-token",
              username: "operador",
              role: "Operations",
              expiresAtUtc: new Date(Date.now() + 600000).toISOString(),
            },
      ),
    );
    return;
  }
  if (req.headers.authorization !== "Bearer test-token" || expire) {
    res.writeHead(401).end("{}");
    return;
  }
  authorized++;
  if (
    (failFlights && req.url === "/api/flight-board") ||
    (occupancyUnavailable && req.url === "/api/flight-occupancy")
  ) {
    res.writeHead(503).end("{}");
    return;
  }
  res.end(
    JSON.stringify(
      req.url === "/api/flight-board"
        ? [flight]
        : [
            {
              flightId: 99,
              registrationCode: "TEST",
              ticketsSold: 80,
              seatCapacity: 100,
            },
          ],
    ),
  );
});
await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
process.env.API_PROXY_TARGET = `http://127.0.0.1:${api.address().port}`;
let vite, browser;
try {
  vite = await createViteServer({
    server: { host: "127.0.0.1", port: 0, strictPort: false },
    logLevel: "error",
  });
  await vite.listen();
  browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "msedge",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const address = `http://127.0.0.1:${vite.httpServer.address().port}`;
  await page.goto(address);
  await page.getByRole("button", { name: "Ver demostración" }).click();
  await page.locator("tbody tr").nth(7).waitFor();
  assert.equal(calls, 0, "Demo must work without API calls");
  await page.getByRole("searchbox").fill("BOG");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByRole("button", { name: "Ver detalle de LA 2380" }).click();
  await page.getByRole("dialog").waitFor();
  assert.match(await page.getByRole("dialog").innerText(), /BOG/);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByLabel("Estado del vuelo").selectOption("DELAYED");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByRole("searchbox").fill("NO-EXISTE");
  await page
    .getByRole("heading", { name: "Sin vuelos para mostrar" })
    .waitFor();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "No horizontal page overflow on mobile",
  );
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await page.getByLabel("Usuario", { exact: true }).fill("operador");
  await page.getByLabel("Contraseña", { exact: true }).fill("test");
  rejectLogin = true;
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "incorrectos" }).waitFor();
  rejectLogin = false;
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await page.getByText("TEST 99", { exact: true }).waitFor();
  assert.ok(
    authorized >= 2,
    "Requests through Vite proxy must include the JWT",
  );
  assert.equal(
    await page.locator("tbody img").count(),
    0,
    "API content is rendered as text",
  );
  occupancyUnavailable = true;
  await page.getByRole("button", { name: "Actualizar datos" }).click();
  await page.getByRole("alert").filter({ hasText: "ocupación" }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 1);
  failFlights = true;
  await page.getByRole("button", { name: "Actualizar datos" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "última consulta" })
    .waitFor();
  assert.equal(
    await page.locator("tbody tr").count(),
    1,
    "Keep previous data after failed refresh",
  );
  expire = true;
  await page.getByRole("button", { name: "Actualizar datos" }).click();
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .waitFor();
  await page.getByRole("alert").filter({ hasText: "sesión venció" }).waitFor();
  assert.equal(
    await page.locator("tbody tr").count(),
    0,
    "Session data cleared after 401",
  );
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(
    "PASS: demo without API, filters, empty state, detail, mobile, rejected login, JWT through proxy, escaped data, partial failure, refresh failure and session expiry.",
  );
} finally {
  await browser?.close();
  await vite?.close();
  api.closeAllConnections();
  await new Promise((resolve) => api.close(resolve));
}
