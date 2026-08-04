# CPGitSync

Sync your competitive programming solutions to GitHub automatically.

When you solve a problem on **LeetCode**, **Codeforces**, or **CodeChef** and get an *Accepted* verdict, CPGitSync grabs your submitted code and pushes it to a GitHub repo you pick. No manual copy-pasting, no git commands.

It's a Chrome extension. There's no server and no account to make — it uses your own GitHub token and talks straight to the GitHub API.

## How it works

**One-time setup**

1. Load the extension in Chrome (see *Install* below).
2. Make an empty GitHub repo to store your solutions.
3. Create a GitHub token and paste it, plus the repo name, into the extension's settings.

**Every time you solve a problem**

1. You submit your solution on the coding site as usual.
2. The moment the verdict shows *Accepted*, the extension notices it.
3. It reads the exact code you submitted, along with the problem name, language, and stats.
4. It commits that code to your repo inside a folder for the problem, and adds a small README with the details.
5. A browser notification confirms the push. If you solve the same problem again, it updates the existing file instead of duplicating it.

That's it — you keep grinding, your GitHub fills up on its own.

## Install

1. Download or clone this repo.
2. Run the icon generator once: `node scripts/make-icons.js`
3. Go to `chrome://extensions`, turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `cpgitsync` folder.

## Setup

CPGitSync signs in with a **one-click "Login with GitHub"** — you approve it on GitHub's own page and you're in. No tokens, no keys to paste. It uses a tiny OAuth proxy (the client secret never touches the extension).

1. **Deploy the OAuth proxy** (one time). Follow [`oauth-proxy/README.md`](oauth-proxy/README.md) — register a GitHub OAuth App, deploy the `oauth-proxy/` folder to Vercel, and set the Client ID + secret as Vercel env vars.
2. **Wire it into the extension.** In [`src/background.js`](src/background.js), set `GITHUB_CLIENT_ID` and `OAUTH_PROXY_URL` to your values, then reload the extension.
3. Create an empty repo (public or private) to hold your solutions.
4. Open the extension → **Settings** → click **Login with GitHub** → approve. It auto-fills your username.
5. Fill in **repo**, click **Test connection** (should turn green), then **Save**.

> Prefer a Personal Access Token instead (no Vercel, no login)? There's an **Advanced** section in Settings — paste a fine-grained token with **Contents: Read & write** and skip steps 1–2 and 4.

## How your repo gets organized

```
leetcode/
  0001-two-sum/
    two-sum.py
    README.md
codeforces/
  1795a-blank-space/
    1795a-blank-space.cpp
    README.md
codechef/
  flow001/
    flow001.py
    README.md
```

Each problem gets its own folder with the solution file and a short README (difficulty, language, runtime, link to the problem).

## Supported sites

| Site | How it pushes |
|------|---------------|
| LeetCode | Automatic on *Accepted* |
| Codeforces | Automatic when the verdict turns *Accepted* |
| CodeChef | Automatic (best-effort) + a manual **Push this solution** button in the popup |

CodeChef doesn't expose a public submission API, so on that site the manual button is the reliable option if auto-detect misses.

## Privacy

Your token and settings are stored only in your browser (`chrome.storage.local`). The extension connects to two places: the coding site you're on, and `api.github.com`. Nothing else. No tracking, no external servers.

---

Not affiliated with LeetCode, Codeforces, CodeChef, or GitHub.
