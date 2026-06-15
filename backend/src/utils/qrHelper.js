// =============================================================================
// qrHelper.js — QR Code generation for easy mobile pairing
// =============================================================================
// Generates a QR code PNG as a base-64 data-URL that the frontend
// can display in an <img> tag.  The QR encodes the server URL so
// any device on the LAN can scan and join without typing an IP.

"use strict";

const QRCode = require("qrcode");

async function generateQR(url) {
  try {
    // toDataURL returns "data:image/png;base64,..."
    const dataUrl = await QRCode.toDataURL(url, {
      width:          256,
      margin:         2,
      color: {
        dark:  "#0f172a",  // Navy dots
        light: "#f8fafc",  // Off-white background
      },
    });
    return dataUrl;
  } catch (err) {
    console.error("[QR] Failed to generate QR code:", err);
    return null;
  }
}

module.exports = { generateQR };