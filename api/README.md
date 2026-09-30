# RustPorts API

This Worker is designed for `https://api.rustports.com`. It stores only GitHub account identity, terms acceptance, project text metadata, public GitHub repository URLs, picks, sessions, and review/audit status in D1.

## No-file guarantee

- There is no multipart, binary, image, archive, game-build, or source upload route.
- Project creation accepts `application/json` only, with an 8 KiB request limit and an allowlist of metadata fields. Unknown fields, including any file/image field, are rejected.
- Pick endpoints reject request bodies.
- GitHub links must be strict `https://github.com/{owner}/{repo}` public repo URLs. The Worker makes a fixed-origin GitHub API request to read public **repository metadata only**. It never fetches or stores repo contents, source, releases, images, or assets.
- The GitHub OAuth access token is used only for `GET api.github.com/user` and is not saved. The app requests `read:user`, not repo/content/write scopes.
- Only `published` projects appear in public list/activity APIs. New submissions begin `submitted`. Moderator updates require an allowlisted GitHub numeric ID, a reason, and a valid state transition.

## Local development

From this folder:

```sh
npm run migrate:local
npm run dev
```

The local Pages/static preview should be served at `http://127.0.0.1:8765`, and this API at `http://127.0.0.1:8788`. GitHub login is intentionally unavailable without a GitHub OAuth app; API submission and moderation handlers can be exercised using a test harness or local auth fixture, not a production bypass.

## Production setup, not yet complete

1. Create a D1 database named `rustports-metadata` and replace `database_id` in `wrangler.jsonc` with its ID. Apply migrations remotely only after confirming the database is new and empty.
2. Create a GitHub OAuth app owned by the site operator, with homepage `https://rustports.com` and callback `https://api.rustports.com/auth/github/callback`. Request only `read:user`. Put `GITHUB_CLIENT_SECRET` into Cloudflare Worker secrets. Set `GITHUB_CLIENT_ID` as a plain-text Worker variable; never put the client secret in code, git, or chat.
3. Set `MODERATOR_GITHUB_IDS` to the trusted moderator's numeric GitHub ID(s). Do not enable public submissions with an empty moderator list.
4. Deploy this Worker with Wrangler (the existing OAuth CLI token may need additional Workers/D1 scopes). Attach the Worker custom domain `api.rustports.com` in Cloudflare and verify TLS/CORS/cookies.
5. Deploy the static frontend only after the API and bindings are ready. Keep file inputs removed. Confirm the `rustports.com` Pages site and `api.rustports.com` are both working over HTTPS.
6. Before inviting users, publish a contact/takedown route, privacy notice, data-deletion flow, reviewed legal ToS, and appeal process. The included ToS is a draft, not legal advice. Run moderator/account security checks on the production domains.

The Worker config deliberately contains a placeholder D1 ID. It cannot be safely deployed to production until the real database ID and secrets are configured. No production D1 database, GitHub OAuth app, or API Worker has been created yet.
