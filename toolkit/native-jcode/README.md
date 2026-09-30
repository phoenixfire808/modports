# Native Jcode spreadsheet workflow: development snapshot

> **EXPERIMENTAL, NOT RELEASED. Do not replace your installed Jcode with this draft.** Source is published for review and contribution. A runnable independent alternative is the [Python starter](../spreadsheet/README.md).

This is an allowlisted snapshot of the existing native workbook work, not a dump of the user's Jcode installation or a fork of private configuration. It preserves the draft as found, including its unfinished tests. It does not imply upstream acceptance or an official Jcode release.

- Upstream: https://github.com/1jehuang/jcode
- Public base commit: `76df6464bf64b504996056b8934ec4ec6e8a4d2d`
- [Tracked-file patch](snapshot/tracked-changes.patch)
- [New source, documentation, tests and synthetic XLSX fixtures](snapshot/new-files/)
- [SHA-256 artifact manifest](snapshot/manifest.json)
- [Draft command and mapping documentation](snapshot/new-files/docs/workbook-workflow.md)
- [Upstream MIT license](LICENSE)

## Review/reconstruct in a separate disposable checkout

Clone the public upstream into a **new directory**, check out the exact base commit, and inspect `tracked-changes.patch`. Run `git apply --check PATH_TO_PATCH` first, then `git apply PATH_TO_PATCH` only in that disposable checkout. Copy the contents of `snapshot/new-files/` into that checkout, preserving paths. The base plus patch plus new files reconstructs the workbook draft. No credentials, settings, sessions, or source-game assets are included. The local compaction change is unrelated and intentionally excluded.

The draft expects the upstream Rust toolchain and build prerequisites. Use a private `CARGO_TARGET_DIR`, not another session's build directory. The focused command is `cargo test -p jcode-import-core --locked`. A root CLI build and tests are a separate requirement, not implied by focused parser tests. No compiled binary is supplied here.

## Known blockers found during publication review

1. The dispatcher calls `args.command.take()` before checking that the command is a workbook command. That can consume unrelated CLI commands. It must be guarded and regression-tested before anyone installs a build.
2. `split_reference` accepts more than one period, while its own unit test expects that input to fail. Config validation checks this separately, but the unit test and helper disagree.
3. Inspection bounds preview rows but not columns, sheet count, cell sizes, archive expansion, or total output. Treat workbook inputs as trusted and bounded.
4. Cross-platform atomic replacement, path aliases, numeric extremes, full CLI routing, and hostile-workbook resource limits need additional testing.
5. Automatic agent context, `init`, table querying, diff presentation, MCP, and automatic engine code generation are not implemented by this snapshot.

These blockers are deliberately visible rather than hidden behind a 'complete' claim. This publication checks artifact integrity and patch applicability, **not successful compilation or execution of the native draft**. Use the tested Python starter for the documented example workflow today.

To export a future reviewed snapshot without modifying the source checkout, use `scripts/export_workbook_draft.py` from the repository root with the source path, a new output directory, and an explicitly reviewed public base commit. Review all changes and renew the manifest and status notes.
