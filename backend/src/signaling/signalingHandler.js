// =============================================================================
// signalingHandler.js — WebRTC Signaling via Socket.IO
// =============================================================================
// NETWORKING: WebRTC requires an out-of-band "signaling channel" to exchange
//   SDP (Session Description Protocol) and ICE candidates before the
//   peer-to-peer DataChannel can open.  This file implements that channel.
//
// Message flow:
//   Peer A                 Server (here)              Peer B
//     |--- offer --------->|--- offer (relayed) ------>|
//     |<-- answer ---------|<-- answer (relayed) -------|
//     |--- ice-candidate ->|--- ice-candidate (relay) ->|
//     |<-- ice-candidate --|<-- ice-candidate (relay) --|
//     |====== DataChannel OPEN — server no longer involved ======|

"use strict";

const registry = require("../discovery/deviceRegistry");
const { ICE_SERVERS } = require("../config");

function registerSignalingHandlers(io, socket) {

  // ── 1. Device registers itself ─────────────────────────────────────────
  // Called immediately after the browser connects.
  socket.on("register", (info) => {
    // Extract the peer's LAN IP from the socket handshake.
    // NETWORKING: socket.handshake.address gives us the TCP remote address.
    const ip = socket.handshake.headers["x-forwarded-for"]
              || socket.handshake.address;

    registry.registerDevice(socket.id, { ...info, ip });

    // Send ICE server config back so the browser knows which STUN to use.
    socket.emit("registered", {
      socketId:   socket.id,
      iceServers: ICE_SERVERS,
    });

    // Broadcast updated peer list to everyone.
    broadcastPeerList(io);
    console.log(`[REGISTRY] ${info.name} joined (${socket.id})`);
  });

  // ── 2. Heartbeat — keeps the device "alive" in the registry ───────────
  socket.on("heartbeat", () => registry.heartbeat(socket.id));

  // ── 3. Request peer list ───────────────────────────────────────────────
  socket.on("get-peers", () => {
    socket.emit("peer-list", registry.getOnlineDevices());
  });

  // ── 4. Relay: WebRTC Offer ─────────────────────────────────────────────
  // NETWORKING: The "caller" creates an SDP offer describing its media/data
  // capabilities and sends it to the "callee" via this relay.
  socket.on("offer", ({ to, offer, from }) => {
    console.log(`[SIGNAL] offer ${socket.id} -> ${to}`);
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  // ── 5. Relay: WebRTC Answer ────────────────────────────────────────────
  // NETWORKING: The callee responds with its own SDP, completing the
  // "SDP handshake" (offer/answer model defined in RFC 3264).
  socket.on("answer", ({ to, answer }) => {
    console.log(`[SIGNAL] answer ${socket.id} -> ${to}`);
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  // ── 6. Relay: ICE Candidate ────────────────────────────────────────────
  // NETWORKING: Each peer trickles ICE candidates (IP:port pairs for
  // different network interfaces) to the other.  The ICE agent tries
  // all pairs and picks the best direct route.
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  // ── 7. File transfer request (signaling only — no file data here) ──────
  socket.on("transfer-request", ({ to, fileInfo }) => {
    const sender = registry.getDevice(socket.id);
    io.to(to).emit("transfer-request", {
      from:     socket.id,
      senderName: sender ? sender.name : "Unknown",
      fileInfo,
    });
  });

  socket.on("transfer-accept", ({ to, transferId }) => {
    io.to(to).emit("transfer-accept", { from: socket.id, transferId });
  });

  socket.on("transfer-reject", ({ to, transferId }) => {
    io.to(to).emit("transfer-reject", { from: socket.id, transferId });
  });

  // ── 8. Disconnect ──────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const dev = registry.getDevice(socket.id);
    if (dev) console.log(`[REGISTRY] ${dev.name} left (${socket.id})`);
    registry.removeDevice(socket.id);
    broadcastPeerList(io);
  });
}

// Emit the live peer list to every connected socket.
function broadcastPeerList(io) {
  io.emit("peer-list", registry.getOnlineDevices());
}

module.exports = { registerSignalingHandlers };