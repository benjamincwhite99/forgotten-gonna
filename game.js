import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let scene, camera, renderer;
let keys = {};
let started = false;
let gameOver = false;
let collected = 0;

let direction = new THREE.Vector3();
let yaw = 0;
let pitch = 0;

let verticalVelocity = 0;
let onGround = true;
const groundY = 2;
const gravity = 0.018;
const jumpStrength = 0.34;

let stamina = 100;
let battery = 100;

let mobileMoveX = 0;
let mobileMoveZ = 0;
let activeLookTouchId = null;
let lastTouchX = null;
let lastTouchY = null;

let sigils = [];
let warden;
let otherPlayers = {};

const objective = document.getElementById("objective");
const staminaBar = document.getElementById("staminaBar");
const batteryBar = document.getElementById("batteryBar");

const mainMenu = document.getElementById("mainMenu");
const lobbyScreen = document.getElementById("lobbyScreen");
const startScreen = document.getElementById("startScreen");
const controlsScreen = document.getElementById("controlsScreen");
const deathScreen = document.getElementById("deathScreen");
const winScreen = document.getElementById("winScreen");

const nameInput = document.getElementById("nameInput");
const roomInput = document.getElementById("roomInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const soloBtn = document.getElementById("soloBtn");
const controlsBtn = document.getElementById("controlsBtn");
const backControlsBtn = document.getElementById("backControlsBtn");
const startBtn = document.getElementById("startBtn");
const leaveLobbyBtn = document.getElementById("leaveLobbyBtn");
const restartBtn = document.getElementById("restartBtn");
const backToLobbyBtn = document.getElementById("backToLobbyBtn");
const winRestartBtn = document.getElementById("winRestartBtn");

const roomDisplay = document.getElementById("roomDisplay");
const playerList = document.getElementById("playerList");
const menuStatus = document.getElementById("menuStatus");

const staticOverlay = document.getElementById("staticOverlay");
const jumpscareScreen = document.getElementById("jumpscareScreen");

const ambient = document.getElementById("ambient");
const staticSound = document.getElementById("staticSound");
const jumpAudio = document.getElementById("jumpAudio");

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
const jumpBtn = document.getElementById("jumpBtn");

init();
animate();

soloBtn.onclick = () => {
  hideAllScreens();
  startScreen.classList.remove("hidden");
};

createBtn.onclick = () => {
  const name = nameInput.value.trim() || "Player";
  menuStatus.innerText = "Creating lobby...";
  Multiplayer.createRoom(name);
};

joinBtn.onclick = () => {
  const name = nameInput.value.trim() || "Player";
  const code = roomInput.value.trim().toUpperCase();

  if (!code) {
    menuStatus.innerText = "Enter a room code.";
    return;
  }

  menuStatus.innerText = "Joining lobby...";
  Multiplayer.joinRoom(code, name);
};

controlsBtn.onclick = () => {
  hideAllScreens();
  controlsScreen.classList.remove("hidden");
};

backControlsBtn.onclick = () => {
  hideAllScreens();
  mainMenu.classList.remove("hidden");
};

startBtn.onclick = () => {
  Multiplayer.startGame();
};

leaveLobbyBtn.onclick = () => {
  hideAllScreens();
  mainMenu.classList.remove("hidden");
};

restartBtn.onclick = () => {
  resetGame();
  beginGame();
};

backToLobbyBtn.onclick = () => {
  resetGame();

  if (Multiplayer.enabled) {
    hideAllScreens();
    lobbyScreen.classList.remove("hidden");
  } else {
    hideAllScreens();
    mainMenu.classList.remove("hidden");
  }
};

winRestartBtn.onclick = () => {
  resetGame();
  beginGame();
};

Multiplayer.onStatus = text => {
  menuStatus.innerText = text;
};

Multiplayer.onLobbyUpdate = (room, myId) => {
  hideAllScreens();
  lobbyScreen.classList.remove("hidden");

  roomDisplay.innerHTML = `Room Code: <b>${Multiplayer.roomCode}</b>`;

  const players = Object.values(room.players);

  playerList.innerHTML =
    `<b>Players: ${players.length}</b><br>` +
    players.map(p => {
      const crown = p.id === room.hostId ? " 👑" : "";
      const ready = p.ready ? " ✅" : "";
      return `• ${p.name}${crown}${ready}`;
    }).join("<br>");

  startBtn.classList.toggle("hidden", !Multiplayer.isHost);
};

Multiplayer.onGameStarted = () => {
  resetGame();
  beginGame();
};

Multiplayer.onPlayersUpdate = (players, myId) => {
  updateOtherPlayers(players, myId);
};

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x182018);
  scene.fog = new THREE.Fog(0x182018, 35, 165);

  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, groundY, 18);

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x707070));

  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(40, 80, 20);
  scene.add(sun);

  const flashlight = new THREE.SpotLight(0xffffff, 4, 80, Math.PI / 5, 0.4, 1);
  flashlight.name = "flashlight";
  camera.add(flashlight);
  flashlight.target.position.set(0, 0, -1);
  camera.add(flashlight.target);
  scene.add(camera);

  makeBaseballField();
  makeSchoolBus();
  makeDugouts();
  makeBleachers();
  makeScoreboard();
  makeSigils();
  makeWarden();

  document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === "Space") doJump();
    if (e.key.toLowerCase() === "f") toggleFlashlight();
  });

  document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  document.body.addEventListener("click", () => {
    unlockJumpscareAudio();
    startFromScreen();
  });

  document.body.addEventListener("touchstart", () => {
    unlockJumpscareAudio();
    startFromScreen();
  }, { passive:false });

  document.addEventListener("mousemove", lookAround);

  jumpBtn.addEventListener("touchstart", e => {
    e.preventDefault();
    doJump();
  }, { passive:false });

  setupMobileControls();

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function hideAllScreens() {
  [mainMenu, lobbyScreen, startScreen, controlsScreen, deathScreen, winScreen].forEach(s => {
    s.classList.add("hidden");
  });
}

