const $ = (id) => document.getElementById(id);

const FIELDS = ["token", "owner", "repo", "branch"];

async function load() {
  const cfg = await chrome.storage.local.get([...FIELDS, "platforms"]);
  $("token").value = cfg.token || "";
  $("owner").value = cfg.owner || "";
  $("repo").value = cfg.repo || "";
  $("branch").value = cfg.branch || "main";
  const p = cfg.platforms || { leetcode: true, codeforces: true, codechef: true };
  $("p_leetcode").checked = p.leetcode !== false;
  $("p_codeforces").checked = p.codeforces !== false;
  $("p_codechef").checked = p.codechef !== false;
}

function currentConfig() {
  return {
    token: $("token").value.trim(),
    owner: $("owner").value.trim(),
    repo: $("repo").value.trim().replace(/^.*\//, ""), // tolerate "owner/repo" paste
    branch: $("branch").value.trim() || "main",
    platforms: {
      leetcode: $("p_leetcode").checked,
      codeforces: $("p_codeforces").checked,
      codechef: $("p_codechef").checked
    }
  };
}

function setResult(el, ok, text) {
  el.textContent = text;
  el.className = "result " + (ok ? "ok" : "err");
}

$("saveBtn").addEventListener("click", async () => {
  const cfg = currentConfig();
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    return setResult($("saveResult"), false, "Token, owner and repo are required.");
  }
  await chrome.storage.local.set(cfg);
  setResult($("saveResult"), true, "Saved ✓");
  setTimeout(() => ($("saveResult").textContent = ""), 2500);
});

$("testBtn").addEventListener("click", async () => {
  const cfg = currentConfig();
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    return setResult($("testResult"), false, "Fill token, owner and repo first.");
  }
  setResult($("testResult"), true, "Testing…");
  const res = await chrome.runtime.sendMessage({
    type: "CPGITSYNC_TEST",
    config: { token: cfg.token, owner: cfg.owner, repo: cfg.repo }
  });
  if (res && res.ok) {
    const priv = res.private ? "private" : "public";
    setResult($("testResult"), true, `✓ ${res.full_name} (${priv}, default: ${res.default_branch})`);
    if (!$("branch").value.trim()) $("branch").value = res.default_branch;
  } else {
    setResult($("testResult"), false, "✗ " + ((res && res.reason) || "Failed"));
  }
});

load();
