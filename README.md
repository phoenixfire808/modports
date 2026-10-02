# RustPorts

> **Work in progress / early development.** The website is live at https://rustports.com. We are sharing the spreadsheet and reverse-engineering toolkit while it is still being developed. We hope to complete the broader workflow soon, but there is no committed release date. The native Jcode snapshot is experimental, not a stable release.

## Start here

- [Guided first run and learning hub](https://rustports.com/resources)
- [Researched 64-item improvement roadmap](IMPROVEMENTS.md)
- [Contribute a focused improvement](CONTRIBUTING.md)

## Public developer resources

- [Start with the toolkit](toolkit/README.md)
- [Spreadsheet research method](toolkit/SPREADSHEET-METHOD.md)
- [Runnable spreadsheet starter and editable workbook](toolkit/spreadsheet/README.md)
- [Native Jcode draft, source and known blockers](toolkit/native-jcode/README.md)
- [Official-source resource library](toolkit/RESOURCES.md)
- [Development status](toolkit/STATUS.md)

The toolkit lives on GitHub, not in the website's deployment artifact. Private configuration, sessions, credentials, and third-party game files are excluded. See toolkit license notices before reuse.

RustPorts indexes original Rust-language game projects. Creators operate their own servers. The site stores text metadata, public GitHub links, and optional direct server addresses. It has no game-file uploads, asset storage, connection proxy, server probing, or game traffic relay.

## Install and validate

Node.js 22 and npm are required. From the project root:

```cmd
npm --prefix api ci
npm test
npm run build
```

The test suite includes small mocked boundary tests, the actual Worker in Miniflare/workerd with an isolated SQLite-backed D1 database, and static packaging checks. Only external GitHub responses are mocked in integration tests. These tests do not prove real GitHub app credentials or real mail delivery.

For a disposable browser fixture:

```cmd
npm run preview:test
```

Visit `http://127.0.0.1:8787/__test/login?user=1` for the synthetic creator, or `user=2` for the synthetic moderator. The fixture binds only to localhost, uses ephemeral data, and is never deployed. Repository verification accepts only `https://github.com/maker/game` in this fixture. It does not exercise real GitHub consent.

For another local session, use `set "RP_PREVIEW_PORT=18937" && npm run preview:test` in Command Prompt. The frontend uses that port and the isolated Worker uses the next port. Choose two free ports rather than stopping another session's server.

For real local OAuth, run the Worker on port 8788 with `SITE_ORIGIN` set to the exact local frontend origin and a separate development GitHub app. Never use production secrets in test fixtures.

## Automatic website updates

Pushes to GitHub's `master` branch run the test suite and build the allowlisted website. Only a successful validation can deploy to Cloudflare Pages `rustports` (https://rustports.com). Pull requests run validation without deployment or deployment secrets. API Worker changes and database migrations remain manual.

Workflow: [`.github/workflows/website.yml`](.github/workflows/website.yml). Set these GitHub Actions secrets before deployment can succeed:

- `CLOUDFLARE_ACCOUNT_ID`: the account containing Pages project `rustports`.
- `CLOUDFLARE_API_TOKEN`: a dedicated Cloudflare API token restricted to that account with **Account / Cloudflare Pages / Edit** permission. Do not use or copy a local Wrangler OAuth/refresh token.

Manage secrets under repository **Settings → Secrets and variables → Actions**. Never commit or paste tokens in issues, logs or chat. The existing Pages production branch is `main`; the workflow deliberately deploys with `--branch main` even though GitHub uses `master`. The `production-website` GitHub environment identifies production deployments. Push access to `master` therefore allows publishing the public website; grant it only to trusted collaborators.

## Deploy

The public website artifact is **dist/**, not the repository root. The build explicitly copies eleven public files and refuses unexpected output files. Never upload `api/`, credentials, package files, tests, `toolkit/`, or `.wrangler/` to Pages.

```cmd
npm test
npm run build
cd api
npx --no-install wrangler d1 migrations apply rustports-metadata --remote
npx --no-install wrangler deploy
npx --no-install wrangler pages deploy ../dist --project-name rustports --branch main
```

Review production migrations before applying. The current release needs existing migrations 0001 through 0003 only. The API uses `api.rustports.com`, D1 `rustports-metadata`, and GitHub OAuth callback `https://api.rustports.com/auth/github/callback`. Secrets belong only in Cloudflare Worker secrets. Both `GITHUB_CLIENT_SECRET` and the existing `RustGitHub` secret alias are supported. Do not print either value.

Wrangler requires Pages write access in addition to existing Worker/D1 permissions. Keep deployment output/version IDs for rollback. Cloudflare Pages supports rolling back to an earlier production deployment from its dashboard. Do not reset production databases to roll back code.

## Product safeguards

- GitHub login requests only `read:user`, uses state and PKCE, consumes state atomically, and discards the GitHub token after reading identity.
- Registration records affirmative consent to versioned terms. Session cookies are secure/HttpOnly in production, with separate CSRF protection for writes.
- Only allowlisted text metadata is accepted. Requests are size-bounded. No multipart uploads, arbitrary URL fetching, or repository file downloads.
- Creators can edit and resubmit, or withdraw their listings. Every edit hides the listing until fresh moderation. Withdrawn/rejected listings cannot be silently edited back into circulation.
- Moderators must start review, approve, then publish. Asset-review attestation is required for approval/publication. A stale review version is rejected. Transitions are audited atomically.
- Picks are idempotent and visible only on published projects. Empty POST streams work correctly in the Cloudflare runtime without permitting body/file uploads.
- Expired sessions and OAuth attempts are purged daily. Listing withdrawal hides metadata but does not erase moderation records.
- Privacy, hosting, rights-reporting, and account-data request instructions are public. Account deletion is a verified manual support process, not an automatic deletion button.

## Launch acceptance and remaining owner actions

Check `/api/health`, logged-out catalog, GitHub consent/callback, creator dashboard, moderator publication, and live response security headers after each deployment. Never seed fake accounts or sample projects into production.

On 2026-09-30, Cloudflare showed the `rights@rustports.com` forwarding rule active and `drew.kallies@gmail.com` verified. Actual email delivery still needs an end-to-end test from a different sender.

Before broad public promotion, the owner must complete qualified legal review of the terms, privacy, and rights-complaint process, and actively monitor the rights inbox/moderation queue. Creator hosting reduces what RustPorts handles but cannot guarantee zero liability. Terms remain a product-policy draft until that review is done.
