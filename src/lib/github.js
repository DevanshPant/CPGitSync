// Minimal GitHub REST client for committing files via the Contents API.
// No git binary required — a single PUT creates or updates a file + commit.

const API = "https://api.github.com";

function headers(token) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

// base64 that survives UTF-8 (emoji, accents, non-ASCII source).
function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// Encode a repo path segment-by-segment so "/" stays a separator.
function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function getRepo({ owner, repo, token }) {
  const res = await fetch(`${API}/repos/${owner}/${repo}`, { headers: headers(token) });
  if (!res.ok) {
    const msg = res.status === 404 ? "Repository not found (check owner/repo)"
      : res.status === 401 ? "Bad token (401 Unauthorized)"
      : `GitHub error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// Returns the existing file sha, or null if the file does not exist yet.
async function getSha({ owner, repo, path, branch, token }) {
  const url = `${API}/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: headers(token) });
  if (res.status === 200) return (await res.json()).sha;
  if (res.status === 404) return null;
  throw new Error(`GitHub read error ${res.status}`);
}

// Create or update a single file. Returns { url, updated }.
export async function commitFile({ owner, repo, branch, path, content, message, token }) {
  const sha = await getSha({ owner, repo, path, branch, token });
  const body = {
    message,
    content: toBase64(content),
    branch,
    ...(sha ? { sha } : {})
  };
  const url = `${API}/repos/${owner}/${repo}/contents/${encodePath(path)}`;
  const res = await fetch(url, { method: "PUT", headers: headers(token), body: JSON.stringify(body) });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).message || ""; } catch (_) {}
    throw new Error(`Commit failed (${res.status}) ${detail}`.trim());
  }
  const data = await res.json();
  return { url: data.content && data.content.html_url, updated: Boolean(sha) };
}
