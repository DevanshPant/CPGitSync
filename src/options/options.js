const $ = (id) => document.getElementById(id);

async function load() {
  const cfg = await chrome.storage.local.get(
    ["token", "ghUser", "owner", "repo", "branch", "platforms"]
  );
  $("token").value = cfg.token || "";
  $("owner").value = cfg.owner || "";
  $("repo").value = cfg.repo || "";
  $("branch").value = cfg.branch || "main";
  const p = cfg.platforms || { leetcode: true, codeforces: true, codechef: true };
  $("p_leetcode").checked = p.leetcode !== false;
  $("p_codeforces").checked = p.codeforces !== false;
  $("p_codechef").checked = p.codechef !== false;
  if (cfg.token && cfg.ghUser) showConnected(cfg.ghUser);
}

function setResult(el, ok, text) {
  el.textContent = text;
  el.className = el.className.replace(/\b(ok|err)\b/g, "").trim() + " " + (ok ? "ok" : "err");
}

function showConnected(user) {
  const el = $("connectedAs");
  el.style.display = "";
  el.innerHTML = `<span class="pill ok">Connected</span> signed in as <b>@${user}</b>`;
}

// ---- One-click login (handled in the background service worker) ----------
$("loginBtn").addEventListener("click", async () => {
  const btn = $("loginBtn");
  btn.disabled = true;
  setResult($("loginStatus"), true, "Opening GitHub… approve CPGitSync in the window that pops up.");
  try {
    const res = await chrome.runtime.sendMessage({ type: "CPGITSYNC_OAUTH_LOGIN" });
    if (res && res.ok) {
      showConnected(res.user || "you");
      if (res.owner && !$("owner").value.trim()) $("owner").value = res.owner;
      setResult($("loginStatus"), true, "Connected ✓  Now set your repo below.");
    } else {
      setResult($("loginStatus"), false, "✗ " + ((res && res.reason) || "Login failed"));
    }
  } catch (_) {
    setResult($("loginStatus"), false, "✗ Login failed — reload the extension and try again.");
  } finally {
    btn.disabled = false;
  }
});

// ---- Save / test ---------------------------------------------------------
function platforms() {
  return {
    leetcode: $("p_leetcode").checked,
    codeforces: $("p_codeforces").checked,
    codechef: $("p_codechef").checked
  };
}

$("saveBtn").addEventListener("click", async () => {
  const owner = $("owner").value.trim();
  const repo = $("repo").value.trim().replace(/^.*\//, ""); // tolerate "owner/repo" paste
  const branch = $("branch").value.trim() || "main";
  const manualToken = $("token").value.trim();

  const stored = await chrome.storage.local.get("token");
  const haveToken = manualToken || stored.token;
  if (!haveToken || !owner || !repo) {
    return setResult($("saveResult"), false, "Log in (or add a token), and fill owner + repo.");
  }

  const cfg = { owner, repo, branch, platforms: platforms() };
  if (manualToken) cfg.token = manualToken;
  await chrome.storage.local.set(cfg);
  setResult($("saveResult"), true, "Saved ✓");
  setTimeout(() => ($("saveResult").textContent = ""), 2500);
});

$("testBtn").addEventListener("click", async () => {
  const owner = $("owner").value.trim();
  const repo = $("repo").value.trim().replace(/^.*\//, "");
  const token = $("token").value.trim() || (await chrome.storage.local.get("token")).token;
  if (!token) return setResult($("testResult"), false, "Log in first (or add a token in Advanced).");
  if (!owner || !repo) return setResult($("testResult"), false, "Fill owner and repo first.");

  setResult($("testResult"), true, "Testing…");
  const res = await chrome.runtime.sendMessage({ type: "CPGITSYNC_TEST", config: { token, owner, repo } });
  if (res && res.ok) {
    const priv = res.private ? "private" : "public";
    setResult($("testResult"), true, `✓ ${res.full_name} (${priv}, default: ${res.default_branch})`);
    if (!$("branch").value.trim()) $("branch").value = res.default_branch;
  } else {
    setResult($("testResult"), false, "✗ " + ((res && res.reason) || "Failed"));
  }
});

// Reflect a successful background login if it lands while the page is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.ghUser && changes.ghUser.newValue) {
    showConnected(changes.ghUser.newValue);
  }
});

load();
