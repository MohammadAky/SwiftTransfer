// app.js — Main application orchestrator

"use strict";

let mySocketId = null;
let pendingRequest = null;

// Pending send state
let _pendingSendFiles = [];
let _pendingSendTarget = null;
let _pendingSendMeta = []; // keeps transferId tied to each File

// ── Device name ──────────────────────────────────────────────────────────────
const nameInput = document.getElementById("deviceNameInput");
nameInput.value = DeviceIdentity.name;
nameInput.addEventListener("change", () => {
  DeviceIdentity.setName(nameInput.value);
  notify("Device name updated", "success", 2000);
});

// ── Server info + QR ─────────────────────────────────────────────────────────
async function loadServerInfo() {
  try {
    const [info, qr] = await Promise.all([
      fetch("/api/info").then((r) => r.json()),
      fetch("/api/qr").then((r) => r.json()),
    ]);
    document.getElementById("serverUrl").textContent = info.url;
    document.getElementById("infoIp").textContent = info.ip;
    document.getElementById("infoUrl").textContent = info.url;
    document.getElementById("infoDeviceId").textContent = DeviceIdentity.id.slice(0, 18) + "…";

    const qrImg = document.getElementById("qrImage");
    qrImg.src = qr.qr;
    qrImg.style.display = "block";
    document.getElementById("qrLoading").style.display = "none";

    document.getElementById("qrModalImage").src = qr.qr;
    document.getElementById("qrModalUrl").textContent = qr.url;
  } catch (e) {
    console.error("[APP] Server info error:", e);
  }
}
loadServerInfo();

// ── QR modal ─────────────────────────────────────────────────────────────────
document
  .getElementById("btnQr")
  .addEventListener("click", () => (document.getElementById("modalQr").style.display = "flex"));
document
  .getElementById("btnCloseQr")
  .addEventListener("click", () => (document.getElementById("modalQr").style.display = "none"));

// ── Signaling ─────────────────────────────────────────────────────────────────
SignalingClient.connect();

SignalingClient.on("connected", () => {
  document.getElementById("statusDot").className = "status-dot online";
  document.getElementById("statusText").textContent = "Connected";
});
SignalingClient.on("disconnected", () => {
  document.getElementById("statusDot").className = "status-dot offline";
  document.getElementById("statusText").textContent = "Disconnected";
  mySocketId = null;
});
SignalingClient.on("registered", (data) => {
  mySocketId = data.socketId;
});
SignalingClient.on("peer-list", (peers) => {
  DeviceListUI.render(peers, mySocketId);
});

// ── WebRTC signaling relay ────────────────────────────────────────────────────
SignalingClient.on("offer", async ({ from, offer }) => {
  await handleOffer(from, offer);
});
SignalingClient.on("answer", async ({ from, answer }) => {
  await handleAnswer(from, answer);
});
SignalingClient.on("ice-candidate", async ({ from, candidate }) => {
  await handleIceCandidate(from, candidate);
});

// ── Incoming transfer request ─────────────────────────────────────────────────
SignalingClient.on("transfer-request", ({ from, senderName, fileInfo }) => {
  pendingRequest = { from, fileInfo };

  const names = fileInfo.map((f) => `"${f.name}"`).join(", ");
  const total = fileInfo.reduce((s, f) => s + f.size, 0);
  document.getElementById("modalIncomingDesc").textContent =
    `${senderName} wants to send you ${fileInfo.length} file(s): ${names} (${formatBytes(total)})`;

  document.getElementById("modalIncoming").style.display = "flex";
});

document.getElementById("btnAccept").addEventListener("click", () => {
  document.getElementById("modalIncoming").style.display = "none";
  if (!pendingRequest) return;
  const { from, fileInfo } = pendingRequest;

  // Create receiving cards NOW before data arrives
  fileInfo.forEach((fi) => {
    TransferUI.createCard(fi.transferId, fi.name, fi.size, "receiving", "Sender");
  });

  SignalingClient.sendTransferAccept(from, from);
  pendingRequest = null;
});

document.getElementById("btnReject").addEventListener("click", () => {
  document.getElementById("modalIncoming").style.display = "none";
  if (pendingRequest) {
    SignalingClient.sendTransferReject(pendingRequest.from, pendingRequest.from);
    pendingRequest = null;
  }
});

// Caller: receiver accepted → initiate WebRTC
SignalingClient.on("transfer-accept", async ({ from }) => {
  console.log("[APP] Accepted by", from);
  await createOffer(from);
});
SignalingClient.on("transfer-reject", () => {
  notify("Transfer declined by remote device", "error");
  _pendingSendFiles = [];
  _pendingSendTarget = null;
  _pendingSendMeta = [];
});

// ── DataChannel events ────────────────────────────────────────────────────────
onDataChannelEvent("open", ({ remoteId }) => {
  console.log("[APP] DataChannel OPEN with", remoteId);
  _startPendingSend(remoteId);
});

onDataChannelEvent("message", ({ remoteId, data }) => {
  handleIncomingData(remoteId, data);
});

// ── File transfer callbacks ───────────────────────────────────────────────────
setCallbacks({
  onProgress: (transferId, pct, speed, eta, direction) => {
    TransferUI.updateProgress(transferId, pct, speed, eta);
  },
  onComplete: (transferId, result, direction) => {
    TransferUI.markDone(transferId);
    if (direction === "receiving" && result) {
      TransferUI.saveFile(result.blob, result.name);
      notify(`✓ Received: ${result.name}`, "success");
    } else {
      notify("✓ Transfer complete!", "success");
    }
  },
  onError: (transferId, err) => {
    TransferUI.markError(transferId, err);
    notify("Transfer error: " + err, "error");
  },
});

// ── Send button ───────────────────────────────────────────────────────────────
document.getElementById("btnSend").addEventListener("click", () => {
  const files = DropZoneUI.getFiles();
  const target = DeviceListUI.getSelected();

  if (!files.length) {
    notify("No files selected", "error");
    return;
  }
  if (!target.id) {
    notify("No device selected", "error");
    return;
  }

  // Build metadata — crucially, generate transferId HERE so sender and
  // receiver cards use THE SAME id when cards are created below.
  _pendingSendMeta = files.map((f) => ({
    transferId: shortId(),
    name: f.name,
    size: f.size,
    mimeType: f.type || "application/octet-stream",
  }));

  _pendingSendFiles = files;
  _pendingSendTarget = target.id;

  // Create sending progress cards immediately
  _pendingSendMeta.forEach((fi, i) => {
    TransferUI.createCard(fi.transferId, fi.name, fi.size, "sending", target.name);
  });

  // Request permission from remote device
  SignalingClient.sendTransferRequest(target.id, _pendingSendMeta);
  notify(`Requesting transfer to ${target.name}…`, "info");

  DropZoneUI.clearQueue();
});

// ── Actually send once DataChannel is open ────────────────────────────────────
async function _startPendingSend(remoteId) {
  if (!_pendingSendFiles.length) return;
  if (remoteId !== _pendingSendTarget) return;

  const files = [..._pendingSendFiles];
  const meta = [..._pendingSendMeta];
  _pendingSendFiles = [];
  _pendingSendTarget = null;
  _pendingSendMeta = [];

  for (let i = 0; i < files.length; i++) {
    // Use the transferId that was already shown in the progress card
    await sendFile(meta[i].transferId, files[i], remoteId);
  }
}
