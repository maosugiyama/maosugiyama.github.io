// ============================================================
// 教材の自動点検
// ============================================================
// 使い方：  node tests/check.js
// 直したあと、公開する前に必ず走らせてください。
// 問題が見つかると、終了コードが 1 になります。
//
// index.html は1万4千行の1ファイルです。手で直すと、
// 気づかないうちに別のところが壊れることが実際にありました
// （置換が他の項目を飲みこむ／閉じタグが1個余る／
//   CSSのエスケープが二重になる など）。
// ここにある点検は、そのすべてを実際に見つけたものです。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

const problems = [];
const notes = [];
function bad(where, msg) { problems.push('[' + where + '] ' + msg); }
function note(msg) { notes.push(msg); }

// ---- データを取り出す ----
function grab(re, name) {
  const m = html.match(re);
  if (!m) { bad('読み取り', name + ' が見つかりません'); return null; }
  return m[0];
}
const ctx = {};
vm.createContext(ctx);
const srcUnits = grab(/const GRAMMAR_UNITS\s*=\s*\[[\s\S]*?\n\];/, 'GRAMMAR_UNITS');
const srcWhy   = grab(/const WHY\s*=\s*\{[\s\S]*?\n\};/, 'WHY');
const srcTopic = grab(/const TOPIC_INDEX\s*=\s*\[[\s\S]*?\n\];/, 'TOPIC_INDEX');
const srcLetters = grab(/const LETTERS\s*=\s*\[[\s\S]*?\n\];/, 'LETTERS');
if (srcUnits) vm.runInContext(srcUnits + ';globalThis.U = GRAMMAR_UNITS;', ctx);
if (srcWhy)   vm.runInContext(srcWhy   + ';globalThis.W = WHY;', ctx);
if (srcTopic) vm.runInContext(srcTopic + ';globalThis.T = TOPIC_INDEX;', ctx);
if (srcLetters) vm.runInContext(srcLetters + ';globalThis.L = LETTERS;', ctx);
const U = ctx.U || [], W = ctx.W || {}, T = ctx.T || [], L = ctx.L || [];

// ============================================================
// 1. 練習問題の形がそろっているか
// ============================================================
const ids = new Set();
U.forEach(function (u) {
  if (ids.has(u.id)) bad('ユニット', u.id + ' が重複しています');
  ids.add(u.id);
  ['id', 'cat', 'level', 'title', 'lesson', 'drills'].forEach(function (k) {
    if (!u[k]) bad('ユニット', u.id + ' に ' + k + ' がありません');
  });
  if (!Array.isArray(u.drills) || !u.drills.length) bad('ユニット', u.id + ' に練習問題がありません');
  (u.drills || []).forEach(function (d, i) {
    const at = u.id + ':' + i;
    if (d.type === 'mc') {
      if (!Array.isArray(d.opts) || d.opts.length < 2) bad(at, '選択肢が足りません');
      else if (typeof d.a !== 'number' || d.a < 0 || d.a >= d.opts.length) bad(at, '正解の番号（a）が範囲外です');
      if (new Set(d.opts).size !== d.opts.length) bad(at, '選択肢が重複しています');
    } else if (d.type === 'input') {
      if (!d.a) bad(at, '答え（a）がありません');
      if (/[́]/.test(d.a || '')) bad(at, '答えにアクセント記号が入っています（入力欄は記号なしで受けます）');
    } else if (d.type === 'order') {
      if (!Array.isArray(d.tokens) || !d.tokens.length) bad(at, '並べ替えの語（tokens）がありません');
      if (!Array.isArray(d.accept) || !d.accept.length) bad(at, '正解（accept）がありません');
      // 語順によって文頭の大文字が動くので、大小は無視して見くらべる
      (d.accept || []).forEach(function (ac) {
        // カードには「в цирк」のように2語入ったものがあるので、
        // どちらも語に割ってから見くらべる
        const norm = function (arr) {
          return arr.join(' ').toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ');
        };
        if (norm([String(ac.o)]) !== norm(d.tokens || [])) {
          bad(at, '並べ替えの語と正解が一致しません：' + ac.o);
        }
      });
    } else {
      bad(at, '知らない種類の問題です：' + d.type);
    }
    if (!d.ex) bad(at, '解説（ex）がありません');
  });
});

