#!/usr/bin/env bash
# build.sh — bundle ui/ into a fully self-contained offline ui/Dollaz.html.
# Pre-compiles JSX with esbuild, bundles the TS domain core from ../src, inlines
# React UMD. Result: single file, no network at runtime (fonts excepted).

set -euo pipefail
cd "$(dirname "$0")"

OUT=Dollaz.html
ESBUILD=../node_modules/.bin/esbuild
REACT_UMD=../node_modules/react/umd/react.production.min.js
REACT_DOM_UMD=../node_modules/react-dom/umd/react-dom.production.min.js
# Order matters — components register on window and read each other off it.
# derive.js initialises window.DATA before the screens capture it.
JSX_ORDER=(icons.jsx shared.jsx state.jsx derive.js dashboard.jsx accounts.jsx transactions.jsx analysis.jsx import.jsx categories.jsx app.jsx)

[[ -x "$ESBUILD" ]] || { echo "error: esbuild not found (run: npm install)"; exit 1; }
[[ -f "$REACT_UMD" ]] || { echo "error: React UMD not found (run: npm install)"; exit 1; }

COMPILED=$(mktemp --suffix=.js)
CORE=$(mktemp --suffix=.js)
UPDATER=$(mktemp --suffix=.js)
trap 'rm -f "$COMPILED" "$CORE" "$UPDATER"' EXIT

# Domain core: bundle ../src through core-entry.js → window.DZ (single source of truth).
"$ESBUILD" core-entry.js --bundle --format=iife --minify --platform=browser > "$CORE"

# Each file compiles to its own IIFE so top-level consts don't collide.
for f in "${JSX_ORDER[@]}"; do
  echo "// --- $f ---"
  "$ESBUILD" "$f" --format=iife --jsx=transform --minify
  echo
done > "$COMPILED"

# Tauri updater glue (no-ops in a browser).
"$ESBUILD" updater-entry.js --bundle --format=iife --minify --platform=browser > "$UPDATER"

{
cat <<'HTML_HEAD'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Dollaz · The Illuminated Ledger</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=EB+Garamond:ital,wght@0,400..700;1,400..700&family=Pirata+One&family=JetBrains+Mono:wght@400..700&display=swap"/>
  <style>
HTML_HEAD

cat styles.css

cat <<'HTML_MID'
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
/* React UMD (production) */
HTML_MID

cat "$REACT_UMD"; echo
echo '/* ReactDOM UMD (production) */'; cat "$REACT_DOM_UMD"; echo
echo '/* Dollaz domain core (bundled from ../src → window.DZ) */'; cat "$CORE"; echo
echo '/* Formatting helpers */'; cat format.js; echo
echo '/* Tauri updater glue */'; cat "$UPDATER"; echo
echo '/* Dollaz UI — JSX pre-compiled with esbuild */'; cat "$COMPILED"

cat <<'HTML_FOOT'
  </script>
</body>
</html>
HTML_FOOT
} > "$OUT"

echo "Built $OUT ($(wc -c < "$OUT") bytes)"
