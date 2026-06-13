"use strict";

module.exports = {
  PORT: process.env.PORT || 9000,
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  CHUNK_SIZE: 64 * 1024,
  MAX_BUFFER_SIZE: 16 * 1024 * 1024,
  HEARTBEAT_INTERVAL: 5000,
  PEER_TIMEOUT: 15000,
};