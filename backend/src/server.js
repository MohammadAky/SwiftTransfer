const express = require("express");
const path = require("path");
const http = require("http");

const { Server } = require("socket.io");

const setupSignaling = require("./signaling/signalingHandler");

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.use(express.static(path.join(__dirname, "../../frontend/public")));

setupSignaling(io);

server.listen(3000, () => {
  console.log("SwiftTransfer running on port 3000");
});
