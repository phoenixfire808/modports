# Workbook contract and canonical matrix

## Authoritative input

`workbooks/model.xlsx` is the editable input. Sheet names are fixed identifiers, not display labels. The schema starts intentionally small and generic; replace sample records with project-approved rows and extend the schema deliberately as model requirements are known.

### `Entities`

| Column | Type | Meaning |
|---|---|---|
| `entity_id` | stable code | Unique ID, e.g. `ENT_ITEM_WOOD` |
| `name` | text | Display label |
| `entity_type` | stable enum | `item`, `weapon`, `npc`, `resource`, or `other` |
| `enabled` | boolean | Whether the generic engine loads this record |
| `description` | text | Optional explanatory text |

### `Fields`

| Column | Type | Meaning |
|---|---|---|
| `field_id` | stable code | Unique field ID, e.g. `FLD_MAX_STACK` |
| `entity_id` | reference | Must match an `Entities.entity_id` |
| `value_type` | stable enum | `string`, `integer`, `number`, `boolean`, `entity_ref` |
| `value` | typed scalar | Configured value; reference values must match an entity ID |
| `unit` | text | Optional unit such as `seconds` or `meters` |

### `Rules`

| Column | Type | Meaning |
|---|---|---|
| `rule_id` | stable code | Unique rule ID |
| `entity_id` | reference | Must match an `Entities.entity_id` |
| `rule_type` | stable enum | Initially `set_field`, `requires_entity`, `cooldown` |
| `target` | code/reference | Target field or entity as defined by rule type |
| `value` | scalar | Rule parameter |
| `enabled` | boolean | Whether the engine evaluates the rule |

## Code rules

Use uppercase ASCII codes matching `^[A-Z][A-Z0-9_]{2,63}$`. Codes are permanent identifiers. Never reuse a deleted code for another meaning. Human-facing names can be edited without changing identifiers. Add new enum/rule types only alongside engine support and validation. Spreadsheet rows describe instances; engine code implements generic semantics for supported types.

## Build guarantees

`python scripts/build_matrix.py` validates required sheets and headers, code syntax/uniqueness, enum/type values, boolean and numeric values, entity references, and required cells. Any validation issue exits nonzero and does not publish a new matrix. On success it writes deterministic JSON with source workbook hash and normalized records. The JSON is generated, not a second authoring surface.

An engine can load `generated/matrix.json` and interpret types/IDs. Typst documents can load the same JSON using `json()`; Typst does not execute the workbook's formulas or implement the game engine.

## Scope and caveat

This is a starter contract, not a claim that any game's design has been recovered. The current sample content is illustrative. New behavior that the engine does not understand still requires adding a generic engine capability; ordinary content/configuration changes should be workbook-only.

The optional `Evidence` sheet is a human-maintained research ledger. It is intentionally not exported or validated by this version. Link observations, hypotheses, version information, and regression tests there. `Entities`, `Fields`, and `Rules` are the only exported tables. Formula and Excel error cells in those tables are rejected. The validator checks structural consistency, not behavioral parity or the semantic meaning of every rule parameter.

Use `python scripts/build_matrix.py --check` in CI to detect drift without writing. Output writes are atomic. The template generator refuses to overwrite an existing workbook. Only process trusted, bounded workbooks locally: this starter is not a hardened upload service or a sandbox for hostile spreadsheet files.
