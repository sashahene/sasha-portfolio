#!/usr/bin/env python3
"""Copy cuff-model.js into the pages that show the cuff.

cuff-model.js is the one place to edit the bracelet. The pages carry their own copy between
<!-- cuff-model:start --> and <!-- cuff-model:end --> so they also work when opened straight
from a file, where a page cannot load a script that sits next to it. Run this after editing
cuff-model.js:

    python3 alc-id/site/models/sync-cuff-model.py
"""
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
PAGES = ["cuff.html", "diamond-drop.html", "pulse-intro.html"]
START, END = "<!-- cuff-model:start -->", "<!-- cuff-model:end -->"

model = (HERE / "cuff-model.js").read_text()
block = f"{START}\n<script>\n{model.rstrip()}\n</script>\n{END}"

for name in PAGES:
    page = HERE / name
    text = page.read_text()
    new, count = re.subn(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S)
    if count != 1:
        raise SystemExit(f"{name}: expected one cuff-model block, found {count}")
    if new != text:
        page.write_text(new)
        print(f"updated {name}")
    else:
        print(f"{name} already up to date")
