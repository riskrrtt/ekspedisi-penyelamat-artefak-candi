// ============================================================
//  EKSPEDISI PENYELAMAT ARTEFAK CANDI  — v2  (mobile-optimised)
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const BASE_W = 1280;
const BASE_H = 720;
canvas.width  = BASE_W;
canvas.height = BASE_H;

// ============================================================
//  RESPONSIVE CANVAS — menjaga aspect ratio 16:9 di semua layar
// ============================================================
function resizeCanvas() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scale = Math.min(winW / BASE_W, winH / BASE_H);
  canvas.style.width  = Math.floor(BASE_W * scale) + 'px';
  canvas.style.height = Math.floor(BASE_H * scale) + 'px';
}
resizeCanvas();
window.addEventListener('resize',       resizeCanvas);
window.addEventListener('orientationchange', () => {
  // Beri sedikit delay agar browser selesai merotasi layar
  setTimeout(resizeCanvas, 200);
});

// ============================================================
//  NONAKTIFKAN ZOOM & SCROLL di seluruh halaman
// ============================================================
// Prevent pinch-zoom & double-tap zoom
document.addEventListener('touchstart', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', e => {
  // Cegah double-tap zoom (selisih < 300ms dua tap berturutan)
  const now = Date.now();
  if (now - (document._lastTouch || 0) < 300) e.preventDefault();
  document._lastTouch = now;
}, { passive: false });

document.addEventListener('touchmove', e => {
  e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart',  e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend',    e => e.preventDefault(), { passive: false });

// ============================================================
//  CONSTANTS
// ============================================================
const GROUND_Y   = 610;          // top of ground surface (scaled from 420/506 → ~600/720)
const GROUND_H   = BASE_H - GROUND_Y;
const SPEED      = 200;          // player walk px/s
const JUMP_FORCE = -520;
const GRAVITY    = 1100;
const ANIM_SPEED = 8;            // ticks per run frame

// ============================================================
//  SCENE KEYS
// ============================================================
const SCENE = {
  MENU:     'menu',
  LEVEL1:   'level1',
  DIALOG:   'dialog',    // transition L1 → L2
  LEVEL2:   'level2',
  SCENE3:   'scene3',    // dalam candi
  GAMEOVER: 'gameover',
  ENDING:   'ending',
};
let scene  = SCENE.MENU;
let paused = false;   // pause state

// ============================================================
//  ON-SCREEN CONTROLS STATE
//  Digunakan oleh mouse/touch, hasilnya menyatu dengan keyboard
// ============================================================
const onScreen = { left: false, right: false, up: false };

// ============================================================
//  ASSET LOADER
// ============================================================
const ASSETS = {};
let assetsLoaded = 0;
let assetsTotal  = 0;
let loopStarted  = false;

function loadImage(key, src) {
  assetsTotal++;
  const img  = new Image();
  img.onload = img.onerror = () => {
    assetsLoaded++;
    if (assetsLoaded === assetsTotal) startLoop();
  };
  img.src    = src;
  ASSETS[key] = img;
}

loadImage('menuBg',        'menu/menu_bg.png');
loadImage('logoJudul',     'menu/logo_judul.png');
loadImage('lvl1Bg',        'environment/background and ground/level_1_ground.png');
loadImage('lvl2Bg',        'environment/background and ground/level_2_ground.png');
loadImage('dalamCandi',    'environment/background and ground/dalam_candi-ground.png');
loadImage('scene3Bg',      'environment/background and ground/scene3_bg.png');
loadImage('temple',        'environment/building/temple.png');
loadImage('altar',         'environment/props/altar.png');
loadImage('monster1',      'enemies/monster_1.png');
loadImage('monster2',      'enemies/monster 2.png');
loadImage('bossWalk1',     'character/boss/walk_1.png');
loadImage('bossWalk2',     'character/boss/walk_2.png');
loadImage('bossWalk3',     'character/boss/walk_3.png');
loadImage('bossWalk4',     'character/boss/walk_4.png');
loadImage('bossWalk5',     'character/boss/walk_5.png');
loadImage('bossWalk6',     'character/boss/walk_6.png');
loadImage('artefact1',     'items/artefact_1.png');
loadImage('artefact2',     'items/artefact_2.png');
loadImage('artefact3',     'items/artefact_3.png');
loadImage('templeKey',     'items/temple_key.png');
loadImage('argaIdle',      'character/arga/idle.png');
loadImage('argaRun1',      'character/arga/run_1.png');
loadImage('argaRun2',      'character/arga/run_2.png');
loadImage('argaRun3',      'character/arga/run_3.png');
loadImage('argaRun4',      'character/arga/run_4.png');
loadImage('argaRun5',      'character/arga/run_5.png');
loadImage('argaRun6',      'character/arga/run_6.png');
loadImage('argaRun7',      'character/arga/run_7.png');
// UI buttons
loadImage('btnMulai',        'ui/buttons/mulai_game_menu.png');
loadImage('btnLanjut',       'ui/buttons/lanjut_ke_level_2.png');
loadImage('btnMainLagi',     'ui/buttons/main_lagi_ending.png');
loadImage('btnRestart',      'ui/buttons/mulai_ulang_game_over.png');
loadImage('btnKembali',      'ui/buttons/kembali.png');
loadImage('btnKembaliEnding','ui/buttons/kembali_ending.png');
loadImage('btnLanjutkan',    'ui/buttons/lanjutkan_pause.png');
// UI panels
loadImage('panelDialog',     'ui/panels/dialog_box_BG.png');
loadImage('panelGameOver',   'ui/panels/game_over_BG.png');
loadImage('panelGOTitle',    'ui/panels/game_over.png');
loadImage('panelPause',      'ui/panels/popup_pause.png');
// UI controls
loadImage('ctrlLeft',  'ui/controls/arrow_left.png');
loadImage('ctrlRight', 'ui/controls/arrow_right.png');
loadImage('ctrlUp',    'ui/controls/arrow_up.png');
loadImage('ctrlPause', 'ui/controls/pause.png');
// UI icons (HUD)
loadImage('iconHeart',     'ui/icons/heart.png');
loadImage('iconArtefact1', 'ui/icons/artefact_1.png');
loadImage('iconArtefact2', 'ui/icons/artefact_2.png');
loadImage('iconArtefact3', 'ui/icons/artefact_3.png');
loadImage('iconKey',       'ui/icons/temple_key.png');

const RUN_FRAMES = [
  'argaRun1','argaRun2','argaRun3','argaRun4',
  'argaRun5','argaRun6','argaRun7',
];

const BOSS_WALK_FRAMES = [
  'bossWalk1','bossWalk2','bossWalk3',
  'bossWalk4','bossWalk5','bossWalk6',
];
const BOSS_ANIM_SPEED = 7; // ticks per frame

// ============================================================
//  AUDIO SYSTEM
// ============================================================
const AUDIO = {};

function loadAudio(key, src) {
  const a = new Audio(src);
  a.preload = 'auto';
  AUDIO[key] = a;
}


loadAudio('bgmLevel',    'audio/BGM/level_1_dan_level_2.mp3');
loadAudio('sfxJump',     'audio/SFX/jump.mp3');
loadAudio('sfxCollect',  'audio/SFX/collect_item.mp3');
loadAudio('sfxHit',      'audio/SFX/damage_hit.mp3');
loadAudio('sfxButton',   'audio/SFX/button_click.mp3');
loadAudio('sfxVictory',  'audio/SFX/victory.mp3');

let bgmPlaying = null;  // key of currently playing BGM

function playBGM(key) {
  if (bgmPlaying === key) return;
  // Stop current BGM
  if (bgmPlaying && AUDIO[bgmPlaying]) {
    AUDIO[bgmPlaying].pause();
    AUDIO[bgmPlaying].currentTime = 0;
  }
  bgmPlaying = key;
  if (!AUDIO[key]) return;
  AUDIO[key].loop   = true;
  AUDIO[key].volume = 0.5;
  AUDIO[key].play().catch(() => {}); // autoplay policy safeguard
}

function stopBGM() {
  if (bgmPlaying && AUDIO[bgmPlaying]) {
    AUDIO[bgmPlaying].pause();
    AUDIO[bgmPlaying].currentTime = 0;
  }
  bgmPlaying = null;
}

function playSFX(key) {
  if (!AUDIO[key]) return;
  // Clone for rapid re-trigger
  const clone = AUDIO[key].cloneNode();
  clone.volume = 0.7;
  clone.play().catch(() => {});
}

// Fallback after 3 s if images are slow / missing
setTimeout(() => { if (!loopStarted) startLoop(); }, 3000);

// ============================================================
//  INPUT
// ============================================================
const keys        = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  if (!keys[e.code]) justPressed[e.code] = true;
  keys[e.code] = true;
  // Prevent page scroll on Space / arrows
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function clearJustPressed() {
  for (const k in justPressed) delete justPressed[k];
}

// Mouse
const mouse = { x: 0, y: 0, clicked: false };

function toGameCoords(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) * (BASE_W / r.width),
    y: (clientY - r.top)  * (BASE_H / r.height),
  };
}

