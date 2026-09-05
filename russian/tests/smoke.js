// ============================================================
// 動作チェック（スモークテスト）
// ============================================================
// 使い方：  node tests/smoke.js
// ヘッドレスの Chrome で、ユーザーが実際にたどる道を歩きます：
// 起動 → 目次 → ユニットを開く → 練習を最後まで解く（mc/input/order
// 全形式）→ 帰り道でスクロール位置が戻るか → タブの往復 → 索引。
// あわせて、画面に見えている文字の実測サイズ（12px未満がないか）と、
// コンソールエラーの有無を確認します。
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROMES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
];
const chrome = CHROMES.filter(function (p) { return fs.existsSync(p); })[0];
if (!chrome) { console.log('Chrome が見つからないので飛ばします。'); process.exit(0); }

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const PROBE = `<script>
var __errs=[]; window.addEventListener('error',function(e){__errs.push(String(e.message).slice(0,90));});
window.addEventListener("load",function(){setTimeout(function(){
var R=[], F=[];
function ok(name,cond,extra){ if(cond){R.push(name);}else{F.push(name+(extra?('｜'+String(extra).slice(0,80)):''));} }
try{
  // ---- 0. 起動と数 ----
  ok('起動:59ユニット', GRAMMAR_UNITS.length===59, GRAMMAR_UNITS.length);
  var totalQ = GRAMMAR_UNITS.reduce(function(n,u){return n+u.drills.length;},0);
  ok('起動:775問', totalQ===775, totalQ);
  ok('起動:表紙が描画', !!document.querySelector('#home-cover, .cover-intro'));

  // ---- 1. 目次 → ユニット → 帰り道（スクロール復元）----
  openToc();
  window.scrollTo(0,600);
  var y0=window.scrollY;
  openGrammarUnit('intonation','toc');
  var uv=document.getElementById('grammar-unit');
  ok('ИК:ユニット表示', uv && uv.style.display==='block' && uv.innerHTML.indexOf('ИК-7')>=0);
  ok('ИК:音調曲線SVG', uv.querySelectorAll('svg').length>=7, uv.querySelectorAll('svg').length);
  ok('ИК:音声ボタン', uv.querySelectorAll('.acc-say').length>=9, uv.querySelectorAll('.acc-say').length);
  backToUnitOrigin();
  ok('目次へ帰還+位置復元', Math.abs(window.scrollY-y0)<80, 'y='+window.scrollY+' 期待'+y0);

  // ---- 2. 文法メニューの帰り道 ----
  switchTab('grammar');
  window.scrollTo(0,300); var y1=window.scrollY;
  openGrammarUnit('adj-short');
  backToGrammarHub();
  ok('メニュー位置復元', Math.abs(window.scrollY-y1)<80, 'y='+window.scrollY);

  // ---- 3. タブの帰り道（goTab/tabBack）----
  switchTab('home');
  window.scrollTo(0,500); var y2=window.scrollY;
  goTab('dictation');
  ok('聞いて綴るへ', activeTab==='dictation' && document.getElementById('dictation-view').innerHTML.indexOf('ディクテーション')>=0);
  tabBack();
  ok('ホームへ帰還+位置復元', activeTab==='home' && Math.abs(window.scrollY-y2)<80, 'y='+window.scrollY);

  // ---- 4. 練習を最後まで解く（全形式）----
  function solveUnit(id){
    openGrammarUnit(id); startUnitDrill(id);
    var guard=0;
    while(drillState && !drillState.done && guard<40){
      guard++;
      var q=drillState.qs[drillState.i];
      if(q.type==='mc'){ answerUnitDrill(q.a); }
      else if(q.type==='input'){ drillState.input=q.a; submitUnitInput(); }
      else if(q.type==='order'){
        drillState.order=q.accept[0].o.split(' ');   // order はトークン文字列の配列
        submitUnitOrder();
      } else { break; }
      if(drillState.answered===null){ break; }   // 解答が受理されなかった
      nextUnitDrill();
    }
    var p=unitProg(id);
    return drillState && drillState.done && p.best===p.total;
  }
  ok('練習全問正解:conjunctions(mc)', solveUnit('conjunctions'));
  ok('練習全問正解:order-case(order/input)', solveUnit('order-case'));
  ok('練習全問正解:noun-plural(input)', solveUnit('noun-plural'));

  // ---- 5. まちがえたときの解説（WHY）----
  openGrammarUnit('negation-words'); startUnitDrill('negation-words');
  var q0=drillState.qs[0]; var wrong=(q0.a===0)?1:0;
  answerUnitDrill(wrong);
  var fb=document.querySelector('#unit-drill-area .drill-fb.ng');
  ok('誤答フィードバック表示', !!fb && fb.textContent.length>10);
  var whyTxt=(document.querySelector('#unit-drill-area .drill-why')||{textContent:''}).textContent;
  ok('選択肢ごとの解説あり', whyTxt.length>5, whyTxt.slice(0,40));

  // ---- 6. ことばの索引・あしあと・ノート ----
  switchTab('home'); openVocab();
  ok('索引が描画', (document.getElementById('home-vocab')||{innerHTML:''}).innerHTML.length>500);
  openLog();
  ok('あしあとカレンダー', (document.getElementById('home-log')||{innerHTML:''}).innerHTML.length>100);
  openNotes();
  ok('ノート画面', (document.getElementById('home-notes')||{innerHTML:''}).innerHTML.length>100);

  // ---- 7. ディクテーションの問題数がラベルどおりか ----
  var dictN=buildDictationPool(['w','s']).length;
  ok('ディクテーション66問(単語33+例文33)', dictN===66, dictN);

  // ---- 8. 文字サイズの実測（12px未満の見える文字）----
  openGrammarUnit('noun-count');
  var small=[];
  uv.querySelectorAll('*').forEach(function(el){
    if(small.length>=5) return;
    var t=(el.childNodes.length===1 && el.firstChild.nodeType===3)?el.textContent.trim():'';
    if(t.length<2) return;
    var fs=parseFloat(getComputedStyle(el).fontSize);
    if(fs<11.5) small.push(el.tagName+':'+fs.toFixed(1)+'px:'+t.slice(0,14));
  });
  ok('12px未満の文字なし(noun-count)', small.length===0, small.join('/'));

  // ---- 9. キリルの二重拡大なし ----
  var dbl=0;
  document.querySelectorAll('[lang=ru] [lang=ru]').forEach(function(el){
    var ps=parseFloat(getComputedStyle(el.parentElement).fontSize);
    var es=parseFloat(getComputedStyle(el).fontSize);
    if(es>ps*1.02) dbl++;
  });
  ok('二重拡大なし', dbl===0, dbl+'件');

}catch(e){ F.push('中断:'+String(e.message).slice(0,90)); }
__errs.forEach(function(m){ F.push('コンソール:'+m); });
document.title = 'SMOKE ' + R.length + '/' + (R.length+F.length) + (F.length? '::'+F.join('::') : '');
},1200);});</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
const page = path.join(ROOT, '_smoke_check.html');
fs.writeFileSync(page, html.replace('</body>', PROBE + '\n</body>'));
let out = '';
try {
  out = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--user-data-dir=' + tmp, '--window-size=500,1200',
    '--virtual-time-budget=12000', '--dump-dom', 'file://' + page,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024, timeout: 28000, killSignal: 'SIGKILL' });
} catch (e) { out = (e.stdout || '').toString(); }
finally { fs.unlinkSync(page); fs.rmSync(tmp, { recursive: true, force: true }); }

const m = out.match(/<title>([^<]*)<\/title>/);
const title = m ? m[1] : '(取得できませんでした)';
console.log('動作チェック（スモークテスト）');
if (/^SMOKE \d+\/\d+$/.test(title)) { console.log('■ すべて通過 ' + title.slice(6)); process.exit(0); }
if (title.indexOf('SMOKE') === 0) {
  const parts = title.split('::');
  console.log('■ ' + parts[0].slice(6) + ' 通過、失敗あり：');
  parts.slice(1).forEach(function (x) { console.log('  - ' + x); });
  process.exit(1);
}
console.log('■ ' + title.slice(0, 300));
process.exit(1);
