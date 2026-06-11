// =============================================================================
// deviceRegistry.js — In-memory store of all currently online devices
// =============================================================================
// NETWORKING: In peer-to-peer discovery on a LAN, devices normally
// broadcast their presence via UDP multicast (mDNS / Bonjour).
// Because we are browser-based we cannot use raw UDP, so our
// Socket.IO server acts as the "discovery hub" instead.
// Every connected browser registers here and receives the full peer list.

"use strict";

const { PEER_TIMEOUT } = require("../config");

// Map<socketId, DeviceInfo>
// DeviceInfo = { id, name, socketId, ip, joinedAt, lastSeen }
const devices = new Map();

// ── Register or refresh a device ──────────────────────────────────────────
function registerDevice(socketId, info) {
  devices.set(socketId, {
    id:        info.id,          // UUID generated in the browser (persistent)
    name:      info.name,        // Human-readable name ("Alice's Laptop")
    socketId:  socketId,         // Current Socket.IO connection ID
    ip:        info.ip,          // LAN IP extracted server-side
    joinedAt:  Date.now(),
    lastSeen:  Date.now(),
  });
}

// ── Heartbeat: update lastSeen so we know the peer is still alive ─────────
function heartbeat(socketId) {
  const device = devices.get(socketId);
  if (device) device.lastSeen = Date.now();
}

// ── Remove a device when its socket disconnects ───────────────────────────
function removeDevice(socketId) {
  devices.delete(socketId);
}

// ── Return all devices that have sent a heartbeat recently ────────────────
function getOnlineDevices() {
  const cutoff = Date.now() - PEER_TIMEOUT;
  const online = [];
  for (const [, dev] of devices) {
    if (dev.lastSeen >= cutoff) online.push(dev);
  }
  return online;
}

// ── Look up a single device by socket ID ─────────────────────────────────
function getDevice(socketId) {
  return devices.get(socketId) || null;
}

module.exports = { registerDevice, heartbeat, removeDevice, getOnlineDevices, getDevice };