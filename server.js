const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

io.on("connection", socket => {
  socket.on("joinRoom", roomCode => {
    socket.join(roomCode);

    if (!rooms[roomCode]) rooms[roomCode] = {};
    rooms[roomCode][socket.id] = { x:0, y:0, z:0, yaw:0 };

    io.to(roomCode).emit("playersUpdate", rooms[roomCode]);
  });

  socket.on("playerState", data => {
    const { roomCode, x, y, z, yaw } = data;

    if (!rooms[roomCode]) return;

    rooms[roomCode][socket.id] = { x, y, z, yaw };

    io.to(roomCode).emit("playersUpdate", rooms[roomCode]);
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      delete rooms[roomCode][socket.id];
      io.to(roomCode).emit("playersUpdate", rooms[roomCode]);
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
