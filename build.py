#!/usr/bin/env python3
"""
data.json の内容を index.html に埋め込んで完成版 HTML を生成するビルドスクリプト
多言語対応（日本語 / English / Русский）
"""

import json
from html import escape

# ── データ読み込み ──────────────────────────────────────────────────────────────
with open("data.json", encoding="utf-8") as f:
    data = json.load(f)

name_ja   = data["name"]["ja"]
name_en   = data["name"]["en"]
keywords  = data["research_keywords"]
papers    = data["papers"]
books     = data["books"]
presentations = data["presentations"]

affiliation_raw = data["affiliation"]
parts = affiliation_raw.split(" ", 1)
institution_ja = parts[0]
position_ja    = parts[1] if len(parts) > 1 else ""

specialties_ja = "、".join(keywords[:5])
specialties_en = ", ".join(keywords[:5])

PROFILE_IMAGE = "image/プロフィール.PNG"


# ── ヘルパー ────────────────────────────────────────────────────────────────────
def e(s):
    return escape(s)


def render_keywords(keywords):
    items = "\n        ".join(
        f'<li class="keyword-tag">{e(kw)}</li>' for kw in keywords
    )
    return f'<ul class="keyword-list">\n        {items}\n      </ul>'


def render_label(label):
    cls = "label-peer-review" if "査読" in label else "label-author"
    return f'<span class="pub-label {cls}">{e(label)}</span>'


def render_papers(papers):
    if not papers:
        return "<p>—</p>"
    items = []
    for p in papers:
        labels_html = " ".join(render_label(l) for l in p.get("labels", []))
        items.append(
            f'        <li class="pub-item">'
            f'<span class="pub-authors">{e(p["authors"])}.</span> '
            f'<span class="pub-title">"{e(p["title"])}."</span> '
            f'<span class="pub-venue">{e(p["publication_info"])}</span>'
            + (f" {labels_html}" if labels_html else "")
            + "</li>"
        )
    return '      <ol class="pub-list">\n' + "\n".join(items) + "\n      </ol>"


def render_books(books):
    if not books:
        return "<p>—</p>"
    items = []
    for b in books:
        items.append(
            f'        <li class="pub-item">'
            f'<span class="pub-authors">{e(b["authors"])}.</span> '
            f'<span class="pub-title">『{e(b["title"])}』</span> '
            f'<span class="pub-venue">{e(b["publication_info"])}</span>'
            "</li>"
        )
    return '      <ol class="pub-list">\n' + "\n".join(items) + "\n      </ol>"


def render_presentations(presentations):
    if not presentations:
        return "<p>—</p>"
    items = []
    for p in presentations:
        items.append(
            f'        <li class="pub-item">'
            f'<span class="pub-title">"{e(p["title"])}."</span> '
            f'<span class="pub-venue">{e(p["event_info"])}</span>'
            "</li>"
        )
    return '      <ol class="pub-list">\n' + "\n".join(items) + "\n      </ol>"


