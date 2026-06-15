// ============================================================
//  SERVICE WORKER — Ekspedisi Penyelamat Artefak Candi
//  Versi cache: update string ini setiap deploy baru
// ============================================================
const CACHE_NAME = 'artefak-candi-v1';

// Semua file yang di-cache saat install
const PRECACHE_URLS = [
  './',
  './index.html',
  './game.js',
  './manifest.json',

  // Icons PWA
  // (menggunakan logo_judul.png dari folder menu)

  // Menu
  './menu/menu_bg.png',
  './menu/logo_judul.png',

  // Environment
  './environment/background_and_ground/level_1_ground.png',
  './environment/background_and_ground/level_2_ground.png',
  './environment/background_and_ground/scene3_bg.png',
  './environment/building/temple.png',
  './environment/props/altar.png',

  // Characters
  './character/arga/idle.png',
  './character/arga/run_1.png',
  './character/arga/run_2.png',
  './character/arga/run_3.png',
  './character/arga/run_4.png',
  './character/arga/run_5.png',
  './character/arga/run_6.png',
  './character/arga/run_7.png',
  './character/boss/walk_1.png',
  './character/boss/walk_2.png',
  './character/boss/walk_3.png',
  './character/boss/walk_4.png',
  './character/boss/walk_5.png',
  './character/boss/walk_6.png',

  // Enemies
  './enemies/monster_1.png',
  './enemies/monster_2.png',

  // Items
  './items/artefact_1.png',
  './items/artefact_2.png',
  './items/artefact_3.png',
  './items/temple_key.png',

  // UI Buttons
  './ui/buttons/mulai_game_menu.png',
  './ui/buttons/lanjut_ke_level_2.png',
  './ui/buttons/main_lagi_ending.png',
  './ui/buttons/mulai_ulang_game_over.png',
  './ui/buttons/kembali.png',
  './ui/buttons/kembali_ending.png',
  './ui/buttons/lanjutkan_pause.png',

  // UI Panels
  './ui/panels/dialog_box_BG.png',
  './ui/panels/game_over_BG.png',
  './ui/panels/game_over.png',
  './ui/panels/popup_pause.png',

  // UI Controls
  './ui/controls/arrow_left.png',
  './ui/controls/arrow_right.png',
  './ui/controls/arrow_up.png',
  './ui/controls/pause.png',

  // UI Icons (HUD)
  './ui/icons/heart.png',
  './ui/icons/artefact_1.png',
  './ui/icons/artefact_2.png',
  './ui/icons/artefact_3.png',
  './ui/icons/temple_key.png',

  // Audio
  './audio/BGM/level_1_dan_level_2.mp3',
  './audio/SFX/button_click.mp3',
  './audio/SFX/collect_item.mp3',
  './audio/SFX/damage_hit.mp3',
  './audio/SFX/jump.mp3',
  './audio/SFX/victory.mp3',
];

// ── INSTALL: pre-cache semua file penting ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll akan gagal jika salah satu URL error.
      // Gunakan loop individual agar file yang ada tetap ter-cache
      // meski satu file tidak ditemukan.
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(() => {
            // Abaikan file yang tidak bisa di-fetch (misal file dihapus)
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: hapus cache lama ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-first, fallback ke network ───────────────
self.addEventListener('fetch', event => {
  // Hanya handle GET request
  if (event.request.method !== 'GET') return;

  // Jangan cache request ke luar origin
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Tidak ada di cache — ambil dari network lalu simpan
      return fetch(event.request).then(response => {
        // Hanya cache response yang valid
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Offline & tidak ada cache — kembalikan halaman offline sederhana
        // hanya untuk request navigasi (bukan aset)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
