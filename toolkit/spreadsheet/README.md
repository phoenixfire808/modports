# Spreadsheet-first starter (experimental)

This is Drew's generic spreadsheet scaffold, adapted for public use. It organizes observations into stable IDs and generates a validated JSON matrix. It does **not** reverse-engineer binaries automatically, recreate a game, or prove that engine behavior matches a reference.

## Run the included example

Requires Python 3.10+ and a trusted local workbook. From the repository root:

```text
cd toolkit/spreadsheet
python -m venv .venv
```

Activate with `.venv\Scripts\activate` in Windows CMD, or `source .venv/bin/activate` on macOS/Linux. Then:

```text
python -m pip install -r requirements.txt
python scripts/build_matrix.py
python scripts/build_matrix.py --check
python -m unittest discover -s tests -v
```

The included `workbooks/model.xlsx` has original illustrative rows only. The generated `generated/matrix.json` is ignored by Git in this repository. Repeat builds of the same workbook produce identical JSON bytes. Changes to workbook bytes, even Excel metadata, change the source hash.

## Start your own project

Copy this `spreadsheet` directory into a new project. Preserve the original example separately, then edit your copy of `workbooks/model.xlsx` in Excel or LibreOffice. Never run a generator over authored data: `create_template.py` refuses to overwrite an existing workbook. It is only for a new directory with no workbook.

1. Read [the schema](docs/model-matrix.md) and [the research method](../SPREADSHEET-METHOD.md).
2. Replace synthetic rows with your own supported facts. Keep unknowns and hypotheses in the Evidence sheet, not as unexplained runtime constants.
3. Build the matrix. Correct errors in the workbook, not the generated JSON.
4. Have your engine load IDs and generic rule types. Do not duplicate per-row values in source code.
5. Add engine-level tests based on repeatable observations. Run matrix `--check` and those tests before each change is accepted.

`--workbook PATH --output PATH` selects alternate paths relative to your current working directory. The default paths are relative to this starter. Source and output cannot resolve to the same file. `--check` never rewrites the output.

## Limits

Only Entities, Fields, and Rules are exported. Evidence is for human review only. The Python and native Jcode draft have different schemas and JSON shapes, and are not drop-in replacements. The validator checks IDs, references, types, enums and required values, not complete rule semantics or behavioral parity. Formula and Excel error cells in exported tables are rejected, and macros are not run. `defusedxml` reduces certain XML parser risks, but this is not a sandbox or resource-limited service. Do not process hostile workbooks or use it as a public upload endpoint. Row labels in some validation messages count nonblank records, so avoid blank rows while diagnosing errors.
