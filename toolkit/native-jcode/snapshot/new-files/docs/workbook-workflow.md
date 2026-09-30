# Using spreadsheet-backed projects in Jcode

This first stage is an explicit local workflow. A project opts in by adding `jcode-workbook.toml`. Jcode does not scan unrelated spreadsheets, call a provider, or automatically add workbook contents to every prompt.

## 1. Inspect a workbook

```console
jcode workbook inspect path/to/model.xlsx
jcode workbook inspect path/to/model.xlsx --json
```

Inspection shows sheet names, dimensions, headers, and at most three preview rows. It is for mapping design, not a complete data dump.

## 2. Add a mapping

Create `jcode-workbook.toml` in the project root. Paths resolve relative to this config file.

```toml
schema_version = 1
workbook = "data/model.xlsx"
output = "generated/matrix.json"

[[sheets]]
name = "Items"
header_row = 1
id_column = "item_id"
required = true

[[sheets.columns]]
name = "item_id"
kind = "code"
required = true
unique = true

[[sheets.columns]]
name = "name"
kind = "string"
required = true

[[sheets.columns]]
name = "rarity"
kind = "string"
required = true
allowed_values = ["common", "uncommon", "rare"]

[[sheets]]
name = "Recipes"
header_row = 1
id_column = "recipe_id"
required = true

[[sheets.columns]]
name = "recipe_id"
kind = "code"
required = true
unique = true

[[sheets.columns]]
name = "result_item"
kind = "code"
required = true
reference = "Items.item_id"

[[sheets.columns]]
name = "quantity"
kind = "integer"
required = true

[[sheets.columns]]
name = "enabled"
kind = "boolean"
required = true
```

Supported kinds are `string`, `integer`, `number`, `boolean`, and `code`. Code values must be uppercase ASCII letters, digits, or underscores, begin with a letter, and be unique where marked. References use `SheetName.column_name`. Formulas in mapped data cells are rejected because Jcode does not recalculate Excel formulas. Put authoritative values in literal cells.

## 3. Build, then check

```console
jcode workbook build
jcode workbook check
```

Build validates the configured sheets and columns, checks unique IDs and references, and atomically writes a versioned JSON matrix with a SHA-256 of the source workbook. A failed validation does not replace an existing matrix. Check recomputes the expected result in memory and reports whether the generated matrix is current without writing it.

Use `--config path/to/other.toml` to select a mapping and `--json` for machine-readable reports. Add `jcode workbook check` to your project validation/CI step once the workbook and mapping are committed.

## Current boundary

The current implementation does not yet automatically detect spreadsheet-relevant agent tasks, query selected rows into model context, generate game code, or expose MCP. The matrix is a validated data artifact, not proof that downstream code cannot drift. Those require explicit code-generation/runtime mappings, checks and end-to-end tests. Formula calculation, macro execution, and automatic inference of business semantics are intentionally out of scope.
