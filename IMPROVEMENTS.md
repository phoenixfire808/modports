# RustPorts enablement and design roadmap

Research and initial implementation: 2026-09-30. This is a prioritized product backlog, not a claim that all work is finished or a promise of a release date.

## Outcome

A visitor should understand RustPorts, find a suitable next step, run an original spreadsheet example, and know how to submit or contribute without guessing. Creators host their own projects and game servers. RustPorts remains a moderated metadata directory, not a file host or traffic relay. This architecture does not eliminate legal risk.

## Audit: what was holding people back

- The old lime/olive landscape identity looked more like a field journal than a developer platform. Tiny uppercase copy, fake coordinates and decorative mountains competed with the useful workflow.
- Navigation disappeared below 600px, including the only prominent resources link. Returning visitors had no clear mobile route into the toolkit.
- An empty catalogue looked like a dead end. We must offer useful next actions without inventing games, users, testimonials or activity.
- Resources were an undifferentiated list of repository links. Prerequisites, commands, expected output and tool maturity were not visible on the website.
- Search/filter state was lost on reload and could not be shared. Pick buttons lacked a programmatic pressed state. The shortcut could steal focus from an open dialog.
- CSS was seven mostly minified lines with conflicting override order and legacy decorative rules. Replacing it is safer than layering another theme on top.
- The browser preview had its own public-file list and omitted resources.html. Test the actual deployment allowlist instead.
- Real production GitHub consent, inbox delivery, legal review and native Jcode compatibility remain independent acceptance gates. Do not disguise them with a visual refresh.

## Research and decisions

