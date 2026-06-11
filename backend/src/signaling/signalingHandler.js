"use strict";

const registry = require("../discovery/deviceRegistry");

function registerSignalingHandlers(io, socket) {
  socket.on("register", (info) => {
    const ip = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
    registry.registerDevice(socket.id, { ...info, ip });
    socket.emit("registered", { socketId: socket.id });
    io.emit("peer-list", registry.getOnlineDevices());
    console.log(`[REGISTRY] ${info.name} joined (${socket.id})`);
  });

  socket.on("heartbeat", () => registry.heartbeat(socket.id));

  socket.on("get-peers", () => {
    socket.emit("peer-list", registry.getOnlineDevices());
  });

  socket.on("disconnect", () => {
    const dev = registry.getDevice(socket.id);
    if (dev) console.log(`[REGISTRY] ${dev.name} left (${socket.id})`);
    registry.removeDevice(socket.id);
    io.emit("peer-list", registry.getOnlineDevices());
  });
}

module.exports = { registerSignalingHandlers };