"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const os = require("os");
const { PORT } = require("./config");
const { registerSignalingHandlers } = require("./signaling/signalingHandler");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 20000,
  pingInterval: 10000,
});

const FRONTEND = path.join(__dirname, "../../frontend/public");
app.use(express.static(FRONTEND));
app.use(express.json());

function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "127.0.0.1";
}

const LAN_IP = getLanIp();
const BASE_URL = `http://${LAN_IP}:${PORT}`;

app.get("/api/info", (req, res) => {
  res.json({ ip: LAN_IP, port: PORT, url: BASE_URL });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND, "index.html"));
});

io.on("connection", (socket) => {
  console.log(`[SOCKET] connected: ${socket.id}`);
  registerSignalingHandlers(io, socket);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LAN Transfer server running at ${BASE_URL}`);
});