use jcode_import_core::workbook::{build_workbook_matrix, check_workbook_matrix, inspect_workbook};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

const FIXTURES: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures");

fn project_with_workbook(fixture_name: &str) -> (TempDir, PathBuf) {
    let dir = tempfile::tempdir().unwrap();
    let source = Path::new(FIXTURES).join(fixture_name);
    fs::copy(source, dir.path().join("model.xlsx")).unwrap();
    let config = dir.path().join("jcode-workbook.toml");
    fs::write(&config, config_contents()).unwrap();
    (dir, config)
}

fn config_contents() -> &'static str {
    r#"
schema_version = 1
workbook = "model.xlsx"
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
allowed_values = ["common", "rare"]

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
"#
}

#[test]
fn real_xlsx_build_is_typed_deterministic_and_checkable() {
    let (dir, config) = project_with_workbook("model.xlsx");
    let report = build_workbook_matrix(&config).unwrap();
    assert_eq!(report.row_count, 4);
    assert_eq!(report.table_count, 2);
    assert!(report.is_current);
    assert_eq!(report.workbook, dir.path().join("model.xlsx"));

    let output = fs::read(&report.output).unwrap();
    let matrix: Value = serde_json::from_slice(&output).unwrap();
    assert_eq!(matrix["schema_version"], 1);
    assert_eq!(matrix["source"]["file_name"], "model.xlsx");
    assert_eq!(matrix["tables"]["Items"]["rows"][0]["item_id"], "ENT_WOOD");
    assert_eq!(matrix["tables"]["Recipes"]["rows"][0]["quantity"], 2);
    assert_eq!(matrix["tables"]["Recipes"]["rows"][0]["enabled"], true);
    assert!(matrix["source"]["sha256"].as_str().unwrap().len() == 64);
    assert!(
        !String::from_utf8(output.clone())
            .unwrap()
            .contains(dir.path().to_str().unwrap())
    );

    let second = build_workbook_matrix(&config).unwrap();
    assert_eq!(output, fs::read(second.output).unwrap());
    assert!(check_workbook_matrix(&config).unwrap().is_current);

    fs::write(&report.output, b"stale matrix").unwrap();
    let stale_check = check_workbook_matrix(&config).unwrap();
    assert!(!stale_check.is_current);
    assert_eq!(fs::read(&report.output).unwrap(), b"stale matrix");
}

#[test]
fn broken_reference_fails_with_physical_row_and_preserves_existing_output() {
    let (dir, config) = project_with_workbook("broken-reference.xlsx");
    let output = dir.path().join("generated/matrix.json");
    fs::create_dir_all(output.parent().unwrap()).unwrap();
    fs::write(&output, b"previous valid matrix").unwrap();

    let error = build_workbook_matrix(&config).unwrap_err().to_string();
    assert!(error.contains("Recipes"), "{error}");
    assert!(error.contains("row 3"), "{error}");
    assert!(error.contains("ENT_MISSING"), "{error}");
    assert_eq!(fs::read(output).unwrap(), b"previous valid matrix");
}

#[test]
fn formulas_in_mapped_cells_are_rejected() {
    let (_dir, config) = project_with_workbook("formula.xlsx");
    let error = build_workbook_matrix(&config).unwrap_err().to_string();
    assert!(error.contains("formula cells are not accepted"), "{error}");
    assert!(error.contains("Items"), "{error}");
}

#[test]
fn type_mismatches_are_reported_at_the_source_cell() {
    let (_dir, config) = project_with_workbook("wrong-type.xlsx");
    let error = build_workbook_matrix(&config).unwrap_err().to_string();
    assert!(error.contains("Recipes"), "{error}");
    assert!(error.contains("row 3"), "{error}");
    assert!(error.contains("enabled"), "{error}");
    assert!(error.contains("expected boolean"), "{error}");
}

#[test]
fn inspect_returns_only_the_requested_preview_rows() {
    let dir = Path::new(FIXTURES).join("model.xlsx");
    let inspection = inspect_workbook(&dir, 1).unwrap();
    assert_eq!(inspection.sheets.len(), 2);
    assert_eq!(inspection.sheets[0].name, "Items");
    assert_eq!(inspection.sheets[0].preview.len(), 1);
}

#[test]
fn unsupported_config_version_is_rejected_before_reading_workbook() {
    let (dir, config) = project_with_workbook("model.xlsx");
    fs::write(
        config,
        config_contents().replace("schema_version = 1", "schema_version = 2"),
    )
    .unwrap();
    let error = build_workbook_matrix(&dir.path().join("jcode-workbook.toml"))
        .unwrap_err()
        .to_string();
    assert!(
        error.contains("unsupported workbook config schema_version 2"),
        "{error}"
    );
}
