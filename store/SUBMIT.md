# Publishing CPGitSync to the Chrome Web Store

A one-time checklist. Budget ~30 minutes plus a few days of review.

## 0. Before you package (web-flow login must be wired in)

The published extension needs your real OAuth values baked in. In `src/background.js`:

```js
const GITHUB_CLIENT_ID = "your-client-id";
const OAUTH_PROXY_URL  = "https://YOUR-APP.vercel.app/api/callback";
```

Make sure your Vercel proxy is deployed and the GitHub OAuth App's callback URL points to it
(see `oauth-proxy/README.md`). Bump the `version` in `manifest.json` for every store upload.

## 1. Build the store zip

The store wants a zip with `manifest.json` at the **root**, only the extension files
(not the proxy, scripts, or docs), and **forward-slash** paths. Use the included script — it
gets all three right:

```bash
python scripts/package.py
```

That produces `cpgitsync.zip` with `manifest.json`, `src/`, and `assets/` — nothing else.

> Avoid Windows `Compress-Archive` for this: it writes backslash paths that the Web Store can
> reject. The Python script (or the `zip` CLI on macOS/Linux) is the safe choice.

## 2. Register as a Chrome Web Store developer (one time)

1. Go to https://chrome.google.com/webstore/devconsole
2. Pay the **one-time $5** registration fee (Google's fee, on your Google account).

## 3. Create the listing

1. **New item** → upload `cpgitsync.zip`.
2. Fill the fields from `store/LISTING.md` (name, summary, description, category, single purpose).
3. **Privacy policy URL:** `https://github.com/DevanshPant/CPGitSync/blob/main/PRIVACY.md`
4. Upload **screenshots** (1280×800 or 640×400) — see the shot list in `LISTING.md`.
5. Upload a **store icon** (128×128 — `assets/icons/icon128.png` works).
6. In **Privacy practices**, declare: collects *Authentication information* (the GitHub token),
   used only to run the extension's single purpose, **not sold or transferred**. Answer the
   permission-justification prompts using the text in `LISTING.md`.

## 4. Submit for review

- Choose visibility (**Public**), then **Submit for review**.
- Review typically takes a few days. You'll get an email when it's live.

## 5. After it's live

- Anyone can install it from your store URL and click **Login with GitHub** — done.
- To ship an update: bump `manifest.json` `version`, rebuild the zip, upload a new version.

## Notes

- Because login uses the web flow, **your Vercel proxy is now public infrastructure** — every
  user's login depends on it. Keep it deployed.
- The published extension's ID is stable, but you don't need it anywhere: the OAuth redirect is
  validated by the proxy against `*.chromiumapp.org`, so it works for any install.
