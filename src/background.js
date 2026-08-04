// Service worker: receives solution payloads from content scripts and commits
// them to GitHub. Also handles config test + history bookkeeping.

import { commitFile, getRepo } from "./lib/github.js";
import { extFor } from "./lib/langmap.js";

// ─── OAuth config ─────────────────────────────────────────────────────────
// Filled in once the GitHub OAuth App + Vercel proxy are set up.
// The Client ID is public (safe to ship). The Client SECRET lives only on
// Vercel — never here.
const GITHUB_CLIENT_ID = "Ov23li4UqW8StPsqS4DO";
const OAUTH_PROXY_URL = "https://cpgitsync.vercel.app/api/callback";

function b64url(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// One-click "Login with GitHub" via the web auth flow (no code typing).
async function oauthLogin() {
  if (GITHUB_CLIENT_ID.startsWith("REPLACE") || OAUTH_PROXY_URL.includes("REPLACE")) {
    return { ok: false, reason: "Login isn't configured yet — the Client ID and Vercel URL still need to be filled in." };
  }
  const redirectUri = chrome.identity.getRedirectURL(); // https://<id>.chromiumapp.org/
  const state = b64url({ r: redirectUri, n: Math.random().toString(36).slice(2) });
  const authUrl =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(OAUTH_PROXY_URL)}` +
    "&scope=repo" +
    `&state=${encodeURIComponent(state)}`;

  let finalUrl;
  try {
    finalUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
  } catch (_) {
    return { ok: false, reason: "Login was cancelled." };
  }

  const frag = (finalUrl.split("#")[1]) || "";
  const params = new URLSearchParams(frag);
  const token = params.get("access_token");
  if (!token) return { ok: false, reason: "GitHub error: " + (params.get("error") || "no token returned") };

  let login = "";
  try {
    const who = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" }
    }).then((r) => r.json());
    login = who.login || "";
  } catch (_) {}

  const { owner } = await chrome.storage.local.get("owner");
  const patch = { token, ghUser: login };
  if (!owner && login) patch.owner = login;
  await chrome.storage.local.set(patch);
  return { ok: true, user: login, owner: patch.owner || owner || "" };
}

const DEFAULTS = {
  token: "",
  ghUser: "",
  owner: "",
  repo: "",
  branch: "main",
  enabled: true,
  platforms: { leetcode: true, codeforces: true, codechef: true },
  history: [],
  streak: { current: 0, longest: 0, lastActiveDate: "", total: 0 }
};

// --- Streak tracking ------------------------------------------------------
function localDay(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysBetween(a, b) {
  return Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000);
}
async function bumpStreak() {
  const { streak } = await chrome.storage.local.get("streak");
  const s = streak || { current: 0, longest: 0, lastActiveDate: "", total: 0 };
  const today = localDay();
  if (s.lastActiveDate === today) {
    s.total += 1; // already counted today — streak unchanged
  } else {
    const gap = s.lastActiveDate ? daysBetween(today, s.lastActiveDate) : null;
    s.current = gap === 1 ? s.current + 1 : 1; // continue if yesterday, else restart
    s.lastActiveDate = today;
    s.total += 1;
  }
  if (s.current > s.longest) s.longest = s.current;
  await chrome.storage.local.set({ streak: s });
  return s;
}

async function getConfig() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored, platforms: { ...DEFAULTS.platforms, ...(stored.platforms || {}) } };
}

function slugify(s) {
  return String(s || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "problem";
}

function notify(title, message) {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon128.png"),
      title,
      message
    });
  } catch (_) { /* notifications permission may be off */ }
}

async function pushHistory(entry) {
  const { history } = await chrome.storage.local.get("history");
  const list = Array.isArray(history) ? history : [];
  list.unshift(entry);
  await chrome.storage.local.set({ history: list.slice(0, 30) });
}

// Build the folder + files for one solution and commit them.
async function handleSolution(payload) {
  const cfg = await getConfig();

  if (!cfg.enabled) return { ok: false, reason: "CPGitSync is turned off" };
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    notify("CPGitSync not set up", "Open the extension options and add your GitHub token + repo.");
    return { ok: false, reason: "Not configured" };
  }
  if (cfg.platforms[payload.platform] === false) {
    return { ok: false, reason: `${payload.platform} disabled` };
  }

  const ext = payload.ext || extFor(payload.lang);
  const num = payload.id ? String(payload.id).padStart(4, "0") : "";
  const slug = slugify(payload.slug || payload.title);
  const folderName = num ? `${num}-${slug}` : slug;
  const dir = `${payload.platform}/${folderName}`;
  const codePath = `${dir}/${slug}.${ext}`;
  const readmePath = `${dir}/README.md`;

  const title = payload.title || slug;
  const commitMsg = `${payload.platform}: ${title}${num ? ` (#${payload.id})` : ""}`;

  // Per-problem README with metadata + stats.
  const stats = payload.stats || {};
  const readme = [
    `# ${title}`,
    "",
    payload.difficulty ? `**Difficulty:** ${payload.difficulty}  ` : "",
    payload.lang ? `**Language:** ${payload.lang}  ` : "",
    stats.runtime ? `**Runtime:** ${stats.runtime}  ` : "",
    stats.memory ? `**Memory:** ${stats.memory}  ` : "",
    payload.url ? `\n[View problem](${payload.url})` : "",
    "",
    "---",
    "_Committed automatically by [CPGitSync](https://github.com)._"
  ].filter((l) => l !== "").join("\n");

  try {
    const res = await commitFile({
      owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, token: cfg.token,
      path: codePath, content: payload.code, message: commitMsg
    });
    // README is best-effort; a failure here shouldn't block the solution.
    try {
      await commitFile({
        owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, token: cfg.token,
        path: readmePath, content: readme, message: `docs: ${title} notes`
      });
    } catch (_) {}

    await pushHistory({
      platform: payload.platform, title, num: payload.id || "",
      path: codePath, url: res.url, at: Date.now(), updated: res.updated
    });
    const s = await bumpStreak();
    notify(res.updated ? "Solution updated ✓" : "Pushed to GitHub ✓",
      `${title} → ${cfg.owner}/${cfg.repo}  ·  🔥 ${s.current}-day streak`);
    return { ok: true, url: res.url, updated: res.updated, streak: s };
  } catch (err) {
    notify("Push failed", err.message || String(err));
    await pushHistory({
      platform: payload.platform, title, error: err.message || String(err), at: Date.now()
    });
    return { ok: false, reason: err.message || String(err) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === "CPGITSYNC_SOLUTION") {
    handleSolution(msg.payload).then(sendResponse);
    return true; // async
  }

  if (msg.type === "CPGITSYNC_TEST") {
    (async () => {
      try {
        const { token, owner, repo } = msg.config;
        const info = await getRepo({ owner, repo, token });
        sendResponse({ ok: true, full_name: info.full_name, private: info.private, default_branch: info.default_branch });
      } catch (err) {
        sendResponse({ ok: false, reason: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "CPGITSYNC_OAUTH_LOGIN") {
    oauthLogin().then(sendResponse);
    return true;
  }

  if (msg.type === "CPGITSYNC_GET_CONFIG") {
    getConfig().then(sendResponse);
    return true;
  }
});
