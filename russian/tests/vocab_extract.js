// 語彙索引の抽出器。ユニットの表から「語＋意味」を取り出す。
const fs=require('fs'),vm=require('vm');
const s=fs.readFileSync('index.html','utf8');const c={};vm.createContext(c);
vm.runInContext(s.match(/const GRAMMAR_UNITS\s*=\s*\[[\s\S]*?\n\];/)[0]+';globalThis.U=GRAMMAR_UNITS;',c);
vm.runInContext(s.match(/const LETTERS\s*=\s*\[[\s\S]*?\n\];/)[0]+';globalThis.L=LETTERS;',c);

const strip=t=>t.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const CYRWORD=/^[А-Яа-яЁё́\-]+$/;
const PRON=new Set(['я','ты','он','она́','оно́','мы','вы','они́','он / она́','кто','что']);

const entries=[];
function add(word,mean,unit){
  word=word.trim(); mean=(mean||'').trim();
  if(!word||!/[А-Яа-яЁё]/.test(word)) return;
  if(PRON.has(word.toLowerCase())) return;
  entries.push({w:word,m:mean,u:unit});
}

// ---- 1) 文字図鑑の33語 ----
c.L.forEach(l=>add(l.ex,l.exm,'@'+l.u));

// ---- 2) 表（conj-table）----
const SKIP_UNITS=new Set(['verb-e','verb-i','verb-past','adj-cases','plural-cases-full','case-gen','case-dat','case-inst','case-prep','noun-count','pron-personal','read-tale']);
const PREPS=new Set(['в','на','с','у','к','по','за','из','о','об','без','для','до','от','над','под','пе́ред','ме́жду','во́зле','о́коло','вокру́г','че́рез']);
c.U.forEach(u=>{
  if(SKIP_UNITS.has(u.id)) return;
  [...u.lesson.matchAll(/<span class="pron">([\s\S]*?)<\/span><span class="form">([\s\S]*?)<\/span>/g)].forEach(m=>{
    let w=strip(m[1]), f=strip(m[2]);
    if(!/[А-Яа-яЁё]/.test(w)) return;
    if(/^-/.test(f)) return;                       // 語尾の行
    if(/[.?!]$/.test(w)||/[.?!] /.test(w)) return; // 文まるごとの行
    // 「у ＋ 生格」→「у」
    w=w.replace(/\s*＋\s*[^＋]*$/,'').trim();
    // 「хоро́ший（良い）」→ 語と意味に分ける
    const par=w.match(/^([^（(]+)（([^）]+)）$/);
    let mean=f;
    if(par){ w=par[1].trim(); mean=par[2]; }
    // 意味は最初のまとまり（全角空白・※・「　」で切る）
    mean=mean.split(/[　※]/)[0].trim();
    // 「царь] 王様　／　цари́ца　王妃」型：form の ／ 以降に第2の語
    const dual=f.split('／');
    if(dual.length===2 && /^[А-Яа-яЁё́\- ]+$/.test(dual[1].trim().split('　')[0]||'')){
      const seg=dual[1].trim().split(/　+/);
      if(seg.length>=2 && CYRWORD.test(seg[0])) add(seg[0],seg.slice(1).join(' '),u.id);
      mean=dual[0].trim();
    }
    // 「снять / снима́ть」→ 2語とも（意味を掃除してから）
    if(/^[А-Яа-яЁё́]+ \/ [А-Яа-яЁё́]+$/.test(w)){
      const mm=mean.split(/(?=[А-Яа-яЁё])/)[0].replace(/[、。・\s]+$/,'').trim();
      const [a,b]=w.split(' / '); add(a,mm,u.id); add(b,mm,u.id); return;
    }
    // 「X → Y」の行：右がロシア語なら派生語、右が日本語なら意味
    const arrow=w.match(/^(.+?)\s*→\s*(.+)$/);
    if(arrow){
      if(/[А-Яа-яЁё]/.test(arrow[2])){ w=arrow[2].trim(); }
      else {
        // 意味欄の先頭のロシア語が本当の見出し（круг → 丸い ／ кру́глый…）
        const mw=mean.match(/^([А-Яа-яЁё́\-]+)/);
        if(mw){ w=mw[1]; mean=arrow[2].trim(); }
        else return;
      }
    }
    // 意味欄からロシア語の用例を切り落とす
    mean=mean.split(/(?=[А-Яа-яЁё])/)[0].replace(/[、。・･\s]+$/,'').trim();
    if(!/[぀-ヿ一-鿿]/.test(mean)) return;
    // 2語のもの：前置詞ではじまる言い回しだけ残す
    const parts=w.split(' ').filter(Boolean);
    if(parts.length>=2){
      const first=parts[0].replace(/́/g,'').toLowerCase();
      const isName=/^[А-ЯЁ]/.test(parts[0]) ; // 固有名（Ба́ба-яга́ 型はハイフンで1語）
      if(!(PREPS.has(first)||isName)) return;
      if(parts.length>3) return;
    }
    add(w,mean,u.id);
  });
  // ---- 3) 絵つきカード・チップ ----
  [...u.lesson.matchAll(/<div class="tp-item[^"]*">(?:<img[^>]*>|<svg[\s\S]*?<\/svg>)<b>([^<]+)<\/b><i>([^<]*)<\/i>/g)]
    .forEach(m=>add(strip(m[1]),strip(m[2]),u.id));
  [...u.lesson.matchAll(/<div class="tchip"[^>]*>([^<]+)<i>([^<]*)<\/i>/g)]
    .forEach(m=>add(strip(m[1]),strip(m[2]),u.id));
});

// ---- 4) 曜日・季節（wd-row）----
c.U.forEach(u=>{
  [...u.lesson.matchAll(/<span class="wd-chip"[^>]*>([^<]+)<\/span><span class="wd-t"><b>([^<]+)<\/b><span class="wd-in">([^<]*)<\/span><span class="wd-why">([^<]*)<\/span>/g)]
    .forEach(m=>{
      const jp=m[1].trim(), w=m[2].trim(), why=m[4].trim();
      const mean = /^[日月火水木金土]$/.test(jp) ? jp+'曜日' : jp;
      add(w, mean, u.id);
    });
});

// ---- 5) 手で足す語（表からは取れないが、教えている語）----
const EXTRA=[
  ['хо́лодно','寒い','impersonal'],['жа́рко','暑い','impersonal'],['ску́чно','退屈だ','impersonal'],
  ['гру́стно','かなしい','impersonal'],['ве́село','楽しい','impersonal'],['интере́сно','おもしろい','impersonal'],
  ['на́до','〜しなければ','impersonal'],['ну́жно','〜する必要がある','impersonal'],
  ['мо́жно','〜してよい','impersonal'],['нельзя́','〜してはいけない','impersonal'],
  ['до́лжен','〜しなければならない（責任）','impersonal'],
  ['о́чень','とても','character'],['дово́льно','なかなか','character'],
  ['сли́шком','〜すぎる','character'],['немно́го','すこし','character'],
  ['лу́чше','よりよい・もっとよく','comparative'],['ху́же','より悪い','comparative'],
  ['бо́льше','より大きい・もっと','comparative'],['ме́ньше','より小さい','comparative'],
  ['ста́рше','年上の（比較級）','comparative'],['моло́же','年下の（比較級）','comparative'],
  ['янва́рь','1月','seasons'],['февра́ль','2月','seasons'],['март','3月','seasons'],
  ['апре́ль','4月','seasons'],['май','5月','seasons'],['ию́нь','6月','seasons'],
  ['ию́ль','7月','seasons'],['а́вгуст','8月','seasons'],['сентя́брь','9月','seasons'],
  ['октя́брь','10月','seasons'],['ноя́брь','11月','seasons'],['дека́брь','12月','seasons'],
];
EXTRA.forEach(x=>add(x[0],x[1],x[2]));

// ---- 重複をまとめる ----
const norm=w=>w.replace(/́/g,'').toLowerCase();
const map=new Map();
entries.forEach(e=>{
  const k=norm(e.w);
  if(map.has(k)){ const x=map.get(k); if(!x.us.includes(e.u)) x.us.push(e.u); if(e.m.length>x.m.length && e.m.length<30) {} }
  else map.set(k,{w:e.w,m:e.m,us:[e.u]});
});
const list=[...map.values()];
console.log('のべ '+entries.length+' → 見出し '+list.length+' 語');
fs.writeFileSync(process.argv[2]||'/tmp/vocab.json', JSON.stringify(list,null,1));