canvas.addEventListener('mousemove', e => {
  const p = toGameCoords(e.clientX, e.clientY);
  mouse.x = p.x; mouse.y = p.y;
});
canvas.addEventListener('click', e => {
  const p = toGameCoords(e.clientX, e.clientY);
  mouse.x = p.x; mouse.y = p.y;
  mouse.clicked = true;
});

// Tangkap tap (touchend) sebagai klik untuk tombol UI di menu/dialog/ending
canvas.addEventListener('touchend', e => {
  if (e.changedTouches.length > 0) {
    const t = e.changedTouches[0];
    const p = toGameCoords(t.clientX, t.clientY);
    mouse.x = p.x; mouse.y = p.y;
    mouse.clicked = true;
  }
}, { passive: true });

// ============================================================
//  UTILITY
// ============================================================
function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function imgOk(key) {
  return ASSETS[key] && ASSETS[key].naturalWidth > 0;
}

function drawRoundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);      ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
  if (fill)   { ctx.fillStyle   = fill;   ctx.fill();   }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

// Draw sprite with optional horizontal flip.
// Inherits current ctx state (globalAlpha, etc.) from caller.
function drawSprite(key, x, y, w, h, flipX) {
  if (!imgOk(key)) {
    ctx.fillStyle = '#f88';
    ctx.fillRect(x, y, w, h);
    return;
  }
  if (flipX) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(ASSETS[key], 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(ASSETS[key], x, y, w, h);
  }
}

// Draw a UI button using image asset, with hover scale effect.
// Returns true if the button was clicked this frame.
function drawButton(key, cx, cy, w, h) {
  // Tambah padding area sentuh untuk mobile (hit area lebih besar dari visual)
  const touchPad = 14;
  const hov = mouse.x >= cx - w / 2 - touchPad && mouse.x <= cx + w / 2 + touchPad &&
              mouse.y >= cy - h / 2 - touchPad && mouse.y <= cy + h / 2 + touchPad;
  ctx.save();
  if (hov) {
    ctx.translate(cx, cy);
    ctx.scale(1.05, 1.05);
    ctx.translate(-cx, -cy);
  }
  if (imgOk(key)) {
    ctx.drawImage(ASSETS[key], cx - w / 2, cy - h / 2, w, h);
  } else {
    // Fallback coloured rect
    drawRoundRect(cx - w / 2, cy - h / 2, w, h, 10,
      hov ? 'rgba(255,193,7,0.9)' : 'rgba(100,60,0,0.85)', '#ffd166');
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(key, cx, cy + 6);
  }
  ctx.restore();
  return mouse.clicked && hov;
}

// Draw a panel using image asset as background (stretched).
function drawPanel(key, x, y, w, h) {
  if (imgOk(key)) {
    ctx.drawImage(ASSETS[key], x, y, w, h);
  } else {
    drawRoundRect(x, y, w, h, 14, 'rgba(10,6,2,0.88)', '#8a6020');
  }
}

// ============================================================
//  NOTIFICATIONS
// ============================================================
let notifications = [];

function addNotif(text, dur = 2.5) {
  // Avoid identical consecutive messages
  if (notifications.length && notifications[notifications.length - 1].text === text) return;
  notifications.push({ text, timer: dur });
}

function updateNotifs(dt) {
  notifications = notifications.filter(n => { n.timer -= dt; return n.timer > 0; });
  updateParticles(dt);
}

