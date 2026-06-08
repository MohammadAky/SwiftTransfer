const {
  addDevice,
  removeDevice,
  renameDevice,
  getDevices,
} = require("../discovery/deviceRegistry");

function setupSignaling(io) {
  function broadcastDevices() {
    io.emit("devices", getDevices());
  }

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("register-device", (data) => {
      addDevice(socket.id, data.name);

      broadcastDevices();
    });

    socket.on("rename-device", (data) => {
      renameDevice(socket.id, data.name);

      broadcastDevices();
    });

    socket.on("connect-request", (targetId) => {
      io.to(targetId).emit("incoming-request", {
        from: socket.id,
      });
    });

    socket.on("disconnect", () => {
      removeDevice(socket.id);

      broadcastDevices();

      console.log("Disconnected:", socket.id);
    });
  });
}

module.exports = setupSignaling;