# ── 翻訳辞書 ────────────────────────────────────────────────────────────────────
# JS の translations オブジェクトに埋め込む文字列を Python dict で定義
# HTML を含む値は innerHTML として扱う
T = {
    "ja": {
        "html_lang": "ja",
        "page_title": f"{name_ja} – 研究者ページ",
        "site_title": name_ja,
        "site_subtitle": f"{name_en}&nbsp;&nbsp;|&nbsp;&nbsp;{institution_ja}",
        "nav_profile": "プロフィール",
        "nav_keywords": "研究キーワード",
        "nav_publications": "業績",
        "sec_profile": "プロフィール",
        "sec_keywords": "研究キーワード",
        "sec_publications": "業績",
        "th_name": "氏名",
        "td_name": f"{name_ja}（{name_en}）",
        "th_affil": "所属",
        "td_affil": institution_ja,
        "th_pos": "職位",
        "td_pos": position_ja,
        "th_spec": "専門分野",
        "td_spec": specialties_ja,
        "th_rm": "researchmap",
        "th_web": "Web",
        "cat_papers": f"論文（{len(papers)} 件）",
        "cat_books": f"著書・訳書（{len(books)} 件）",
        "cat_pres": f"発表（{len(presentations)} 件）",
        "footer": f"&copy; 2026 {name_ja}. All rights reserved.",
    },
    "en": {
        "html_lang": "en",
        "page_title": f"{name_en} – Researcher Page",
        "site_title": name_en,
        "site_subtitle": f"{name_en}&nbsp;&nbsp;|&nbsp;&nbsp;Nagoya University of Foreign Studies",
        "nav_profile": "Profile",
        "nav_keywords": "Research Keywords",
        "nav_publications": "Publications",
        "sec_profile": "Profile",
        "sec_keywords": "Research Keywords",
        "sec_publications": "Publications",
        "th_name": "Name",
        "td_name": name_en,
        "th_affil": "Affiliation",
        "td_affil": "Nagoya University of Foreign Studies",
        "th_pos": "Position",
        "td_pos": "Full-time Lecturer in Foreign Languages",
        "th_spec": "Specialties",
        "td_spec": specialties_en,
        "th_rm": "researchmap",
        "th_web": "Web",
        "cat_papers": f"Papers ({len(papers)})",
        "cat_books": f"Books &amp; Translations ({len(books)})",
        "cat_pres": f"Presentations ({len(presentations)})",
        "footer": f"&copy; 2026 {name_en}. All rights reserved.",
    },
    "ru": {
        "html_lang": "ru",
        "page_title": "Мао Сугияма – Страница исследователя",
        "site_title": "Мао Сугияма",
        "site_subtitle": "Мао Сугияма&nbsp;&nbsp;|&nbsp;&nbsp;Нагойский университет иностранных языков",
        "nav_profile": "Профиль",
        "nav_keywords": "Ключевые слова",
        "nav_publications": "Публикации",
        "sec_profile": "Профиль",
        "sec_keywords": "Ключевые слова",
        "sec_publications": "Публикации",
        "th_name": "Имя",
        "td_name": f"杉山 真央（Мао Сугияма）",
        "th_affil": "Место работы",
        "td_affil": "Нагойский университет иностранных языков",
        "th_pos": "Должность",
        "td_pos": "Преподаватель иностранных языков",
        "th_spec": "Специализация",
        "td_spec": specialties_ja,
        "th_rm": "researchmap",
        "th_web": "Web",
        "cat_papers": f"Статьи ({len(papers)})",
        "cat_books": f"Книги и переводы ({len(books)})",
        "cat_pres": f"Доклады ({len(presentations)})",
        "footer": "&copy; 2026 Мао Сугияма. Все права защищены.",
    },
}

