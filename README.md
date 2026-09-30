# RustPorts

RustPorts is a community index for ports, conversions, and parodies of any game rewritten in the Rust programming language. It is about the Rust language, not the Rust game. The project is designed to accept project metadata and public GitHub repository links only. It has no asset/file upload feature and the API rejects file-oriented content.

## Local development

Requirements: Node.js and npm. From the repository root:

```sh
cd api
npm install
npm run migrate:local
npm test
npm run dev
```

Serve the root frontend separately, for example `npx http-server . -p 8765`, and visit `http://127.0.0.1:8765`. The frontend points at the local Worker on port 8788 for localhost. `npm run check` validates Worker syntax. The API tests use Miniflare/Wrangler's local runtime and in-memory test bindings.

## Product safeguards

- Sign-in is through GitHub OAuth with minimal `read:user` scope. OAuth state and PKCE are used, and the GitHub access token is discarded.
- Account registration requires affirmative acceptance of the versioned Terms of Service.
- Submissions contain short text metadata and a public `github.com/{owner}/{repo}` URL. RustPorts checks repository metadata only, never clones a repository or fetches its source/assets.
- No project binaries, archives, images, screenshots, or other files may be uploaded. The API bounds request sizes, accepts allowlisted JSON fields, and rejects multipart/form uploads.
- Projects remain private to their creator and moderators until approved and published. Moderators have an audited status-transition queue. Publishing requires an explicit record that an asset review was completed.
- Community picks and published-project activity are shared through the service; contributors can see their own project status.

## Production readiness

The repository is not itself a production deployment. Before enabling public accounts, configure a Cloudflare D1 database and apply `api/migrations`, deploy the Worker, attach `api.rustports.com`, configure the GitHub OAuth application and Worker secrets, and set the trusted moderator GitHub numeric IDs. Confirm a public contact/takedown process, privacy and account-deletion disclosures, and have qualified counsel review the Terms before inviting users. Keep the moderator allowlist empty until it is deliberately configured. Secrets must only be set using Cloudflare's secret mechanism and must never be committed.

The current Cloudflare Pages site and API may not match this repository until these production setup steps are completed. The Terms page is a product-policy draft, not legal advice. RustPorts is an independent community project and is not affiliated with any game publisher or rights holder.