// ============================================================
// 2. 選択肢ごとの解説（WHY）の整合
// ============================================================
// 問題を途中に足すと番号がずれ、解説が別の問題に付いてしまいます。
// これは実際に5回起きました。
let whyOk = 0;
U.forEach(function (u) {
  u.drills.forEach(function (d, i) {
    if (d.type !== 'mc') return;
    const k = u.id + ':' + i, w = W[k];
    if (!w) { bad(k, '選択肢ごとの解説がありません'); return; }
    if (w.length !== d.opts.length) { bad(k, '選択肢 ' + d.opts.length + ' に対して解説が ' + w.length + ' 件です'); return; }
    if (w[d.a] !== '') { bad(k, '正解の位置（' + d.a + '）の解説が空ではありません'); return; }
    const empty = w.map(function (x, j) { return (j !== d.a && !x) ? j : -1; }).filter(function (x) { return x >= 0; });
    if (empty.length) { bad(k, '誤答 ' + empty.join(',') + ' の解説が空です'); return; }
    whyOk++;
  });
});
Object.keys(W).forEach(function (k) {
  const p = k.split(':'), u = U.filter(function (x) { return x.id === p[0]; })[0];
  if (!u || !u.drills[+p[1]]) bad('WHY', k + ' に対応する問題がありません');
});

// ============================================================
// 3. 解説のHTMLタグが閉じているか
// ============================================================
const VOID = new Set(['br','hr','img','input','meta','link','polyline','path','circle','line',
                      'polygon','rect','use','stop','ellipse','source','col']);
function checkTags(s, where) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(s))) {
    const closing = m[1] === '/', name = m[2].toLowerCase(), self = m[3] === '/';
    if (VOID.has(name) || self) continue;
    if (!closing) stack.push(name);
    else {
      if (!stack.length) { bad(where, '余分な </' + name + '> があります'); return; }
      const top = stack.pop();
      if (top !== name) { bad(where, '<' + top + '> が </' + name + '> で閉じられています'); return; }
    }
  }
  if (stack.length) bad(where, '閉じていないタグ：<' + stack.join('>, <') + '>');
}
U.forEach(function (u) { checkTags(u.lesson, '解説:' + u.id); });

// ============================================================
// 4. 答えが問題文に見えていないか
// ============================================================
function noAccent(s) { return String(s).replace(/́/g, '').toLowerCase(); }
U.forEach(function (u) {
  u.drills.forEach(function (d, i) {
    if (d.type !== 'mc' || !d.q) return;
    const ans = noAccent(d.opts[d.a]).replace(/[.!?、。（）()]/g, '').trim();
    if (ans.length < 4) return;
    if (noAccent(d.q).indexOf(ans) >= 0) note('答えが問題文に見えているかもしれません [' + u.id + ':' + i + '] ' + d.q.slice(0, 40));
  });
});

// ============================================================
// 5. 表記のきまり
// ============================================================
// ・ё は常に強勢なのでアクセント記号を付けない
// ・1音節の語にはアクセント記号を付けない
const VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
function syllables(w) { return w.split('').filter(function (c) { return VOWELS.indexOf(c) >= 0; }).length; }
// タグを外してから語を拾う。фла́<b>г</b> のような書き方で語が割れないように。
// 語の途中を強調している箇所（но́в<b>ый</b>）で語が割れないよう、
// 文字を飾るタグは空文字に、区切りになるタグは空白に置きかえる。
const plain = html
  .replace(/<\/?(?:b|i|em|strong|u|sub|sup)\b[^>]*>/g, '')
  .replace(/<[^>]+>/g, ' ');
