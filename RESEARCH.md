# RustPorts research notes

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
