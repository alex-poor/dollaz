# Dollaz

Local-only personal finance analysis. Import bank CSV exports, auto-categorise
transactions with rules you teach it once, and explore dashboards, category
trends and projections. Built as a Tauri desktop app (Linux AppImage) following
the same architecture as `ffcalc`.

## What it does

- **Import** any bank CSV. Map the date / description / amount columns once
  (Debit + Credit pairs supported); the layout is remembered per file format.
- **Auto-categorise.** A transaction's description is matched against retained
  rules (`WOOLWORTHS` → Groceries). New, unmatched merchants are surfaced in the
  import flow so you map them in one pass — that mapping is kept for next time.
- **Dedupe.** Re-importing an overlapping date range skips rows already present.
- **Dashboard.** Income / expense / net totals, monthly trend, top categories.
- **Analysis.** Category spend over time, plus simple projections (trailing
  average or linear trend) over a 3 / 6 / 12-month horizon.

All data lives in the browser-engine's `localStorage` on your machine. No network
calls at runtime except the update check.

## Architecture

- **`src/`** — the domain core in framework-free TypeScript (CSV parsing,
  description normalisation, rule matching, dedupe, aggregation, projection).
  Unit-tested with vitest (`npm test`).
- **`ui/`** — plain React `.jsx` screens. `ui/build.sh` bundles them with esbuild
  — **and bundles `src/` itself via `ui/core-entry.js`** so the same code that's
  unit-tested runs in the app (exposed as `window.DZ`). Output is a single
  self-contained `ui/Dollaz.html` (React UMD inlined; works from `file://`).
- **`src-tauri/`** — Tauri 2 shell. `updater` + `process` plugins; Linux AppImage.

## Develop

```
npm install
npm test            # run the core test suite
npm run ui:build    # bundle ui/Dollaz.html
npm run ui:open     # open the bundle in a browser (no Tauri needed)
npm run tauri:dev   # run the desktop app with devtools
```

## Build a local binary

```
npm run tauri:build
# → src-tauri/target/release/bundle/appimage/Dollaz_<version>_amd64.AppImage
```

## Pushing updates

Releases are signed and self-update from GitHub Releases of `alex-poor/dollaz`.
See [.github/UPDATER.md](.github/UPDATER.md) for the one-time signing-key setup.
Once set up:

```
npm version minor   # bumps + syncs package.json / Cargo.toml / tauri.conf.json
git push && git push --tags
```

CI builds and signs the AppImage, attaches a `latest.json` manifest to a draft
release; publish it and installed apps pick up the update within 30 minutes (or
via *Check for updates*).
