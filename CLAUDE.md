# Dollaz — codebase guide

Local-only personal-finance desktop app (Tauri 2, Linux AppImage). Architecture
deliberately mirrors `../ffcalc`: a framework-free TypeScript core + a React UI
bundled by esbuild into one self-contained HTML + a thin Tauri shell with a
signed self-updater.

## Layout

- `src/` — domain core, pure TypeScript, no DOM/React. The single source of truth.
  - `csv.ts` parse + delimiter/header detection · `normalize.ts` description
    cleaning, `parseAmount`/`parseDate` · `import.ts` CSV+mapping → transactions,
    `guessMapping` · `categorize.ts` rule matching (`applyRules`, `groupUnmapped`)
    · `dedupe.ts` · `analyze.ts` aggregations · `project.ts` forecasts ·
    `seed.ts` default categories/rules · `types.ts` · `index.ts` barrel.
- `tests/core.test.ts` — vitest over `src/`. `npm test`.
- `ui/` — React `.jsx` (no build-time JSX dep; esbuild `--jsx=transform`).
  - `core-entry.js` imports `../src/index.ts` and assigns `window.DZ` — esbuild
    bundles it so the **same** tested code runs in the app. No hand-ported mirror.
  - `format.js` → `window.fmtCurrency/fmtNumber/fmtMonth/fmtDate`. Currency symbol
    read from `window.__dz_currency` (set by `app.jsx` from settings).
  - `state.jsx` localStorage (`dollaz:v1`), undo/redo, toasts.
  - Screens: `dashboard.jsx` `import.jsx` `categories.jsx` `transactions.jsx`
    `analysis.jsx`; shell/router/updater/settings in `app.jsx`.
  - `build.sh` assembles `ui/Dollaz.html` (gitignored, regenerated). Screen files
    register components on `window`; **order in `JSX_ORDER` matters**.
  - `help/*.md` embedded as `window.HELP` per route.
- `src-tauri/` — Tauri shell; `lib.rs` registers updater + process plugins.
  `tauri.conf.json` updater endpoint → `alex-poor/dollaz`, AppImage target.
- `.github/workflows/tauri.yml` — tag `v*` → build/sign/publish `latest.json`.
- `scripts/sync-versions.mjs` — `npm version` keeps the three version fields aligned.

## Conventions

- Money sign convention everywhere: `amount < 0` = outflow/expense, `> 0` = income.
- A category **rule** matches when its (uppercased) `pattern` is a substring of the
  transaction's normalised description; longest match wins.
- Adding/editing rules re-runs `applyRules` over all transactions.
- After changing anything in `src/`, run `npm test`, then `npm run ui:build`
  (the UI embeds a bundled copy of `src/`).

## Gotchas

- `ui/Dollaz.html` is generated — never edit it by hand.
- AppImage bundling needs FUSE; in restricted environments build with
  `APPIMAGE_EXTRACT_AND_RUN=1`.
- The updater needs a signing keypair (see `.github/UPDATER.md`); the public key
  lives in `tauri.conf.json`, the private key is a CI secret.