| Source, accessed 2026-09-30 | Finding | Decision |
| --- | --- | --- |
| [W3C WCAG 2.2 additions](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) | Visible keyboard focus and adequately spaced targets are essential; AA target-size minimum is 24 CSS px with exceptions. | Aim for 44px action targets, visible 3px focus, no overlay navigation that traps users, visible mobile links. Do not claim certified WCAG conformance. |
| [Diataxis](https://diataxis.fr/) | Tutorials, how-to guides, reference and explanation answer different needs. | Separate first run, spreadsheet method, official reference library and development status. |
| [GitHub contribution guidance](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors) | Contribution instructions reduce malformed submissions and appear in GitHub's contribution UI. | Add contribution instructions and structured issue/PR templates with safety and evidence expectations. |
| [Bevy quick start](https://bevy.org/learn/quick-start/introduction/) | Concrete progression and modular, data-focused concepts introduce a large developer ecosystem. | Give novices a small runnable example first; link to official engine education instead of creating an unmaintained engine tutorial. |
| [Official Rust learning paths](https://www.rust-lang.org/learn) | The Book, Rust by Example and Rustlings provide complementary learning modes. | Offer these as explicit beginner routes, not a flat list of tools. |
| [Reduced motion guidance](https://web.dev/articles/prefers-reduced-motion) | Decorative parallax and animation can cause harm or distraction. | No autoplay, particle canvas, parallax or continuous animation. Respect reduced-motion preferences. |
| [Core Web Vitals](https://web.dev/articles/vitals) | Target p75 LCP <=2.5s, INP <=200ms, CLS <=0.1, separately on mobile and desktop. | Keep system fonts, local CSS illustration and vanilla JS. Payload budgets are regression checks, not evidence that field Web Vitals pass. |

These sources informed principles and information architecture. No third-party site artwork, stylesheets or text were copied.

## Visual direction: a development lab, not a landscape

Midnight graphite surfaces, warm ember primary actions, ice-blue technical accents and high-contrast off-white type. Strong sans-serif headlines, restrained monospace labels, generous reading width, original CSS sheet-to-code illustration. Use hierarchy, spacing and functional diagrams rather than stock game art. The resources hub and account dialogs use the same tokens. Content stays readable without decorative effects.

## Priority model

P0 protects trust or unblocks a core journey. P1 improves activation and repeat use. P2 compounds ecosystem growth. P3 is optional and should wait for evidence. Effort: S = localized, M = multi-component, L = substantial integration. Impact is a hypothesis until measured with real users. `This pass` means implementation scope; completion evidence is recorded in RESEARCH.md, not assumed here.

## Comprehensive improvement backlog

| ID | Priority / effort | Improvement and leverage | Acceptance / dependency | Scope |
| --- | --- | --- | --- | --- |
| 01 | P0/M | Replace disliked palette, typography and decorative identity | Unified home, resources, legal pages and dialogs at desktop/mobile | This pass |
| 02 | P0/S | Keep mobile navigation visible | Discover, toolkit and contribution routes reachable at 320px | This pass |
| 03 | P0/S | Explain product and maturity in first viewport | Directory + toolkit + early-development status, no misleading launch claim | This pass |
| 04 | P0/S | Give players, creators and contributors distinct routes | Every route has a working destination | This pass |
| 05 | P0/M | Turn resources into a task-oriented learning hub | First run, method, reference, limitations and contribution paths | This pass |
| 06 | P0/S | Publish OS-specific copyable quickstarts | Explicit Python/Git requirements; no remote pipe-to-shell; matching output | This pass |
| 07 | P0/S | Explain Python versus native Jcode maturity | Runnable experimental starter distinguished from unbuilt native draft | This pass |
| 08 | P0/S | Replace dead-end empty catalogue | Genuine empty state links to toolkit and submission, never fake projects | This pass |
| 09 | P0/M | Keyboard, contrast and touch foundations | Focus visible, readable muted text, 44px main controls, dialog flow verified | This pass |
| 10 | P0/S | Preserve fast, private, local assets | No trackers, external fonts, image CDNs or new frontend framework | This pass |
| 11 | P0/S | Fix preview/deployment file-list drift | Preview imports build allowlist and serves resources page | This pass |
| 12 | P0/S | Cache-safe release assets | All HTML and live checks use new version; live byte equality checked | This pass |
| 13 | P0/M | Validate production GitHub OAuth end to end | Owner completes real consent; callback/session/logout verified without bypass | Owner-assisted gate |
| 14 | P0/S | Verify rights inbox end to end | Authorized external test mail received and actionable | Owner-assisted gate |
| 15 | P0/L | Professional legal/policy review | Qualified counsel reviews actual product, takedown, licensing and jurisdictions | Professional gate |
| 16 | P0/M | Audit moderation and rate-limit concurrency | Repeated simultaneous create/update tests, atomic daily quota where needed | Next engineering |
| 17 | P0/M | Restore/rollback rehearsal | D1 backup restore in isolated database and Pages rollback documented/tested | Next operations |
| 18 | P0/M | Security disclosure handling | Private reporting contact, ownership and response process agreed | Owner policy gate |
| 19 | P1/S | Shareable search/filter/sort | URL preserves safe query state and browser back restores it | This pass |
| 20 | P1/S | Pick state and result announcements | aria-pressed, result count status and clear-filter recovery | This pass |
| 21 | P1/S | Clipboard failure recovery | Visible selectable address/commands and honest copy status | This pass |
| 22 | P1/S | Search shortcut respects dialogs | Ctrl/Cmd+K never pulls focus behind active modal | This pass |
| 23 | P1/S | Static FAQ resolves high-friction questions | Hosting, rights, review, native status and player setup answered | This pass |
| 24 | P1/S | Contribution guide | Local setup, test commands, review scope and safe first tasks | This pass |
| 25 | P1/S | Issue and PR templates | Reproduction, evidence, platform and no-secret/no-asset reminders | This pass |
| 26 | P1/S | Public prioritized roadmap | This backlog linked from website and repository | This pass |
| 27 | P1/M | CI for web and workbook regressions | Fresh dependency install, build, tests and publication checks on PR | Next after local acceptance |
| 28 | P1/M | Deterministic visual/browser regression suite | Desktop/mobile populated/empty/error/auth/dashboard snapshots | Next engineering |
| 29 | P1/M | Screen-reader review | NVDA/VoiceOver labels, status announcements, focus restoration | Specialist acceptance |
| 30 | P1/M | Cross-engine/device coverage | Safari/iOS and Chromium/Android actual flows, zoom and forced colors | Device acceptance |
| 31 | P1/M | Save submission drafts safely | Opt-in local storage, shared-device warning, never consent or secrets persisted | Later, privacy review |
| 32 | P1/M | More precise form help/errors | Inline server-validation mapping, described-by, recovery preserves inputs | Next engineering |
| 33 | P1/M | Own-project pagination and moderation filtering | Complete access beyond current limits without silent omission | Next engineering |
| 34 | P1/M | Moderation expectations | Public submission checklist and honest response expectations, no unsupported SLA | Owner process |
| 35 | P1/M | Publish the first genuinely reviewed projects | Permission/rights and repo-owner checks, real gameplay setup instructions | Creator participation |
| 36 | P1/M | Broken-link and ownership changes | Metadata-only checks with timeouts and no game-server probes | Next engineering |
| 37 | P1/M | Field performance baseline | Real p75 vitals with privacy review; no tracking added silently | Evidence gate |
| 38 | P1/M | Search engine metadata | Canonicals, sitemap, robots and original share artwork, no invented ratings | Next discoverability |
| 39 | P1/M | Submission intent across OAuth | Preserve intended action safely; no auto-accepted consent or unsaved-data leak | Next engineering |
| 40 | P1/M | Account deletion/export UX | Identity verification, actual retention policy and abuse safeguards | Privacy engineering |
| 41 | P1/L | Native Jcode release blockers | Fix CLI dispatch consumption, reference grammar and input resource caps in owner-approved tree | Separate native task |
| 42 | P1/L | Native cross-platform artifact | Build/test Windows/macOS/Linux, checksummed release and known compatibility | Depends on 41 |
| 43 | P1/M | Workbook evidence validation | Source, observation, uncertainty and test mapping explicitly validated | Sheet schema design |
| 44 | P1/M | Runtime parity tutorial | Original tiny Rust engine consumes matrix and tests observed behavior | Original example only |
| 45 | P1/M | Hostile workbook limits | Archive expansion, entry count, rows/cols and numeric bounds tested | Security work |
| 46 | P1/M | Python/native format migration | Versioned schemas and explicit compatibility or conversion | Depends on native stability |
| 47 | P2/M | Golden workbook fixtures | Blank-row diagnostics, formulas, duplicate IDs, refs and atomic failures | Expand existing tests |
| 48 | P2/M | Beginner no-code path | Edit copy in LibreOffice, preserve original, explain CLI step-by-step | Tutorial user testing |
| 49 | P2/M | Troubleshooting knowledge base | Python PATH, venv, workbook validation, ports and OAuth common errors | Based on real reports |
| 50 | P2/M | Translation-ready content | Language ownership, terminology and reviewed safety/legal translations | Community capacity |
| 51 | P2/M | Offline documentation bundle | Versioned README/schema/examples available without live website | Packaging decision |
| 52 | P2/L | Self-host server recipe | Creator-owned deployment, firewall/TLS/admin updates, no RustPorts relay | Real original server demo |
| 53 | P2/M | Contributor task board | Small evidence-backed issues and maintainer review capacity | Owner-managed queue |
| 54 | P2/M | Release notes and version matrix | Native/Python/web versions, upgrade impact and migration notes | Release discipline |
| 55 | P2/M | Repository license clarity | Root website/API license explicitly approved; toolkit license retained | Owner approval, no unilateral relicensing |
| 56 | P2/M | Community conduct and moderation appeals | Roles, escalation, conflicts and private reports | Owner policy decision |
| 57 | P2/M | Dependency/update policy | Scheduled human review, pinning, audit and rollback rather than force-fix | Operations ownership |
| 58 | P2/M | Data lifecycle verification | Scheduled expiry, deletion requests and backups tested against privacy claims | Privacy/operations |
| 59 | P2/M | Catalogue facets guided by inventory | Platform/engine/license filters only when reliable metadata exists | Real catalogue demand |
| 60 | P2/M | Project detail/permalink pages | Indexable approved metadata and clear external link boundaries | Schema/routing work |
| 61 | P3/L | Community forums/chat | Only with moderation capacity and spam controls | Do not launch empty channels |
| 62 | P3/M | Notifications/subscriptions | Explicit opt-in, unsubscribe, privacy review and delivery ownership | Not needed for first success |
| 63 | P3/M | Personalization and recommendations | Useful only with real catalogue, avoid fabricated engagement | Real demand first |
| 64 | P3/L | Hosted processing or gameplay | Conflicts with current no-host/no-relay boundary | Out of scope |

## Implementation sequence and checks

1. Replace the visual system and homepage structure while preserving API IDs and consent forms.
2. Build a resources hub that works without JavaScript. Enhance command copying progressively.
3. Improve existing catalogue interactions without changing moderation or traffic architecture.
4. Add contributor documentation and link this prioritized backlog.
5. Run web/API and Python tests, source-publication checks, then exercise actual local Worker+D1 creator/moderator journeys and desktop/mobile layout. Check normal text contrast with declared tokens and inspect keyboard/empty/error states. Record gaps rather than calling a partial review an accessibility certification.
6. Commit scoped reviewed files, push, deploy static allowlisted assets, verify exact live bytes/headers/API and visually inspect production.

## Stop conditions

No fake project inventory, testimonials, usage claims or native release claims. No payment, tracking integration, broad OAuth permission, production test submission, server probing or email sending as part of this pass. Native source in another session remains untouched. Further work prioritizes demonstrated user friction over feature count.
