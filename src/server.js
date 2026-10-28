import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventBus } from "./infrastructure/EventBus.js";
import { JsonStore } from "./infrastructure/JsonStore.js";
import { MarketplaceService } from "./application/MarketplaceService.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const store = new JsonStore();
const eventBus = new EventBus();
const service = new MarketplaceService(store, eventBus);

eventBus.subscribe("offer.published", persistEvent);
eventBus.subscribe("reservation.created", persistEvent);
eventBus.subscribe("reservation.picked_up", persistEvent);
eventBus.subscribe("donation.created", persistEvent);

const server = http.createServer(async (request, response) => {
  setHeaders(response);
  try {
    if (request.url?.startsWith("/api/")) return await handleApi(request, response);
    return serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: "Ocurrió un error interno.", detail: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => {
  console.log(`Alquimia Circular disponible en http://localhost:${port}`);
});

function setHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'");
  response.setHeader("Cache-Control", "no-store");
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, { status: "ok", timestamp: new Date().toISOString() });
  }
  if (request.method === "GET" && url.pathname === "/api/offers") {
    return sendJson(response, 200, { offers: service.listOffers() });
  }
  if (request.method === "GET" && url.pathname === "/api/reservations") {
    return sendJson(response, 200, { reservations: service.listReservations() });
  }
  if (request.method === "GET" && url.pathname === "/api/summary") {
    return sendJson(response, 200, service.summary());
  }
  if (request.method === "POST" && url.pathname === "/api/offers") {
    const result = service.createOffer(await readBody(request));
    if (result.errors) return sendJson(response, 400, { errors: result.errors });
    return sendJson(response, 201, result);
  }
  if (request.method === "POST" && url.pathname === "/api/reservations") {
    const result = service.reserveOffer(await readBody(request));
    if (result.errors) return sendJson(response, 409, { errors: result.errors });
    return sendJson(response, 201, result);
  }
  const pickupMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)\/pickup$/);
  if (request.method === "PATCH" && pickupMatch) {
    const result = service.confirmPickup(decodeURIComponent(pickupMatch[1]));
    if (result.errors) return sendJson(response, 409, { errors: result.errors });
    return sendJson(response, 200, result);
  }
  const donateMatch = url.pathname.match(/^\/api\/offers\/([^/]+)\/donate$/);
  if (request.method === "POST" && donateMatch) {
    const input = await readBody(request);
    const result = service.donateOffer(decodeURIComponent(donateMatch[1]), input.partnerName);
    if (result.errors) return sendJson(response, 409, { errors: result.errors });
    return sendJson(response, 201, result);
  }
  return sendJson(response, 404, { error: "Ruta no encontrada." });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 16_384) {
        reject(new Error("El cuerpo de la solicitud supera el límite permitido."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error("El cuerpo debe ser JSON válido.")); }
    });
    request.on("error", reject);
  });
}

function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requestedFile = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(publicRoot, requestedFile);
  if (!filePath.startsWith(`${publicRoot}${path.sep}`) && filePath !== path.join(publicRoot, "index.html")) {
    response.writeHead(403);
    return response.end("Prohibido");
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      return response.end("No encontrado");
    }
    const extension = path.extname(filePath).toLowerCase();
    const contentType = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" }[extension] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function persistEvent(event) {
  store.update((state) => state.events.unshift(event));
}
