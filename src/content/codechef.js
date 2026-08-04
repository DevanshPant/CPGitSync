// CodeChef content script (ISOLATED world).
// CodeChef is a single-page React app with no stable public submission API,
// so detection is best-effort: we react to the interceptor's ACCEPTED signal
// and read the in-page editor. The popup's manual push is the reliable path.

const CC_EXT = {
  "c++": "cpp", cpp: "cpp", "gnu c": "c", c: "c", java: "java",
  python: "py", python3: "py", pypy: "py", "c#": "cs", javascript: "js",
  nodejs: "js", kotlin: "kt", go: "go", rust: "rs", ruby: "rb", php: "php",
  scala: "scala", swift: "swift", pascal: "pas", perl: "pl", r: "r", haskell: "hs"
};

function extFor(lang) {
  const s = (lang || "").toLowerCase();
  for (const k of Object.keys(CC_EXT)) if (s.includes(k)) return CC_EXT[k];
  return "txt";
}

// CodeChef problem URLs:
//   /problems/CODE
//   /<CONTEST>/problems/CODE
function problemInfo() {
  const m = location.pathname.match(/\/problems\/([A-Za-z0-9_]+)/);
  const code = m ? m[1] : "";
  let title = code;
  const h = document.querySelector("h1, h2, ._problemName_, [class*='problemName']");
  if (h && h.textContent.trim()) title = h.textContent.trim();
  return { code, title };
}

// Try to read the selected language from the CodeChef UI.
function detectLang() {
  const sel = document.querySelector("select#language, select[name='language']");
  if (sel && sel.selectedOptions.length) return sel.selectedOptions[0].textContent.trim();
  const chip = document.querySelector("[class*='language'] [class*='value'], [class*='langDropdown']");
  return chip ? chip.textContent.trim() : "";
}

let editorResolve = null;
function readEditor() {
  return new Promise((resolve) => {
    editorResolve = resolve;
    window.postMessage({ __cpgitsync: true, type: "READ_EDITOR" }, "*");
    setTimeout(() => resolve(""), 1500);
  });
}

let lastPushed = "";
async function pushCurrent(reason) {
  const { code, title } = problemInfo();
  if (!code) return { ok: false, reason: "Open a CodeChef problem first" };
  const source = await readEditor();
  if (!source) return { ok: false, reason: "Could not read the editor" };

  const fingerprint = code + ":" + source.length;
  if (reason === "auto" && fingerprint === lastPushed) return { ok: false, reason: "Already pushed" };
  lastPushed = fingerprint;

  const lang = detectLang();
  const payload = {
    platform: "codechef",
    id: "",
    slug: code.toLowerCase(),
    title,
    difficulty: "",
    lang,
    ext: extFor(lang),
    code: source,
    url: `https://www.codechef.com/problems/${code}`,
    stats: {}
  };
  return chrome.runtime.sendMessage({ type: "CPGITSYNC_SOLUTION", payload });
}

// Interceptor bridge + auto push on accepted verdict.
window.addEventListener("message", (e) => {
  const d = e.data;
  if (!d || !d.__cpgitsync || d.tag !== "CPGITSYNC_ITC") return;
  if (d.type === "EDITOR_VALUE") { editorResolve && editorResolve(d.code); return; }
  if (d.platform === "codechef" && d.type === "ACCEPTED") pushCurrent("auto");
});

// Manual push from the popup.
chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  if (msg && msg.type === "CPGITSYNC_MANUAL") {
    pushCurrent("manual").then(sendResponse);
    return true;
  }
});
