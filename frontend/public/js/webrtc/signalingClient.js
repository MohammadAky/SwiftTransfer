"use strict";

const SignalingClient = (() => {
  let socket = null;
  let iceServers = [];
  const handlers = {};

  function on(event, cb) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(cb);
  }

  function emit(event, data) {
    if (handlers[event]) handlers[event].forEach((fn) => fn(data));
  }

  function connect() {
    socket = io({ transports: ["websocket"], reconnection: true });

    socket.on("connect", () => {
      socket.emit("register", { id: DeviceIdentity.id, name: DeviceIdentity.name });
      emit("connected");
    });

    socket.on("disconnect", () => emit("disconnected"));
    socket.on("registered", (data) => {
      iceServers = data.iceServers || [];
      emit("registered", data);
    });
    socket.on("peer-list", (peers) => emit("peer-list", peers));

    socket.on("offer", (d) => emit("offer", d));
    socket.on("answer", (d) => emit("answer", d));
    socket.on("ice-candidate", (d) => emit("ice-candidate", d));

    setInterval(() => { if (socket.connected) socket.emit("heartbeat"); }, 5000);
  }

  function sendOffer(to, offer) { socket.emit("offer", { to, offer, from: socket.id }); }
  function sendAnswer(to, answer) { socket.emit("answer", { to, answer }); }
  function sendIceCandidate(to, candidate) { socket.emit("ice-candidate", { to, candidate }); }
  function getIceServers() { return iceServers; }
  function getSocketId() { return socket ? socket.id : null; }

  return { connect, on, sendOffer, sendAnswer, sendIceCandidate, getIceServers, getSocketId };
})();