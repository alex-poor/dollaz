// Syncs src-tauri/Cargo.toml + src-tauri/tauri.conf.json to match package.json's version.
// Wired as the `version` npm script, so `npm version <patch|minor|major>` keeps all three in lockstep.
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const v = pkg.version;
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v)) {
  console.error(`Invalid semver in package.json: ${v}`);
  process.exit(1);
}

// tauri.conf.json — JSON, safe rewrite
const confPath = 'src-tauri/tauri.conf.json';
const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
conf.version = v;
fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n');

// Cargo.toml — replace first top-level `version = "..."` (the [package] one).
const cargoPath = 'src-tauri/Cargo.toml';
let cargo = fs.readFileSync(cargoPath, 'utf8');
const re = /^version = ".*"/m;
if (!re.test(cargo)) {
  console.error(`Could not find 'version = "..."' in ${cargoPath}`);
  process.exit(1);
}
cargo = cargo.replace(re, `version = "${v}"`);
fs.writeFileSync(cargoPath, cargo);

console.log(`✓ Synced v${v} → src-tauri/Cargo.toml, src-tauri/tauri.conf.json`);
