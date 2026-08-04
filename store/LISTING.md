# Chrome Web Store listing — copy/paste

Everything you need to fill in the store submission form.

---

## Name
CPGitSync

## Summary (short description — max 132 chars)
Auto-push your accepted LeetCode, Codeforces and CodeChef solutions straight to a GitHub repo. One-click GitHub login.

## Category
Developer Tools

## Language
English

---

## Detailed description

Solve a problem, get Accepted, and CPGitSync commits your code to GitHub for you — no copy-pasting, no git commands.

CPGitSync watches your submissions on LeetCode, Codeforces, and CodeChef. The moment a solution is Accepted, it grabs your exact code (plus the problem name, language, and stats) and commits it to a GitHub repository you choose, neatly organized into a folder per problem.

WHY YOU'LL LIKE IT
• One-click "Login with GitHub" — no tokens or keys to paste.
• Automatic. Solve, get Accepted, it's on GitHub. That's it.
• Clean structure: leetcode/0001-two-sum/two-sum.py + a README with stats.
• Build a streak. Track consecutive days solved and share a streak card with friends.
• Private by design. Your data goes only to GitHub — no tracking, no analytics.

HOW IT WORKS
1. Click "Login with GitHub" and approve.
2. Pick the repo to store your solutions.
3. Solve problems. Your solutions push themselves.

SUPPORTED SITES
• LeetCode — automatic on Accepted
• Codeforces — automatic when the verdict turns Accepted
• CodeChef — automatic (best-effort) plus a manual "Push this solution" button

Open source: https://github.com/DevanshPant/CPGitSync

Not affiliated with LeetCode, Codeforces, CodeChef, or GitHub.

---

## Privacy policy URL
https://github.com/DevanshPant/CPGitSync/blob/main/PRIVACY.md

## Single purpose (required by the store)
CPGitSync automatically saves a user's own accepted competitive-programming solutions to a GitHub repository they choose.

## Permission justifications (for the review form)
- **host access to leetcode.com / codeforces.com / codechef.com** — to detect the user's accepted submissions and read the submitted source code on those sites.
- **host access to github.com / api.github.com** — to sign the user in with GitHub and commit their solutions to their chosen repository.
- **storage** — to save the user's settings and access token locally in their browser.
- **notifications** — to confirm when a solution was pushed.
- **identity** — to run the "Login with GitHub" OAuth flow.
- **activeTab / scripting** — to push the currently open problem's solution when the user clicks the manual push button.
- **Remote code:** none. All logic ships inside the extension; network calls only send/receive data to GitHub.

---

## Screenshots to capture (1280×800 or 640×400, at least one)
1. The popup showing the streak navbar + a couple of recent pushes.
2. The Settings page with the "Login with GitHub" button.
3. The shareable streak card page.
4. A GitHub repo showing the auto-created problem folders.