const seen = new Set();
(plain.match(/[А-Яа-яЁё́-]+/g) || []).forEach(function (token) {
  // тёмно-си́ний のような複合語は、ハイフンで区切って1語ずつ見る
  token.split('-').forEach(function (w) {
    w = w.replace(/^[^А-Яа-яЁё]+|[^А-Яа-яЁё́]+$/g, '');
    if (!w || seen.has(w)) return; seen.add(w);
    if (/ё/.test(w) && /́/.test(w)) bad('表記', w + '：ё があるのにアクセント記号も付いています');
    // 1音節の語にアクセントは付けない。ただし не́ было のように
    // 本当に付ける語もあるので、ここは警告にとどめる。
    if (w.indexOf('́') >= 0 && syllables(w.replace(/́/g, '')) === 1 && w.length >= 4) {
      note('1音節なのにアクセント記号が付いています：' + w);
    }
  });
});

// ============================================================
// 6. 画像が実在するか／キャッシュ一覧に載っているか
// ============================================================
const refs = new Set();
(html.match(/src="([^"]+\.(?:png|jpg|jpeg|svg))"/g) || []).forEach(function (s) {
  const f = s.slice(5, -1);
  if (f.indexOf('data:') === 0 || f.indexOf('http') === 0) return;
  refs.add(f);
});
refs.forEach(function (f) {
  if (!fs.existsSync(path.join(ROOT, f))) bad('画像', f + ' が見つかりません');
  else if (sw.indexOf("'./" + f + "'") < 0) bad('sw.js', f + ' がキャッシュ一覧（CORE）に入っていません');
});
(sw.match(/'\.\/([^']+\.(?:png|jpg|jpeg))'/g) || []).forEach(function (s) {
  const f = s.slice(3, -1);
  if (!fs.existsSync(path.join(ROOT, f))) bad('sw.js', f + ' はキャッシュ一覧にありますが、ファイルがありません');
});

// ============================================================
// 7. 目次の飛び先
// ============================================================
T.forEach(function (t) {
  if (!t.u) { bad('目次', '「' + t.t + '」に飛び先（u）がありません'); return; }
  if (!ids.has(t.u)) bad('目次', '「' + t.t + '」の飛び先 ' + t.u + ' が存在しません');
});

// ============================================================
// 8. 版の数字がそろっているか
// ============================================================
const appV = (html.match(/const APP_VERSION = '([^']+)'/) || [])[1];
const swV  = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
if (!appV) bad('版', 'APP_VERSION が見つかりません');
if (!swV) bad('版', 'sw.js の VERSION が見つかりません');
const cff = path.join(ROOT, '..', 'CITATION.cff');
if (fs.existsSync(cff)) {
  const cv = (fs.readFileSync(cff, 'utf8').match(/version:\s*"([^"]+)"/) || [])[1];
  if (cv && appV && cv !== appV) note('CITATION.cff の版（' + cv + '）と APP_VERSION（' + appV + '）が違います');
}

// ============================================================
// まとめ
// ============================================================
const drills = U.reduce(function (n, u) { return n + u.drills.length; }, 0);
console.log('教材の自動点検');
console.log('  ユニット ' + U.length + ' ／ 練習問題 ' + drills + ' ／ 文字 ' + L.length);
console.log('  選択肢ごとの解説 ' + whyOk + ' 問ぶん照合');
console.log('  画像 ' + refs.size + ' 点');
console.log('  版 APP_VERSION=' + appV + ' ／ sw.js=' + swV);
console.log('');
if (notes.length) {
  console.log('気になるところ ' + notes.length + ' 件（止めはしません）');
  notes.forEach(function (n) { console.log('  - ' + n); });
  console.log('');
}
if (problems.length) {
  console.log('■ 直すところ ' + problems.length + ' 件');
  problems.forEach(function (p) { console.log('  - ' + p); });
  process.exit(1);
}
console.log('■ 問題なし');
