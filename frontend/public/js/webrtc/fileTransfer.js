// fileTransfer.js — Chunked file sending and receiving over WebRTC DataChannel

"use strict";

const CHUNK_SIZE = 16 * 1024; // 16 KB — safe for all browsers
const MAX_BUFFER = 4 * 1024 * 1024; // 4 MB buffer ceiling

const receiveSessions = new Map();

const callbacks = {
  onProgress: null,
  onComplete: null,
  onError: null,
};

function setCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// ─── SENDER ──────────────────────────────────────────────────────────────────

async function sendFile(transferId, file, remoteId) {
  const dc = getDataChannel(remoteId);
  if (!dc || dc.readyState !== "open") {
    callbacks.onError?.(transferId, "DataChannel not open");
    return;
  }

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // 1. Send metadata first
  dc.send(
    JSON.stringify({
      type: "meta",
      transferId,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    }),
  );

  // 2. Stream chunks
  let chunkIndex = 0;
  let bytesSent = 0;
  let startTime = performance.now();
  let lastReport = performance.now();
  let lastBytes = 0;

  // Report 0% immediately so card shows
  callbacks.onProgress?.(transferId, 0, 0, Infinity, "sending");

  function waitForBuffer() {
    return new Promise((resolve) => {
      if (dc.bufferedAmount <= MAX_BUFFER) {
        resolve();
        return;
      }
      // Poll every 50 ms until buffer drains
      const iv = setInterval(() => {
        if (dc.bufferedAmount <= MAX_BUFFER / 2) {
          clearInterval(iv);
          resolve();
        }
      }, 50);
    });
  }

  async function sendNextChunk() {
    if (chunkIndex >= totalChunks) {
      // 3. Send done signal
      dc.send(JSON.stringify({ type: "done", transferId }));
      callbacks.onProgress?.(transferId, 100, 0, 0, "sending");
      callbacks.onComplete?.(transferId, null, "sending");
      return;
    }

    // Flow control — wait if buffer full
    await waitForBuffer();

    const start = chunkIndex * CHUNK_SIZE;
    const slice = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    const buffer = await slice.arrayBuffer();

    dc.send(buffer);
    bytesSent += buffer.byteLength;
    chunkIndex++;

    // Report progress every 100ms
    const now = performance.now();
    if (now - lastReport >= 100) {
      const elapsed = (now - lastReport) / 1000;
      const bytesWindow = bytesSent - lastBytes;
      const speed = bytesWindow / elapsed; // bytes/sec
      const remaining = file.size - bytesSent;
      const eta = speed > 0 ? remaining / speed : Infinity;
      const pct = (bytesSent / file.size) * 100;

      callbacks.onProgress?.(transferId, pct, speed, eta, "sending");

      lastReport = now;
      lastBytes = bytesSent;
    }

    // Yield to event loop so UI can paint, then send next chunk
    setTimeout(sendNextChunk, 0);
  }

  sendNextChunk();
}

// ─── RECEIVER ─────────────────────────────────────────────────────────────────

function handleIncomingData(remoteId, data) {
  if (typeof data === "string") {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (msg.type === "meta") {
      receiveSessions.set(msg.transferId, {
        meta: msg,
        chunks: [],
        received: 0,
        lastReport: performance.now(),
        lastBytes: 0,
      });
      // Show 0% card immediately
      callbacks.onProgress?.(msg.transferId, 0, 0, Infinity, "receiving");
      console.log(`[RECV] "${msg.name}" ${msg.size} bytes`);
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

  // Binary chunk — find its session (most recently opened)
  for (const [tid, s] of receiveSessions) {
    s.chunks.push(data.slice(0)); // copy the ArrayBuffer
    s.received += data.byteLength;

    const now = performance.now();
    if (now - s.lastReport >= 100) {
      const elapsed = (now - s.lastReport) / 1000;
      const bytesWindow = s.received - s.lastBytes;
      const speed = bytesWindow / elapsed;
      const remaining = s.meta.size - s.received;
      const eta = speed > 0 ? remaining / speed : Infinity;
      const pct = (s.received / s.meta.size) * 100;

      callbacks.onProgress?.(tid, pct, speed, eta, "receiving");

      s.lastReport = now;
      s.lastBytes = s.received;
    }
    break;
  }
}
