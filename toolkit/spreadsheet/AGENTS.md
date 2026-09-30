# Project instructions

## Mandatory spreadsheet-first workflow

Before every implementation task, inspect `docs/model-matrix.md` and run `python scripts/build_matrix.py`. The workbook in `workbooks/model.xlsx` is the authoring source. `generated/matrix.json` is derived and must never be edited manually.

If the workbook or generated matrix is missing, stop feature work and restore/regenerate it first. Do not infer spreadsheet content from old conversations or duplicate it in source code. Ask for the authoritative workbook if one has not been supplied.

Rows and columns use stable codes. Names and descriptions are human-facing and may change; codes are API identifiers and must not be repurposed or silently removed. Engine code should interpret generic types/rules and reference IDs, not hard-code individual rows. Extend the engine only when a genuinely new behavior cannot be expressed by existing supported rule types.

Any workbook schema change must update the validator and `docs/model-matrix.md` together. Build must fail on duplicate/missing codes, invalid enum values, broken references, and invalid required fields. Never modify user-authored workbook data without approval. Generated outputs may be regenerated.

Keep model/game behavior and content data in the workbook where representable. Use Typst only for generated documentation/presentation, loading the generated JSON rather than copying values.
