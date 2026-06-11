# Auto-updater setup

Dollaz uses Tauri's updater plugin. Releases are signed; clients verify via an
embedded public key and pull `latest.json` from the latest GitHub Release of
`alex-poor/dollaz`.

## One-time setup

1. Create the GitHub repo `alex-poor/dollaz` and push this project to it.

2. Generate a signing keypair locally:

   ```
   npx tauri signer generate -w ~/.tauri/dollaz.key
   ```

   Choose a strong password. Keep the `.key` file out of git.

3. Add GitHub repo secrets (Settings → Secrets and variables → Actions):

   - `TAURI_SIGNING_PRIVATE_KEY` — contents of the `.key` file.
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password you chose.

4. Copy the public key (printed by `signer generate`, also in
   `~/.tauri/dollaz.key.pub`) into `src-tauri/tauri.conf.json`, replacing the
   `REPLACE_WITH_PUBLIC_KEY` placeholder.

5. Commit the config change, then tag a release:

   ```
   npm version minor      # bumps package.json + syncs Cargo.toml/tauri.conf.json
   git push && git push --tags
   ```

   CI signs the AppImage, uploads it plus a `latest.json` manifest to a **draft**
   release. Publish the draft to make it discoverable via
   `releases/latest/download/latest.json`.

## How updates reach the installed binary

- The app checks the endpoint on launch and every 30 minutes (desktop only).
- When a newer `version` is found, the user gets an in-app prompt; on accept it
  downloads, verifies the signature, installs, and relaunches.

## Local build (no signing, no updater)

```
npm install
npm run tauri:build   # produces src-tauri/target/release/bundle/appimage/*.AppImage
```

The AppImage runs standalone. Self-update only works once the signed,
published release flow above is in place.
