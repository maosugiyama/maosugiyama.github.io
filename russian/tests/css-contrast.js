// ============================================================
// 色の組み合わせを、ブラウザなしで点検する
// ============================================================
// 使い方：  node tests/css-contrast.js
//
// tests/contrast.js（ブラウザ版）は実際に描いた画面を測るので確かですが、
// 「その画面を開かないと測れない」という穴があります。
// 練習中にだけ出るボタンなどは、長いあいだ測られないままでした。
// こちらは CSS を直接読むので、画面を開かなくても全部を見られます。
// 両方を走らせるのがいちばん確かです。
const fs = require('fs');
const path = require('path');

const css = (function () {
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  return h.slice(0, h.indexOf('</style>'));
})();

function srgb(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(x) { return 0.2126 * srgb(x[0]) + 0.7152 * srgb(x[1]) + 0.0722 * srgb(x[2]); }
function ratio(f, b) { const a = lum(f), c = lum(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); }
function hex(v) {
  v = v.replace('#', '');
  if (v.length === 3) v = v.split('').map(function (c) { return c + c; }).join('');
  return [0, 2, 4].map(function (i) { return parseInt(v.substr(i, 2), 16); });
}

const problems = [];
let checked = 0;
const RULE = /([^{}]+)\{([^}]*)\}/g;
let m;
while ((m = RULE.exec(css))) {
  const sel = m[1].trim().split('\n').pop().trim();
  const body = m[2];
  const fg = /(?<![-\w])color:\s*(#[0-9A-Fa-f]{3,6})\b/.exec(body);
  const bg = /background(?:-color)?:\s*(#[0-9A-Fa-f]{3,6})\s*[;}]/.exec(body);
  if (!fg || !bg) continue;
  checked++;
  const size = /font-size:\s*([\d.]+)px/.exec(body);
  const bold = /font-weight:\s*(\d+)/.exec(body);
  const sz = size ? parseFloat(size[1]) : 12;
  const isBold = bold ? parseInt(bold[1], 10) >= 700 : false;
  const need = (sz >= 24 || (sz >= 18.66 && isBold)) ? 3.0 : 4.5;
  const r = ratio(hex(fg[1]), hex(bg[1]));
  if (r < need) {
    problems.push(sel.slice(0, 40) + '  ' + fg[1] + ' / ' + bg[1] + '  ' + r.toFixed(2) + '（必要 ' + need + '）');
  }
}

console.log('色の組み合わせの点検（CSSから直接）');
console.log('  文字色と背景色をどちらも指定している規則 ' + checked + ' 件');
console.log('');
if (problems.length) {
  console.log('■ 基準を割っているところ ' + problems.length + ' 件');
  problems.forEach(function (p) { console.log('  - ' + p); });
  process.exit(1);
}
console.log('■ 問題なし');
