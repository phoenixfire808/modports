# RustPorts reverse-engineering and spreadsheet toolkit

> **Work in progress / early development.** We are sharing the current tools and research method now so people can try them and help improve them. We are aiming to complete the broader workflow soon, but there is no committed release date. This is not a finished reverse-engineering suite or a promise of behavioral parity.

## Start here

1. Read the [spreadsheet method](SPREADSHEET-METHOD.md) and agree on the scope and permissions for your project.
2. Try the [Python spreadsheet starter](spreadsheet/README.md). It runs independently of Jcode and includes an editable, original example workbook.
3. Use the [Jcode project instructions](spreadsheet/AGENTS.md) in your own project to keep authored workbook data separate from generated output.
4. Browse the [reference library](RESOURCES.md). Links go to the tools' official sites rather than repackaged downloads.
5. Developers can inspect the [native Jcode draft](native-jcode/README.md), including source, tests, a patch, and fixture workbooks. It is **not a stable Jcode release**.
6. Read the [Jcode SQLite + DBViewer + optional Obsidian guide](JCODE-DBVIEWER-OBSIDIAN.md) for the current native database workflow, spreadsheet cutover choice, detailed flowchart, token/context boundaries, installation, and validation checklist.

## What exists versus what is planned

| Area | Status |
| --- | --- |
| Entities / Fields / Rules workbook and Python validator | Runnable starter, not a game engine |
| Stable IDs, references, literal values, generated JSON, drift check | Implemented in Python starter |
| Evidence sheet | Human-maintained research ledger, not validated/exported yet |
| Native Jcode SQLite, CLI/agent database tools, separate DBViewer, and optional Obsidian memory | Experimental implementation in the Jcode development tree; follow the integration guide and verify the precise downloadable build before use |
| Automatic reconstruction of a game from a binary or spreadsheet | Not provided |
| Automatic task context, query UI, schema migration, parity automation | Planned or exploratory, not completed features |
| Copyright or legal clearance | Not provided by these tools |

See [development status and next steps](STATUS.md). Contributions should use small original examples, include reproducible tests, and state what was actually measured. Do not submit commercial binaries, game assets, private keys, account data, or confidential research.

## Ownership and distribution

The starter examples are synthetic. They are not recovered data from a commercial game. The native Jcode material retains its upstream [MIT license](native-jcode/LICENSE). Original material in this toolkit is covered by [LICENSE](LICENSE), with the native subtree governed by its own notice. Referenced third-party tools retain their own licenses and are not bundled. No permission to use any game's code, branding, art, or assets is conveyed.
