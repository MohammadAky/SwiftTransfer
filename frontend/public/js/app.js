import { socket } from "./webrtc/signalingClient.js";

import { getDeviceName } from "./utils/deviceId.js";

const myDeviceName = getDeviceName();

socket.emit("register-device", {
  name: myDeviceName,
});

socket.on("devices", (devices) => {
  console.log(devices);
});
