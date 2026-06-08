function getDefaultDeviceName() {
  const ua = navigator.userAgent;

  if (ua.includes("Android")) return "Android Device";

  if (ua.includes("iPhone")) return "iPhone";

  if (ua.includes("Windows")) return "Windows PC";

  if (ua.includes("Mac")) return "Mac Device";

  return "Browser Device";
}

export function getDeviceName() {
  let name = localStorage.getItem("deviceName");

  if (!name) {
    name = getDefaultDeviceName();

    localStorage.setItem("deviceName", name);
  }

  return name;
}

function saveDeviceName(name) {
  localStorage.setItem("deviceName", name);
}

window.DeviceId = {
  getDeviceName,
  saveDeviceName,
};
