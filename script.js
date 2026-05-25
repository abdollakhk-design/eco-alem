const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const HUD = 84;
const FOOTER = 52;
const PLAY_TOP = HUD;
const PLAY_BOTTOM = H - FOOTER;

const keys = new Set();
const colors = {
  white: "#eef7f1",
  muted: "#b9c8bf",
  black: "#0d1210",
  hud: "#20342e",
  panel: "#29443b",
  line: "#4d7768",
  grass: "#43914c",
  grass2: "#3a8446",
  dirt: "#845d39",
  polluted: "#443f42",
  toxic: "#76aa38",
  clean: "#a67043",
  green: "#3fcb66",
  tree: "#266f37",
  tree2: "#3da64e",
  water: "#3685b1",
  water2: "#27628a",
  yellow: "#e7c45a",
  red: "#de5248",
  blue: "#4a9cdc",
  orange: "#dc8f41",
  player: "#42cf6f",
  pants: "#3769c0",
};

const trashTypes = {
  plastic: { name: "Пластик", color: colors.blue, value: 12 },
  paper: { name: "Қағаз", color: colors.white, value: 8 },
  metal: { name: "Металл", color: "#a4acb2", value: 14 },
  toxic: { name: "Улы қалдық", color: colors.orange, value: 20 },
};

const state = {
  screen: "menu",
  eco: 70,
  score: 0,
  message: "Eco-Alem әлеміне қош келдіңіз!",
  messageTimer: 0,
  bag: [],
  player: { x: 88, y: 470, facing: 1, step: 0 },
  floats: [],
  station: { x: 696, y: 118, w: 72, h: 72 },
  nursery: { x: 700, y: 224, w: 66, h: 64 },
  water: { x: 40, y: 112, w: 160, h: 78 },
  trash: [],
  patches: [],
};

function resetGame() {
  state.screen = "menu";
  state.eco = 70;
  state.score = 0;
  state.message = "Eco-Alem әлеміне қош келдіңіз!";
  state.messageTimer = 0;
  state.bag = [];
  state.player = { x: 88, y: 470, facing: 1, step: 0 };
  state.floats = [];
  state.trash = [
    t(122, 224, "plastic"),
    t(178, 310, "paper"),
    t(250, 190, "metal"),
    t(334, 250, "plastic"),
    t(420, 172, "toxic"),
    t(520, 230, "paper"),
    t(628, 154, "plastic"),
    t(652, 330, "metal"),
    t(558, 422, "toxic"),
    t(454, 474, "paper"),
    t(314, 430, "plastic"),
    t(202, 480, "metal"),
    t(104, 390, "paper"),
    t(596, 500, "plastic"),
    t(728, 404, "toxic"),
  ];
  state.patches = [
    p(260, 330),
    p(312, 338),
    p(370, 352),
    p(428, 330),
    p(486, 344),
    p(544, 324),
    p(250, 520),
    p(330, 510),
    p(410, 520),
    p(490, 510),
    p(570, 520),
    p(650, 476),
  ];
}

function t(x, y, kind) {
  return { x, y, kind };
}

