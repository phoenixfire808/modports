# RustPorts research notes

## Production verification, 2026-09-30 11:49 UTC

- Worker version: `6eb6f4f5-4b50-4915-8dec-67d794d1bb06`. Final Pages deployment: `https://f937aac5.rustports.pages.dev`, serving `https://rustports.com`.
- `node scripts/check-live.mjs` passed all 16 read-only checks: seven public files match the reviewed build with security headers, five private/nonexistent paths return 404, and four live API endpoints return expected status/CORS and configured-auth health. No production test accounts or listings were added.
- Live browser loaded the empty moderated catalog, called the live API, and opened an enabled GitHub consent dialog. Actual GitHub login still requires the user's own Terms acceptance. Local browser workflow and 23 automated checks passed earlier, with static checks rerun after the final deployment fixes.
- Live verification caught Cloudflare email obfuscation rewriting contact links. Reused `email_off` exclusions (https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/) and verified only the directives are removed in production, with mailto links intact and no decode script injected.
- Live browser also reproduced stale prelaunch JavaScript under the zone's four-hour asset caching. Versioned script/style URLs fixed initialization. Bump the asset query version in HTML and smoke checks whenever those assets change.
- Remaining acceptance boundaries: real production GitHub sign-in and test-email delivery to rights@rustports.com. Obtain qualified legal review before representing the platform as legally launch-ready. Direct connections and no asset hosting do not eliminate liability.

## Launch hardening, 2026-09-30

- Reused Cloudflare's D1 test binding pattern: https://developers.cloudflare.com/workers/testing/miniflare/storage/d1/
- Reused Pages `_headers` configuration: https://developers.cloudflare.com/pages/configuration/headers/
- Kept existing Cloudflare Wrangler deployment rather than introducing another provider. Integration discovery returned no suitable catalog deployment tool.
- Pinned Wrangler 4.144.0 and its matching Miniflare 5.20260926.1-alpha. This release exports `convertV4MiniflareOptions`, used to adapt the documented Miniflare v4 options to v5. npm audit reported zero vulnerabilities.
- Added actual Worker/workerd + SQLite-backed D1 integration tests, rather than relying on the previous SQL-string stubs. GitHub responses remain mocked. Tests reproduced an empty POST body-stream bug in picks and an unsupported `redirect: error` OAuth runtime failure, then passed after fixes.
- Browser checks used the actual frontend and Worker with disposable local identities: submit privately, review/approve/publish, pick, search reset, and edit back into private review. Checked 390px viewport without document overflow. These do not substitute for real production GitHub consent or real mail delivery.
- Strictly allowlisted public build prevents source/config/credentials from entering Pages uploads. Removed external font requests so CSP can remain self-only for script/style/font and privacy copy does not omit a font provider.
- Cloudflare UI showed rights forwarding active and its destination verified. Wrangler's limited deployment authorization completed successfully. Neither observation proves inbox delivery.


Reviewed for the account, repository-linking, and moderation feature work on 2026-09-30.

## Reusable implementation sources

- Cloudflare Pages Functions bindings, including D1 setup in dashboard/config and redeploy requirements: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Pages Functions advanced mode with `_worker.js`, `env.ASSETS.fetch()` static fallback, and the documented Git-integration deployment requirement: https://developers.cloudflare.com/pages/functions/advanced-mode/
- GitHub OAuth app authorization flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- GitHub OAuth app security practices: https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/best-practices-for-creating-an-oauth-app

Integration discovery found no end-user auth, Cloudflare D1, or user-repository linking integration. GitHub CLI exists in the integration directory but is not a solution for community members' sign-in/repo linking. Product choices recorded: Cloudflare D1 and GitHub OAuth Apps, off-catalog.

## Decisions

- No RustPorts API accepts file data. Public submissions are JSON text metadata only; reject multipart/form-data and all file upload fields at the server boundary. No cover art upload, binary upload, mirroring, copying, or hosting.
- User login/linking uses GitHub identity only with a minimal `read:user` scope. Do not request repository write or content scopes. Discard the temporary OAuth access token after reading the user's GitHub numeric ID/login, rather than storing it.
- Accept only links to public `github.com/{owner}/{repo}` repositories. Verify through the public GitHub repository metadata endpoint only, with a hard-coded `api.github.com` origin and strict owner/repo parsing. Never fetch a user-supplied arbitrary URL or repository contents/assets.
- New submissions stay private to their contributor in `submitted`/review states. Only moderator-approved and `published` entries appear in the public catalog. Every status transition records moderator, reason, and timestamp. Contributor edits to an approved/public project return it to review.
- Terms of Service is a versioned product document; record explicit acceptance timestamp and version when creating an account. This is policy copy, not a substitute for legal review.
- Use D1 for accounts, project metadata, selection records, and moderation audit events. No R2 binding or asset storage is needed.
- Cloudflare Pages currently uses direct upload. Cloudflare documents Advanced Mode `_worker.js` deployment through Git integration, so don't assume a direct-upload folder can securely activate API Functions. A separate same-site Worker API on `api.rustports.com` is a deployable option with a D1 binding, provided the OAuth app and Worker secrets are configured.

## Operational blockers before a real public rollout

- An owner-created GitHub OAuth app is needed, with callback URL on the API domain. Its client secret must be added directly to Cloudflare Workers secrets, never committed or pasted into chat.
- A trusted moderator identity/allowlist must be configured before approvals are enabled.
- Deploy the API, set D1 binding and API hostname, then update/redeploy the frontend to call it. Verify public published-only visibility and moderator/contributor role boundaries before inviting users.
- Review final ToS/privacy/takedown process with appropriate counsel and provide user data deletion/contact routes before launch.
