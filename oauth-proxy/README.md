# CPGitSync OAuth proxy

A single serverless function that completes "Login with GitHub" for the CPGitSync
extension. It's the **only** place the GitHub client secret lives — the extension
never sees it.

## What it does

`GET /api/callback` receives GitHub's `code`, exchanges it for an access token
using your client ID + secret, and redirects the token back to the extension's
private `chromiumapp.org` URL. That's the whole thing (~50 lines, no dependencies).

## Deploy to Vercel (one time)

1. **Create the GitHub OAuth App** → https://github.com/settings/applications/new
   - **Application name:** `CPGitSync`
   - **Homepage URL:** your solutions repo URL (anything works)
   - **Authorization callback URL:** you'll set this in step 4 — put `https://example.com` for now
   - Click **Register application**
   - Copy the **Client ID**, then click **Generate a new client secret** and copy that too.

2. **Deploy this folder to Vercel:**
   - Easiest: install the CLI (`npm i -g vercel`), then from inside `oauth-proxy/` run:
     ```bash
     vercel --prod
     ```
   - Or import the repo at https://vercel.com/new and set the **Root Directory** to `oauth-proxy`.

3. **Add environment variables** in the Vercel project (Settings → Environment Variables):
   - `GITHUB_CLIENT_ID` = your Client ID
   - `GITHUB_CLIENT_SECRET` = your Client secret
   - Redeploy so they take effect.

4. **Set the callback URL** back on the GitHub OAuth App to:
   ```
   https://YOUR-APP.vercel.app/api/callback
   ```
   (use the domain Vercel gave you).

5. **Tell the extension about it.** In `src/background.js`, fill in:
   ```js
   const GITHUB_CLIENT_ID = "your-client-id";
   const OAUTH_PROXY_URL  = "https://YOUR-APP.vercel.app/api/callback";
   ```
   Reload the extension. "Login with GitHub" now works in one click.

## Security notes

- The client **secret** stays in Vercel env vars — never in the extension or the repo.
- The function only ever redirects back to a valid `https://<32-char-id>.chromiumapp.org/`
  URL (open-redirect guard), so the token can't be bounced to an attacker.
- The token is requested with `repo` scope so CPGitSync can commit to your repos.