function drawNotifs() {
  let ny = BASE_H / 2 - 40;
  for (const n of notifications) {
    const a = Math.min(1, n.timer / 0.5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font        = 'bold 26px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#ffe066';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
    ctx.fillText(n.text, BASE_W / 2, ny);
    ctx.restore();
    ny += 42;
  }
}

// ============================================================
//  HUD
// ============================================================
//  HUD
// ============================================================
function drawHUD() {
  ctx.save();

  // --- Panel background ---
  const PX = 14, PY = 14, PW = 340, PH = 124;
  drawRoundRect(PX, PY, PW, PH, 12, null, 'rgba(180,140,40,0.6)');
  drawRoundRect(PX + 2, PY + 2, PW - 4, PH - 4, 10,
    'rgba(10,8,4,0.72)', 'rgba(120,90,20,0.5)');

  const LX    = PX + 14;   // left margin dalam panel
  const ICON  = 26;        // ukuran icon PNG
  const LABEL_COLOR = 'rgba(255,220,120,0.9)';

  ctx.font      = 'bold 15px sans-serif';
  ctx.textAlign = 'left';

  // ── Row 1: HP ──────────────────────────────────────────
  const hpY = PY + 20;
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText('HP', LX, hpY + ICON * 0.72);

  for (let i = 0; i < player.maxHp; i++) {
    const ix = LX + 34 + i * (ICON + 6);
    ctx.save();
    ctx.globalAlpha = i < player.hp ? 1 : 0.2;
    // Glow merah saat HP aktif
    if (i < player.hp) {
      ctx.shadowColor = '#ff000088';
      ctx.shadowBlur  = 8;
    }
    drawSprite('iconHeart', ix, hpY, ICON, ICON, false);
    ctx.restore();
  }

  // ── Row 2: Artefak ─────────────────────────────────────
  const artY = PY + 52;
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText('Artefak', LX, artY + ICON * 0.72);

  const artKeys = ['iconArtefact1', 'iconArtefact2', 'iconArtefact3'];
  for (let i = 0; i < 3; i++) {
    const ix = LX + 78 + i * (ICON + 6);
    ctx.save();
    ctx.globalAlpha = i < player.artefacts ? 1 : 0.2;
    if (i < player.artefacts) {
      ctx.shadowColor = '#ffd70088';
      ctx.shadowBlur  = 7;
    }
    drawSprite(artKeys[i], ix, artY, ICON, ICON, false);
    ctx.restore();
  }

  ctx.font      = 'bold 15px sans-serif';
  ctx.fillStyle = player.artefacts === 3 ? '#06d6a0' : '#ffd166';
  ctx.fillText(`${player.artefacts}/3`, LX + 78 + 3 * (ICON + 6) + 4, artY + ICON * 0.72);

  // ── Row 3: Kunci ───────────────────────────────────────
  const keyY = PY + 84;
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText('Kunci', LX, keyY + ICON * 0.72);

  ctx.save();
  ctx.globalAlpha = player.hasKey ? 1 : 0.2;
  if (player.hasKey) {
    ctx.shadowColor = '#ffe06688';
    ctx.shadowBlur  = 7;
  }
  drawSprite('iconKey', LX + 60, keyY, ICON, ICON, false);
  ctx.restore();

  ctx.font      = 'bold 15px sans-serif';
  ctx.fillStyle = player.hasKey ? '#06d6a0' : '#888';
  ctx.fillText(player.hasKey ? 'Didapat' : 'Belum', LX + 60 + ICON + 6, keyY + ICON * 0.72);

  ctx.restore();
}

// ============================================================
//  ON-SCREEN CONTROLS  (draw + hit-test)
// ============================================================
// Ukuran tombol lebih besar untuk kemudahan menyentuh di HP
const CTRL_SIZE    = 80;    // ukuran visual gambar tombol
const CTRL_HIT_PAD = 18;    // padding area sentuh tambahan di luar gambar

const CTRL = {
  left:  { x: 130,                      y: BASE_H - CTRL_SIZE - 50 },
  right: { x: 150 + CTRL_SIZE + 14,     y: BASE_H - CTRL_SIZE - 50 },
  up:    { x: BASE_W - CTRL_SIZE - 140,  y: BASE_H - CTRL_SIZE - 50 },
  pause: { x: BASE_W - CTRL_SIZE - 16,  y: 14 },
};

function drawOnScreenControls() {
  ctx.save();
  ctx.globalAlpha = 0.72;

  // Kiri
  if (imgOk('ctrlLeft'))  ctx.drawImage(ASSETS['ctrlLeft'],  CTRL.left.x,  CTRL.left.y,  CTRL_SIZE, CTRL_SIZE);
  // Kanan
  if (imgOk('ctrlRight')) ctx.drawImage(ASSETS['ctrlRight'], CTRL.right.x, CTRL.right.y, CTRL_SIZE, CTRL_SIZE);
  // Atas (lompat)
  if (imgOk('ctrlUp'))    ctx.drawImage(ASSETS['ctrlUp'],    CTRL.up.x,    CTRL.up.y,    CTRL_SIZE, CTRL_SIZE);

  ctx.restore();
}

function drawPauseButton() {
  ctx.save();
  ctx.globalAlpha = 0.8;
  if (imgOk('ctrlPause')) ctx.drawImage(ASSETS['ctrlPause'], CTRL.pause.x, CTRL.pause.y, CTRL_SIZE, CTRL_SIZE);
  ctx.restore();
}

// Cek apakah titik (px, py) mengenai kontrol — dengan hit-padding tambahan
function hitCtrl(ctrl, px, py) {
  const pad = CTRL_HIT_PAD;
  return px >= ctrl.x - pad && px <= ctrl.x + CTRL_SIZE + pad &&
         py >= ctrl.y - pad && py <= ctrl.y + CTRL_SIZE + pad;
}

// Setup pointer events untuk on-screen controls
// Dipanggil sekali saat game dimulai
(function setupOnScreenControls() {
  const activePointers = new Map();  // pointerId → 'left'|'right'|'up'|'pause'

  function evalPoint(id, clientX, clientY, down) {
    if (!down) {
      const prev = activePointers.get(id);
      if (prev === 'left')  onScreen.left  = false;
      if (prev === 'right') onScreen.right = false;
      if (prev === 'up')    onScreen.up    = false;
      activePointers.delete(id);
      return;
    }
    // Konversi ke koordinat game (dengan memperhitungkan CSS scaling)
    const p  = toGameCoords(clientX, clientY);
    const sx = p.x;
    const sy = p.y;

    let hit = null;
    if (hitCtrl(CTRL.left,  sx, sy)) hit = 'left';
    else if (hitCtrl(CTRL.right, sx, sy)) hit = 'right';
    else if (hitCtrl(CTRL.up,    sx, sy)) hit = 'up';
    else if (hitCtrl(CTRL.pause, sx, sy)) hit = 'pause';

    const prev = activePointers.get(id);
    if (prev === 'left')  onScreen.left  = false;
    if (prev === 'right') onScreen.right = false;
    if (prev === 'up')    onScreen.up    = false;

    if (hit === 'left')  onScreen.left  = true;
    if (hit === 'right') onScreen.right = true;
    if (hit === 'up') {
      // Jump: hanya trigger sekali per press
      if (prev !== 'up') justPressed['Space'] = true;
      onScreen.up = true;
    }
    if (hit === 'pause' && prev !== 'pause') {
      togglePause();
    }

    if (hit) activePointers.set(id, hit);
    else     activePointers.delete(id);
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    evalPoint(e.pointerId, e.clientX, e.clientY, true);
  }, { passive: false });
  canvas.addEventListener('pointermove', e => {
    e.preventDefault();
    if (activePointers.has(e.pointerId))
      evalPoint(e.pointerId, e.clientX, e.clientY, true);
  }, { passive: false });
  canvas.addEventListener('pointerup',   e => { e.preventDefault(); evalPoint(e.pointerId, e.clientX, e.clientY, false); }, { passive: false });
  canvas.addEventListener('pointercancel', e => { e.preventDefault(); evalPoint(e.pointerId, e.clientX, e.clientY, false); }, { passive: false });
})();

// ============================================================
//  PAUSE SYSTEM
// ============================================================
function togglePause() {
  if (scene !== SCENE.LEVEL1 && scene !== SCENE.LEVEL2 && scene !== SCENE.SCENE3) return;
  paused = !paused;
  if (paused) {
    // Pause BGM
    if (bgmPlaying && AUDIO[bgmPlaying]) AUDIO[bgmPlaying].pause();
  } else {
    // Resume BGM
    if (bgmPlaying && AUDIO[bgmPlaying]) AUDIO[bgmPlaying].play().catch(() => {});
  }
}

