# Development status

Updated 2026-09-30. **Experimental.** The current Jcode development tree integrates project-scoped SQLite, bounded CLI/agent database access, and a separate native Rust DBViewer. The Obsidian memory adapter and portable release are being validated; do not describe a release as stable until its exact binary, tests, package manifest, and clean-install workflow have been checked.

## Available toolkit resources

- Public method, spreadsheet authoring contract, and Jcode project instructions.
- Original editable example workbook with an Evidence ledger.
- Python validation, deterministic generated JSON, non-writing drift checks, and tests.
- Detailed native Jcode SQLite/DBViewer/Obsidian integration guide and flowchart: `JCODE-DBVIEWER-OBSIDIAN.md`.
- Current native Jcode source remains maintained in the Jcode repository; the RustPorts website only links resources and does not host executables, code archives, databases, or game assets.

## Validation still required for a named release

- Run focused memory adapter tests and the affected CLI/agent/database suites against the exact working-tree source.
- Build JcodeSS and the separate DBViewer for the published platform and package them with both licenses, launch scripts, user guide, and SHA-256 manifest.
- Validate the archive in a clean temporary directory; launch the real GUI against an isolated database fixture and observe a rendered page.
- Exercise Obsidian single-vault auto-detection, Jcode-to-vault writes, note-edit import before recall, no-vault fallback, multiple-vault selection, and ensure unrelated notes remain untouched.
- Publish the exact build and source reference to a GitHub release only after the checks pass; then link it from RustPorts Resources. RustPorts itself remains metadata/link-only.

## Product limits

- The native database workflow uses SQLite as the one structured authority. A workbook can remain authoritative until a deliberate one-time validated migration. Do not maintain workbook and SQLite copies as concurrent editable authorities.
- DBViewer is a separate read-only companion for SQLite data. It does not generate Rust code or decompile a game.
- Obsidian sync is local and occurs at Jcode memory save/recall boundaries. It is not a background watcher while Jcode is idle or closed.
- Schema validity and stable IDs reduce divergence; they do not prove program behavior or guarantee zero drift. Differential tests and human review remain required.
- The toolkit provides no legal clearance. Use owned or authorized sources and assets.

See [the detailed workflow and flowchart](JCODE-DBVIEWER-OBSIDIAN.md). Report reproducible problems with tool version, platform, command, observed output, and minimal original fixtures. Do not post secrets, private research, proprietary binaries, or game assets.
