const $ = (id) => document.getElementById(id);

const PLATFORM_HOSTS = {
  leetcode: "leetcode.com",
  codeforces: "codeforces.com",
  codechef: "www.codechef.com"
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function platformOf(url) {
  if (!url) return null;
  if (url.includes("leetcode.com")) return "leetcode";
  if (url.includes("codeforces.com")) return "codeforces";
  if (url.includes("codechef.com")) return "codechef";
  return null;
}

function renderHistory(history) {
  const ul = $("history");
  ul.innerHTML = "";
  if (!history || !history.length) {
    ul.innerHTML = '<li class="empty">Nothing pushed yet.</li>';
    return;
  }
  history.slice(0, 8).forEach((h) => {
    const li = document.createElement("li");
    const err = h.error;
    li.innerHTML = `
      <div class="row1">
        <span class="ttl">${escapeHtml(h.title || "Untitled")}</span>
        <span class="plat">${h.platform}</span>
      </div>
      <div class="meta ${err ? "err" : ""}">
        ${err ? "✗ " + escapeHtml(h.error) : (h.updated ? "updated" : "pushed") + " · " + timeAgo(h.at)}
      </div>`;
    if (h.url && !err) {
      li.style.cursor = "pointer";
      li.title = "Open on GitHub";
      li.addEventListener("click", () => chrome.tabs.create({ url: h.url }));
    }
    ul.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function load() {
  const cfg = await chrome.runtime.sendMessage({ type: "CPGITSYNC_GET_CONFIG" });

  $("enabled").checked = cfg.enabled !== false;

  const configured = cfg.token && cfg.owner && cfg.repo;
  if (configured) {
    $("repoLine").textContent = `${cfg.owner}/${cfg.repo}`;
    const who = cfg.ghUser ? `@${cfg.ghUser} · ` : "";
    $("connLine").innerHTML = `<span class="pill ok">Connected</span> <span class="eyebrow">${who}${cfg.branch || "main"}</span>`;
  } else {
    $("repoLine").textContent = "Not connected";
    $("connLine").innerHTML = '<span class="pill err">Set up needed</span>';
  }

  renderHistory(cfg.history);
  return cfg;
}

$("enabled").addEventListener("change", (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});

$("settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());

$("pushBtn").addEventListener("click", async () => {
  const btn = $("pushBtn");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const platform = platformOf(tab && tab.url);
  if (!platform) {
    $("pushHint").textContent = "Open a LeetCode / Codeforces / CodeChef problem tab first.";
    return;
  }
  if (platform === "codeforces") {
    $("pushHint").textContent = "Codeforces pushes automatically when a verdict shows. Manual push isn't available there.";
    return;
  }
  btn.classList.add("busy");
  btn.textContent = "Pushing…";
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "CPGITSYNC_MANUAL" });
    if (res && res.ok) {
      $("pushHint").textContent = res.updated ? "Updated on GitHub ✓" : "Pushed to GitHub ✓";
      setTimeout(load, 600);
    } else {
      $("pushHint").textContent = (res && res.reason) || "Push failed.";
    }
  } catch (_) {
    $("pushHint").textContent = "Reload the problem page and try again.";
  } finally {
    btn.classList.remove("busy");
    btn.textContent = "Push this solution ↗";
  }
});

// Live-refresh history when a background push lands.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.history) load();
});

load();