function drawPauseOverlay() {
  // Overlay gelap
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel popup pause — tengah layar
  const pw = 520, ph = 320;
  const px = BASE_W / 2 - pw / 2;
  const py = BASE_H / 2 - ph / 2;
  drawPanel('panelPause', px, py, pw, ph);

  // Teks PAUSE
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 36px serif';
  ctx.fillStyle   = '#ffd166';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
  ctx.fillText('PAUSE', BASE_W / 2, py + 76);
  ctx.restore();

  // Tombol Lanjutkan
  if (drawButton('btnLanjutkan', BASE_W / 2, py + 160, 280, 70)) {
    playSFX('sfxButton');
    togglePause();
  }

  // Tombol Kembali ke Menu
  if (drawButton('btnKembali', BASE_W / 2, py + 248, 280, 70)) {
    playSFX('sfxButton');
    paused = false;
    stopBGM();
    scene = SCENE.MENU;
  }
}

// Keyboard shortcut pause: Escape atau P
window.addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
});

// ============================================================
//  PLAYER
// ============================================================
function createPlayer(startX) {
  return {
    x: startX || 60,
    y: GROUND_Y - 72,
    w: 56, h: 72,
    vx: 0, vy: 0,
    onGround: true,
    facingRight: true,
    hp: 3, maxHp: 3,
    invincible: 0,
    knockback: 0,
    state: 'idle',   // idle | run | jump
    frame: 0,
    frameTick: 0,
    artefacts: 0,
    hasKey: false,
  };
}

let player = createPlayer();

function updatePlayer(dt) {
  // --- Knockback decay ---
  if (player.knockback > 0) {
    player.knockback -= dt;
    player.vx *= 0.82;
  } else {
    const left  = keys['ArrowLeft']  || keys['KeyA'] || onScreen.left;
    const right = keys['ArrowRight'] || keys['KeyD'] || onScreen.right;
    if (left)       { player.vx = -SPEED; player.facingRight = false; }
    else if (right) { player.vx =  SPEED; player.facingRight = true;  }
    else            { player.vx =  0; }
  }

  // --- Jump ---
  const wantJump = justPressed['Space'] || justPressed['ArrowUp'] || justPressed['KeyW'] || onScreen.up;
  if (wantJump && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    playSFX('sfxJump');
  }

  // --- Gravity ---
  player.vy += GRAVITY * dt;
  if (player.vy > 900) player.vy = 900;

  // --- Move X ---
  player.x += player.vx * dt;
  // Clamp left edge; right edge clamped per-level to allow exit trigger
  if (player.x < 0) player.x = 0;

  // --- Move Y + ground collision ---
  player.y += player.vy * dt;
  player.onGround = false;
  if (player.y + player.h >= GROUND_Y) {
    player.y        = GROUND_Y - player.h;
    player.vy       = 0;
    player.onGround = true;
  }

  // --- Invincibility ---
  if (player.invincible > 0) player.invincible -= dt;

  // --- Animation state ---
  if (!player.onGround) {
    player.state = 'jump';
  } else if (Math.abs(player.vx) > 10) {
    player.state = 'run';
    player.frameTick++;
    if (player.frameTick >= ANIM_SPEED) {
      player.frameTick = 0;
      player.frame = (player.frame + 1) % RUN_FRAMES.length;
    }
  } else {
    player.state     = 'idle';
    player.frame     = 0;
    player.frameTick = 0;
  }
}

function drawPlayer() {
  // Flicker during invincibility
  if (player.invincible > 0 && Math.floor(player.invincible * 10) % 2 === 0) return;

  let key = 'argaIdle';
  if (player.state === 'run')  key = RUN_FRAMES[player.frame];
  if (player.state === 'jump') key = 'argaRun4';

  // Flip when facing left
  drawSprite(key, player.x, player.y, player.w, player.h, !player.facingRight);
}

function damagePlayer(knockDir) {
  if (player.invincible > 0) return;
  player.hp--;
  player.invincible = 1.5;
  player.knockback  = 0.35;
  player.vx = knockDir * 180;
  player.vy = -220;
  playSFX('sfxHit');
}

// ============================================================
//  STOMP CHECK
//  Player must be falling AND feet overlap top-half of target
// ============================================================
function checkStomp(target) {
  if (player.vy < 60) return false;
  const pFeet = player.y + player.h;
  const tTop  = target.y;
  const tMid  = target.y + target.h * 0.5;
  const hOk   = player.x + player.w - 6 > target.x &&
                player.x + 6 < target.x + target.w;
  const vOk   = pFeet >= tTop - 2 && pFeet <= tMid + 10;
  return hOk && vOk;
}

// ============================================================
//  ENEMY
// ============================================================
function createEnemy(x, type, artefactKey, patrolRange, speed) {
  const range = patrolRange || 100;
  return {
    x, y: GROUND_Y - 60,
    w: 60, h: 60,
    alive: true,
    type,
    vx: speed || 70,
    dir: 1,               // 1 = moving right, -1 = moving left
    patrolLeft:  x - range,
    patrolRight: x + range,
    artefactKey,
    deadTimer: 0,
    blinkTimer: 0,
  };
}

function updateEnemy(e, dt) {
  if (!e.alive) { e.deadTimer += dt; return; }

  e.x += e.vx * e.dir * dt;

  // Reverse at patrol edges
  if (e.x <= e.patrolLeft)  { e.x = e.patrolLeft;  e.dir =  1; }
  if (e.x >= e.patrolRight) { e.x = e.patrolRight; e.dir = -1; }

  // Keep on ground (no platforming)
  e.y = GROUND_Y - e.h;

  if (e.blinkTimer > 0) e.blinkTimer -= dt;
}

