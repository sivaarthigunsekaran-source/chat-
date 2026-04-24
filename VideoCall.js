import React, { useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function VideoCall() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peer, setPeer] = useState(null);

  // 🔗 Create peer connection
  function createPeer(stream) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        }
      ]
    });

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = e => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = e => {
      if (e.candidate) socket.emit("ice-candidate", e.candidate);
    };

    setPeer(pc);
    return pc;
  }

  // 📞 Start call
  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log("✅ Got local stream:", stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeer(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", offer);
    } catch (err) {
      console.error("❌ Camera error:", err);
      alert("Camera access failed: " + err.message);
    }
  }

  // 🛑 End call
  function endCall() {
    if (peer) peer.close();
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
      localVideoRef.current.srcObject = null;
    }
    setPeer(null);
  }

  // 🔔 Socket listeners
  socket.on("offer", async (offer) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeer(stream);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", answer);
    } catch (err) {
      console.error("❌ Camera error (answer side):", err);
    }
  });

  socket.on("answer", async (answer) => {
    if (peer) await peer.setRemoteDescription(answer);
  });

  socket.on("ice-candidate", async (c) => {
    try {
      if (peer) await peer.addIceCandidate(c);
    } catch (err) {
      console.error("ICE error:", err);
    }
  });

  return (
    <div style={{ textAlign: "center", background: "black", padding: "10px" }}>
      <video ref={localVideoRef} autoPlay muted playsInline width="45%" />
      <video ref={remoteVideoRef} autoPlay playsInline width="45%" />
      <div>
        <button onClick={startCall}>Start</button>
        <button onClick={endCall}>End</button>
      </div>
    </div>
  );
}
