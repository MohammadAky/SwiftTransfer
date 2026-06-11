// =============================================================================
// deviceList.js — Renders the sidebar list of discovered LAN peers
// =============================================================================

"use strict";

let selectedPeerId   = null;   // socket ID of selected target
let selectedPeerName = "";

const DeviceListUI = (() => {

  const listEl   = document.getElementById("deviceList");
  const countEl  = document.getElementById("peerCount");

  // ── render(): Diff the DOM against the live peer list ─────────────────
  function render(peers, mySocketId) {
    // Filter out ourselves
    const others = peers.filter(p => p.socketId !== mySocketId);
    countEl.textContent = others.length;

    listEl.innerHTML = "";

    if (others.length === 0) {
      listEl.innerHTML = `
        <li class="device-item device-empty">
          <div class="empty-icon">📡</div>
          <p>No devices found</p>
          <small>Open this app on another device on the same Wi-Fi or LAN</small>
        </li>`;
      selectedPeerId = null;
      updateSendButton();
      return;
    }

    others.forEach(peer => {
      const li = document.createElement("li");
      li.className = "device-item" + (peer.socketId === selectedPeerId ? " active" : "");
      li.dataset.id = peer.socketId;
      li.innerHTML = `
        <div class="device-avatar">${_initial(peer.name)}</div>
        <div class="device-info">
          <div class="device-name">${_esc(peer.name)}</div>
          <div class="device-ip">${peer.ip || "LAN"}</div>
        </div>
        <div class="device-ping">LAN</div>`;
      li.addEventListener("click", () => selectPeer(peer.socketId, peer.name));
      listEl.appendChild(li);
    });
  }

  function selectPeer(socketId, name) {
    selectedPeerId   = socketId;
    selectedPeerName = name;
    // Update active state
    document.querySelectorAll(".device-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === socketId);
    });
    updateSendButton();
    notify(`Selected: ${name}`, "info", 2000);
  }

  function updateSendButton() {
    const btn    = document.getElementById("btnSend");
    const target = document.getElementById("targetDeviceName");
    if (btn) {
      btn.disabled = !selectedPeerId;
      if (target) target.textContent = selectedPeerName || "—";
    }
  }

  function getSelected() { return { id: selectedPeerId, name: selectedPeerName }; }

  function _initial(name) {
    return (name || "?")[0].toUpperCase();
  }

  function _esc(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  return { render, selectPeer, getSelected };
})();