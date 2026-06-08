export function getDeviceName() {
  let name = localStorage.getItem("deviceName");

  if (!name) {
    name = "Chrome Device";

    localStorage.setItem("deviceName", name);
  }

  return name;
}

export function saveDeviceName(name) {
  localStorage.setItem("deviceName", name);
}
