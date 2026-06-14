// transferUI.js — Renders transfer progress cards and handles file save

"use strict";

const TransferUI = (() => {
  const section = document.getElementById("transfersSection");
  const listEl = document.getElementById("transferList");
  const cards = new Map(); // transferId → DOM refs

  function createCard(transferId, fileName, fileSize, direction, peerName) {
    section.style.display = "flex";

    // Remove any existing card with same id (retry case)
    document.getElementById(`tc-${transferId}`)?.remove();

    const card = document.createElement("div");
    card.className = `transfer-card ${direction}`;
    card.id = `tc-${transferId}`;
    card.innerHTML = `
      <div class="tc-header">
        <div class="tc-icon">${direction === "sending" ? "📤" : "📥"}</div>
        <div class="tc-meta">
          <div class="tc-name">${_esc(fileName)}</div>
          <div class="tc-peer">${direction === "sending" ? "To" : "From"} ${_esc(peerName)} &middot; ${formatBytes(fileSize)}</div>
        </div>
        <div class="tc-status ${direction}">${direction === "sending" ? "Sending…" : "Receiving…"}</div>
      </div>
      <div class="tc-progress-bar">
        <div class="tc-progress-fill" style="width:0%"></div>
      </div>
      <div class="tc-stats">
        <span class="tc-pct">0%</span>
        <span class="tc-speed">Waiting…</span>
        <span class="tc-eta">--:--</span>
      </div>`;

    listEl.prepend(card); // newest on top

    cards.set(transferId, {
      card,
      fillEl: card.querySelector(".tc-progress-fill"),
      statusEl: card.querySelector(".tc-status"),
      pctEl: card.querySelector(".tc-pct"),
      speedEl: card.querySelector(".tc-speed"),
      etaEl: card.querySelector(".tc-eta"),
    });
  }

  function updateProgress(transferId, pct, speed, eta) {
    const c = cards.get(transferId);
    if (!c) return;

    const safePct = Math.min(100, Math.max(0, pct));
    c.fillEl.style.width = safePct.toFixed(1) + "%";
    c.pctEl.textContent = safePct.toFixed(0) + "%";
    c.speedEl.textContent = speed > 0 ? formatBytes(speed) + "/s" : "Calculating…";
    c.etaEl.textContent = speed > 0 ? "ETA " + formatTime(eta) : "";
  }

  function markDone(transferId) {
    const c = cards.get(transferId);
    if (!c) return;
    c.fillEl.style.width = "100%";
    c.fillEl.style.background = "var(--green)";
    c.card.className = "transfer-card done";
    c.statusEl.className = "tc-status done";
    c.statusEl.textContent = "✓ Complete";
    c.pctEl.textContent = "100%";
    c.speedEl.textContent = "";
    c.etaEl.textContent = "Done";
  }

  function markError(transferId, reason) {
    const c = cards.get(transferId);
    if (!c) return;
    c.card.className = "transfer-card error";
    c.statusEl.className = "tc-status error";
    c.statusEl.textContent = "✕ Error";
    c.etaEl.textContent = reason || "Failed";
  }

  function saveFile(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function _esc(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { createCard, updateProgress, markDone, markError, saveFile };
})();
