# RustPorts

RustPorts is a community index for ports, conversions, and parodies of any game rewritten in the Rust programming language. It is about the Rust language, not the Rust game. Creators operate and host any game servers themselves. RustPorts stores only project metadata, public GitHub links, and optional direct server addresses. It does not host game builds or server software and never proxies, relays, tunnels, or tests game connections. It has no asset/file upload feature and the API rejects file-oriented content.

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
- Submissions contain short text metadata and a public `github.com/{owner}/{repo}` URL. Creators may add a direct `hostname:port` or `[IPv6]:port` address for a creator-operated server. RustPorts stores this as text and does not connect to it; players use the game client to connect directly.
- No project binaries, archives, images, screenshots, or other files may be uploaded. The API bounds request sizes, accepts allowlisted JSON fields, and rejects multipart/form uploads.
- RustPorts serves the directory website/API and project metadata. It does not serve the games or carry game network traffic. Direct endpoints can expose where a creator's server is reachable and are published only after moderation.
- Projects remain private to their creator and moderators until approved and published. Moderators have an audited status-transition queue. Publishing requires an explicit record that an asset review was completed.
- Community picks and published-project activity are shared through the service; contributors can see their own project status.

## Production readiness

The repository is not itself a production deployment. Apply all D1 migrations, including `0003_direct_connection_address.sql`, and deploy the updated Worker and frontend together. Before enabling public accounts, configure Cloudflare D1, attach `api.rustports.com`, configure GitHub OAuth and Worker secrets, and set trusted moderator GitHub numeric IDs. Confirm a public contact/takedown process, privacy and account-deletion disclosures, and have qualified counsel review the Terms before inviting users. Keep the moderator allowlist empty until deliberately configured. Secrets must only be set using Cloudflare's secret mechanism and must never be committed.

The current Cloudflare Pages site and API may not match this repository until these production setup steps are completed. The Terms page is a product-policy draft, not legal advice. RustPorts is an independent community project and is not affiliated with any game publisher or rights holder.
