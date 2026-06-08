const devices = new Map();

function addDevice(id, name) {
  devices.set(id, { id, name });
}

function removeDevice(id) {
  devices.delete(id);
}

function renameDevice(id, name) {
  const device = devices.get(id);

  if (device) {
    device.name = name;
  }
}

function getDevices() {
  return Array.from(devices.values());
}

module.exports = {
  addDevice,
  removeDevice,
  renameDevice,
  getDevices,
};
