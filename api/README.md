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

## Production status

- Production D1 database `rustports-metadata` is provisioned and migrations `0001` and `0002` are applied.
- The GitHub OAuth app is registered with homepage `https://rustports.com`, exact callback `https://api.rustports.com/auth/github/callback`, wildcard redirect matching off, and device flow off. It requests only `read:user`.
- The OAuth Client ID is a Worker variable. Its Client Secret is stored encrypted in Cloudflare under the secret binding `RustGitHub`; the Worker reads that binding without exposing its value. For a fresh setup, prefer the conventional secret name `GITHUB_CLIENT_SECRET`.
- `api.rustports.com` is attached to the deployed Worker and declared in `wrangler.jsonc`; the owner GitHub account is the initial moderator.
- Public catalog and activity endpoints have returned the expected empty JSON responses. OAuth start redirects to GitHub; a real authorization/callback should still be smoke-tested in the browser.

## Before public rollout

The Pages frontend is not yet updated from this repository. Before replacing it with the account/submission UI, establish and publish a working rights/takedown contact, privacy notice, account-deletion process, and reviewed Terms. The included Terms are a draft, not legal advice. Never place the Client Secret in source control or chat. Keep moderators trusted and review each linked public repository manually before publication.
