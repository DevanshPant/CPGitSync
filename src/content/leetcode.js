// LeetCode content script (ISOLATED world).
// Listens for the interceptor's "ACCEPTED" signal, pulls the full submission
// (code + stats) via LeetCode's GraphQL API, and hands it to the background
// worker. Also handles manual pushes triggered from the popup.

const LANG_EXT = {
  python: "py", python3: "py", cpp: "cpp", c: "c", java: "java", csharp: "cs",
  javascript: "js", typescript: "ts", golang: "go", kotlin: "kt", swift: "swift",
  rust: "rs", ruby: "rb", scala: "scala", php: "php", racket: "rkt",
  erlang: "erl", elixir: "ex", dart: "dart", mysql: "sql", mssql: "sql",
  oraclesql: "sql", bash: "sh"
};

function cookie(name) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

async function graphql(query, variables) {
  const res = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrftoken": cookie("csrftoken") },
    credentials: "include",
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  return json.data;
}

const SUBMISSION_QUERY = `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      code
      runtimeDisplay
      memoryDisplay
      lang { name verboseName }
      question { titleSlug title }
    }
  }`;

const QUESTION_QUERY = `
  query question($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      title
      titleSlug
      difficulty
    }
  }`;

function slugFromUrl() {
  const m = location.pathname.match(/\/problems\/([^/]+)/);
  return m ? m[1] : "";
}

async function buildPayload(submissionId) {
  const data = await graphql(SUBMISSION_QUERY, { submissionId: Number(submissionId) });
  const d = data && data.submissionDetails;
  if (!d || !d.code) return null;

  const slug = (d.question && d.question.titleSlug) || slugFromUrl();
  let frontendId = "", difficulty = "", title = (d.question && d.question.title) || slug;
  try {
    const q = await graphql(QUESTION_QUERY, { titleSlug: slug });
    if (q && q.question) {
      frontendId = q.question.questionFrontendId || "";
      difficulty = q.question.difficulty || "";
      title = q.question.title || title;
    }
  } catch (_) {}

  const lang = (d.lang && d.lang.name) || "";
  return {
    platform: "leetcode",
    id: frontendId,
    slug,
    title,
    difficulty,
    lang: (d.lang && d.lang.verboseName) || lang,
    ext: LANG_EXT[lang.toLowerCase()] || "txt",
    code: d.code,
    url: `https://leetcode.com/problems/${slug}/`,
    stats: { runtime: d.runtimeDisplay, memory: d.memoryDisplay }
  };
}

// Debounce so a single accepted run doesn't fire twice.
let lastPushed = "";
async function pushSubmission(submissionId) {
  if (submissionId === lastPushed) return;
  lastPushed = submissionId;
  const payload = await buildPayload(submissionId);
  if (payload) chrome.runtime.sendMessage({ type: "CPGITSYNC_SOLUTION", payload });
}

// Listen to the MAIN-world interceptor.
window.addEventListener("message", (e) => {
  const d = e.data;
  if (!d || !d.__cpgitsync || d.tag !== "CPGITSYNC_ITC") return;
  if (d.platform === "leetcode" && d.type === "ACCEPTED") {
    pushSubmission(d.submissionId);
  }
  if (d.type === "EDITOR_VALUE") manualResolve && manualResolve(d.code);
});

// --- Manual push from the popup ------------------------------------------
let manualResolve = null;
function readEditor() {
  return new Promise((resolve) => {
    manualResolve = resolve;
    window.postMessage({ __cpgitsync: true, type: "READ_EDITOR" }, "*");
    setTimeout(() => resolve(""), 1500);
  });
}

chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  if (msg && msg.type === "CPGITSYNC_MANUAL") {
    (async () => {
      const slug = slugFromUrl();
      if (!slug) return sendResponse({ ok: false, reason: "Open a LeetCode problem first" });
      const code = await readEditor();
      if (!code) return sendResponse({ ok: false, reason: "Could not read the editor" });
      let frontendId = "", difficulty = "", title = slug;
      try {
        const q = await graphql(QUESTION_QUERY, { titleSlug: slug });
        if (q && q.question) {
          frontendId = q.question.questionFrontendId || "";
          difficulty = q.question.difficulty || "";
          title = q.question.title || slug;
        }
      } catch (_) {}
      const payload = {
        platform: "leetcode", id: frontendId, slug, title, difficulty,
        lang: "", ext: "txt", code,
        url: `https://leetcode.com/problems/${slug}/`, stats: {}
      };
      const res = await chrome.runtime.sendMessage({ type: "CPGITSYNC_SOLUTION", payload });
      sendResponse(res);
    })();
    return true;
  }
});