function p(x, y) {
  return { x, y, stage: 0 };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playerRect() {
  return { x: state.player.x - 15, y: state.player.y - 15, w: 30, h: 30 };
}

function blockedRects() {
  return [
    { x: state.station.x + 4, y: state.station.y + 3, w: state.station.w - 8, h: state.station.h - 6 },
    { x: state.nursery.x + 4, y: state.nursery.y + 3, w: state.nursery.w - 8, h: state.nursery.h - 6 },
    { x: state.water.x + 3, y: state.water.y + 3, w: state.water.w - 6, h: state.water.h - 6 },
  ];
}

function distance(x, y) {
  return Math.hypot(state.player.x - x, state.player.y - y);
}

function nearestTrash() {
  return state.trash
    .filter((item) => distance(item.x, item.y) <= 52)
    .sort((a, b) => distance(a.x, a.y) - distance(b.x, b.y))[0];
}

function nearestPatch() {
  return state.patches
    .filter((item) => distance(item.x, item.y) <= 52)
    .sort((a, b) => distance(a.x, a.y) - distance(b.x, b.y))[0];
}

function inInflated(rect, amount) {
  return (
    state.player.x >= rect.x - amount &&
    state.player.x <= rect.x + rect.w + amount &&
    state.player.y >= rect.y - amount &&
    state.player.y <= rect.y + rect.h + amount
  );
}

function setMessage(text, time = 2200) {
  state.message = text;
  state.messageTimer = time;
}

function addFloat(text, x, y, color) {
  state.floats.push({ text, x, y, color, life: 70 });
}

function action() {
  if (state.screen === "menu") {
    state.screen = "play";
    setMessage("Миссия басталды. Қоқысқа жақындап E басыңыз.");
    return;
  }
  if (state.screen === "help") {
    state.screen = "play";
    return;
  }
  if (state.screen === "win") {
    resetGame();
    return;
  }
  if (state.screen !== "play") return;

  const trash = nearestTrash();
  if (trash) {
    collectTrash(trash);
    return;
  }
  if (inInflated(state.station, 58)) {
    recycleBag();
    return;
  }
  const patch = nearestPatch();
  if (patch) {
    restorePatch(patch);
    return;
  }
  if (inInflated(state.nursery, 48)) {
    setMessage("Көшетхана: алдымен таза топыраққа жақындаңыз.");
    return;
  }
  setMessage("Әрекет үшін қоқысқа, жерге немесе станцияға жақындаңыз.");
}

function collectTrash(item) {
  if (state.bag.length >= 6) {
    setMessage("Сөмке толды. Қайта өңдеу станциясына барыңыз.");
    return;
  }
  state.trash.splice(state.trash.indexOf(item), 1);
  state.bag.push(item.kind);
  state.score += 2;
  addFloat(`+ ${trashTypes[item.kind].name}`, item.x, item.y, colors.white);
  setMessage(`${trashTypes[item.kind].name} жиналды. Сөмке: ${state.bag.length}/6.`);
}

function recycleBag() {
  if (!state.bag.length) {
    setMessage("Станция: сөмке бос. Алдымен қоқыс жинаңыз.");
    return;
  }
  const gain = state.bag.reduce((sum, kind) => sum + trashTypes[kind].value, 0);
  const count = state.bag.length;
  state.bag = [];
  state.eco += gain;
  state.score += gain;
  addFloat(`+${gain} Эко-қуат`, state.station.x + 36, state.station.y, colors.yellow);
  setMessage(`${count} қалдық қайта өңделді. +${gain} Эко-қуат.`);
}

function restorePatch(patch) {
  if (patch.stage === 0) {
    if (state.eco < 10) {
      setMessage("Тазарту үшін 10 Эко-қуат керек.");
      return;
    }
    state.eco -= 10;
    patch.stage = 1;
    state.score += 20;
    addFloat("Топырақ тазартылды", patch.x, patch.y, colors.clean);
    setMessage("Топырақ тазартылды. Енді көгал отырғызыңыз.");
    return;
  }
  if (patch.stage === 1) {
    if (state.eco < 20) {
      setMessage("Көгал отырғызу үшін 20 Эко-қуат керек.");
      return;
    }
    state.eco -= 20;
    patch.stage = 2;
    state.score += 35;
    addFloat("Көгал өсті", patch.x, patch.y, colors.green);
    setMessage("Жаңа көгал пайда болды!");
    return;
  }
  setMessage("Бұл жер толық қалпына келді.");
}

function progress() {
  const total = state.patches.length * 2 + 15 + 1;
  const patchProgress = state.patches.reduce((sum, patch) => sum + (patch.stage === 2 ? 2 : patch.stage), 0);
  const trashProgress = 15 - state.trash.length;
  const recycleProgress = state.bag.length ? 0 : 1;
  return Math.floor(((patchProgress + trashProgress + recycleProgress) / total) * 100);
}

function checkWin() {
  if (state.trash.length) return;
  if (state.bag.length) return;
  if (state.patches.some((patch) => patch.stage !== 2)) return;
  state.screen = "win";
  setMessage("Жеңіс: табиғат қалпына келді!", 4000);
}

function update(dt) {
  if (state.messageTimer > 0) state.messageTimer = Math.max(0, state.messageTimer - dt);
  state.floats.forEach((item) => {
    item.y -= 0.35;
    item.life -= 1;
  });
  state.floats = state.floats.filter((item) => item.life > 0);

  if (state.screen !== "play") return;

  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    move((dx / len) * 3.3, 0);
    move(0, (dy / len) * 3.3);
    state.player.facing = dx >= 0 ? 1 : -1;
    state.player.step = (state.player.step + 1) % 40;
  }
  checkWin();
}

