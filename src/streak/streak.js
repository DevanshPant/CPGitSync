const $ = (id) => document.getElementById(id);

function localDay(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function aliveStreak(s) {
  if (!s || !s.lastActiveDate) return 0;
  const gap = Math.round(
    (new Date(localDay() + "T00:00:00") - new Date(s.lastActiveDate + "T00:00:00")) / 86400000
  );
  return gap <= 1 ? s.current : 0;
}

let STATE = { current: 0, longest: 0, total: 0, user: "you", owner: "", repo: "" };

async function init() {
  const cfg = await chrome.storage.local.get(["streak", "ghUser", "owner", "repo"]);
  const s = cfg.streak || { current: 0, longest: 0, lastActiveDate: "", total: 0 };
  STATE = {
    current: aliveStreak(s),
    longest: s.longest || 0,
    total: s.total || 0,
    user: cfg.ghUser || cfg.owner || "you",
    owner: cfg.owner || "",
    repo: cfg.repo || ""
  };

  $("handle").textContent = "@" + STATE.user;
  $("cardNum").textContent = STATE.current;
  $("cardWord").textContent = STATE.current === 1 ? "DAY STREAK" : "DAY STREAK";
  $("cardBest").textContent = STATE.longest;
  $("cardTotal").textContent = STATE.total;

  if (navigator.canShare) $("nativeBtn").style.display = "";
}

function repoUrl() {
  return STATE.owner && STATE.repo ? `https://github.com/${STATE.owner}/${STATE.repo}` : "";
}

function shareText() {
  const n = STATE.current;
  const streakBit = n > 0
    ? `🔥 I'm on a ${n}-day competitive programming streak!`
    : `🔥 Building my competitive programming streak!`;
  const url = repoUrl();
  return `${streakBit} ${STATE.total} problems solved and auto-synced to GitHub with CPGitSync.` +
    (url ? `\n\nMy solutions: ${url}` : "");
}

function setNote(ok, text) {
  const el = $("statusNote");
  el.textContent = text;
  el.className = "statusnote " + (ok ? "ok" : "err");
  if (text) setTimeout(() => { el.textContent = ""; el.className = "statusnote"; }, 3000);
}

// ---- Canvas card (downloadable PNG) --------------------------------------
function drawCard() {
  const c = $("canvas");
  const ctx = c.getContext("2d");
  const W = 1080, H = 1080;

  // background + border
  ctx.fillStyle = "#fff8f3";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#232629";
  ctx.lineWidth = 24;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // top row
  ctx.textAlign = "left";
  ctx.fillStyle = "#1d283a";
  ctx.font = "700 40px Georgia, serif";
  ctx.fillText("CPGITSYNC", 80, 130);
  ctx.fillStyle = "#e8552d";
  ctx.fillText("◆", 400, 130);
  ctx.textAlign = "right";
  ctx.fillStyle = "#55617a";
  ctx.font = "700 36px Arial, sans-serif";
  ctx.fillText("@" + STATE.user, W - 80, 130);

  // flame + number
  ctx.textAlign = "center";
  ctx.font = "150px Arial, sans-serif";
  ctx.fillText("🔥", W / 2, 400);
  ctx.fillStyle = "#1d283a";
  ctx.font = "700 300px Georgia, serif";
  ctx.fillText(String(STATE.current), W / 2, 700);
  ctx.fillStyle = "#e8552d";
  ctx.font = "700 44px Arial, sans-serif";
  ctx.fillText("D A Y   S T R E A K", W / 2, 770);

  // divider
  ctx.strokeStyle = "#232629";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(180, 840);
  ctx.lineTo(W - 180, 840);
  ctx.stroke();

  // stats
  ctx.fillStyle = "#1d283a";
  ctx.font = "700 76px Georgia, serif";
  ctx.fillText(String(STATE.longest), W / 2 - 200, 950);
  ctx.fillText(String(STATE.total), W / 2 + 200, 950);
  ctx.fillStyle = "#55617a";
  ctx.font = "700 28px Arial, sans-serif";
  ctx.fillText("LONGEST", W / 2 - 200, 990);
  ctx.fillText("SOLVED", W / 2 + 200, 990);

  // footer
  ctx.fillStyle = "#55617a";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.fillText("LEETCODE · CODEFORCES · CODECHEF  →  GITHUB", W / 2, 1030);

  return c;
}

function downloadCard() {
  drawCard().toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpgitsync-streak-${STATE.current}day.png`;
    a.click();
    URL.revokeObjectURL(url);
    setNote(true, "Card downloaded — post it anywhere ✓");
  }, "image/png");
}

// ---- Share buttons -------------------------------------------------------
$("shareWa").addEventListener("click", () => {
  window.open("https://wa.me/?text=" + encodeURIComponent(shareText()), "_blank");
});
$("shareX").addEventListener("click", () => {
  window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText()), "_blank");
});
$("copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareText());
    setNote(true, "Copied to clipboard ✓");
  } catch (_) {
    setNote(false, "Couldn't copy — select the text manually.");
  }
});
$("downloadBtn").addEventListener("click", downloadCard);
$("nativeBtn").addEventListener("click", () => {
  drawCard().toBlob(async (blob) => {
    const file = new File([blob], "cpgitsync-streak.png", { type: "image/png" });
    const data = { text: shareText(), files: [file] };
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(data);
      } else {
        await navigator.share({ text: shareText() });
      }
    } catch (_) { /* user cancelled */ }
  }, "image/png");
});

init();