function startFromScreen() {
  if (!startScreen.classList.contains("hidden")) {
    beginGame();
  }
}

function beginGame() {
  hideAllScreens();
  started = true;
  gameOver = false;

  if (!isMobile()) document.body.requestPointerLock();

  ambient.volume = 0.45;
  staticSound.volume = 0.01;

  ambient.play().catch(() => {});
  staticSound.play().catch(() => {});
}

function unlockJumpscareAudio() {
  jumpAudio.volume = 0.01;

  jumpAudio.play().then(() => {
    jumpAudio.pause();
    jumpAudio.currentTime = 0;
    jumpAudio.volume = 1;
  }).catch(() => {});
}

function isMobile() {
  return innerWidth <= 900;
}

function lookAround(e) {
  if (!started || gameOver) return;
  if (!isMobile() && document.pointerLockElement !== document.body) return;

  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-1.3, Math.min(1.3, pitch));

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function setupMobileControls() {
  joystick.addEventListener("touchmove", e => {
    e.preventDefault();

    const rect = joystick.getBoundingClientRect();
    const touch = e.touches[0];

    let x = touch.clientX - rect.left - rect.width / 2;
    let y = touch.clientY - rect.top - rect.height / 2;

    const max = 45;
    const length = Math.hypot(x, y);

    if (length > max) {
      x = (x / length) * max;
      y = (y / length) * max;
    }

    stick.style.left = `${35 + x}px`;
    stick.style.top = `${35 + y}px`;

    mobileMoveX = x / max;
    mobileMoveZ = y / max;
  }, { passive:false });

  joystick.addEventListener("touchend", () => {
    mobileMoveX = 0;
    mobileMoveZ = 0;
    stick.style.left = "35px";
    stick.style.top = "35px";
  });

  document.addEventListener("touchstart", e => {
    if (!started || gameOver) return;

    for (let touch of e.changedTouches) {
      const inJoystick = touch.clientX < 180 && touch.clientY > innerHeight - 180;
      const inJump = touch.clientX > innerWidth - 140 && touch.clientY > innerHeight - 150;

      if (!inJoystick && !inJump && activeLookTouchId === null) {
        activeLookTouchId = touch.identifier;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      }
    }
  }, { passive:false });

  document.addEventListener("touchmove", e => {
    if (!started || gameOver) return;
    e.preventDefault();

    for (let touch of e.touches) {
      if (touch.identifier === activeLookTouchId) {
        const dx = touch.clientX - lastTouchX;
        const dy = touch.clientY - lastTouchY;

        yaw -= dx * 0.0017;
        pitch -= dy * 0.0017;
        pitch = Math.max(-1.1, Math.min(1.1, pitch));

        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      }
    }
  }, { passive:false });

  document.addEventListener("touchend", e => {
    for (let touch of e.changedTouches) {
      if (touch.identifier === activeLookTouchId) {
        activeLookTouchId = null;
        lastTouchX = null;
        lastTouchY = null;
      }
    }
  });
}

