// =============================================================================
// config.js — Central configuration for the LAN Transfer Server
// =============================================================================
// All tunable parameters live here so you never hunt through multiple files.

"use strict";

module.exports = {
  // ── Server ──────────────────────────────────────────────────────────────
  PORT: process.env.PORT || 9000,

  // ── WebRTC ICE / STUN configuration ─────────────────────────────────────
  // NETWORKING: ICE (Interactive Connectivity Establishment) is the protocol
  // that finds the best network path between two peers.  STUN servers tell
  // each peer "your public IP looks like X:port" so they can exchange that
  // information during signaling.  On a LAN the peers usually connect via
  // their private IPs (host candidates) without needing STUN at all.
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],

  // ── File Transfer ────────────────────────────────────────────────────────
  // CHUNK_SIZE: WebRTC DataChannel works best with chunks ≤ 16 KB by spec,
  // but modern browsers support up to 256 KB.  64 KB is a safe sweet-spot
  // that maximises throughput without triggering buffering issues.
  CHUNK_SIZE: 64 * 1024, // 64 KB per chunk

  // Maximum bytes allowed in the DataChannel send-buffer before we pause.
  // NETWORKING: TCP has flow-control built-in; WebRTC SCTP (used by
  // DataChannel) also has a send-buffer — we must respect it manually.
  MAX_BUFFER_SIZE: 16 * 1024 * 1024, // 16 MB

  // ── Discovery ────────────────────────────────────────────────────────────
  // How often (ms) peers broadcast their presence on the signaling server.
  HEARTBEAT_INTERVAL: 5000,

  // Peers not seen within this window are considered offline.
  PEER_TIMEOUT: 15000,
};
