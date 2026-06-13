"use strict";

let mySocketId = null;
let pendingRequest = null;
let _pendingSendFiles = [];
let _pendingSendTarget = null;
let _pendingSendMeta = [];

const nameInput = document.getElementById("deviceNameInput");
nameInput.value = DeviceIdentity.name;
nameInput.addEventListener("change", () => {
  DeviceIdentity.setName(nameInput.value);
  notify("Device name updated", "success", 2000);
});

async function loadServerInfo() {
  try {
    const info = await fetch("/api/info").then((r) => r.json());
    document.getElementById("serverUrl").textContent = info.url;
    document.getElementById("infoIp").textContent = info.ip;
    document.getElementById("infoUrl").textContent = info.url;
    document.getElementById("infoDeviceId").textContent = DeviceIdentity.id.slice(0, 18) + "…";
  } catch (e) { console.error("[APP] Server info error:", e); }
}
loadServerInfo();

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
SignalingClient.on("registered", (data) => { mySocketId = data.socketId; });
SignalingClient.on("peer-list", (peers) => { DeviceListUI.render(peers, mySocketId); });

SignalingClient.on("offer", async ({ from, offer }) => { await handleOffer(from, offer); });
SignalingClient.on("answer", async ({ from, answer }) => { await handleAnswer(from, answer); });
SignalingClient.on("ice-candidate", async ({ from, candidate }) => { await handleIceCandidate(from, candidate); });

SignalingClient.on("transfer-request", ({ from, senderName, fileInfo }) => {
  pendingRequest = { from, fileInfo };
  const names = fileInfo.map((f) => `"${f.name}"`).join(", ");
  document.getElementById("modalIncomingDesc").textContent =
    `${senderName} wants to send: ${names}`;
  document.getElementById("modalIncoming").style.display = "flex";
});

document.getElementById("btnAccept").addEventListener("click", () => {
  document.getElementById("modalIncoming").style.display = "none";
  if (!pendingRequest) return;
  SignalingClient.sendTransferAccept(pendingRequest.from, pendingRequest.from);
  pendingRequest = null;
});

document.getElementById("btnReject").addEventListener("click", () => {
  document.getElementById("modalIncoming").style.display = "none";
  if (pendingRequest) {
    SignalingClient.sendTransferReject(pendingRequest.from, pendingRequest.from);
    pendingRequest = null;
  }
});

SignalingClient.on("transfer-accept", async ({ from }) => { await createOffer(from); });

onDataChannelEvent("open", ({ remoteId }) => { _startPendingSend(remoteId); });
onDataChannelEvent("message", ({ remoteId, data }) => { handleIncomingData(remoteId, data); });

setCallbacks({
  onProgress: (id, pct) => console.log(`[${id}] ${pct.toFixed(0)}%`),
  onComplete: (id, result, dir) => {
    if (dir === "receiving" && result) {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.name;
      a.click();
      notify(`Received: ${result.name}`, "success");
    } else {
      notify("Transfer complete", "success");
    }
  },
  onError: (id, err) => notify("Transfer error: " + err, "error"),
});

document.getElementById("btnSend").addEventListener("click", () => {
  const files = [...document.getElementById("fileInput").files];
  const target = DeviceListUI.getSelected();
  if (!files.length) { notify("No files selected", "error"); return; }
  if (!target.id) { notify("No device selected", "error"); return; }

  _pendingSendMeta = files.map((f) => ({
    transferId: Math.random().toString(36).slice(2, 9),
    name: f.name, size: f.size, mimeType: f.type || "application/octet-stream",
  }));
  _pendingSendFiles = files;
  _pendingSendTarget = target.id;
  SignalingClient.sendTransferRequest(target.id, _pendingSendMeta);
  notify(`Requesting transfer to ${target.name}…`, "info");
});

async function _startPendingSend(remoteId) {
  if (!_pendingSendFiles.length || remoteId !== _pendingSendTarget) return;
  const files = [..._pendingSendFiles];
  const meta = [..._pendingSendMeta];
  _pendingSendFiles = []; _pendingSendTarget = null; _pendingSendMeta = [];
  for (let i = 0; i < files.length; i++) {
    await sendFile(meta[i].transferId, files[i], remoteId);
  }
}