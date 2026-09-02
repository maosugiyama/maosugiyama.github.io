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

const PROBE = `<script>window.addEventListener("load",function(){setTimeout(function(){
function lum(c){var m=c.match(/\\d+/g); if(!m) return null;
 var a=m.slice(0,3).map(function(v){v=v/255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
 return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
function bgOf(el){ while(el){ var c=getComputedStyle(el).backgroundColor;
 if(c && c.indexOf("rgba(0, 0, 0, 0)")<0 && c!=="transparent") return c; el=el.parentElement; }
 return "rgb(255,255,255)"; }
var bad=[], seen={};
function scan(){ document.querySelectorAll("body *").forEach(function(el){
  if(!el.offsetParent && el.tagName!=="BODY") return;
  var t=""; for(var i=0;i<el.childNodes.length;i++) if(el.childNodes[i].nodeType===3) t+=el.childNodes[i].textContent;
  t=t.trim(); if(!t) return;
  var cs=getComputedStyle(el); var f=lum(cs.color), b=lum(bgOf(el)); if(f===null||b===null) return;
  var r=(Math.max(f,b)+0.05)/(Math.min(f,b)+0.05);
  var size=parseFloat(cs.fontSize), bold=(parseInt(cs.fontWeight)||400)>=700;
  var need=(size>=24 || (size>=18.66 && bold)) ? 3.0 : 4.5;
  if(r<need){ var k=cs.color+"|"+bgOf(el)+"|"+Math.round(size); if(seen[k]) return; seen[k]=1;
    bad.push(r.toFixed(2)+" 必要"+need+" "+Math.round(size)+"px "+cs.color+" / "+bgOf(el)+" 「"+t.slice(0,20)+"」"); } }); }
try{
  enterRoad(); scan(); switchTab("grammar"); scan();
  GRAMMAR_UNITS.forEach(function(u){ openGrammarUnit(u.id); scan(); });
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
    '--virtual-time-budget=12000', '--dump-dom', 'file://' + page,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = (e.stdout || '').toString();
} finally {
  fs.unlinkSync(page);
  fs.rmSync(tmp, { recursive: true, force: true });
}
const m = out.match(/<title>([^<]*)<\/title>/);
const title = m ? m[1] : '(取得できませんでした)';
console.log('文字の読みやすさ（コントラスト）の点検');
if (title === 'OK') { console.log('■ 問題なし'); process.exit(0); }
if (title.indexOf('NG::') === 0) {
  const list = title.slice(4).split('::');
  console.log('■ 基準を割っているところ ' + list.length + ' 件');
  list.forEach(function (x) { console.log('  - ' + x); });
  process.exit(1);
}
console.log('■ ' + title);
process.exit(1);
