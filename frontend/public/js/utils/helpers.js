"use strict";

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