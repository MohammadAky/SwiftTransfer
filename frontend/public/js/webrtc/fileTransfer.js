"use strict";

const CHUNK_SIZE = 16 * 1024;

const receiveSessions = new Map();
const callbacks = { onProgress: null, onComplete: null, onError: null };

function setCallbacks(cbs) { Object.assign(callbacks, cbs); }

async function sendFile(transferId, file, remoteId) {
  const dc = getDataChannel(remoteId);
  if (!dc || dc.readyState !== "open") {
    callbacks.onError?.(transferId, "DataChannel not open");
    return;
  }

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  dc.send(JSON.stringify({
    type: "meta", transferId, name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size, chunkSize: CHUNK_SIZE, totalChunks,
  }));

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const buffer = await file.slice(start, Math.min(start + CHUNK_SIZE, file.size)).arrayBuffer();
    dc.send(buffer);
    callbacks.onProgress?.(transferId, ((i + 1) / totalChunks) * 100, 0, 0, "sending");
  }

  dc.send(JSON.stringify({ type: "done", transferId }));
  callbacks.onComplete?.(transferId, null, "sending");
}

function handleIncomingData(remoteId, data) {
  if (typeof data === "string") {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === "meta") {
      receiveSessions.set(msg.transferId, { meta: msg, chunks: [], received: 0 });
      callbacks.onProgress?.(msg.transferId, 0, 0, 0, "receiving");
    }
    if (msg.type === "done") {
      const s = receiveSessions.get(msg.transferId);
      if (!s) return;
      const blob = new Blob(s.chunks, { type: s.meta.mimeType });
      receiveSessions.delete(msg.transferId);
      callbacks.onComplete?.(msg.transferId, { blob, name: s.meta.name }, "receiving");
    }
    return;
  }

  for (const [tid, s] of receiveSessions) {
    s.chunks.push(data.slice(0));
    s.received += data.byteLength;
    const pct = (s.received / s.meta.size) * 100;
    callbacks.onProgress?.(tid, pct, 0, 0, "receiving");
    break;
  }
}