function move(dx, dy) {
  state.player.x += dx;
  state.player.y += dy;
  state.player.x = Math.max(18, Math.min(W - 18, state.player.x));
  state.player.y = Math.max(PLAY_TOP + 18, Math.min(PLAY_BOTTOM - 18, state.player.y));
  const pr = playerRect();
  blockedRects().forEach((block) => {
    if (!rectsOverlap(pr, block)) return;
    if (dx > 0) state.player.x = block.x - 15;
    if (dx < 0) state.player.x = block.x + block.w + 15;
    if (dy > 0) state.player.y = block.y - 15;
    if (dy < 0) state.player.y = block.y + block.h + 15;
  });
}

function hint() {
  const trash = nearestTrash();
  if (trash) {
    if (state.bag.length >= 6) return "Сөмке толды. Станцияға барып қайта өңдеңіз.";
    return `${trashTypes[trash.kind].name} жақын. E басып жинаңыз.`;
  }
  if (inInflated(state.station, 58)) {
    return state.bag.length ? `Станция: E басып ${state.bag.length} қалдықты өңдеңіз.` : "Станция: сөмке бос.";
  }
  const patch = nearestPatch();
  if (patch) {
    if (patch.stage === 0) return "Ластанған жер: E басып тазарту. Құны 10.";
    if (patch.stage === 1) return "Таза топырақ: E басып көгал отырғызу. Құны 20.";
    return "Бұл жер қалпына келді.";
  }
  return "Қозғалу: WASD немесе бағыттар. Әрекет: E.";
}

function draw() {
  drawWorld();
  drawHud();
  drawFooter();
  if (state.screen === "menu") drawMenu();
  if (state.screen === "help") drawHelp();
  if (state.screen === "win") drawWin();
}

function drawWorld() {
  drawGround();
  drawWater();
  drawStation();
  drawNursery();
  state.patches.forEach(drawPatch);
  state.trash.forEach(drawTrash);
  drawInteractionRing();
  drawPlayer();
  state.floats.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.font = "15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(item.text, item.x, item.y);
  });
}

function drawGround() {
  for (let y = PLAY_TOP; y < PLAY_BOTTOM; y += 40) {
    for (let x = 0; x < W; x += 40) {
      ctx.fillStyle = (x / 40 + y / 40) % 2 === 0 ? colors.grass : colors.grass2;
      ctx.fillRect(x, y, 40, 40);
      if ((x + y) % 120 === 0) {
        line(colors.tree2, x + 8, y + 30, x + 16, y + 22, 2);
        line(colors.tree2, x + 24, y + 31, x + 29, y + 20, 2);
      }
    }
  }
  ctx.fillStyle = colors.dirt;
  ctx.fillRect(0, 438, W, 44);
  for (let x = 0; x < W; x += 36) circle("#704d30", x + 10, 462, 3);
}

