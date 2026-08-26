// ねこと学ぶ キリル文字 — オフライン用のサービスワーカー
// ★ 内容を更新したら、下の VERSION を必ず1つ上げてください（例: v1 → v2）
//    番号を上げないと、利用者の端末に古い画面が残り続けます。
const VERSION = 'v39';
const CACHE = 'neko-cyrillic-' + VERSION;

// 最初に保存しておくファイル（これだけあればオフラインで起動できます）
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './profile.jpg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k.indexOf('neko-cyrillic-') === 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// ページから「更新する」が押されたら、新しい版に切りかえる
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// 取得の方針：まずキャッシュ（速い・オフラインでも動く）、
// 同時に裏で取り直して次回に備える
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;      // 外部（Google Analytics など）はそのまま

  e.respondWith(
    caches.match(req).then(function (hit) {
      const net = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // オフラインで、キャッシュにもないページ → トップを返す
        return hit || caches.match('./index.html');
      });
      return hit || net;
    })
  );
});