function drawEnemy(e) {
  if (e.deadTimer > 0.6) return;
  const alpha = e.alive ? 1 : Math.max(0, 1 - e.deadTimer / 0.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (e.blinkTimer > 0 && Math.floor(e.blinkTimer * 12) % 2 === 0) ctx.globalAlpha = 0.1;

  // dir 1 = moving right → face right (no flip)
  // dir -1 = moving left → face left (flip)
  drawSprite(e.type, e.x, e.y, e.w, e.h, e.dir < 0);

  ctx.restore();
}

// ============================================================
//  BOSS
// ============================================================
function createBoss(x) {
  return {
    x, y: GROUND_Y - 90,
    w: 90, h: 90,
    hp: 3, maxHp: 3,
    alive: true,
    vx: 90,
    dir: 1,
    invincible: 0,
    blinkTimer: 0,
    deadTimer: 0,
    stunTimer: 0,   // > 0 = boss sedang stun, tidak bergerak & tidak damage
    frame: 0,
    frameTick: 0,
  };
}

function updateBoss(b, dt) {
  if (!b.alive) { b.deadTimer += dt; return; }

  // Stun countdown — saat stun boss diam
  if (b.stunTimer > 0) {
    b.stunTimer -= dt;
    b.y = GROUND_Y - b.h;
    if (b.blinkTimer > 0) b.blinkTimer -= dt;
    if (b.invincible > 0) b.invincible -= dt;
    return;  // skip movement & anim
  }

  b.x += b.vx * b.dir * dt;

  // Patrol hanya di area tengah — tidak masuk area temple (kanan) maupun terlalu kiri
  if (b.x <= 300)    { b.x = 300;  b.dir =  1; }
  if (b.x >= 900)    { b.x = 900;  b.dir = -1; }

  b.y = GROUND_Y - b.h;

  // Walk animation tick
  b.frameTick++;
  if (b.frameTick >= BOSS_ANIM_SPEED) {
    b.frameTick = 0;
    b.frame = (b.frame + 1) % BOSS_WALK_FRAMES.length;
  }

  if (b.blinkTimer > 0) b.blinkTimer -= dt;
  if (b.invincible > 0) b.invincible -= dt;
}

function drawBoss(b) {
  if (b.deadTimer > 0.9) return;
  const alpha = b.alive ? 1 : Math.max(0, 1 - b.deadTimer / 0.9);
  const frameKey = BOSS_WALK_FRAMES[b.frame];

  ctx.save();

  if (b.stunTimer > 0) {
    // Saat stun: sprite normal lalu overlay merah transparan menggunakan
    // source-atop sehingga tint mengikuti bentuk sprite, bukan kotak
    ctx.globalAlpha = alpha;
    drawSprite(frameKey, b.x, b.y, b.w, b.h, b.dir < 0);

    // Berkedip lambat — setiap ~0.15 s berganti
    const showTint = Math.floor(b.stunTimer * 7) % 2 === 0;
    if (showTint) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.42;
      ctx.fillStyle   = '#ff4444';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }

  } else if (b.blinkTimer > 0) {
    // Hit blink: sprite berkedip putih singkat (invincibility frames)
    const showWhite = Math.floor(b.blinkTimer * 14) % 2 === 0;
    ctx.globalAlpha = showWhite ? 0.15 : alpha;
    drawSprite(frameKey, b.x, b.y, b.w, b.h, b.dir < 0);

    if (showWhite && alpha > 0.1) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }

  } else {
    // Normal
    ctx.globalAlpha = alpha;
    drawSprite(frameKey, b.x, b.y, b.w, b.h, b.dir < 0);
  }

  ctx.restore();

  // HP bar — tanpa nama boss
  if (b.alive) {
    const bw = 120, bh = 12;
    const bx = b.x + b.w / 2 - bw / 2;
    const by = b.y - 22;
    ctx.fillStyle = '#300'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#500'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = b.hp > 1 ? '#e22' : '#ff6600';
    ctx.fillRect(bx, by, bw * (b.hp / b.maxHp), bh);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    if (b.stunTimer > 0) {
      ctx.font        = 'bold 11px sans-serif';
      ctx.fillStyle   = '#ff8888';
      ctx.textAlign   = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
      ctx.fillText('STUN', b.x + b.w / 2, by - 3);
      ctx.shadowBlur  = 0;
    }
  }
}

function stompBoss(b) {
  if (b.invincible > 0) return false;
  b.hp--;
  b.blinkTimer = 0.8;
  b.invincible = 1.2;
  b.stunTimer  = 1.0;   // 1 detik stun — boss diam & tidak damage
  if (b.hp <= 0) { b.alive = false; b.stunTimer = 0; }
  playSFX('sfxHit');
  return true;
}

// ============================================================
//  COLLECTIBLE
// ============================================================
//  COLLECTIBLE  — fisika drop + glow + partikel
// ============================================================

// Partikel emas kecil
function createParticles(x, y, color) {
  const arr = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.4;
    const spd   = 40 + Math.random() * 60;
    arr.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 60,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      r: 2 + Math.random() * 2,
      color,
    });
  }
  return arr;
}

// Global partikel pool
let particles = [];

function updateParticles(dt) {
  particles = particles.filter(p => {
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.vy += 300 * dt;   // gravity
    p.life -= dt;
    return p.life > 0;
  });
}

function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha  = a;
    ctx.fillStyle    = p.color;
    ctx.shadowColor  = p.color;
    ctx.shadowBlur   = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * createCollectible — item dengan fisika drop
 * @param {number} x      - posisi spawn X
 * @param {number} y      - posisi spawn Y
 * @param {string} type   - key aset
 * @param {number} vx     - kecepatan awal horizontal (px/s)
 * @param {number} vy     - kecepatan awal vertikal (px/s, negatif = ke atas)
 */
function createCollectible(x, y, type, vx, vy) {
  return {
    x, y,
    w: 44, h: 44,
    type,
    vx: vx !== undefined ? vx : 0,
    vy: vy !== undefined ? vy : 0,
    landed: false,      // false = sedang melayang, belum bisa diambil
    collected: false,
    bobT: 0,
  };
}

function updateCollectible(c, dt) {
  if (c.collected) return;

  if (!c.landed) {
    // Fisika sederhana
    c.vy += 700 * dt;           // gravity
    c.x  += c.vx * dt;
    c.y  += c.vy * dt;

    // Cek mendarat di tanah
    if (c.y + c.h >= GROUND_Y) {
      c.y  = GROUND_Y - c.h;
      c.vy = 0;
      c.vx = 0;
      c.landed = true;
      // Burst partikel saat mendarat
      const color = c.type === 'templeKey' ? '#ffe066' : '#ffd700';
      particles.push(...createParticles(c.x + c.w / 2, c.y, color));
    }

    // Clamp ke dalam canvas
    if (c.x < 0)               c.x = 0;
    if (c.x + c.w > BASE_W)    c.x = BASE_W - c.w;
  } else {
    // Animasi mengambang setelah mendarat
    c.bobT += dt;
  }
}

function drawCollectible(c) {
  if (c.collected) return;

  if (!c.landed) {
    // Sedang jatuh — gambar biasa, tanpa glow
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawSprite(c.type, c.x, c.y, c.w, c.h, false);
    ctx.restore();
    return;
  }

  // Sudah mendarat — glow + bob
  const t     = c.bobT;
  const bob   = Math.sin(t * 3) * 4;
  const gAlpha = 0.55 + Math.sin(t * 4) * 0.35;
  const isKey  = c.type === 'templeKey';
  const glowColor = isKey ? '#ffe066' : '#ffd700';

  ctx.save();

  // Shadow glow di bawah
  ctx.shadowColor  = glowColor;
  ctx.shadowBlur   = 18;
  ctx.globalAlpha  = gAlpha;
  drawSprite(c.type, c.x, c.y + bob, c.w, c.h, false);

  // Lapisan glow tambahan — lebih terang
  ctx.shadowBlur   = 32;
  ctx.globalAlpha  = gAlpha * 0.5;
  drawSprite(c.type, c.x, c.y + bob, c.w, c.h, false);

  ctx.restore();
}