function drawWater() {
  roundRect(state.water.x, state.water.y, state.water.w, state.water.h, 18, colors.water);
  strokeRound(state.water.x, state.water.y, state.water.w, state.water.h, 18, colors.water2, 3);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = "#75bedc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.water.x + 62, state.water.y + 25 + i * 13, 45, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  circle("#2a3a35", state.water.x + 118, state.water.y + 42, 12);
  circle(colors.toxic, state.water.x + 118, state.water.y + 42, 5);
}

function drawStation() {
  const r = state.station;
  roundRect(r.x, r.y, r.w, r.h, 8, "#37484b");
  strokeRound(r.x, r.y, r.w, r.h, 8, colors.line, 2);
  circle(colors.yellow, r.x + 36, r.y + 36, 22);
  ctx.strokeStyle = colors.panel;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r.x + 36, r.y + 18);
  ctx.lineTo(r.x + 55, r.y + 48);
  ctx.lineTo(r.x + 20, r.y + 56);
  ctx.stroke();
  label("Өңдеу", r.x + 36, r.y + r.h + 15, 13);
}

function drawNursery() {
  const r = state.nursery;
  roundRect(r.x, r.y, r.w, r.h, 8, "#496845");
  strokeRound(r.x, r.y, r.w, r.h, 8, colors.line, 2);
  [18, 34, 50].forEach((offset) => {
    line("#553d24", r.x + offset, r.y + 48, r.x + offset, r.y + 28, 3);
    circle(colors.tree2, r.x + offset - 4, r.y + 28, 8);
    circle(colors.tree, r.x + offset + 4, r.y + 25, 8);
  });
  label("Көшет", r.x + 33, r.y + r.h + 15, 13);
}

function drawPatch(patch) {
  if (patch.stage === 0) {
    ellipse(colors.polluted, patch.x, patch.y, 44, 36);
    strokeEllipse("#2d2b2d", patch.x, patch.y, 44, 36, 2);
    circle(colors.toxic, patch.x - 8, patch.y, 5);
    circle(colors.toxic, patch.x + 11, patch.y + 6, 4);
  } else if (patch.stage === 1) {
    ellipse(colors.clean, patch.x, patch.y, 44, 36);
    strokeEllipse("#774b2a", patch.x, patch.y, 44, 36, 2);
    circle("#8b5832", patch.x - 10, patch.y + 2, 3);
    circle("#8b5832", patch.x + 12, patch.y - 4, 3);
  } else {
    ellipse("#32a548", patch.x, patch.y, 44, 36);
    line("#5b4929", patch.x, patch.y + 13, patch.x, patch.y - 8, 4);
    circle(colors.tree, patch.x - 7, patch.y - 12, 12);
    circle(colors.tree2, patch.x + 7, patch.y - 13, 12);
    circle(colors.tree, patch.x + 1, patch.y - 23, 11);
  }
}

