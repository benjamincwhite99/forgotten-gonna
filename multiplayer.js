const SERVER_URL = "https://forgotten-gonna.onrender.com";

let socket = null;
let roomCode = null;
let isHost = false;
let multiplayerEnabled = false;

const Multiplayer = {
  get socket() { return socket; },
  get roomCode() { return roomCode; },
  get isHost() { return isHost; },
  get enabled() { return multiplayerEnabled; },

  connect,
  createRoom,
  joinRoom,
  startGame,
  sendPlayerState,

  onLobbyUpdate:null,
  onPlayersUpdate:null,
  onGameStarted:null,
  onStatus:null
};

window.Multiplayer = Multiplayer;

function connect() {
  if (socket) return;

  socket = io(SERVER_URL, { transports:["websocket"] });

  socket.on("connect_error", () => {
    Multiplayer.onStatus?.("Server connection failed. Render may be asleep.");
  });

  socket.on("roomCreated", data => {
    multiplayerEnabled = true;
    roomCode = data.roomCode;
    isHost = true;
    Multiplayer.onStatus?.("Lobby created. Share the code.");
  });

  socket.on("roomJoined", data => {
    multiplayerEnabled = true;
    roomCode = data.roomCode;
    isHost = socket.id === data.hostId;
    Multiplayer.onStatus?.("Joined lobby. Waiting for host.");
  });

  socket.on("joinError", text => {
    Multiplayer.onStatus?.(text);
  });

  socket.on("lobbyUpdate", room => {
    isHost = socket.id === room.hostId;
    Multiplayer.onLobbyUpdate?.(room, socket.id);
  });

  socket.on("playersUpdate", players => {
    Multiplayer.onPlayersUpdate?.(players, socket.id);
  });

  socket.on("gameStarted", () => {
    Multiplayer.onGameStarted?.();
  });
}

function createRoom(name) {
  connect();

  if (socket.connected) {
    socket.emit("createRoom", { name });
  } else {
    socket.once("connect", () => {
      socket.emit("createRoom", { name });
    });
  }
}

function joinRoom(code, name) {
  connect();

  if (socket.connected) {
    socket.emit("joinRoom", { roomCode:code, name });
  } else {
    socket.once("connect", () => {
      socket.emit("joinRoom", { roomCode:code, name });
    });
  }
}

function startGame() {
  if (socket && roomCode && isHost) {
    socket.emit("startGame", roomCode);
  }
}

function sendPlayerState(state) {
  if (!socket || !socket.connected || !roomCode) return;

  socket.emit("playerState", {
    roomCode,
    ...state
  });
}