function makeBaseballField() {
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color:0x235c25 })
  );
  grass.rotation.x = -Math.PI / 2;
  scene.add(grass);

  const dirtMat = new THREE.MeshStandardMaterial({ color:0x9b6a3c });
  const lineMat = new THREE.MeshBasicMaterial({ color:0xffffff });

  const infield = new THREE.Mesh(new THREE.CircleGeometry(32, 64), dirtMat);
  infield.rotation.x = -Math.PI / 2;
  infield.position.y = 0.01;
  scene.add(infield);

  const mound = new THREE.Mesh(new THREE.CircleGeometry(5, 32), dirtMat);
  mound.rotation.x = -Math.PI / 2;
  mound.position.set(0, 0.03, -10);
  scene.add(mound);

  [[0,0], [18,-18], [0,-36], [-18,-18]].forEach(([x,z]) => {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.18, 3),
      new THREE.MeshStandardMaterial({ color:0xffffff })
    );
    base.position.set(x, 0.12, z);
    base.rotation.y = Math.PI / 4;
    scene.add(base);
  });

  makeLine(0,0,80,-80,lineMat);
  makeLine(0,0,-80,-80,lineMat);
  makeLine(18,-18,0,-36,lineMat);
  makeLine(0,-36,-18,-18,lineMat);
  makeLine(-18,-18,0,0,lineMat);
  makeLine(0,0,18,-18,lineMat);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(190, 8, 2),
    new THREE.MeshStandardMaterial({ color:0x123d12 })
  );
  wall.position.set(0, 4, -98);
  scene.add(wall);

  makeLightPole(-60, -55);
  makeLightPole(60, -55);
  makeFoulPole(-82, -82);
  makeFoulPole(82, -82);
}

function makeLine(x1, z1, x2, z2, mat) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);

  const line = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, len), mat);
  line.position.set((x1+x2)/2, 0.08, (z1+z2)/2);
  line.rotation.y = Math.atan2(dx, dz);
  scene.add(line);
}

function makeLightPole(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 30, 12),
    new THREE.MeshStandardMaterial({ color:0x555555 })
  );
  pole.position.set(x, 15, z);
  scene.add(pole);

  const light = new THREE.PointLight(0xffffff, 2, 95);
  light.position.set(x, 31, z);
  scene.add(light);
}

function makeFoulPole(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 28, 10),
    new THREE.MeshStandardMaterial({ color:0xffff00 })
  );
  pole.position.set(x, 14, z);
  scene.add(pole);
}

function makeSchoolBus() {
  const bus = new THREE.Group();

  const yellow = new THREE.MeshStandardMaterial({ color:0xb89100 });
  const black = new THREE.MeshStandardMaterial({ color:0x111111 });
  const glass = new THREE.MeshStandardMaterial({ color:0x66aaff, transparent:true, opacity:0.65 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 5), yellow);
  body.position.y = 3;
  bus.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(15.5, 1, 4.5), yellow);
  roof.position.y = 5.5;
  bus.add(roof);

  [[-5.5,1,2.8],[5.5,1,2.8],[-5.5,1,-2.8],[5.5,1,-2.8]].forEach(pos => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 20), black);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    bus.add(wheel);
  });

  for (let i = -6; i <= 6; i += 2.4) {
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.2,0.1), glass);
    w1.position.set(i, 4, 2.55);
    bus.add(w1);

    const w2 = w1.clone();
    w2.position.z = -2.55;
    bus.add(w2);
  }

  bus.position.set(0, 0, -15);
  bus.rotation.y = Math.PI / 7;
  scene.add(bus);
}

