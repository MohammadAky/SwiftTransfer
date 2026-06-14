// =============================================================================
// helpers.js — Pure utility functions (no side-effects)
// =============================================================================

"use strict";

// Format bytes into a human-readable string (KB, MB, GB …)
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

// Format seconds into mm:ss or hh:mm:ss
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Return an emoji icon based on file MIME type or extension
function fileIcon(name, type) {
  if (!type) type = "";
  if (type.startsWith("image/"))       return "🖼️";
  if (type.startsWith("video/"))       return "🎬";
  if (type.startsWith("audio/"))       return "🎵";
  if (type.includes("pdf"))            return "📄";
  if (type.includes("zip") || type.includes("rar") || name.endsWith(".7z")) return "🗜️";
  if (type.includes("word") || name.endsWith(".docx")) return "📝";
  if (type.includes("spreadsheet") || name.endsWith(".xlsx")) return "📊";
  return "📁";
}

// Generate a short random ID (used for transfer session IDs)
function shortId() {
  return Math.random().toString(36).slice(2, 9);
}

// Simple toast notification
function notify(msg, type = "info", duration = 4000) {
  let container = document.querySelector(".notif-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "notif-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = `notif ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}