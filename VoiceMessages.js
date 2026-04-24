// 🎙 Playback voice messages
socket.on("receive_voice", (data) => {
  const div = document.createElement("div");
  div.className = data.user === user.value ? "message sent" : "message received";
  div.innerHTML = `<b>${data.user}</b>: 🎙 Voice Message<br>
    <audio controls src="${data.audio}"></audio>`;
  chat.appendChild(div);
});

// 🎙 Record voice messages
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("send_voice", { user: user.value || "Me", audio: reader.result });
    };
    reader.readAsDataURL(audioBlob);
    audioChunks = [];
  };

  mediaRecorder.start(); // records until stopRecording() is called
  console.log("🎙 Recording started...");
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("🛑 Recording stopped.");
  }
}
