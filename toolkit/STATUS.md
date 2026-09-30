# Development status

Updated 2026-09-30. **Work in progress.** We are aiming to complete the broader spreadsheet-driven workflow soon. No completion date is committed, and the current snapshot should not be described as production-ready.

## Available now

- Public method, resource library, spreadsheet authoring contract and Jcode instructions.
- Original editable example workbook with an Evidence ledger.
- Python validation, deterministic generated JSON, non-writing drift checks and tests.
- Native Jcode workbook source snapshot, integration patch, tests, synthetic fixtures and upstream license.

## Next priorities

- Fix native dispatch and reference-parser blockers documented in the native README.
- Validate the native parser and complete CLI workflow on supported platforms before shipping a binary.
- Add resource limits and path-edge-case tests for workbook input/output.
- Design and validate evidence-to-rule/test references without treating hypotheses as facts.
- Expand worked examples using original or clearly licensed programs.
- Add bounded queries and task-context integration only after the core contract is stable.
- Document migration between Python and native schemas, rather than pretending they are interchangeable.

## Definition of ready for a stable tool release

A fresh checkout must reproduce the documented example, validation failures must preserve authored data and last-good output, all advertised commands must pass tests, install instructions must work without changing unrelated Jcode configuration, dependencies and notices must be reviewed, and each known blocker must be fixed or explicitly removed from the supported scope. A game implementation still needs independent behavioral tests and rights review.

Report issues with the exact tool version, operating system, command, expected/observed behavior, and a minimal original workbook. Never post confidential research, secrets, proprietary binaries, or game assets in an issue.
