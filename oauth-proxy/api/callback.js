// CPGitSync OAuth proxy — the ONLY place the GitHub client secret lives.
//
// Flow: the extension sends the user to GitHub's authorize page with this
// endpoint as the redirect_uri. GitHub redirects back here with a `code`.
// We exchange that code for an access token (using the secret), then bounce
// the token back to the extension's private chromiumapp.org redirect.
//
// Env vars required on Vercel:
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET

export default async function handler(req, res) {
  const { code, state, error: ghError } = req.query;

  if (ghError) return fail(res, null, ghError);
  if (!code || !state) return res.status(400).send("Missing code or state.");

  // state carries the extension's private redirect URL (base64url JSON).
  let ext;
  try {
    const json = Buffer.from(String(state).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    ext = JSON.parse(json).r;
  } catch (_) {
    return res.status(400).send("Bad state.");
  }

  // Open-redirect guard: only ever bounce back to a Chrome extension redirect.
  if (!/^https:\/\/[a-p]{32}\.chromiumapp\.org\/?$/.test(ext)) {
    return res.status(400).send("Invalid redirect target.");
  }

  // Clear signal if the deployment is missing its env vars.
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return fail(res, ext, "server_missing_env_vars (set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on Vercel, then redeploy)");
  }

  try {
    const ghRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    const data = await ghRes.json();
    if (data.error || !data.access_token) {
      return fail(res, ext, data.error_description || data.error || "no_token");
    }

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, `${ext}#access_token=${encodeURIComponent(data.access_token)}`);
  } catch (e) {
    return fail(res, ext, "exchange_failed");
  }
}

function fail(res, ext, err) {
  if (ext && /^https:\/\/[a-p]{32}\.chromiumapp\.org\/?$/.test(ext)) {
    return res.redirect(302, `${ext}#error=${encodeURIComponent(err)}`);
  }
  return res.status(400).send("Login failed: " + err);
}
