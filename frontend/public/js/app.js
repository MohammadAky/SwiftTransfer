"use strict";

let mySocketId = null;

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
  } catch (e) {
    console.error("[APP] Server info error:", e);
  }
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

onDataChannelEvent("open", ({ remoteId }) => {
  console.log("[APP] DataChannel open with", remoteId);
});