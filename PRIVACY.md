# CPGitSync — Privacy Policy

_Last updated: 2026-08-04_

CPGitSync is a browser extension that pushes your accepted competitive-programming
solutions to a GitHub repository you choose. This policy explains exactly what data
it touches and where that data goes. In short: **your data goes only to GitHub, and
nothing is sold, tracked, or shared with anyone else.**

## What the extension accesses

- **Your submitted solution code and problem details** (title, difficulty, language,
  runtime/memory) from LeetCode, Codeforces, and CodeChef pages you visit, at the
  moment you get an *Accepted* verdict (or when you click "Push this solution").
- **A GitHub access token**, obtained when you click "Login with GitHub" and approve
  the app on GitHub's own page.
- **Your GitHub username**, read once after login to label the connection.
- **Your repository settings** (owner, repo, branch, per-platform toggles) that you enter.

## How that data is used

Solely to **commit your solutions to the GitHub repository you selected**. The token
is used only to authenticate those commits. That's the extension's only purpose.

## Where data is stored

- Your token and settings are stored **locally in your browser** using `chrome.storage.local`.
  They are not uploaded anywhere by the extension except to GitHub to perform commits.
- During the one-time "Login with GitHub" step, the login response passes through a
  small OAuth helper (the CPGitSync OAuth proxy, hosted on Vercel) whose **only** job is
  to complete GitHub's login handshake and hand the token back to your browser. The proxy
  does not store your token or log your data.

## What is sent to third parties

- **GitHub** (`github.com`, `api.github.com`): receives your solution files and commit
  requests — this is the core function — and issues your access token during login.
- **The CPGitSync OAuth proxy** (Vercel): momentarily handles the login code exchange.
- **No one else.** There are no analytics, no trackers, no advertising, and no data brokers.

## Data retention & deletion

Everything the extension stores lives in your browser. Remove the extension (or clear its
storage) to delete it. To revoke access entirely, delete the token under your GitHub
[Applications settings](https://github.com/settings/applications).

## Permissions, briefly

- Host access to `leetcode.com`, `codeforces.com`, `codechef.com` — to read your accepted
  submissions on those sites.
- Host access to `github.com` / `api.github.com` — to log in and commit.
- `storage` — to save your settings/token locally.
- `notifications` — to confirm pushes.
- `identity` — to run the "Login with GitHub" flow.

## Contact

Questions? Open an issue at https://github.com/DevanshPant/CPGitSync/issues