# Python dict → JS オブジェクトリテラル文字列に変換
def dict_to_js(d):
    lines = []
    for lang, vals in d.items():
        inner = ",\n      ".join(f'"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in vals.items())
        lines.append(f'  "{lang}": {{\n      {inner}\n  }}')
    return "{\n" + ",\n".join(lines) + "\n}"


js_translations = dict_to_js(T)

# ── HTML 生成 ───────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title data-i18n="page_title">{e(name_ja)} – 研究者ページ</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <header class="site-header">
    <div class="container header-inner">
      <div class="header-titles">
        <h1 class="site-title" data-i18n="site_title">{e(name_ja)}</h1>
        <p class="site-subtitle" data-i18n="site_subtitle">{e(name_en)}&nbsp;&nbsp;|&nbsp;&nbsp;{e(institution_ja)}</p>
      </div>
      <div class="lang-switcher">
        <button class="lang-btn active" data-lang="ja">JA</button>
        <button class="lang-btn" data-lang="en">EN</button>
        <button class="lang-btn" data-lang="ru">RU</button>
      </div>
    </div>
  </header>

  <nav class="site-nav">
    <div class="container">
      <ul>
        <li><a href="#profile" data-i18n="nav_profile">プロフィール</a></li>
        <li><a href="#keywords" data-i18n="nav_keywords">研究キーワード</a></li>
        <li><a href="#publications" data-i18n="nav_publications">業績</a></li>
      </ul>
    </div>
  </nav>

  <main class="container">

    <!-- プロフィール -->
    <section id="profile" class="section">
      <h2 class="section-title" data-i18n="sec_profile">プロフィール</h2>
      <div class="profile-grid">
        <div class="profile-photo">
          <img src="{PROFILE_IMAGE}" alt="プロフィール写真" class="profile-img">
        </div>
        <div class="profile-text">
          <table class="profile-table">
            <tr>
              <th data-i18n="th_name">氏名</th>
              <td data-i18n="td_name">{e(name_ja)}（{e(name_en)}）</td>
            </tr>
            <tr>
              <th data-i18n="th_affil">所属</th>
              <td data-i18n="td_affil">{e(institution_ja)}</td>
            </tr>
            <tr>
              <th data-i18n="th_pos">職位</th>
              <td data-i18n="td_pos">{e(position_ja)}</td>
            </tr>
            <tr>
              <th data-i18n="th_spec">専門分野</th>
              <td data-i18n="td_spec">{e(specialties_ja)}</td>
            </tr>
            <tr>
              <th data-i18n="th_web">Web</th>
              <td><a href="https://maosugiyama.github.io" target="_blank" rel="noopener">maosugiyama.github.io</a></td>
            </tr>
            <tr>
              <th data-i18n="th_rm">researchmap</th>
              <td><a href="https://researchmap.jp/mao-lang" target="_blank" rel="noopener">researchmap.jp/mao-lang</a></td>
            </tr>
          </table>
        </div>
      </div>
    </section>

    <!-- 研究キーワード -->
    <section id="keywords" class="section">
      <h2 class="section-title" data-i18n="sec_keywords">研究キーワード</h2>
      {render_keywords(keywords)}
    </section>

    <!-- 業績 -->
    <section id="publications" class="section">
      <h2 class="section-title" data-i18n="sec_publications">業績</h2>

      <div class="pub-category">
        <h3 class="pub-category-title" data-i18n="cat_papers">論文（{len(papers)} 件）</h3>
{render_papers(papers)}
      </div>

      <div class="pub-category">
        <h3 class="pub-category-title" data-i18n="cat_books">著書・訳書（{len(books)} 件）</h3>
{render_books(books)}
      </div>

      <div class="pub-category">
        <h3 class="pub-category-title" data-i18n="cat_pres">発表（{len(presentations)} 件）</h3>
{render_presentations(presentations)}
      </div>

    </section>

  </main>

  <footer class="site-footer">
    <div class="container">
      <p data-i18n="footer">&copy; 2026 {e(name_ja)}. All rights reserved.</p>
    </div>
  </footer>

  <script>
    const T = {js_translations};

    function setLang(lang) {{
      if (!T[lang]) return;
      const t = T[lang];

      // data-i18n 要素を一括更新
      document.querySelectorAll('[data-i18n]').forEach(el => {{
        const key = el.dataset.i18n;
        if (t[key] !== undefined) el.innerHTML = t[key];
      }});

      // <html lang> と <title> を更新
      document.documentElement.lang = t.html_lang || lang;

      // ボタンのアクティブ状態
      document.querySelectorAll('.lang-btn').forEach(btn => {{
        btn.classList.toggle('active', btn.dataset.lang === lang);
      }});

      localStorage.setItem('lang', lang);
    }}

    // 言語ボタンにイベントを設定
    document.querySelectorAll('.lang-btn').forEach(btn => {{
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    }});

    // 初期化：保存済み言語 or デフォルト ja
    setLang(localStorage.getItem('lang') || 'ja');
  </script>

</body>
</html>
"""

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("index.html を生成しました。")
