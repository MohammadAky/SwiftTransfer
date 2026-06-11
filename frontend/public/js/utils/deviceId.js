// =============================================================================
// deviceId.js — Persistent device identity
// =============================================================================
// CONCEPT: Each browser generates a UUID once and stores it in localStorage
// so the same device is recognised across page reloads (like ShareIt device
// IDs).  The name is editable and also persisted.

"use strict";

const STORAGE_KEY_ID = "lantransfer_device_id";
const STORAGE_KEY_NAME = "lantransfer_device_name";

// Crypto-grade UUID v4 (uses browser Web Crypto API when available)
function generateUUID() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Default name: "Chrome on Windows", "Firefox on Mac", etc.
function defaultDeviceName() {
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  return `${browser} Device`;
}

const DeviceIdentity = {
  id:
    localStorage.getItem(STORAGE_KEY_ID) ||
    (() => {
      const id = generateUUID();
      localStorage.setItem(STORAGE_KEY_ID, id);
      return id;
    })(),
  name: localStorage.getItem(STORAGE_KEY_NAME) || defaultDeviceName(),

  setName(n) {
    this.name = n.trim() || defaultDeviceName();
    localStorage.setItem(STORAGE_KEY_NAME, this.name);
  },
};
