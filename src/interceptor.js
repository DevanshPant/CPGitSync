// Runs in the PAGE (MAIN) world. Two jobs:
//   1) Watch fetch/XHR for "Accepted" submission responses and notify the
//      isolated content script via window.postMessage.
//   2) On request, read the in-page Monaco editor value (for manual push).
// It never touches the network itself and never talks to GitHub.
(() => {
  const HOST = location.hostname;
  const TAG = "CPGITSYNC_ITC";

  function post(detail) {
    window.postMessage({ __cpgitsync: true, ...detail }, "*");
  }

  // --- Response sniffing --------------------------------------------------
  function inspect(url, text) {
    try {
      if (!text) return;

      // LeetCode: /submissions/detail/<id>/check/ -> {state, status_msg, ...}
      if (HOST.endsWith("leetcode.com") && /\/submissions\/detail\/(\d+)\/check\//.test(url)) {
        const id = url.match(/\/submissions\/detail\/(\d+)\/check\//)[1];
        const data = JSON.parse(text);
        if (data && data.state === "SUCCESS" && data.status_msg === "Accepted") {
          post({ tag: TAG, platform: "leetcode", type: "ACCEPTED", submissionId: id });
        }
        return;
      }

      // CodeChef (best effort): submission result endpoints carry a verdict.
      if (HOST.endsWith("codechef.com") && /submission/i.test(url)) {
        const data = JSON.parse(text);
        const blob = JSON.stringify(data).toLowerCase();
        const accepted = /"result_code"\s*:\s*"accepted"/.test(blob) ||
          /"status"\s*:\s*"?ac/.test(blob) || /\baccepted\b/.test(blob);
        if (accepted) {
          post({ tag: TAG, platform: "codechef", type: "ACCEPTED", raw: data });
        }
      }
    } catch (_) { /* not JSON / not ours */ }
  }

  const origFetch = window.fetch;
  window.fetch = function (...args) {
    return origFetch.apply(this, args).then((res) => {
      try {
        const url = (args[0] && args[0].url) || String(args[0]);
        res.clone().text().then((t) => inspect(url, t)).catch(() => {});
      } catch (_) {}
      return res;
    });
  };

  const OpenXHR = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__cpgitsyncUrl = url;
    return OpenXHR.apply(this, arguments);
  };
  const SendXHR = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...a) {
    this.addEventListener("load", () => {
      try { inspect(this.__cpgitsyncUrl || "", this.responseText); } catch (_) {}
    });
    return SendXHR.apply(this, a);
  };

  // --- Monaco bridge (manual push) ---------------------------------------
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || !d.__cpgitsync || d.type !== "READ_EDITOR") return;
    let code = "";
    try {
      // LeetCode / most sites: Monaco
      if (window.monaco && monaco.editor) {
        const models = monaco.editor.getModels();
        if (models && models.length) code = models[0].getValue();
      }
      // CodeChef and others: Ace editor
      if (!code && window.ace) {
        const el = document.querySelector(".ace_editor");
        if (el && ace.edit) code = ace.edit(el).getValue();
      }
      // Fallback: a plain <textarea> holding the source
      if (!code) {
        const ta = document.querySelector("textarea.ace_text-input, textarea#program-source-text, textarea[name='source']");
        if (ta && ta.value) code = ta.value;
      }
    } catch (_) {}
    post({ tag: TAG, type: "EDITOR_VALUE", code });
  });
})();
