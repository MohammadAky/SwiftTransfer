// =============================================================================
// dropZone.js — Drag-and-drop + file input handling
// =============================================================================

"use strict";

const DropZoneUI = (() => {
  const zone = document.getElementById("dropZone");
  const input = document.getElementById("fileInput");
  const queueDiv = document.getElementById("fileQueue");
  const queueList = document.getElementById("queueList");
  const btnClear = document.getElementById("btnClearQueue");

  let pendingFiles = []; // File[] waiting to be sent

  // ── Drag-and-drop events ──────────────────────────────────────────────
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    addFiles([...e.dataTransfer.files]);
  });
  zone.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    addFiles([...input.files]);
    input.value = "";
  });

  btnClear.addEventListener("click", clearQueue);

  // ── addFiles(): Push files into the pending queue ─────────────────────
  function addFiles(files) {
    if (!files.length) return;
    pendingFiles.push(...files);
    renderQueue();
  }

  // ── renderQueue(): Show the file list ────────────────────────────────
  function renderQueue() {
    queueList.innerHTML = "";
    pendingFiles.forEach((file, idx) => {
      const li = document.createElement("li");
      li.className = "queue-item";
      li.innerHTML = `
        <span class="queue-icon">${fileIcon(file.name, file.type)}</span>
        <span class="queue-name">${_esc(file.name)}</span>
        <span class="queue-size">${formatBytes(file.size)}</span>
        <button class="queue-remove" data-idx="${idx}">✕</button>`;
      queueList.appendChild(li);
    });

    // Remove individual file
    queueList.querySelectorAll(".queue-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        pendingFiles.splice(idx, 1);
        renderQueue();
      });
    });

    const hasFiles = pendingFiles.length > 0;
    queueDiv.style.display = hasFiles ? "block" : "none";
    zone.classList.toggle("has-files", hasFiles);
  }

  function clearQueue() {
    pendingFiles = [];
    renderQueue();
    zone.classList.remove("has-files");
    queueDiv.style.display = "none";
  }

  function getFiles() {
    return [...pendingFiles];
  }

  function _esc(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  return { addFiles, getFiles, clearQueue };
})();