function drawTrash(item) {
  const data = trashTypes[item.kind];
  if (item.kind === "paper") {
    roundRect(item.x - 13, item.y - 13, 26, 26, 3, data.color);
    line("#b4b4b4", item.x - 8, item.y - 5, item.x + 8, item.y - 5, 1);
    line("#b4b4b4", item.x - 8, item.y + 2, item.x + 7, item.y + 2, 1);
  } else if (item.kind === "metal") {
    roundRect(item.x - 11, item.y - 12, 22, 24, 5, data.color);
    strokeRound(item.x - 11, item.y - 12, 22, 24, 5, "#697076", 2);
  } else if (item.kind === "toxic") {
    circle(data.color, item.x, item.y, 13);
    circle(colors.red, item.x, item.y, 6);
    line(colors.black, item.x - 7, item.y, item.x + 7, item.y, 2);
  } else {
    ctx.fillStyle = data.color;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - 13);
    ctx.lineTo(item.x + 13, item.y);
    ctx.lineTo(item.x, item.y + 13);
    ctx.lineTo(item.x - 13, item.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.blue;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawInteractionRing() {
  if (state.screen !== "play") return;
  const target = nearestTrash() || nearestPatch();
  let x;
  let y;
  if (target) {
    x = target.x;
    y = target.y;
  } else if (inInflated(state.station, 58)) {
    x = state.station.x + 36;
    y = state.station.y + 36;
  } else {
    return;
  }
  ctx.strokeStyle = colors.yellow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayer() {
  const p = state.player;
  const x = p.x - 15;
  const y = p.y - 15;
  const leg = p.step < 20 ? 3 : -3;
  ellipse("#14231b", p.x, y + 30, 25, 7);
  roundRect(x + 8, y + 16, 6, 14, 2, colors.pants);
  roundRect(x + 18, y + 16 + leg, 6, 14, 2, colors.pants);
  roundRect(x + 6, y + 9, 18, 18, 5, colors.player);
  circle("#f7c79b", p.x, y + 7, 9);
  circle(colors.black, p.x + 3 * p.facing, y + 6, 2);
  roundRect(x + 1, y + 12, 7, 13, 3, "#1f7040");
  roundRect(x + 22, y + 12, 7, 13, 3, "#1f7040");
}

function drawHud() {
  ctx.fillStyle = colors.hud;
  ctx.fillRect(0, 0, W, HUD);
  line(colors.line, 0, HUD, W, HUD, 2);
  label("Eco-Alem", 22, 44, 34, colors.white, "left", "bold");
  const stats = [
    `Эко-қуат: ${state.eco}`,
    `Ұпай: ${state.score}`,
    `Сөмке: ${state.bag.length}/6`,
    `Қалпына келтіру: ${progress()}%`,
  ];
  stats.forEach((text, i) => label(text, 190 + i * 132, 29, 15, colors.white, "left"));
  progressBar(190, 47, 402, 12, progress() / 100);
  drawCanvasButton(670, 22, 104, 38, "Көмек");
}

function drawFooter() {
  ctx.fillStyle = colors.hud;
  ctx.fillRect(0, PLAY_BOTTOM, W, FOOTER);
  line(colors.line, 0, PLAY_BOTTOM, W, PLAY_BOTTOM, 2);
  const h = state.screen === "play" ? hint() : "Мақсат: қоқысты жинап, жерді тазалап, көгал отырғызу.";
  label(h, 22, 572, 15, colors.white, "left");
  label(state.message, 22, 592, 13, state.messageTimer > 0 ? colors.yellow : colors.muted, "left");
  drawCanvasButton(612, 548, 162, 38, "Әрекет (E)", colors.green, "#0b2114");
}

function progressBar(x, y, w, h, ratio) {
  roundRect(x, y, w, h, 6, "#171f1e");
  roundRect(x, y, Math.max(2, w * ratio), h, 6, colors.green);
  strokeRound(x, y, w, h, 6, colors.line, 1);
}

function drawMenu() {
  dim();
  panel(92, 112, 616, 380);
  label("Eco-Alem: Жасыл қала миссиясы", 400, 158, 30, colors.white, "center", "bold");
  const lines = [
    "Сен экология еріктісісің. Қала саябағы ластанып қалды.",
    "Қоқысты жина, қайта өңде, ластанған жерді тазарт.",
    "Таза топыраққа көгал мен ағаш отырғыз.",
    "Барлық қалдық жойылып, барлық жер жасыл болғанда жеңесің.",
    "",
    "Басқару: WASD немесе бағыттар. Әрекет: E.",
  ];
  lines.forEach((line, i) => label(line, 400, 215 + i * 30, 18, line ? colors.white : colors.muted));
  drawCanvasButton(305, 408, 190, 46, "Ойынды бастау", colors.green, "#0b2114");
}

function drawHelp() {
  dim();
  panel(86, 104, 628, 392);
  label("Ойын нұсқаулығы", 400, 145, 30, colors.white, "center", "bold");
  const lines = [
    "1. Қоқысқа жақындап E бассаңыз, ол сөмкеге түседі.",
    "2. Сөмке толса, оң жақтағы қайта өңдеу станциясына барыңыз.",
    "3. Қайта өңдеу Эко-қуат береді.",
    "4. Ластанған жерді тазарту құны: 10 Эко-қуат.",
    "5. Таза топыраққа көгал отырғызу құны: 20 Эко-қуат.",
    "6. Жеңіс: барлық қоқыс өңделіп, барлық топырақ жасыл болуы керек.",
    "",
    "ESC немесе төмендегі батырма арқылы ойынға қайтыңыз.",
  ];
  lines.forEach((line, i) => label(line, 128, 190 + i * 29, 18, line ? colors.white : colors.muted, "left"));
  drawCanvasButton(305, 408, 190, 46, "Ойынға қайту", colors.green, "#0b2114");
}

function drawWin() {
  dim();
  panel(92, 154, 616, 310);
  label("Жеңіс: табиғат қалпына келді!", 400, 210, 30, colors.white, "center", "bold");
  const lines = [
    "Қала саябағы тазартылды, қоқыс өңделді, жаңа көгал өсті.",
    `Жалпы ұпай: ${state.score}`,
    `Қалған Эко-қуат: ${state.eco}`,
    "Бұл жоба экологиялық жауапкершілік идеясын көрсетеді.",
  ];
  lines.forEach((line, i) => label(line, 400, 260 + i * 30, 18, colors.white));
  drawCanvasButton(308, 390, 184, 44, "Қайта бастау", colors.green, "#0b2114");
}

function canvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  const y = ((event.clientY - rect.top) / rect.height) * H;
  if (state.screen === "play" && x >= 670 && x <= 774 && y >= 22 && y <= 60) {
    state.screen = "help";
    return;
  }
  if (x >= 612 && x <= 774 && y >= 548 && y <= 586) {
    action();
    return;
  }
  if (state.screen === "menu" && x >= 305 && x <= 495 && y >= 408 && y <= 454) action();
  if (state.screen === "help" && x >= 305 && x <= 495 && y >= 408 && y <= 454) action();
  if (state.screen === "win" && x >= 308 && x <= 492 && y >= 390 && y <= 434) action();
}

function drawCanvasButton(x, y, w, h, text, fill = colors.panel, textColor = colors.white) {
  roundRect(x, y, w, h, 8, fill);
  strokeRound(x, y, w, h, 8, colors.line, 2);
  label(text, x + w / 2, y + h / 2 + 6, 18, textColor, "center", "bold");
}

function panel(x, y, w, h) {
  roundRect(x, y, w, h, 12, colors.panel);
  strokeRound(x, y, w, h, 12, colors.line, 2);
}

function dim() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.67)";
  ctx.fillRect(0, 0, W, H);
}

function label(text, x, y, size = 16, color = colors.white, align = "center", weight = "normal") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function circle(color, x, y, r) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function strokeEllipse(color, x, y, w, h, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function line(color, x1, y1, x2, y2, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function roundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function strokeRound(x, y, w, h, r, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}

let last = performance.now();
function loop(now) {
  const dt = now - last;
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (key === "e" || event.key === " ") action();
  else if (event.key === "Escape") state.screen = state.screen === "help" ? "play" : "help";
  else keys.add(key);
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

canvas.addEventListener("click", canvasClick);

document.querySelector("#touchAction").addEventListener("click", action);
document.querySelectorAll("[data-key]").forEach((button) => {
  const key = button.dataset.key;
  button.addEventListener("pointerdown", () => keys.add(key));
  button.addEventListener("pointerup", () => keys.delete(key));
  button.addEventListener("pointerleave", () => keys.delete(key));
  button.addEventListener("pointercancel", () => keys.delete(key));
});

resetGame();
requestAnimationFrame(loop);
