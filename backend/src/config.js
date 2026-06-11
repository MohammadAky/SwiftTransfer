"use strict";

module.exports = {
  PORT: process.env.PORT || 9000,
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  HEARTBEAT_INTERVAL: 5000,
  PEER_TIMEOUT: 15000,
};