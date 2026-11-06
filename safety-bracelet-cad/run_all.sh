#!/bin/zsh
# Rebuild everything from params.py. Run from this folder.
set -e
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
.venv/bin/python build.py
"$BLENDER" -b -P render_views.py -- --samples 96 | grep -E "Render device|Traceback|complete"
.venv/bin/python annotate.py