function makeDugouts() {
  const mat = new THREE.MeshStandardMaterial({ color:0x333333 });

  [-35, 35].forEach(x => {
    const dugout = new THREE.Mesh(new THREE.BoxGeometry(24, 5, 8), mat);
    dugout.position.set(x, 2.5, 16);
    scene.add(dugout);
  });
}

function makeBleachers() {
  const mat = new THREE.MeshStandardMaterial({ color:0x777777 });

  for (let i = 0; i < 5; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(70, 0.5, 2), mat);
    row.position.set(0, 1 + i * 1.1, 36 + i * 2.3);
    scene.add(row);
  }
}

function makeScoreboard() {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(28, 14, 1),
    new THREE.MeshStandardMaterial({ color:0x111111 })
  );
  board.position.set(0, 12, -105);
  scene.add(board);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "black";
  ctx.fillRect(0,0,512,256);
  ctx.fillStyle = "white";
  ctx.font = "bold 46px Arial";
  ctx.textAlign = "center";
  ctx.fillText("FORGOTTEN", 256, 90);
  ctx.fillText("GONZA", 256, 155);

  const texture = new THREE.CanvasTexture(canvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 13),
    new THREE.MeshBasicMaterial({ map:texture })
  );
  sign.position.set(0, 12, -104.4);
  scene.add(sign);
}

function makeSigils() {
  const positions = [
    [0,2.3,0], [18,2.3,-18], [0,2.3,-36], [-18,2.3,-18],
    [45,2.3,-55], [-45,2.3,-55], [65,2.3,-20], [-65,2.3,-20]
  ];

  positions.sort(() => Math.random() - 0.5);

  positions.forEach(pos => {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 24, 24),
      new THREE.MeshStandardMaterial({ color:0xffffff })
    );
    ball.position.set(...pos);
    ball.userData.taken = false;

    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.035, 8, 36),
      new THREE.MeshBasicMaterial({ color:0xff0000 })
    );
    seam.rotation.x = Math.PI / 2;
    ball.add(seam);

    scene.add(ball);
    sigils.push(ball);
  });
}

function makeWarden() {
  const texture = new THREE.TextureLoader().load("assets/warden2.png");
  const mat = new THREE.SpriteMaterial({ map:texture, transparent:true });

  warden = new THREE.Sprite(mat);
  warden.position.set(45, 3, 45);
  warden.scale.set(7, 9, 1);
  scene.add(warden);
}

function makeOtherPlayer(name) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 1.2, 6, 12),
    new THREE.MeshStandardMaterial({ color:0x1e90ff })
  );
  body.position.y = 1.25;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 16),
    new THREE.MeshStandardMaterial({ color:0xffd1a4 })
  );
  head.position.y = 2.25;
  group.add(head);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16),
    new THREE.MeshStandardMaterial({ color:0xff2222 })
  );
  cap.position.y = 2.58;
  group.add(cap);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,.65)";
  ctx.fillRect(0,0,512,128);
  ctx.fillStyle = "white";
  ctx.font = "bold 52px Arial";
  ctx.textAlign = "center";
  ctx.fillText(name, 256, 82);

  const tag = new THREE.Sprite(new THREE.SpriteMaterial({
    map:new THREE.CanvasTexture(canvas),
    transparent:true
  }));
  tag.position.y = 3.25;
  tag.scale.set(4,1,1);
  group.add(tag);

  return group;
}

function updateOtherPlayers(players, myId) {
  for (const id in players) {
    if (id === myId) continue;

    const p = players[id];

    if (!otherPlayers[id]) {
      otherPlayers[id] = makeOtherPlayer(p.name);
      scene.add(otherPlayers[id]);
    }

    otherPlayers[id].position.set(p.x, p.y, p.z);
    otherPlayers[id].rotation.y = p.yaw;
  }

  for (const id in otherPlayers) {
    if (!players[id]) {
      scene.remove(otherPlayers[id]);
      delete otherPlayers[id];
    }
  }
}

function doJump() {
  if (onGround && started && !gameOver) {
    verticalVelocity = jumpStrength;
    onGround = false;
  }
}

function toggleFlashlight() {
  const light = camera.getObjectByName("flashlight");
  light.visible = !light.visible;
}

