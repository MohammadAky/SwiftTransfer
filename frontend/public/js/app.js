import { socket } from "./webrtc/signalingClient.js";
import { getDeviceName } from "./utils/deviceId.js";
import { renderDevices } from "./ui/deviceList.js";

const myDeviceName = getDeviceName();

function updateLocalName() {
  const nameElement = document.getElementById("myDeviceName");
  if (nameElement) {
    nameElement.textContent = myDeviceName;
  }
}

socket.on("connect", () => {
  socket.emit("register-device", {
    name: myDeviceName,
  });
});

socket.on("devices", (devices) => {
  renderDevices(devices);
});

updateLocalName();
