const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const translate = require("google-translate-api-x");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

const userLang = {};

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Default language
  userLang[socket.id] = "en";

  // 🌍 Set language
  socket.on("set_language", (lang) => {
    userLang[socket.id] = lang;
  });

  // 💬 Text messages
  socket.on("send_message", async (data) => {
    for (let [id, client] of io.sockets.sockets) {
      const lang = (userLang[id] || "en").split("-")[0];
      try {
        const result = await translate(data.msg, { to: lang });
        client.emit("receive_message", {
          user: data.user,
          msg: result.text,
          original: data.msg,
          lang
        });
      } catch (err) {
        console.error("Translation error:", err);
        client.emit("receive_message", {
          user: data.user,
          msg: data.msg,
          original: data.msg,
          lang
        });
      }
    }
  });

  // 🎙 Voice messages
  socket.on("send_voice", (data) => {
    io.emit("receive_voice", data);
  });

  // 🎞 Subtitles (speech-to-text + translation)
  socket.on("send_subtitle", async (data) => {
    for (let [id, client] of io.sockets.sockets) {
      const lang = (userLang[id] || "en").split("-")[0];
      try {
        const result = await translate(data.text, { to: lang });
        client.emit("receive_subtitle", {
          user: data.user,
          text: result.text,
          original: data.text,
          lang
        });
      } catch (err) {
        console.error("Subtitle translation error:", err);
        client.emit("receive_subtitle", {
          user: data.user,
          text: data.text,
          original: data.text,
          lang
        });
      }
    }
  });

  // 📹 Video call signaling
  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice-candidate", (c) => {
    socket.broadcast.emit("ice-candidate", c);
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    delete userLang[socket.id];
  });
});

server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
