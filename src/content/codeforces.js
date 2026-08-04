// Codeforces content script (ISOLATED world).
// Watches submission tables; when a row turns "Accepted", fetches the source
// via Codeforces' own /data/submitSource endpoint and pushes it to GitHub.

const CF_EXT = {
  "c++": "cpp", "gnu c++": "cpp", "ms c++": "cpp", clang: "cpp",
  "gnu c": "c", java: "java", "python": "py", pypy: "py", python3: "py",
  "c#": "cs", "mono c#": "cs", ".net": "cs", javascript: "js", "node.js": "js",
  kotlin: "kt", go: "go", rust: "rs", ruby: "rb", scala: "scala", php: "php",
  haskell: "hs", pascal: "pas", perl: "pl", d: "d", ocaml: "ml", delphi: "pas",
  fpc: "pas", "f#": "fs", r: "r", swift: "swift", typescript: "ts"
};

function extFor(lang) {
  const s = (lang || "").toLowerCase();
  for (const k of Object.keys(CF_EXT)) if (s.includes(k)) return CF_EXT[k];
  return "txt";
}

function csrf() {
  const input = document.querySelector('input[name="csrf_token"]');
  if (input && input.value) return input.value;
  const meta = document.querySelector('meta[name="X-Csrf-Token"]');
  return meta ? meta.content : "";
}

async function fetchSource(submissionId) {
  const res = await fetch("/data/submitSource", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest"
    },
    credentials: "include",
    body: `submissionId=${encodeURIComponent(submissionId)}&csrf_token=${encodeURIComponent(csrf())}`
  });
  const json = await res.json();
  return json && json.source ? json.source : "";
}

// Parse one submissions-table row into problem metadata.
function parseRow(tr) {
  const sid = tr.getAttribute("data-submissionid") || tr.getAttribute("data-submission-id");
  if (!sid) return null;

  const problemLink = tr.querySelector('a[href*="/problem/"]');
  if (!problemLink) return null;
  const href = problemLink.getAttribute("href");
  const m = href.match(/\/(?:contest|problemset\/problem|gym)\/(\d+)\/(?:problem\/)?([A-Za-z0-9]+)/)
    || href.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
  const contestId = m ? m[1] : "";
  const index = m ? m[2] : "";
  const name = problemLink.textContent.trim().replace(/^[A-Za-z0-9]+\s*[-–]\s*/, "");

  // Language cell: Codeforces marks it with class "status-frame-datatable" — grab
  // the cell whose text looks like a known language.
  let lang = "";
  tr.querySelectorAll("td").forEach((td) => {
    const t = td.textContent.trim();
    if (!lang && /(\+\+|c#|python|java|kotlin|rust|go|ruby|scala|php|haskell|pascal|perl|node|javascript|swift|ocaml|delphi|fpc)/i.test(t) && t.length < 40) {
      lang = t;
    }
  });

  return { sid, contestId, index, name, lang, href };
}

const seen = new Set();
let processing = false;

async function handleAcceptedRow(tr) {
  const info = parseRow(tr);
  if (!info || seen.has(info.sid)) return;
  seen.add(info.sid);

  const source = await fetchSource(info.sid);
  if (!source) return;

  const idNum = info.contestId && info.index ? `${info.contestId}${info.index}` : info.sid;
  const payload = {
    platform: "codeforces",
    id: idNum,
    slug: `${info.contestId}-${info.index}`.toLowerCase() || info.sid,
    title: info.name || `Problem ${info.index}`,
    difficulty: "",
    lang: info.lang,
    ext: extFor(info.lang),
    code: source,
    url: `https://codeforces.com${info.href}`,
    stats: {}
  };
  chrome.runtime.sendMessage({ type: "CPGITSYNC_SOLUTION", payload });
}

function scan(markOnly) {
  const rows = document.querySelectorAll("tr[data-submissionid], tr[data-submission-id]");
  rows.forEach((tr) => {
    const accepted = tr.querySelector(".verdict-accepted, .verdict-accepted1");
    const sid = tr.getAttribute("data-submissionid") || tr.getAttribute("data-submission-id");
    if (!sid) return;
    if (accepted) {
      if (markOnly) {
        seen.add(sid); // pre-existing accepteds shouldn't be re-pushed on load
      } else if (!seen.has(sid)) {
        handleAcceptedRow(tr);
      }
    }
  });
}

function start() {
  // On first load, treat already-accepted rows as "seen" so we only push new ones.
  scan(true);
  const observer = new MutationObserver(() => {
    if (processing) return;
    processing = true;
    setTimeout(() => { scan(false); processing = false; }, 400);
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
