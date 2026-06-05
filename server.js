const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send("Forgotten Gonza server is running");
});

const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

function makeCode() {
  return "GONZA-" + Math.floor(1000 + Math.random() * 9000);
}

io.on("connection", socket => {
  socket.on("createRoom", ({ name }) => {
    const roomCode = makeCode();

    rooms[roomCode] = {
      hostId: socket.id,
      started: false,
      players: {}
    };

    rooms[roomCode].players[socket.id] = {
      id: socket.id,
      name: name || "Player",
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    };

    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, hostId: socket.id });
    io.to(roomCode).emit("lobbyUpdate", rooms[roomCode]);
  });

  socket.on("joinRoom", ({ roomCode, name }) => {
    roomCode = roomCode.toUpperCase();

    if (!rooms[roomCode]) {
      socket.emit("joinError", "Room not found");
      return;
    }

    if (rooms[roomCode].started) {
      socket.emit("joinError", "Game already started");
      return;
    }

    rooms[roomCode].players[socket.id] = {
      id: socket.id,
      name: name || "Player",
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    };

    socket.join(roomCode);
    socket.emit("roomJoined", { roomCode, hostId: rooms[roomCode].hostId });
    io.to(roomCode).emit("lobbyUpdate", rooms[roomCode]);
  });

  socket.on("startGame", roomCode => {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.hostId !== socket.id) return;

    room.started = true;
    io.to(roomCode).emit("gameStarted");
  });

  socket.on("playerState", ({ roomCode, x, y, z, yaw }) => {
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    room.players[socket.id].x = x;
    room.players[socket.id].y = y;
    room.players[socket.id].z = z;
    room.players[socket.id].yaw = yaw;

    io.to(roomCode).emit("playersUpdate", room.players);
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];

      if (room.players[socket.id]) {
        delete room.players[socket.id];

        if (socket.id === room.hostId) {
          const ids = Object.keys(room.players);
          room.hostId = ids[0] || null;
        }

        if (Object.keys(room.players).length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit("lobbyUpdate", room);
          io.to(roomCode).emit("playersUpdate", room.players);
        }
      }
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
