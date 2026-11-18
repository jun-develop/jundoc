#!/usr/bin/env python3
"""Check every internal link and #anchor in the site, and every nav.js href. Exit 1 on a broken one.
Usage: python3 scripts/check-links.py   (from the jundoc folder)"""
import os, re, sys
from html.parser import HTMLParser

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = set(); self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"): self.ids.add(a["id"])
        if tag == "a" and a.get("href"): self.links.append(a["href"])

pages = {}
for d, _, files in os.walk(root):
    if "/." in d or "/scripts" in d: continue
    for f in files:
        if f.endswith(".html"):
            p = os.path.join(d, f); pg = Page(); pg.feed(open(p, encoding="utf-8").read())
            pages[os.path.relpath(p, root)] = pg

bad = []
for href in re.findall(r'href: "([^"]+)"', open(os.path.join(root, "assets/js/nav.js"), encoding="utf-8").read()):
    if href not in pages: bad.append(f"nav.js -> {href}")
for name, pg in sorted(pages.items()):
    for link in pg.links:
        if link.startswith(("http:", "https:", "mailto:", "javascript:")): continue
        path, _, frag = link.partition("#")
        target = os.path.normpath(os.path.join(os.path.dirname(name), path)) if path else name
        if target not in pages: bad.append(f"{name} -> {link} (no page)")
        elif frag and frag not in pages[target].ids: bad.append(f"{name} -> {link} (no anchor)")

print("\n".join(bad) or f"OK: {len(pages)} pages, no broken internal links")
sys.exit(1 if bad else 0)
