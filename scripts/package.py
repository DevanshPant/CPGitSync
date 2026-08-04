#!/usr/bin/env python3
"""Build a Chrome Web Store zip of the extension.

Produces cpgitsync.zip with manifest.json at the root and only the files the
store needs (manifest.json, src/, assets/) — no proxy, scripts, or docs.
Uses forward-slash paths so the Web Store accepts it. Run: python scripts/package.py
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "cpgitsync.zip")
INCLUDE = ["manifest.json", "src", "assets"]

if os.path.exists(OUT):
    os.remove(OUT)

count = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for item in INCLUDE:
        path = os.path.join(ROOT, item)
        if os.path.isfile(path):
            z.write(path, item)
            count += 1
        else:
            for dirpath, _dirs, files in os.walk(path):
                for f in files:
                    full = os.path.join(dirpath, f)
                    rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
                    z.write(full, rel)
                    count += 1

size_kb = round(os.path.getsize(OUT) / 1024, 1)
print(f"Built {OUT} — {count} files, {size_kb} KB")
