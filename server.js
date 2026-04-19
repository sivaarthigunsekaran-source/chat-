const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const translate = require("google-translate-api-x");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

const userLang = {};

io.on("connection", (socket) => {

  userLang[socket.id] = "en";

  socket.on("set_language", (lang) => {
    userLang[socket.id] = lang;
  });

  socket.on("send_message", async (data) => {

    const clients = io.sockets.sockets;

    for (let [id, client] of clients) {

      const lang = userLang[id] || "en";

      try {
        const result = await translate(data.msg, { to: lang });

        client.emit("receive_message", {
          user: data.user,
          msg: result.text
        });

      } catch (err) {
        client.emit("receive_message", {
          user: data.user,
          msg: data.msg
        });
      }
    }
  });

  socket.on("disconnect", () => {
    delete userLang[socket.id];
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});