function updatePlayer() {
  direction.set(0,0,0);

  if (keys["w"] || mobileMoveZ < -0.2) direction.z -= 1;
  if (keys["s"] || mobileMoveZ > 0.2) direction.z += 1;
  if (keys["a"] || mobileMoveX < -0.2) direction.x -= 1;
  if (keys["d"] || mobileMoveX > 0.2) direction.x += 1;

  direction.normalize();

  const sprinting = keys["shift"] && stamina > 0 && direction.length() > 0;
  const speed = sprinting ? 0.35 : 0.21;

  if (sprinting) stamina -= 0.45;
  else stamina += 0.25;

  stamina = Math.max(0, Math.min(100, stamina));
  staminaBar.style.width = `${stamina}%`;

  const light = camera.getObjectByName("flashlight");

  if (light.visible) battery -= 0.025;
  else battery += 0.035;

  battery = Math.max(0, Math.min(100, battery));
  batteryBar.style.width = `${battery}%`;
  light.intensity = battery <= 0 ? 0 : 4;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  camera.position.addScaledVector(forward, -direction.z * speed);
  camera.position.addScaledVector(right, direction.x * speed);

  verticalVelocity -= gravity;
  camera.position.y += verticalVelocity;

  if (camera.position.y <= groundY) {
    camera.position.y = groundY;
    verticalVelocity = 0;
    onGround = true;
  }

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -105, 105);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -105, 105);

  if (Multiplayer.enabled) {
    Multiplayer.sendPlayerState({
      x:camera.position.x,
      y:camera.position.y - 2,
      z:camera.position.z,
      yaw
    });
  }
}

function updateWarden() {
  const playerPos = camera.position.clone();
  const distance = playerPos.distanceTo(warden.position);
  const dir = playerPos.sub(warden.position).normalize();

  const speed = 0.12 + collected * 0.03;
  warden.position.addScaledVector(dir, speed);
  warden.position.y = 3;

  const staticAmount = Math.max(0, Math.min(0.95, 1 - distance / 50));
  staticOverlay.style.opacity = staticAmount;
  staticSound.volume = staticAmount;

  if (distance < 3.2) loseGame();
}

function updateSigils() {
  sigils.forEach(ball => {
    if (ball.userData.taken) return;

    ball.rotation.y += 0.03;

    const d = camera.position.distanceTo(ball.position);

    if (d < 3) {
      ball.userData.taken = true;
      ball.visible = false;
      collected++;

      objective.innerHTML = `Baseballs: ${collected} / 8`;

      if (collected >= 8) winGame();
    }
  });
}

function loseGame() {
  gameOver = true;

  ambient.pause();
  staticSound.pause();
  staticOverlay.style.opacity = 0;

  jumpscareScreen.style.display = "block";

  jumpAudio.pause();
  jumpAudio.currentTime = 0;
  jumpAudio.volume = 1;
  jumpAudio.play().catch(() => {});

  setTimeout(() => {
    jumpscareScreen.style.display = "none";
    hideAllScreens();
    deathScreen.classList.remove("hidden");
  }, 1200);

  if (document.pointerLockElement) document.exitPointerLock();
}

function winGame() {
  gameOver = true;

  ambient.pause();
  staticSound.pause();

  hideAllScreens();
  winScreen.classList.remove("hidden");

  if (document.pointerLockElement) document.exitPointerLock();
}

function resetGame() {
  started = false;
  gameOver = false;
  collected = 0;
  stamina = 100;
  battery = 100;

  objective.innerHTML = "Baseballs: 0 / 8";
  staminaBar.style.width = "100%";
  batteryBar.style.width = "100%";

  camera.position.set(0, groundY, 18);
  yaw = 0;
  pitch = 0;
  verticalVelocity = 0;
  onGround = true;

  camera.rotation.order = "YXZ";
  camera.rotation.y = 0;
  camera.rotation.x = 0;

  warden.position.set(45, 3, 45);

  sigils.forEach(ball => {
    ball.userData.taken = false;
    ball.visible = true;
  });

  ambient.currentTime = 0;
  staticSound.currentTime = 0;
}

function animate() {
  requestAnimationFrame(animate);

  if (started && !gameOver) {
    updatePlayer();
    updateWarden();
    updateSigils();
  }

  renderer.render(scene, camera);
}
