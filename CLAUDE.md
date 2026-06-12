# Dollaz — codebase guide

Local-only personal-finance desktop app (Tauri 2, Linux AppImage). Architecture
deliberately mirrors `../ffcalc`: a framework-free TypeScript core + a React UI
bundled by esbuild into one self-contained HTML + a thin Tauri shell with a
signed self-updater.

## Layout

- `src/` — domain core, pure TypeScript, no DOM/React. The single source of truth.
  - `csv.ts` parse + delimiter/header detection · `normalize.ts` description
    cleaning, `parseAmount`/`parseDate` · `import.ts` CSV+mapping → transactions,
    `guessMapping` · `ofx.ts`/`qif.ts`/`detect.ts` other formats · `categorize.ts`
    rule matching · `dedupe.ts` (FITID-aware) · `analyze.ts` aggregations ·
    `project.ts` forecasts · `wellbeing.ts` Augury score + net-worth series ·
    `seed.ts` grimoire categories/rules · `types.ts` (incl. `Account`) · `index.ts`.
- `tests/core.test.ts` — vitest over `src/`. `npm test`.
- `ui/` — React `.jsx` (no build-time JSX dep; esbuild `--jsx=transform`).
  **Design: "The Illuminated Ledger" — gilded gothic grimoire, dark-only, arcane
  copy.** Design source + screenshots in `dollaz.zip` (gitignored, local only).
  - `core-entry.js` imports `../src/index.ts` → `window.DZ` (single source of truth).
  - `derive.js` — `window.refreshData(state)` computes the screens' `window.DATA`
    (a STABLE object, mutated in place) from live state via `DZ`. Screens capture
    `const D = window.DATA` once and read live. `app.jsx` calls it each render.
  - `format.js` → `window.fmtCurrency/...`; `window.setCurrencySymbol` from settings.
  - `state.jsx` localStorage (`dollaz:v1`): transactions, categories, rules,
    **accounts**, importFormats, settings (incl. `tweaks`: mood/grain/gilt/brandMark/
    chartStyle). undo/redo, toasts.
  - `shared.jsx` primitives + engraved SVG charts + ornament (Corners/Headpiece/
    Laurel/Donut). `icons.jsx` `Icon`/`ICONS`.
  - Screens (route → component): `dashboard.jsx` Sanctum · `accounts.jsx` Vaults ·
    `transactions.jsx` The Ledger · `analysis.jsx` Auguries · `categories.jsx`
    Sigils · `import.jsx` The Summoning. Shell/router/updater/settings+tweaks/help
    in `app.jsx`. Screens get props `{ t, go, toast, app:{state,setState,pushHistory} }`.
  - `build.sh` assembles `ui/Dollaz.html` (gitignored). **`JSX_ORDER` matters** —
    `derive.js` must precede the screens (it initialises `window.DATA`).
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
