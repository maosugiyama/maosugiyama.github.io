#!/usr/bin/env python3
"""
researchmap.jp/mao-lang から公開情報を取得して data.json に保存するスクリプト
"""

import json
import re
import sys
import requests
from bs4 import BeautifulSoup

URL = "https://researchmap.jp/mao-lang"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36"
}


def fetch_page(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    return BeautifulSoup(resp.text, "html.parser")


def get_name(soup: BeautifulSoup) -> dict:
    ja = soup.select_one("h1.rm-researcher-name")
    en = soup.select_one("div.rm-ruby")
    return {
        "ja": ja.get_text(strip=True) if ja else "",
        "en": en.get_text(strip=True) if en else "",
    }


def get_affiliation(soup: BeautifulSoup) -> str:
    for dl in soup.select("dl.rm-cv-basic-dl"):
        dt = dl.select_one("dt")
        if dt and "所属" in dt.get_text():
            dd = dl.select_one("dd")
            return dd.get_text(" ", strip=True) if dd else ""
    return ""


def get_keywords(soup: BeautifulSoup) -> list[str]:
    section = soup.select_one("div.research_interests-body")
    if not section:
        return []
    return [a.get_text(strip=True) for a in section.select("a.rm-cv-list-title")]


def get_papers(soup: BeautifulSoup) -> list[dict]:
    section = soup.select_one("div.published_papers-body")
    if not section:
        return []
    papers = []
    for li in section.select("ul.rm-cv-list-group > li.list-group-item"):
        title_tag = li.select_one("a.rm-cv-list-title")
        author_tag = li.select_one("div.rm-cv-list-author")
        divs = li.select("div.rm-cv-list-content > div")
        labels = [s.get_text(strip=True) for s in li.select("span.rm-cv-list-label")]

        # 3番目の div に雑誌名・巻号・年が入っている
        pub_info = ""
        for div in divs:
            text = div.get_text(" ", strip=True)
            # ラベル span を除いた本文だけ取得
            for span in div.select("span"):
                span.decompose()
            text = div.get_text(" ", strip=True)
            if text and not text.startswith("http"):
                pub_info = text

        papers.append({
            "title": title_tag.get_text(strip=True) if title_tag else "",
            "authors": author_tag.get_text(strip=True) if author_tag else "",
            "publication_info": pub_info,
            "labels": labels,
        })
    return papers


def get_books(soup: BeautifulSoup) -> list[dict]:
    section = soup.select_one("div.books_etc-body")
    if not section:
        return []
    books = []
    for li in section.select("ul.rm-cv-list-group > li.list-group-item"):
        title_tag = li.select_one("a.rm-cv-list-title")
        author_tag = li.select_one("div.rm-cv-list-author")
        clearfix = li.select_one("div.clearfix")
        pub_info = ""
        if clearfix:
            all_divs = clearfix.select("div")
            if len(all_divs) >= 3:
                pub_info = all_divs[-1].get_text(" ", strip=True)

        books.append({
            "title": title_tag.get_text(strip=True) if title_tag else "",
            "authors": author_tag.get_text(strip=True) if author_tag else "",
            "publication_info": pub_info,
        })
    return books


def get_presentations(soup: BeautifulSoup) -> list[dict]:
    section = soup.select_one("div.presentations-body")
    if not section:
        return []
    items = []
    for li in section.select("ul.rm-cv-list-group > li.list-group-item"):
        title_tag = li.select_one("a.rm-cv-list-title")
        divs = li.select("div.rm-cv-list-content > div")
        event_info = divs[-1].get_text(" ", strip=True) if divs else ""
        items.append({
            "title": title_tag.get_text(strip=True) if title_tag else "",
            "event_info": event_info,
        })
    return items


def main():
    print(f"Fetching: {URL}")
    soup = fetch_page(URL)

    data = {
        "source": URL,
        "name": get_name(soup),
        "affiliation": get_affiliation(soup),
        "research_keywords": get_keywords(soup),
        "papers": get_papers(soup),
        "books": get_books(soup),
        "presentations": get_presentations(soup),
    }

    output_path = "data.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Saved to {output_path}")
    print(f"  名前: {data['name']['ja']} ({data['name']['en']})")
    print(f"  所属: {data['affiliation']}")
    print(f"  研究キーワード: {len(data['research_keywords'])} 件")
    print(f"  論文: {len(data['papers'])} 件")
    print(f"  著書: {len(data['books'])} 件")
    print(f"  発表: {len(data['presentations'])} 件")


if __name__ == "__main__":
    main()
