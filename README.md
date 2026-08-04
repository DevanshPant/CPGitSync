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

CPGitSync signs in with **"Login with GitHub"** (GitHub's Device Flow) — you never paste a secret key. It's a one-time OAuth App registration, then click-and-approve.

1. **Register an OAuth App** (one time, ~2 min) at https://github.com/settings/applications/new
   - Application name: `CPGitSync`
   - Homepage URL / Authorization callback URL: your repo URL (the callback isn't used by device flow, but the field is required)
   - ✅ **Check "Enable Device Flow"** — required
   - Register, then copy the **Client ID** (this is public, not a secret).
2. Create an empty repo (public or private) to hold your solutions.
3. Open the extension → **Settings** → paste the **Client ID** → click **Login with GitHub**. A code is copied to your clipboard and GitHub opens — paste it, approve, done.
4. Fill in **owner** and **repo**, click **Test connection** (should turn green), then **Save**.

> Prefer a Personal Access Token instead? There's an **Advanced** section for that — paste a fine-grained token with **Contents: Read & write**. No login needed then.

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
