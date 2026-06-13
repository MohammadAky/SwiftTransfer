// =============================================================================
// signalingClient.js — Socket.IO client for WebRTC signaling
// =============================================================================
// NETWORKING: This module connects to the Socket.IO signaling server.
// It is the "post office" that delivers SDP offers/answers and ICE
// candidates between peers.  No file bytes ever travel through here.

"use strict";

const SignalingClient = (() => {

  let socket = null;
  let iceServers = [];
  const handlers = {};  // event-name → [callback, …]

  // ── on(): Register an event handler ────────────────────────────────────
  function on(event, cb) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(cb);
  }

  function emit(event, data) {
    if (handlers[event]) handlers[event].forEach(fn => fn(data));
  }

  // ── connect(): Open Socket.IO connection to our server ─────────────────
  function connect() {
    // NETWORKING: io() without arguments connects to the page's origin.
    // Socket.IO upgrades HTTP → WebSocket automatically.
    socket = io({ transports: ["websocket"], reconnection: true });

    // ── Connection events ────────────────────────────────────────────────
    socket.on("connect", () => {
      console.log("[SIGNAL] Connected, socket:", socket.id);
      // Register this device on the server
      socket.emit("register", {
        id:   DeviceIdentity.id,
        name: DeviceIdentity.name,
      });
      emit("connected");
    });

    socket.on("disconnect", () => {
      console.log("[SIGNAL] Disconnected");
      emit("disconnected");
    });

    socket.on("registered", (data) => {
      iceServers = data.iceServers || [];
      console.log("[SIGNAL] Registered as", data.socketId);
      emit("registered", data);
    });

    socket.on("peer-list", (peers) => {
      emit("peer-list", peers);
    });

    // ── WebRTC signaling relay events ─────────────────────────────────
    socket.on("offer",         d => emit("offer", d));
    socket.on("answer",        d => emit("answer", d));
    socket.on("ice-candidate", d => emit("ice-candidate", d));

    // ── File transfer negotiation ─────────────────────────────────────
    socket.on("transfer-request", d => emit("transfer-request", d));
    socket.on("transfer-accept",  d => emit("transfer-accept", d));
    socket.on("transfer-reject",  d => emit("transfer-reject", d));

    // ── Keep-alive heartbeat ──────────────────────────────────────────
    // NETWORKING: We send a heartbeat so the server knows we are still
    // alive even if no data has been exchanged for a while.
    setInterval(() => { if (socket.connected) socket.emit("heartbeat"); }, 5000);
  }

  // ── Public send helpers ───────────────────────────────────────────────
  function sendOffer(to, offer)           { socket.emit("offer",         { to, offer, from: socket.id }); }
  function sendAnswer(to, answer)         { socket.emit("answer",        { to, answer }); }
  function sendIceCandidate(to, candidate){ socket.emit("ice-candidate", { to, candidate }); }
  function sendTransferRequest(to, info)  { socket.emit("transfer-request", { to, fileInfo: info }); }
  function sendTransferAccept(to, id)     { socket.emit("transfer-accept",  { to, transferId: id }); }
  function sendTransferReject(to, id)     { socket.emit("transfer-reject",  { to, transferId: id }); }
  function requestPeerList()              { socket.emit("get-peers"); }
  function getIceServers()                { return iceServers; }
  function getSocketId()                  { return socket ? socket.id : null; }

  return { connect, on, sendOffer, sendAnswer, sendIceCandidate,
           sendTransferRequest, sendTransferAccept, sendTransferReject,
           requestPeerList, getIceServers, getSocketId };
})();