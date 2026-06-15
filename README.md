# LAN Transfer — Browser-based P2P File Transfer

A browser-based LAN file transfer application similar to ShareIt, Zapya, and LocalSend.
Files are sent **peer-to-peer** using **WebRTC DataChannel** — the server is only a
signaling relay and **never touches your files**.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Signaling Server | Node.js + Express + Socket.IO |
| P2P Transport | WebRTC DataChannel (DTLS + SCTP) |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript |
| QR Pairing | `qrcode` npm package |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser on multiple devices on the same LAN
#    http://<YOUR-LAN-IP>:3000
```

## Project Structure

```
lan-transfer-app/
├── backend/
│   └── src/
│       ├── server.js               # Express + Socket.IO entry point
│       ├── config.js               # Central configuration
│       ├── discovery/
│       │   └── deviceRegistry.js  # In-memory peer registry
│       ├── signaling/
│       │   └── signalingHandler.js # WebRTC signaling relay
│       └── utils/
│           └── qrHelper.js         # QR code generation
└── frontend/
    └── public/
        ├── index.html              # SPA shell
        ├── css/style.css           # Dark industrial theme
        └── js/
            ├── app.js              # Main orchestrator
            ├── utils/
            │   ├── helpers.js      # formatBytes, formatTime, etc.
            │   └── deviceId.js     # Persistent device UUID
            ├── webrtc/
            │   ├── signalingClient.js  # Socket.IO signaling
            │   ├── peerConnection.js   # RTCPeerConnection
            │   └── fileTransfer.js     # Chunked send/receive
            └── ui/
                ├── deviceList.js   # Peer list renderer
                ├── transferUI.js   # Progress card renderer
                └── dropZone.js     # Drag-and-drop handler
```

## Networking Architecture

```
Device A (Sender)              Signaling Server              Device B (Receiver)
     |                              |                              |
     |------ Socket.IO connect ---->|<---- Socket.IO connect ------|
     |------ register(name,id) ---->|<---- register(name,id) ------|
     |                              |                              |
     |  [ User selects files + target device and clicks Send ]     |
     |                              |                              |
     |--- transfer-request -------->|--- transfer-request -------->|
     |                              |  [ Accept/Reject modal ]     |
     |<-- transfer-accept ----------|<-- transfer-accept ----------|
     |                              |                              |
     |  [ WebRTC Signaling begins ] |                              |
     |--- SDP Offer -------------->|--- SDP Offer --------------->|
     |<-- SDP Answer --------------|<-- SDP Answer ---------------|
     |--- ICE Candidate ---------->|--- ICE Candidate ----------->|
     |<-- ICE Candidate -----------|<-- ICE Candidate ------------|
     |                              |                              |
     |====== RTCDataChannel OPEN (Direct P2P — server uninvolved) ======|
     |                                                             |
     |===== File chunks (64 KB each) =============================>|
     |===== File chunks ============================================>|
     |                                                             |
     [ Download triggered automatically on receiver ]
```

## Phases

| Phase | Feature |
|-------|---------|
| 1 | Server setup — Express + Socket.IO |
| 2 | Device discovery — registry + heartbeat |
| 3 | Signaling — SDP offer/answer/ICE relay |
| 4 | WebRTC DataChannel establishment |
| 5 | Chunked file transfer engine |
| 6 | Flow control + speed/ETA display |
| 7 | QR pairing + drag-and-drop + multi-file |