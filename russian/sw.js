// ねこと学ぶ キリル文字 — オフライン用のサービスワーカー
// ★ 内容を更新したら、下の VERSION を必ず1つ上げてください（例: v1 → v2）
//    番号を上げないと、利用者の端末に古い画面が残り続けます。
const VERSION = 'v104';
const CACHE = 'neko-cyrillic-' + VERSION;

// 最初に保存しておくファイル（これだけあればオフラインで起動できます）
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './banner.jpg',
];

// 文字の絵、解説のなかの絵と写真。起動には要らないので、
// 表示されてから、あとでそっと保存します。はじめて開いた人が
// 数メガバイトを一度に読みこまなくてすむようにするためです。
const EXTRA = [
  './cat-a.jpg',
  './cat-b.jpg',
  './cat-c.jpg',
  './cat-ch.jpg',
  './cat-d.jpg',
  './cat-e.jpg',
  './cat-ee.jpg',
  './cat-f.jpg',
  './cat-g.jpg',
  './cat-h.jpg',
  './cat-hard.jpg',
  './cat-i.jpg',
  './cat-j.jpg',
  './cat-k.jpg',
  './cat-l.jpg',
  './cat-m.jpg',
  './cat-n.jpg',
  './cat-o.jpg',
  './cat-p.jpg',
  './cat-r.jpg',
  './cat-s.jpg',
  './cat-sh.jpg',
  './cat-shh.jpg',
  './cat-soft.jpg',
  './cat-t.jpg',
  './cat-u.jpg',
  './cat-v.jpg',
  './cat-y.jpg',
  './cat-ya.jpg',
  './cat-yo.jpg',
  './cat-yu.jpg',
  './cat-z.jpg',
  './cat-zh.jpg',
  './footer-cat.jpg',
  './celebration.jpg',
  './profile.jpg',
  './cl-blouse.png',
  './cl-dress.png',
  './cl-hoodie.png',
  './cl-jacket.png',
  './cl-jeans.png',
  './cl-scarf.png',
  './cl-skirt.png',
  './cl-valenki.png',
  './ht-beret.png',
  './ht-beysbolka.png',
  './ht-furazhka.png',
  './ht-kanote.png',
  './ht-kartuz.png',
  './ht-kepka.png',
  './ht-mehovaya.png',
  './ht-panama.png',
  './ht-shapka.png',
  './ht-shlyapa.png',
  './ht-solomennaya.png',
  './ht-ushanka.png',
  './ht-vyazanaya.png',
  './il-autumn.jpg',
  './il-bus.jpg',
  './il-christmas.jpg',
  './il-mimosa.jpg',
  './il-snow.jpg',
  './il-sunflower.jpg',
  './il-tulip.jpg',
  './ph-bliny.jpg',
  './ph-cheburashka.jpg',
  './ph-flag.jpg',
  './ph-park.jpg',
  './ph-znachki.jpg',
  './ph-polk.jpg',
  './ph-river.jpg',
  './ph-rossiya.jpg',
  './ph-square.jpg',
  './sh-baletki.png',
  './sh-botinki.png',
  './sh-kedy.png',
  './sh-krossovki.png',
  './sh-lofery.png',
  './sh-obuv.png',
  './sh-rezinovye.png',
  './sh-sapogi.png',
  './sh-shlepancy.png',
  './sh-slancy.png',
  './sh-tapochki.png',
  './sh-tufli.png',
  './sh-uggi.png',
  './sh-valenki.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }));
});

// 絵と写真を、1点ずつゆっくり保存する。
// 通信をふさがないよう間をあけ、失敗しても先へ進みます。
function warmExtra() {
  caches.open(CACHE).then(function (c) {
    (function next(i) {
      if (i >= EXTRA.length) return;
      c.match(EXTRA[i]).then(function (hit) {
        if (hit) return next(i + 1);
        return c.add(EXTRA[i]).catch(function () {}).then(function () {
          setTimeout(function () { next(i + 1); }, 150);
        });
      });
    })(0);
  });
}

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k.indexOf('neko-cyrillic-') === 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
      .then(function () { setTimeout(warmExtra, 3000); })
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