// ============================================================
//  TEMPLE DOOR (Level 2 exit)
//  Proporsional dengan player/boss, ujung kanan map
// ============================================================
const TEMPLE_W = 200;
const TEMPLE_H = 260;   // proporsional di 1280×720
const TEMPLE_X = BASE_W - TEMPLE_W - 10;

function createTempleDoor() {
  return {
    x: TEMPLE_X + 20,
    y: GROUND_Y - TEMPLE_H,
    w: TEMPLE_W - 20,
    h: TEMPLE_H,
  };
}

function drawTempleDoor(unlocked) {
  const tx = TEMPLE_X;
  const ty = GROUND_Y - TEMPLE_H;

  ctx.save();

  if (imgOk('temple')) {
    ctx.drawImage(ASSETS['temple'], tx, ty, TEMPLE_W, TEMPLE_H);
  } else {
    // Fallback shape
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(tx, ty, TEMPLE_W, TEMPLE_H);
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(tx + 55, ty + 60, 70, TEMPLE_H - 60);
  }

  // Glow effect saat unlocked
  if (unlocked) {
    const t   = Date.now() / 500;
    const gAlpha = 0.25 + 0.18 * Math.sin(t);

    // Radial glow di tengah pintu
    const cx  = tx + TEMPLE_W / 2;
    const cy  = ty + TEMPLE_H * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 90);
    grad.addColorStop(0,   `rgba(255,220,80,${gAlpha + 0.15})`);
    grad.addColorStop(0.5, `rgba(255,160,20,${gAlpha})`);
    grad.addColorStop(1,   'rgba(255,100,0,0)');
    ctx.fillStyle   = grad;
    ctx.fillRect(tx, ty, TEMPLE_W, TEMPLE_H);

    // Arrow hint
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 1.5);
    ctx.font        = 'bold 18px sans-serif';
    ctx.fillStyle   = '#ffe066';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.fillText('▶ MASUK', tx + TEMPLE_W / 2, ty - 10);
  }

  ctx.restore();
}

// ============================================================
//  ALTAR (Scene 3)
// ============================================================
function createAltar(x) {
  return { x, y: GROUND_Y - 110, w: 110, h: 110 };
}

function drawAltar(altar) {
  drawSprite('altar', altar.x, altar.y, altar.w, altar.h, false);
  // Glow
  ctx.save();
  ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 400);
  ctx.fillStyle   = '#ffd166';
  ctx.fillRect(altar.x, altar.y, altar.w, altar.h);
  ctx.restore();

  ctx.save();
  ctx.font      = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.restore();
}

// ============================================================
//  BACKGROUND HELPERS
// ============================================================
function drawBg(key, fallbackColor) {
  if (imgOk(key)) {
    ctx.drawImage(ASSETS[key], 0, 0, BASE_W, BASE_H);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(0, GROUND_Y, BASE_W, GROUND_H);
  }
}

// ============================================================
//  LEVEL 1
// ============================================================
let L1 = null;

function initLevel1() {
  player = createPlayer(60);
  L1 = {
    enemies: [
      // Monster 1 (Ular) — lambat, patroli pendek
      createEnemy(420, 'monster1', 'artefact1', 100,  50),
      // Monster 2 (Serangga) — cepat, patroli jauh
      createEnemy(800, 'monster2', 'artefact2', 180, 90),
    ],
    collectibles: [],
    allClear: false,
    exitMsgShown: false,
  };
  particles = [];
  notifications = [];
  scene = SCENE.LEVEL1;
  playBGM('bgmLevel');
}

function updateLevel1(dt) {
  updatePlayer(dt);
  updateNotifs(dt);

  const p = player;

  // Right wall — only passable when allClear
  if (!L1.allClear && p.x + p.w > BASE_W - 10) {
    p.x = BASE_W - p.w - 10;
    if (!L1.exitMsgShown) {
      addNotif('Kalahkan semua monster dan ambil artefak dulu!');
      L1.exitMsgShown = true;
      setTimeout(() => { if (L1) L1.exitMsgShown = false; }, 3500);
    }
  }

  // Enemies
  for (const e of L1.enemies) {
    updateEnemy(e, dt);
    if (!e.alive) continue;

    if (checkStomp(e)) {
      e.alive = false;
      player.vy = -370;
      addNotif('Musuh dikalahkan!');
      playSFX('sfxHit');
      // Drop artefak dengan fisika terlempar
      const throwVx = (Math.random() - 0.5) * 160;  // -80 ~ +80
      L1.collectibles.push(createCollectible(
        e.x + e.w / 2 - 16,
        e.y,
        e.artefactKey,
        throwVx,
        -200
      ));
    } else if (rectOverlap(p, e)) {
      damagePlayer(p.x < e.x ? -1 : 1);
    }
  }

  // Collectibles
  for (const c of L1.collectibles) {
    updateCollectible(c, dt);
    if (!c.collected && c.landed && rectOverlap(p, c)) {
      c.collected = true;
      p.artefacts++;
      addNotif('Artefak ditemukan!');
      playSFX('sfxCollect');
    }
  }

  // Check clear condition
  const allEnemiesDead    = L1.enemies.every(e => !e.alive);
  const allArtefactsTaken = p.artefacts >= 2;
  L1.allClear = allEnemiesDead && allArtefactsTaken;

  // Exit: reach right edge when clear → dialog
  if (L1.allClear && p.x + p.w >= BASE_W - 5) {
    dialogAlpha = 0;
    stopBGM();
    scene = SCENE.DIALOG;
  }

  if (p.hp <= 0) { stopBGM(); scene = SCENE.GAMEOVER; }
}

function drawLevel1() {
  drawBg('lvl1Bg', '#2d5a1a');

  for (const e of L1.enemies) drawEnemy(e);
  for (const c of L1.collectibles) drawCollectible(c);
  drawParticles();

  // Right-edge arrow hint when clear
  if (L1.allClear) {
    ctx.save();
    ctx.font      = 'bold 28px sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'right';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillText('▶▶ LANJUT', BASE_W - 10, GROUND_Y - 20);
    ctx.restore();
  }

  drawPlayer();
  drawHUD();
  drawOnScreenControls();
  drawPauseButton();
  drawNotifs();
}

// ============================================================
//  DIALOG — transition L1 → L2
// ============================================================
let dialogAlpha = 0;

function initDialog() {
  dialogAlpha = 0;
  scene       = SCENE.DIALOG;
}

function updateDialog(dt) {
  dialogAlpha = Math.min(1, dialogAlpha + dt * 1.6);
}

