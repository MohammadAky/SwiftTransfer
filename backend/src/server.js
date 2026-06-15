// =============================================================================
// server.js — Main entry point for the LAN Transfer signaling server
// =============================================================================
// ARCHITECTURE:
//   ┌─────────────────────────────────────────────────────┐
//   │  Express HTTP Server (port 3000)                    │
//   │  ├── GET /          → serves frontend/public/       │
//   │  ├── GET /api/qr    → returns QR code data-URL      │
//   │  └── GET /api/info  → returns server IP & port      │
//   │                                                     │
//   │  Socket.IO (WebSocket upgrade on same port)         │
//   │  └── Handles: register, offer, answer, ice-*, ...  │
//   └─────────────────────────────────────────────────────┘
//
// NETWORKING: HTTP and WebSocket share TCP port 3000.
// Socket.IO performs the WebSocket upgrade handshake (HTTP 101
// Switching Protocols) transparently.

"use strict";

const express   = require("express");
const http      = require("http");
const { Server } = require("socket.io");
const path      = require("path");
const os        = require("os");
const { PORT }  = require("./config");
const { registerSignalingHandlers } = require("./signaling/signalingHandler");
const { generateQR } = require("./utils/qrHelper");

// ── 1. Create Express app and raw HTTP server ──────────────────────────────
// NETWORKING: We create the HTTP server manually (not app.listen) so that
// Socket.IO can attach to the same TCP socket.
const app    = express();
const server = http.createServer(app);

// ── 2. Attach Socket.IO to the HTTP server ─────────────────────────────────
// NETWORKING: Socket.IO negotiates: polling → WebSocket upgrade.
// cors: "*" allows any LAN IP to connect (fine for local networks).
const io = new Server(server, {
  cors:              { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e6, // 1 MB max per Socket.IO message (signaling only)
  pingTimeout:       20000,
  pingInterval:      10000,
});

// ── 3. Serve static frontend files ────────────────────────────────────────
const FRONTEND = path.join(__dirname, "../../frontend/public");
app.use(express.static(FRONTEND));
app.use(express.json());

// ── 4. Detect the server's LAN IP ─────────────────────────────────────────
// NETWORKING: We enumerate network interfaces and pick the first non-
// loopback IPv4 address.  This is what other LAN devices will connect to.
function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const LAN_IP  = getLanIp();
const BASE_URL = `http://${LAN_IP}:${PORT}`;

// ── 5. REST API endpoints ──────────────────────────────────────────────────

// Returns server metadata (used by frontend to know its own address).
app.get("/api/info", (req, res) => {
  res.json({ ip: LAN_IP, port: PORT, url: BASE_URL });
});

// Generates a QR code for easy mobile pairing.
app.get("/api/qr", async (req, res) => {
  const qr = await generateQR(BASE_URL);
  res.json({ qr, url: BASE_URL });
});

// Catch-all: serve index.html for any unknown route (SPA behaviour).
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND, "index.html"));
});

// ── 6. Socket.IO connection handler ───────────────────────────────────────
// Each browser tab that opens a WebSocket gets its own `socket` object.
io.on("connection", (socket) => {
  console.log(`[SOCKET] New connection: ${socket.id} from ${socket.handshake.address}`);
  // Delegate all event handling to the signaling module.
  registerSignalingHandlers(io, socket);
});

// ── 7. Start listening ─────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       LAN File Transfer Server — RUNNING         ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Local:   http://localhost:${PORT}                  ║`);
  console.log(`║  LAN:     ${BASE_URL.padEnd(38)} ║`);
  console.log("║  Share the LAN URL or scan the QR in the app    ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
});