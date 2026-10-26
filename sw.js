// AI PaceMaker service worker
// 電波が弱くてもすぐ開けるように「端末に保存した版をすぐ表示 → 裏で新しい版を取得」する方式
const CACHE = 'pacemaker-v4.2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// 自サイトのファイルだけ扱う（Google・ClaudeのAPI通信には触らない）
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin || req.method !== 'GET') return;
  const isPage = req.mode === 'navigate';
  const key = isPage ? './index.html' : req;

  const network = fetch(req, { cache: 'no-cache' })
    .then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    })
    .catch(() => null);

  e.respondWith(
    caches.match(key, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;                       // 保存済みならすぐ表示
      return network.then(res => res || caches.match('./index.html'));
    })
  );
  e.waitUntil(network);                                // 裏で最新版を保存（次回開いたときに反映）
});
