// ============================================================
// 文字の読みやすさ（コントラスト）の点検
// ============================================================
// 使い方：  node tests/contrast.js
// ヘッドレスの Chrome で全画面をまわり、背景に対して文字が薄すぎる
// ところを探します。WCAG の AA（本文 4.5:1／大きな文字 3:1）が基準です。
//
// 背景の色を変えたとき、実際に何度も基準を割りました。目で見て
// 「読めるかな」と判断すると必ず甘くなるので、測っています。
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROMES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const chrome = CHROMES.filter(function (p) { return fs.existsSync(p); })[0];
if (!chrome) {
  console.log('Chrome が見つからないので、この点検は飛ばします。');
  console.log('（node tests/check.js のほうは Chrome なしで走ります）');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const ALL = process.argv.indexOf('--all') >= 0;
const PROBE = `<script>window.addEventListener("load",function(){setTimeout(function(){
var ALL_UNITS = ${ALL};
function lum(c){var m=c.match(/\\d+/g); if(!m) return null;
 var a=m.slice(0,3).map(function(v){v=v/255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
 return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
// 背景が半透明のときは、下の色と重ねてから測る。
// 重ねずに測ると、実際より暗く（または明るく）見積もってしまう。
function parse(c){ var m=(c||"").match(/[\d.]+/g); if(!m) return null;
 return [ +m[0], +m[1], +m[2], m.length>3 ? +m[3] : 1 ]; }
function bgOf(el){
  var layers=[];
  while(el){
    var cs=getComputedStyle(el);
    // グラデーションが背景のときは、下地の色を1つに決められない。
    // 無理に決めると、濃いボタンの上の白文字を「白地に白」と誤って報告する。
    // 判定できないものは見送る（見落とすほうが、狼少年になるよりまし）。
    //
    // ただし body と html は読まない。ここには森の地図が
    // データURIで入っていて、backgroundImage を読むだけで
    // 13万字の文字列が返る。要素ごとに読むと検査が固まってしまう。
    if(el !== document.body && el !== document.documentElement){
      var bi = cs.backgroundImage;
      if(bi && bi !== 'none') return null;
    }
    var c=parse(cs.backgroundColor);
    if(c && c[3]>0){ layers.push(c); if(c[3]>=1) break; }
    el=el.parentElement;
  }
  var base=[255,255,255];
  for(var i=layers.length-1;i>=0;i--){
    var l=layers[i], a=l[3];
    base=[ l[0]*a+base[0]*(1-a), l[1]*a+base[1]*(1-a), l[2]*a+base[2]*(1-a) ];
  }
  return "rgb("+Math.round(base[0])+", "+Math.round(base[1])+", "+Math.round(base[2])+")";
}
var bad=[], seen={};
function scan(){ document.querySelectorAll("body *").forEach(function(el){
  if(!el.offsetParent && el.tagName!=="BODY") return;
  var t=""; for(var i=0;i<el.childNodes.length;i++) if(el.childNodes[i].nodeType===3) t+=el.childNodes[i].textContent;
  t=t.trim(); if(!t) return;
  var cs=getComputedStyle(el); var bg=bgOf(el); if(!bg) return;
  var f=lum(cs.color), b=lum(bg); if(f===null||b===null) return;
  var r=(Math.max(f,b)+0.05)/(Math.min(f,b)+0.05);
  var size=parseFloat(cs.fontSize), bold=(parseInt(cs.fontWeight)||400)>=700;
  var need=(size>=24 || (size>=18.66 && bold)) ? 3.0 : 4.5;
  if(r<need){ var k=cs.color+"|"+bg+"|"+Math.round(size); if(seen[k]) return; seen[k]=1;
    bad.push(r.toFixed(2)+" 必要"+need+" "+Math.round(size)+"px "+cs.color+" / "+bg+" 「"+t.slice(0,20)+"」"); } }); }
try{
  enterRoad(); scan(); switchTab("grammar"); scan();
  // 全52ユニットをまわると数分かかり、結局だれも走らせなくなります。
  // 見た目の型はカテゴリーごとに共通なので、ふだんは各カテゴリーから
  // 1つずつ（＋見た目の特殊なもの）を見ます。全部見るときは --all を付けてください。
  var pick = ALL_UNITS ? GRAMMAR_UNITS.map(function(u){ return u.id; }) : (function(){
    var seen = {}, list = [];
    GRAMMAR_UNITS.forEach(function(u){ if(!seen[u.cat]){ seen[u.cat]=1; list.push(u.id); } });
    ['character','shape-types','seasons','clothes','color-shape','comparative',
     'impersonal','imperative-future','case-dat','numbers'].forEach(function(id){
      if(list.indexOf(id)<0) list.push(id);
    });
    return list;
  })();
  pick.forEach(function(id){ openGrammarUnit(id); scan(); });
  try{ document.querySelectorAll("#grammar-unit .note-mark")[0].click(); }catch(e){}
  scan(); switchTab("home"); openNotes(); scan();
  switchTab("alphabet"); scan(); openCardDetail(LETTERS[0]); scan();
  document.getElementById("modal-bg").classList.remove("open");
  switchTab("pronunciation"); scan(); switchTab("challenge"); scan(); switchTab("dictation"); scan();
  openToc(); scan(); openIntro(); scan(); backToCover(); scan();
  document.title = bad.length ? ("NG::"+bad.join("::")) : "OK";
}catch(e){ document.title="ERR "+e.message; } },900);});</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'contrast-'));
const page = path.join(ROOT, '_contrast_check.html');
fs.writeFileSync(page, html.replace('</body>', PROBE + '\n</body>'));
let out = '';
try {
  out = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--user-data-dir=' + tmp, '--window-size=500,1200',
    '--virtual-time-budget=' + (ALL ? 40000 : 9000), '--dump-dom', 'file://' + page,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = (e.stdout || '').toString();
} finally {
  fs.unlinkSync(page);
  fs.rmSync(tmp, { recursive: true, force: true });
}
const m = out.match(/<title>([^<]*)<\/title>/);
const title = m ? m[1] : '(取得できませんでした)';
console.log('文字の読みやすさ（コントラスト）の点検' + (ALL ? '（全ユニット）' : '（代表ユニット／全部見るには --all）'));
if (title === 'OK') { console.log('■ 問題なし'); process.exit(0); }
if (title.indexOf('NG::') === 0) {
  const list = title.slice(4).split('::');
  console.log('■ 基準を割っているところ ' + list.length + ' 件');
  list.forEach(function (x) { console.log('  - ' + x); });
  process.exit(1);
}
console.log('■ ' + title);
process.exit(1);
