# RustPorts research notes

## Enablement and visual redesign, 2026-09-30

- Published implementation commit `8af0b23` to GitHub and deployed Pages `https://e554ed80.rustports.pages.dev` to `https://rustports.com`. All 18 production smoke checks passed: nine public byte/header comparisons, five private/nonexistent route exclusions and four live API checks. Firefox confirmed the new theme, initialized empty catalogue and correct roadmap/contribution destinations. Existing Worker and database were unchanged.

- [IMPROVEMENTS.md](IMPROVEMENTS.md) records 64 prioritized improvements, acceptance criteria, dependencies and explicit deferred gates. Implemented the scoped visual redesign, visible mobile navigation, task-oriented learning hub, OS-specific starter commands, honest maturity labels, useful empty states, shareable catalogue state, accessible pick state, modal-safe shortcut and contribution templates.
- Reused the existing vanilla frontend, Worker/D1 moderation, original workbook starter and strict public build allowlist. No new frontend dependencies, fonts, trackers, game assets or network relays. Original CSS spreadsheet/code illustration replaces the landscape theme.
- Primary research: [WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [Diataxis](https://diataxis.fr/), [GitHub contribution guidance](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors), [Bevy introduction](https://bevy.org/learn/quick-start/introduction/), [Rust learning paths](https://www.rust-lang.org/learn), [reduced motion](https://web.dev/articles/prefers-reduced-motion), and [Core Web Vitals](https://web.dev/articles/vitals). Source-to-decision mapping is in the roadmap. No third-party artwork or stylesheets copied.
- Final local web suite passed 31 tests: 20 API/runtime tests and 11 frontend/static checks. The new release-query regression test caught an unversioned 404 stylesheet, which was corrected and rerun. Token contrast and combined compressed payload budget pass; these are not accessibility certification or field Web Vitals measurements.
- Firefox exercised actual frontend plus Worker/D1 on an isolated localhost port pair: private creator submission, moderator note requirement, start review, approve, publish, pick, search/no-match/clear, and owner edit returning the listing to private review. No production sample data was created. GitHub identity/repository responses were fixture data, not real OAuth acceptance.
- Home and learning hub were checked in real browser frames at 320, 390, 768 and 1280 CSS pixels. A 397px learning-page overflow at narrow widths was reproduced, fixed with a zero-minimum grid track, and all four learning widths then matched document width. Mobile navigation remained visible. Clipboard permission was denied in the browser and the real selectable-command fallback worked. Native clipboard success, screen readers and Safari/Chromium devices remain unverified.
- The exact Windows first-run sequence succeeded in a fresh public clone and new virtual environment: pinned dependencies installed, five original rows exported, read-only drift check passed, all 12 workbook tests passed. macOS/Linux command variants were reviewed but not executed here. No native Jcode build/release is claimed.
- Preview now reuses the public allowlist and accepts an explicit frontend port with the Worker on the next port. Existing preview processes were left untouched. Pages artifact remains eleven allowlisted public files only.
- Remaining gates include real production OAuth consent, actual rights-email delivery, qualified legal review, cross-device/screen-reader acceptance and unfinished native integration. Self-hosting is not a zero-liability guarantee.

## Public toolkit preparation, 2026-09-30

- Published `321b51c` to the new public repository https://github.com/phoenixfire808/rustports on `master`. Existing website history was preserved, with no force push or upstream Jcode changes.
- Deployed the resources page and development notice to Pages deployment `https://5bbad354.rustports.pages.dev`. All 17 live checks passed, including resources page byte/header verification. Browser navigation from the live resources page reached the public GitHub toolkit and its development notice.
- A fresh GitHub clone passed snapshot hashes, documentation links and publication checks, then built the included workbook, passed the read-only drift check and passed all 12 starter tests again. The native draft remains explicitly unbuilt/unreleased in this publication.

- User requested publication now with explicit work-in-progress status, rather than waiting for the native tool to be complete. Public destination: `phoenixfire808/rustports`. No stable release or completion date is claimed.
- Reused Drew's existing generic Entities/Fields/Rules scaffold and spreadsheet-first instructions. Published only synthetic examples, added non-overwriting template generation, literal/formula validation, atomic output and a read-only drift check. The original project and its authored workbook were not changed.
- Preserved the native Jcode draft as an allowlisted source snapshot, not an installed runtime or entire private checkout. Upstream MIT notice retained. Verified public baseline `76df6464bf64b504996056b8934ec4ec6e8a4d2d` through GitHub. Local compaction changes were excluded. Patch applicability was checked using a private Git index without changing the shared Jcode worktree.
- Native dispatcher and reference-helper defects found during review are documented as blockers. Snapshot checksums and applicability do not establish that this draft builds or works. The runnable Python alternative has a distinct schema, explicitly documented.
- Consulted official Ghidra and openpyxl documentation, and linked primary tool/documentation sources in `toolkit/RESOURCES.md`. No third-party binaries, manuals, commercial game assets, or credential stores are included.
- Python starter: 12 tests passed through real CLI calls and in-memory validation. Included workbook built successfully and passed `--check`. Website: all 23 existing tests passed with the resources page added to the ten-file static allowlist.
- `scripts/check_publication.py` passed a heuristic scan of 58 candidate files and 63 historical blobs, XLSX archive checks, native artifact hashes, local documentation links and native patch applicability. These are bounded checks, not a guarantee of secret absence or legal clearance.

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

## Spreadsheet workflow + Jcode SQLite/Obsidian resource update, 2026-09-30

- Added the experimental Jcode + SQLite + separate DBViewer + optional Obsidian guide and Mermaid flowchart to the public toolkit. The guide keeps one writable authority per project and explicitly states limits on behavioral parity, drift guarantees, and token savings.
- Reused Obsidian's official local Markdown vault storage model rather than introducing an Obsidian plugin or server API: https://obsidian.md/help/data-storage. Jcode syncs only its dedicated `Jcode Memory` folders at memory-save/recall boundaries; it is not an always-on file watcher and does not upload a vault.
- Reused the existing separately packaged MIT DBViewer companion and the site's allowlisted static build. The site remains metadata/link-only: GitHub is the destination for source/releases; RustPorts does not accept executable or archive uploads.
- RustPorts validation: API tests passed 20/20, static checks passed 3/3, and the build emitted only ten allowlisted public files. Deployment is not yet verified.
- Jcode release compilation and Obsidian-specific Rust tests remain pending. No stable release or completed end-to-end Obsidian GUI acceptance is claimed.
