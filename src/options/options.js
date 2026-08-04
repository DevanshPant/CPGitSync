const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load() {
  const cfg = await chrome.storage.local.get(
    ["clientId", "token", "ghUser", "owner", "repo", "branch", "platforms"]
  );
  $("clientId").value = cfg.clientId || "";
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

// ---- GitHub Device Flow (no backend, no secret) --------------------------
async function deviceLogin() {
  const clientId = $("clientId").value.trim();
  if (!clientId) {
    return setResult($("loginStatus"), false, "Paste your OAuth App Client ID first (see the help above).");
  }
  await chrome.storage.local.set({ clientId });
  const btn = $("loginBtn");
  btn.disabled = true;

  try {
    // 1) Ask GitHub for a device + user code
    const devRes = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, scope: "repo" })
    });
    const dev = await devRes.json();
    if (dev.error) {
      throw new Error(
        dev.error === "unauthorized_client"
          ? 'Enable "Device Flow" in your OAuth App settings, then try again.'
          : (dev.error_description || dev.error)
      );
    }

    // 2) Copy the code + open GitHub's approval page
    try { await navigator.clipboard.writeText(dev.user_code); } catch (_) {}
    renderStep(dev);
    chrome.tabs.create({ url: dev.verification_uri });

    // 3) Poll until the user approves
    const token = await pollToken(clientId, dev.device_code, dev.interval || 5, dev.expires_in || 900);

    // 4) Confirm identity + store
    const who = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" }
    }).then((r) => r.json());
    const login = who.login || "";

    const patch = { token, ghUser: login };
    if (!$("owner").value.trim() && login) { patch.owner = login; $("owner").value = login; }
    await chrome.storage.local.set(patch);

    showConnected(login);
    setResult($("loginStatus"), true, "Connected ✓  You can close the GitHub tab. Now set your repo below.");
  } catch (err) {
    setResult($("loginStatus"), false, "✗ " + (err.message || String(err)));
  } finally {
    btn.disabled = false;
  }
}

function renderStep(dev) {
  const el = $("loginStatus");
  el.className = "result login-status";
  el.innerHTML = `
    <div class="devflow">
      <div class="dfline">Code copied to clipboard:</div>
      <div class="dfcode">${dev.user_code}</div>
      <div class="dfline">On the GitHub tab that just opened, paste it and click
        <b>Continue → Authorize</b>. If clipboard was blocked, type the code above.</div>
      <div class="dfwait">⏳ Waiting for you to approve…</div>
    </div>`;
}

async function pollToken(clientId, deviceCode, interval, expiresIn) {
  const deadline = Date.now() + expiresIn * 1000;
  let wait = interval;
  while (Date.now() < deadline) {
    await sleep(wait * 1000);
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });
    const data = await res.json();
    if (data.access_token) return data.access_token;
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") { wait += 5; continue; }
    if (data.error === "expired_token") throw new Error("Login timed out — click Login again.");
    if (data.error === "access_denied") throw new Error("Authorization was denied on GitHub.");
    if (data.error) throw new Error(data.error_description || data.error);
  }
  throw new Error("Login timed out — click Login again.");
}

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

  const cfg = { owner, repo, branch, platforms: platforms(), clientId: $("clientId").value.trim() };
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

$("loginBtn").addEventListener("click", deviceLogin);

load();
