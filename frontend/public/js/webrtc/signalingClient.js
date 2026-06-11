"use strict";

const SignalingClient = (() => {
  let socket = null;
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

    socket.on("registered", (data) => emit("registered", data));
    socket.on("peer-list", (peers) => emit("peer-list", peers));

    setInterval(() => { if (socket.connected) socket.emit("heartbeat"); }, 5000);
  }

  function getSocketId() { return socket ? socket.id : null; }

  return { connect, on, getSocketId };
})();