function drawDialog() {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  ctx.save();
  ctx.globalAlpha = dialogAlpha;

  // Panel dialog — tengah layar
  const pw = 820, ph = 300;
  const px = BASE_W / 2 - pw / 2;
  const py = BASE_H / 2 - ph / 2 - 20;
  drawPanel('panelDialog', px, py, pw, ph);

  ctx.textAlign   = 'center';
  ctx.font        = 'italic 26px serif';
  ctx.fillStyle   = '#ffd166';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
  ctx.fillText('"Dua artefak berhasil ditemukan…', BASE_W / 2, py + 100);
  ctx.fillText('satu artefak lagi ada di dalam reruntuhan."', BASE_W / 2, py + 142);

  ctx.font      = '18px sans-serif';
  ctx.fillStyle = '#bbb';
  ctx.shadowBlur = 0;
  ctx.fillText('— Arga meneruskan perjalanan ke reruntuhan candi —', BASE_W / 2, py + 190);

  ctx.restore();

  // Dua tombol: Lanjut ke Level 2 | Kembali ke Menu
  const btnY    = py + ph + 54;
  const btnW    = 260, btnH = 74;
  const gap     = 24;

  if (drawButton('btnLanjut', BASE_W / 2 - btnW / 2 - gap / 2, btnY, btnW, btnH)) {
    playSFX('sfxButton');
    initLevel2();
  }
  if (drawButton('btnKembali', BASE_W / 2 + btnW / 2 + gap / 2, btnY, btnW, btnH)) {
    playSFX('sfxButton');
    dialogAlpha = 0;
    scene = SCENE.MENU;
  }
}

// ============================================================
//  LEVEL 2
// ============================================================
let L2 = null;

function initLevel2() {
  const prevArtefacts = player.artefacts;
  const prevHp        = player.hp;          // bawa HP dari Level 1
  player = createPlayer(60);
  player.artefacts = prevArtefacts;
  // Bawa HP dari Level 1, maksimum tetap 3
  player.hp = Math.min(player.maxHp, prevHp);

  L2 = {
    boss: createBoss(680),
    collectibles: [],
    bossDefeated: false,
    templeDoor: createTempleDoor(),   // ukuran besar di ujung kanan
    doorMsgShown: false,
  };
  particles = [];
  notifications = [];
  scene = SCENE.LEVEL2;
  playBGM('bgmLevel');
}

function updateLevel2(dt) {
  updatePlayer(dt);
  updateNotifs(dt);

  const p  = player;
  const b  = L2.boss;
  const td = L2.templeDoor;

  // Boss logic
  if (b) {
    updateBoss(b, dt);

    if (b.alive) {
      if (checkStomp(b)) {
        if (stompBoss(b)) {
          player.vy = -390;
          addNotif(b.alive ? `Boss HP: ${b.hp}` : 'Boss dikalahkan!');
        }
      } else if (b.stunTimer <= 0 && rectOverlap(p, b)) {
        // Boss hanya damage player kalau tidak stun
        damagePlayer(p.x < b.x ? -1 : 1);
        playSFX('sfxHit');
      }
    }

    // Spawn drops on first death frame
    if (!b.alive && !L2.bossDefeated) {
      L2.bossDefeated = true;
      // Artefak 3 → terlempar ke kiri
      L2.collectibles.push(createCollectible(
        b.x + b.w / 2 - 16, b.y,
        'artefact3', -110, -240
      ));
      // Kunci → terlempar ke kanan
      L2.collectibles.push(createCollectible(
        b.x + b.w / 2 - 16, b.y,
        'templeKey', 110, -240
      ));
      addNotif('Boss dikalahkan! Ambil artefak dan kunci!');
    }
  }

  // Collectibles
  for (const c of L2.collectibles) {
    updateCollectible(c, dt);
    if (!c.collected && c.landed && rectOverlap(p, c)) {
      c.collected = true;
      if (c.type === 'templeKey') {
        p.hasKey = true;
        addNotif('Kunci Candi ditemukan!');
        playSFX('sfxCollect');
      } else {
        p.artefacts++;
        addNotif('Artefak terakhir ditemukan!');
        playSFX('sfxCollect');
      }
    }
  }

  // Temple door interaction
  if (rectOverlap(p, td)) {
    if (!p.hasKey) {
      if (!L2.doorMsgShown) {
        addNotif('Pintu candi masih terkunci.');
        L2.doorMsgShown = true;
        setTimeout(() => { if (L2) L2.doorMsgShown = false; }, 3200);
      }
      p.x = td.x - p.w - 2;  // push player back
    } else {
      addNotif('Pintu candi berhasil dibuka!');
      stopBGM();
      initScene3();
    }
  }

  if (p.hp <= 0) { stopBGM(); scene = SCENE.GAMEOVER; }
}

function drawLevel2() {
  drawBg('lvl2Bg', '#3d2a1a');
  drawTempleDoor(player.hasKey);
  if (L2.boss) drawBoss(L2.boss);
  for (const c of L2.collectibles) drawCollectible(c);
  drawParticles();
  drawPlayer();
  drawHUD();
  drawOnScreenControls();
  drawPauseButton();
  drawNotifs();
}

// ============================================================
//  SCENE 3 — DALAM CANDI
// ============================================================
let S3 = null;

function initScene3() {
  const prevArtefacts = player.artefacts;
  const prevKey       = player.hasKey;
  player = createPlayer(60);
  player.artefacts = prevArtefacts;
  player.hasKey    = prevKey;

  S3 = {
    altar: createAltar(BASE_W - 130),
    reached: false,
  };
  notifications = [];
  scene = SCENE.SCENE3;
}

function updateScene3(dt) {
  updatePlayer(dt);
  updateNotifs(dt);

  // Right wall to prevent going off screen
  if (player.x + player.w > BASE_W - 5) player.x = BASE_W - player.w - 5;

  // Reach altar
  if (!S3.reached && rectOverlap(player, S3.altar)) {
    S3.reached = true;
    if (player.artefacts >= 3 && player.hasKey) {
      stopBGM();
      playSFX('sfxVictory');
      addNotif('"Artefak telah kembali… candi kembali aman."');
      setTimeout(() => { scene = SCENE.ENDING; }, 3000);
    } else {
      // Shouldn't happen with correct flow, but handle gracefully
      addNotif('Kamu belum mengumpulkan semua artefak!');
    }
  }

  if (player.hp <= 0) scene = SCENE.GAMEOVER;
}

function drawScene3() {
  drawBg('scene3Bg', '#0a0d06');
  if (S3.reached) {
    for (let i = 0; i < 3; i++) {
      drawSprite(`artefact${i + 1}`,
        S3.altar.x + 4 + i * 26, S3.altar.y - 30, 24, 24, false);
    }
  }
  drawAltar(S3.altar);
  drawPlayer();
  drawHUD();
  drawOnScreenControls();
  drawPauseButton();
  drawNotifs();
}

