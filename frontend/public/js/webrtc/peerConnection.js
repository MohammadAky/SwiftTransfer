// =============================================================================
// peerConnection.js — RTCPeerConnection lifecycle management
// =============================================================================
// NETWORKING: RTCPeerConnection is the browser API that:
//   1. Gathers ICE candidates (your potential network addresses).
//   2. Performs the DTLS handshake (encrypts the DataChannel).
//   3. Opens a SCTP stream (the DataChannel transport).
// All data that flows through DataChannel is end-to-end encrypted by DTLS.

"use strict";

// Map<peerSocketId, RTCPeerConnection>
const peerConnections = new Map();

// Map<peerSocketId, RTCDataChannel>
const dataChannels = new Map();

// callbacks registered by fileTransfer.js
const dcHandlers = { open: [], message: [], close: [] };

function onDataChannelEvent(event, cb) {
  dcHandlers[event].push(cb);
}

// ── createConnection() ────────────────────────────────────────────────────
// Creates (or returns) the RTCPeerConnection for a given remote socket ID.
function createConnection(remoteId) {
  if (peerConnections.has(remoteId)) return peerConnections.get(remoteId);

  // NETWORKING: RTCPeerConnection is configured with STUN servers so it
  // can determine our public-facing address for ICE candidate gathering.
  const pc = new RTCPeerConnection({
    iceServers: SignalingClient.getIceServers(),
    // BundlePolicy: use a single ICE component for all media/data tracks.
    bundlePolicy: "max-bundle",
    // iceTransportPolicy: "all" means try both relay (TURN) and direct.
    iceTransportPolicy: "all",
  });

  peerConnections.set(remoteId, pc);

  // ── ICE candidate trickle ──────────────────────────────────────────────
  // NETWORKING: As the browser discovers its network addresses (host,
  // server-reflexive via STUN, relayed via TURN), it fires this event.
  // We forward each candidate to the remote peer via our signaling server.
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      SignalingClient.sendIceCandidate(remoteId, candidate);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[ICE] ${remoteId} → ${pc.iceConnectionState}`);
    if (pc.iceConnectionState === "failed") {
      pc.restartIce(); // Attempt ICE restart before giving up
    }
  };

  // ── Remote DataChannel (callee side) ─────────────────────────────────
  // NETWORKING: When the caller creates a DataChannel, the callee receives
  // it here.  We configure it identically to the sender's channel.
  pc.ondatachannel = ({ channel }) => {
    console.log(`[DC] Remote channel opened from ${remoteId}`);
    _setupDataChannel(channel, remoteId);
  };

  return pc;
}

// ── createDataChannel() — called by the CALLER (sender) ─────────────────
// NETWORKING: The caller creates the DataChannel before setting the offer.
// This is what triggers the SDP to include a data channel application.
function createDataChannel(remoteId) {
  const pc = createConnection(remoteId);
  if (dataChannels.has(remoteId)) return dataChannels.get(remoteId);

  // ordered: true → SCTP will retransmit lost chunks (like TCP, not UDP)
  // This is critical for file integrity.
  const dc = pc.createDataChannel("file-transfer", { ordered: true });
  dc.binaryType = "arraybuffer"; // Receive chunks as ArrayBuffer not Blob
  _setupDataChannel(dc, remoteId);
  return dc;
}

// ── _setupDataChannel() — wire up events ─────────────────────────────────
function _setupDataChannel(dc, remoteId) {
  dataChannels.set(remoteId, dc);
  dc.binaryType = "arraybuffer";

  dc.onopen = () => {
    console.log(`[DC] Channel OPEN with ${remoteId}`);
    dcHandlers.open.forEach((fn) => fn({ remoteId, channel: dc }));
  };
  dc.onmessage = ({ data }) => {
    dcHandlers.message.forEach((fn) => fn({ remoteId, data }));
  };
  dc.onclose = () => {
    console.log(`[DC] Channel CLOSED with ${remoteId}`);
    dataChannels.delete(remoteId);
    dcHandlers.close.forEach((fn) => fn({ remoteId }));
  };
  dc.onerror = (err) => console.error("[DC] Error:", err);
}

// ── createOffer() — Caller: create and set local SDP offer ───────────────
// NETWORKING: SDP = Session Description Protocol.  It describes the media
// and data capabilities of this peer (codecs, network params, …).
async function createOffer(remoteId) {
  const pc = createConnection(remoteId);
  createDataChannel(remoteId); // ensure DC is in the SDP

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  SignalingClient.sendOffer(remoteId, offer);
  console.log(`[SDP] Offer sent to ${remoteId}`);
}

// ── handleOffer() — Callee: receive offer, create answer ─────────────────
async function handleOffer(remoteId, offer) {
  const pc = createConnection(remoteId);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  SignalingClient.sendAnswer(remoteId, answer);
  console.log(`[SDP] Answer sent to ${remoteId}`);
}

// ── handleAnswer() — Caller: finalise connection ─────────────────────────
async function handleAnswer(remoteId, answer) {
  const pc = peerConnections.get(remoteId);
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

// ── handleIceCandidate() — add remote candidate to our ICE agent ──────────
async function handleIceCandidate(remoteId, candidate) {
  const pc = peerConnections.get(remoteId);
  if (pc && candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("[ICE] addIceCandidate error:", e);
    }
  }
}

// ── getDataChannel() ─────────────────────────────────────────────────────
function getDataChannel(remoteId) {
  return dataChannels.get(remoteId) || null;
}

// ── closeConnection() ────────────────────────────────────────────────────
function closeConnection(remoteId) {
  dataChannels.get(remoteId)?.close();
  peerConnections.get(remoteId)?.close();
  dataChannels.delete(remoteId);
  peerConnections.delete(remoteId);
}
