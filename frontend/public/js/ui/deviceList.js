export function renderDevices(devices, selectedDeviceId) {
  const container = document.getElementById("deviceList");

  container.innerHTML = "";

  devices.forEach((device) => {
    const item = document.createElement("div");

    item.className = "device-item";

    item.textContent = device.name;

    item.dataset.id = device.id;

    if (device.id === selectedDeviceId) {
      item.classList.add("selected");
    }

    container.appendChild(item);
  });
}