// ============================================================
//  SCENE: MENU
// ============================================================
function drawMenu() {
  // Background
  if (imgOk('menuBg')) {
    ctx.drawImage(ASSETS['menuBg'], 0, 0, BASE_W, BASE_H);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, BASE_H);
    g.addColorStop(0, '#120820'); g.addColorStop(1, '#3a1500');
    ctx.fillStyle = g; ctx.fillRect(0, 0, BASE_W, BASE_H);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Logo judul — preserve aspect ratio, max 700×220, tengah
  if (imgOk('logoJudul')) {
    const img   = ASSETS['logoJudul'];
    const maxW  = 700, maxH = 220;
    const ratio = img.naturalWidth / img.naturalHeight;
    let lw = maxW, lh = lw / ratio;
    if (lh > maxH) { lh = maxH; lw = lh * ratio; }
    const logoY = BASE_H / 2 - lh / 2 - 80;
    ctx.drawImage(img, BASE_W / 2 - lw / 2, logoY, lw, lh);
  } else {
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 58px serif';
    ctx.fillStyle   = '#fff8e1';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 18;
    ctx.fillText('Penyelamat Artefak Candi', BASE_W / 2, BASE_H / 2 - 80);
    ctx.restore();
  }

  // Tombol Mulai Game — di bawah logo
  if (drawButton('btnMulai', BASE_W / 2, BASE_H / 2 + 90, 320, 80)) {
    playSFX('sfxButton');
    stopBGM();
    initLevel1();
  }
}

// ============================================================
//  SCENE: GAME OVER
// ============================================================
function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel background
  const pw = 660, ph = 340;
  const px = BASE_W / 2 - pw / 2;
  const py = BASE_H / 2 - ph / 2 - 20;
  drawPanel('panelGameOver', px, py, pw, ph);

  // Game over title image
  if (imgOk('panelGOTitle')) {
    const tw = 460, th = 110;
    ctx.drawImage(ASSETS['panelGOTitle'], BASE_W / 2 - tw / 2, py + 24, tw, th);
  } else {
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 62px serif';
    ctx.fillStyle   = '#e63946';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', BASE_W / 2, py + 100);
  }

  ctx.textAlign   = 'center';
  ctx.font        = '20px sans-serif';
  ctx.fillStyle   = '#ccc';
  ctx.shadowBlur  = 0;
  ctx.fillText('Arga tidak berhasil menyelesaikan misinya.', BASE_W / 2, py + 180);

  // Dua tombol berdampingan: Mulai Ulang | Kembali
  const btnY    = py + ph + 50;
  const btnW    = 260, btnH = 74;
  const gap     = 24;
  const leftCX  = BASE_W / 2 - btnW / 2 - gap / 2;
  const rightCX = BASE_W / 2 + btnW / 2 + gap / 2;

  if (drawButton('btnRestart', leftCX, btnY, btnW, btnH)) {
    playSFX('sfxButton');
    initLevel1();
  }
  if (drawButton('btnKembali', rightCX, btnY, btnW, btnH)) {
    playSFX('sfxButton');
    scene = SCENE.MENU;
  }
}

// ============================================================
//  SCENE: ENDING
// ============================================================
let endingAlpha = 0;

function drawEnding() {
  drawBg('scene3Bg', '#0a0d06');

  endingAlpha = Math.min(1, endingAlpha + 0.007);
  ctx.save();
  ctx.globalAlpha = endingAlpha;

  // Panel di tengah
  const pw = 740, ph = 320;
  const px = BASE_W / 2 - pw / 2;
  const py = BASE_H / 2 - ph / 2 - 40;
  drawPanel('panelDialog', px, py, pw, ph);

  // Altar + artefak di atas panel
  if (imgOk('altar'))
    ctx.drawImage(ASSETS['altar'], BASE_W / 2 - 64, py + 36, 128, 128);
  for (let i = 0; i < 3; i++)
    drawSprite(`artefact${i + 1}`, BASE_W / 2 - 58 + i * 46, py + 16, 38, 38, false);

  ctx.textAlign   = 'center';
  ctx.font        = 'bold 40px serif';
  ctx.fillStyle   = '#ffd166';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 16;
  ctx.fillText('"Artefak telah kembali…', BASE_W / 2, py + 188);
  ctx.fillText('candi kembali aman."', BASE_W / 2, py + 236);

  ctx.font        = '18px sans-serif';
  ctx.fillStyle   = '#ccc';
  ctx.shadowBlur  = 0;
  ctx.fillText('— Misi Arga telah selesai —', BASE_W / 2, py + 278);

  ctx.restore();

  // Dua tombol: Main Lagi | Kembali ke Menu
  const btnY    = py + ph + 60;
  const btnW    = 260, btnH = 74;
  const gap     = 24;

    if (drawButton('btnKembaliEnding', BASE_W / 2 + btnW / 2 + gap / 2, btnY, btnW, btnH)) {
    playSFX('sfxButton');
    endingAlpha = 0;
    scene = SCENE.MENU;
  }
    if (drawButton('btnMainLagi', BASE_W / 2 - btnW / 2 - gap / 2, btnY, btnW, btnH)) {
    playSFX('sfxButton');
    endingAlpha = 0;
    initLevel1();
  }
}

// ============================================================
//  MAIN LOOP
// ============================================================
let lastTime = 0;

function gameLoop(ts) {
  const rawDt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  // Saat paused: dt = 0 sehingga semua physics/enemy berhenti
  const dt = paused ? 0 : rawDt;

  ctx.clearRect(0, 0, BASE_W, BASE_H);

  switch (scene) {
    case SCENE.MENU:     drawMenu();                    break;
    case SCENE.LEVEL1:   updateLevel1(dt); drawLevel1(); break;
    case SCENE.DIALOG:   updateDialog(dt); drawDialog(); break;
    case SCENE.LEVEL2:   updateLevel2(dt); drawLevel2(); break;
    case SCENE.SCENE3:   updateScene3(dt); drawScene3(); break;
    case SCENE.GAMEOVER: drawGameOver();                break;
    case SCENE.ENDING:   drawEnding();                  break;
  }

  // Pause overlay di atas segalanya (hanya saat di level)
  if (paused) drawPauseOverlay();

  // Tombol pause di menu / dialog tidak diperlukan, hanya saat bermain
  if (!paused && (scene === SCENE.LEVEL1 || scene === SCENE.LEVEL2 || scene === SCENE.SCENE3)) {
    // Klik tombol pause via mouse (sudah ditangani pointer events, cek lagi untuk mouse click biasa)
    if (mouse.clicked && hitCtrl(CTRL.pause, mouse.x, mouse.y)) {
      togglePause();
    }
  }

  clearJustPressed();
  mouse.clicked = false;
  requestAnimationFrame(gameLoop);
}

function startLoop() {
  if (loopStarted) return;
  loopStarted = true;
  requestAnimationFrame(gameLoop);
}

// ============================================================
//  AUTOPLAY POLICY — Mobile browser memblokir audio tanpa gesture.
//  Saat user pertama kali menyentuh / mengklik layar, coba putar
//  BGM yang seharusnya sedang aktif.
// ============================================================
(function setupAudioUnlock() {
  let unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    // Jika ada BGM yang seharusnya diputar tapi belum jalan, mulai sekarang
    if (bgmPlaying && AUDIO[bgmPlaying] && AUDIO[bgmPlaying].paused) {
      AUDIO[bgmPlaying].play().catch(() => {});
    }
    // Hapus listener setelah berhasil unlock
    window.removeEventListener('touchstart', unlock, true);
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('click', unlock, true);
  }
  window.addEventListener('touchstart', unlock, { capture: true, passive: true });
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('click',      unlock, { capture: true, passive: true });
})();
