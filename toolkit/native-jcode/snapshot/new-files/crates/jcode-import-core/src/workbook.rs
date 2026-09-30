use calamine::{Data, Range, Reader, open_workbook_auto};
use serde::{Deserialize, Serialize};
use serde_json::{Number, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs::{self, File};
use std::io::{Error, ErrorKind, Read, Write};
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;

use crate::ImportCoreResult;

const CONFIG_VERSION: u32 = 1;
const MATRIX_VERSION: u32 = 1;

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkbookConfig {
    pub schema_version: u32,
    pub workbook: PathBuf,
    pub output: PathBuf,
    pub sheets: Vec<WorkbookSheetConfig>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkbookSheetConfig {
    pub name: String,
    #[serde(default = "default_header_row")]
    pub header_row: usize,
    #[serde(default)]
    pub id_column: Option<String>,
    #[serde(default)]
    pub required: bool,
    pub columns: Vec<WorkbookColumnConfig>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkbookColumnConfig {
    pub name: String,
    pub kind: WorkbookValueKind,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub unique: bool,
    #[serde(default)]
    pub allowed_values: Vec<String>,
    /// Optional reference target written as `Table.column`.
    #[serde(default)]
    pub reference: Option<String>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkbookValueKind {
    String,
    Integer,
    Number,
    Boolean,
    Code,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct WorkbookInspection {
    pub file_name: String,
    pub sheets: Vec<SheetInspection>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct SheetInspection {
    pub name: String,
    pub rows: usize,
    pub columns: usize,
    pub headers: Vec<Value>,
    pub preview: Vec<Vec<Value>>,
}

#[derive(Debug, Serialize)]
pub struct MatrixDocument {
    pub schema_version: u32,
    pub source: MatrixSource,
    pub tables: BTreeMap<String, MatrixTable>,
}

#[derive(Debug, Serialize)]
pub struct MatrixSource {
    pub file_name: String,
    pub sha256: String,
}

#[derive(Debug, Serialize)]
pub struct MatrixTable {
    pub columns: Vec<String>,
    pub row_count: usize,
    pub rows: Vec<BTreeMap<String, Value>>,
    #[serde(skip)]
    source_rows: Vec<usize>,
}

#[derive(Debug)]
pub struct WorkbookBuildReport {
    pub workbook: PathBuf,
    pub output: PathBuf,
    pub source_sha256: String,
    pub row_count: usize,
    pub table_count: usize,
    pub is_current: bool,
}

fn default_header_row() -> usize {
    1
}

fn invalid(message: impl Into<String>) -> Box<dyn std::error::Error + Send + Sync> {
    Box::new(Error::new(ErrorKind::InvalidData, message.into()))
}

/// Read a project mapping. Relative workbook and output paths resolve from the
/// directory containing the mapping file, not the shell's later working dir.
pub fn load_workbook_config(path: &Path) -> ImportCoreResult<(WorkbookConfig, PathBuf, PathBuf)> {
    let text = fs::read_to_string(path)?;
    let config: WorkbookConfig = toml::from_str(&text)?;
    validate_config(&config)?;
    let config_dir = path.parent().unwrap_or_else(|| Path::new("."));
    let workbook = resolve_path(config_dir, &config.workbook);
    let output = resolve_path(config_dir, &config.output);
    if paths_refer_to_same_file(&workbook, &output) {
        return Err(invalid(
            "workbook source and generated matrix output resolve to the same file",
        ));
    }
    Ok((config, workbook, output))
}

fn resolve_path(base: &Path, path: &Path) -> PathBuf {
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        base.join(path)
    }
}

fn paths_refer_to_same_file(source: &Path, output: &Path) -> bool {
    if let (Ok(source), Ok(output)) = (source.canonicalize(), output.canonicalize()) {
        return source == output;
    }
    let source = source
        .canonicalize()
        .unwrap_or_else(|_| lexical_absolute(source));
    let output_parent = output.parent().unwrap_or_else(|| Path::new("."));
    let output_name = output.file_name();
    let Some(output_name) = output_name else {
        return false;
    };
    let output = output_parent
        .canonicalize()
        .unwrap_or_else(|_| lexical_absolute(output_parent))
        .join(output_name);
    source == output
}

fn lexical_absolute(path: &Path) -> PathBuf {
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(path)
    }
}

fn validate_config(config: &WorkbookConfig) -> ImportCoreResult<()> {
    if config.schema_version != CONFIG_VERSION {
        return Err(invalid(format!(
            "unsupported workbook config schema_version {}; expected {CONFIG_VERSION}",
            config.schema_version
        )));
    }
    if config.workbook.as_os_str().is_empty() || config.output.as_os_str().is_empty() {
        return Err(invalid("workbook and output paths must not be empty"));
    }
    if config.sheets.is_empty() {
        return Err(invalid("config must define at least one [[sheets]] entry"));
    }

    let mut sheet_names = HashSet::new();
    for sheet in &config.sheets {
        if sheet.name.trim().is_empty() {
            return Err(invalid("configured sheet name must not be empty"));
        }
        if !sheet_names.insert(sheet.name.as_str()) {
            return Err(invalid(format!(
                "sheet {:?} is configured more than once",
                sheet.name
            )));
        }
        if sheet.header_row == 0 {
            return Err(invalid(format!(
                "sheet {:?}: header_row is 1-based and must be at least 1",
                sheet.name
            )));
        }
        if sheet.columns.is_empty() {
            return Err(invalid(format!(
                "sheet {:?}: configure at least one column",
                sheet.name
            )));
        }
        let mut column_names = HashSet::new();
        for column in &sheet.columns {
            if column.name.trim().is_empty() {
                return Err(invalid(format!(
                    "sheet {:?}: configured column name must not be empty",
                    sheet.name
                )));
            }
            if !column_names.insert(column.name.as_str()) {
                return Err(invalid(format!(
                    "sheet {:?}: column {:?} is configured more than once",
                    sheet.name, column.name
                )));
            }
            if column.unique && !column.required {
                return Err(invalid(format!(
                    "sheet {:?}, column {:?}: unique columns must be required",
                    sheet.name, column.name
                )));
            }
            if let Some(reference) = column.reference.as_deref() {
                if !reference.contains('.') || reference.matches('.').count() != 1 {
                    return Err(invalid(format!(
                        "sheet {:?}, column {:?}: reference must use `Table.column` syntax",
                        sheet.name, column.name
                    )));
                }
                if !matches!(
                    column.kind,
                    WorkbookValueKind::String | WorkbookValueKind::Code
                ) {
                    return Err(invalid(format!(
                        "sheet {:?}, column {:?}: reference columns must be string or code values",
                        sheet.name, column.name
                    )));
                }
            }
        }
        if let Some(id_column) = sheet.id_column.as_deref() {
            let Some(column) = sheet.columns.iter().find(|column| column.name == id_column) else {
                return Err(invalid(format!(
                    "sheet {:?}: id_column {:?} must also be listed under [[sheets.columns]]",
                    sheet.name, id_column
                )));
            };
            if !matches!(column.kind, WorkbookValueKind::Code) || !column.unique || !column.required
            {
                return Err(invalid(format!(
                    "sheet {:?}: id_column {:?} must be a required unique `code` column",
                    sheet.name, id_column
                )));
            }
        }
    }

    for sheet in &config.sheets {
        for column in &sheet.columns {
            if let Some(reference) = column.reference.as_deref() {
                let (table, target_column) = split_reference(reference)?;
                let Some(target_sheet) = config
                    .sheets
                    .iter()
                    .find(|candidate| candidate.name == table)
                else {
                    return Err(invalid(format!(
                        "sheet {:?}, column {:?}: reference target table {:?} is not configured",
                        sheet.name, column.name, table
                    )));
                };
                let Some(target) = target_sheet
                    .columns
                    .iter()
                    .find(|candidate| candidate.name == target_column)
                else {
                    return Err(invalid(format!(
                        "sheet {:?}, column {:?}: reference target {:?} is not configured",
                        sheet.name, column.name, reference
                    )));
                };
                if !target.unique {
                    return Err(invalid(format!(
                        "sheet {:?}, column {:?}: reference target {:?} must be unique",
                        sheet.name, column.name, reference
                    )));
                }
            }
        }
    }
    Ok(())
}

fn split_reference(reference: &str) -> ImportCoreResult<(&str, &str)> {
    let Some((table, column)) = reference.split_once('.') else {
        return Err(invalid(format!("invalid reference target {reference:?}")));
    };
    if table.is_empty() || column.is_empty() {
        return Err(invalid(format!("invalid reference target {reference:?}")));
    }
    Ok((table, column))
}

/// Inspect workbook structure without returning an unbounded cell dump.
pub fn inspect_workbook(path: &Path, preview_rows: usize) -> ImportCoreResult<WorkbookInspection> {
    let mut workbook = open_workbook_auto(path)?;
    let names = workbook.sheet_names().to_vec();
    let mut sheets = Vec::with_capacity(names.len());
    for name in names {
        let range = workbook.worksheet_range(&name)?;
        let headers = range
            .rows()
            .next()
            .map(|row| row.iter().map(cell_to_json).collect())
            .unwrap_or_default();
        let preview = range
            .rows()
            .skip(1)
            .take(preview_rows)
            .map(|row| row.iter().map(cell_to_json).collect())
            .collect();
        sheets.push(SheetInspection {
            name,
            rows: range.height(),
            columns: range.width(),
            headers,
            preview,
        });
    }
    Ok(WorkbookInspection {
        file_name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("workbook")
            .to_string(),
        sheets,
    })
}

/// Validate a mapped workbook and write the deterministic canonical matrix.
pub fn build_workbook_matrix(config_path: &Path) -> ImportCoreResult<WorkbookBuildReport> {
    let (config, workbook_path, output_path) = load_workbook_config(config_path)?;
    let document = create_matrix(&config, &workbook_path)?;
    let content = serde_json::to_vec_pretty(&document)?;
    write_atomically(&output_path, &content)?;
    Ok(report(&config, workbook_path, output_path, document, true))
}

/// Validate and compare expected matrix bytes without changing any file.
pub fn check_workbook_matrix(config_path: &Path) -> ImportCoreResult<WorkbookBuildReport> {
    let (config, workbook_path, output_path) = load_workbook_config(config_path)?;
    let document = create_matrix(&config, &workbook_path)?;
    let expected = serde_json::to_vec_pretty(&document)?;
    let is_current = match fs::read(&output_path) {
        Ok(existing) => existing == expected,
        Err(error) if error.kind() == ErrorKind::NotFound => false,
        Err(error) => return Err(Box::new(error)),
    };
    Ok(report(
        &config,
        workbook_path,
        output_path,
        document,
        is_current,
    ))
}

fn report(
    _config: &WorkbookConfig,
    workbook: PathBuf,
    output: PathBuf,
    document: MatrixDocument,
    is_current: bool,
) -> WorkbookBuildReport {
    let row_count = document.tables.values().map(|table| table.row_count).sum();
    WorkbookBuildReport {
        workbook,
        output,
        source_sha256: document.source.sha256,
        row_count,
        table_count: document.tables.len(),
        is_current,
    }
}

fn create_matrix(
    config: &WorkbookConfig,
    workbook_path: &Path,
) -> ImportCoreResult<MatrixDocument> {
    let source_hash = sha256_file(workbook_path)?;
    let mut workbook = open_workbook_auto(workbook_path)?;
    let available_sheets = workbook.sheet_names().to_vec();
    let mut tables = BTreeMap::new();

    for sheet in &config.sheets {
        if !available_sheets.contains(&sheet.name) {
            if sheet.required {
                return Err(invalid(format!(
                    "workbook is missing required sheet {:?}; available sheets: {}",
                    sheet.name,
                    available_sheets.join(", ")
                )));
            }
            continue;
        }
        let range = workbook.worksheet_range(&sheet.name)?;
        let formula_range = workbook.worksheet_formula(&sheet.name).ok();
        let table = normalize_sheet(sheet, &range, formula_range.as_ref())?;
        tables.insert(sheet.name.clone(), table);
    }
    validate_references(config, &tables)?;

    let file_name = workbook_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("workbook")
        .to_string();
    Ok(MatrixDocument {
        schema_version: MATRIX_VERSION,
        source: MatrixSource {
            file_name,
            sha256: source_hash,
        },
        tables,
    })
}

fn normalize_sheet(
    config: &WorkbookSheetConfig,
    range: &Range<Data>,
    formulas: Option<&Range<String>>,
) -> ImportCoreResult<MatrixTable> {
    if range.is_empty() {
        return Err(invalid(format!(
            "sheet {:?} is empty; expected header row {}",
            config.name, config.header_row
        )));
    }
    let (start_row, start_column) = range
        .start()
        .ok_or_else(|| invalid(format!("sheet {:?} contains no cells", config.name)))?;
    let header_index = config.header_row.saturating_sub(1);
    let relative_header = header_index
        .checked_sub(start_row as usize)
        .filter(|index| *index < range.height())
        .ok_or_else(|| {
            invalid(format!(
                "sheet {:?} does not contain configured header row {}",
                config.name, config.header_row
            ))
        })?;
    let header_row = range.rows().nth(relative_header).ok_or_else(|| {
        invalid(format!(
            "sheet {:?}: header row is unavailable",
            config.name
        ))
    })?;
    let headers: Vec<Option<String>> = header_row
        .iter()
        .map(|value| match value {
            Data::Empty => None,
            other => Some(other.to_string().trim().to_string()),
        })
        .collect();

    let mut header_positions: HashMap<&str, Vec<usize>> = HashMap::new();
    for (index, header) in headers.iter().enumerate() {
        if let Some(header) = header.as_deref().filter(|header| !header.is_empty()) {
            header_positions.entry(header).or_default().push(index);
        }
    }
    let mut errors = Vec::new();
    let mut configured_positions = Vec::with_capacity(config.columns.len());
    for column in &config.columns {
        match header_positions.get(column.name.as_str()) {
            None => errors.push(format!(
                "sheet {:?}, row {}, column {:?}: configured header is missing",
                config.name, config.header_row, column.name
            )),
            Some(positions) if positions.len() > 1 => errors.push(format!(
                "sheet {:?}, row {}, column {:?}: header occurs more than once",
                config.name, config.header_row, column.name
            )),
            Some(positions) => configured_positions.push((column, positions[0])),
        }
    }
    if !errors.is_empty() {
        return Err(invalid(errors.join("\n")));
    }

    let mut unique_values: HashMap<&str, HashSet<String>> = HashMap::new();
    let mut rows = Vec::new();
    let mut source_rows = Vec::new();
    for (relative_row, row) in range.rows().skip(relative_header + 1).enumerate() {
        if row.iter().all(|cell| matches!(cell, Data::Empty)) {
            continue;
        }
        let absolute_row = start_row as usize + relative_header + 1 + relative_row;
        let excel_row = absolute_row + 1;
        let mut output = BTreeMap::new();
        for (column, relative_column) in &configured_positions {
            let cell = row.get(*relative_column).unwrap_or(&Data::Empty);
            let absolute_column = start_column as usize + relative_column;
            if formula_at(formulas, absolute_row, absolute_column) {
                errors.push(format!(
                    "sheet {:?}, row {}, column {:?}: formula cells are not accepted as authoritative inputs; replace with a literal value",
                    config.name, excel_row, column.name
                ));
                continue;
            }
            match normalize_cell(cell, column) {
                Ok(value) => {
                    if column.required && (value.is_null() || is_blank_string(&value)) {
                        errors.push(format!(
                            "sheet {:?}, row {}, column {:?}: required value is empty",
                            config.name, excel_row, column.name
                        ));
                    }
                    if !column.allowed_values.is_empty()
                        && !value.is_null()
                        && !column.allowed_values.iter().any(|allowed| {
                            value.as_str() == Some(allowed.as_str())
                                || value.to_string() == *allowed
                        })
                    {
                        errors.push(format!(
                            "sheet {:?}, row {}, column {:?}: value {} is not in allowed_values [{}]",
                            config.name,
                            excel_row,
                            column.name,
                            value,
                            column.allowed_values.join(", ")
                        ));
                    }
                    if column.unique && !value.is_null() {
                        let key = value.to_string();
                        if !unique_values
                            .entry(column.name.as_str())
                            .or_default()
                            .insert(key.clone())
                        {
                            errors.push(format!(
                                "sheet {:?}, row {}, column {:?}: duplicate value {}",
                                config.name, excel_row, column.name, value
                            ));
                        }
                    }
                    output.insert(column.name.clone(), value);
                }
                Err(message) => errors.push(format!(
                    "sheet {:?}, row {}, column {:?}: {}",
                    config.name, excel_row, column.name, message
                )),
            }
        }
        rows.push(output);
        source_rows.push(excel_row);
    }
    if !errors.is_empty() {
        return Err(invalid(errors.join("\n")));
    }
    let columns = config
        .columns
        .iter()
        .map(|column| column.name.clone())
        .collect();
    Ok(MatrixTable {
        row_count: rows.len(),
        columns,
        rows,
        source_rows,
    })
}

fn formula_at(formulas: Option<&Range<String>>, row: usize, column: usize) -> bool {
    formulas
        .and_then(|range| range.get_value((row as u32, column as u32)))
        .is_some_and(|formula| !formula.trim().is_empty())
}

fn normalize_cell(cell: &Data, config: &WorkbookColumnConfig) -> Result<Value, String> {
    if matches!(cell, Data::Empty) {
        return Ok(Value::Null);
    }
    match config.kind {
        WorkbookValueKind::String => match cell {
            Data::String(value) => Ok(Value::String(value.clone())),
            Data::DateTimeIso(value) | Data::DurationIso(value) => Ok(Value::String(value.clone())),
            Data::DateTime(value) => Ok(Value::String(value.to_string())),
            _ => Err(format!("expected text, found {}", cell_kind(cell))),
        },
        WorkbookValueKind::Code => match cell {
            Data::String(value) if is_stable_code(value.trim()) => {
                Ok(Value::String(value.trim().to_string()))
            }
            Data::String(value) => Err(format!(
                "invalid stable code {:?}; expected 3-64 uppercase ASCII letters/digits/underscores, starting with a letter",
                value
            )),
            _ => Err(format!(
                "expected stable-code text, found {}",
                cell_kind(cell)
            )),
        },
        WorkbookValueKind::Integer => match cell {
            Data::Int(value) => Ok(Value::Number((*value).into())),
            Data::Float(value) if value.is_finite() && value.fract() == 0.0 => {
                let integer = *value as i64;
                if integer as f64 == *value {
                    Ok(Value::Number(integer.into()))
                } else {
                    Err("expected integer within the supported 64-bit range".to_string())
                }
            }
            _ => Err(format!("expected integer, found {}", cell_kind(cell))),
        },
        WorkbookValueKind::Number => match cell {
            Data::Int(value) => Ok(Value::Number((*value).into())),
            Data::Float(value) => Number::from_f64(*value)
                .map(Value::Number)
                .ok_or_else(|| "number is not finite".to_string()),
            _ => Err(format!("expected number, found {}", cell_kind(cell))),
        },
        WorkbookValueKind::Boolean => match cell {
            Data::Bool(value) => Ok(Value::Bool(*value)),
            _ => Err(format!("expected boolean, found {}", cell_kind(cell))),
        },
    }
}

fn cell_kind(cell: &Data) -> &'static str {
    match cell {
        Data::Empty => "empty cell",
        Data::String(_) => "text",
        Data::Int(_) => "integer",
        Data::Float(_) => "number",
        Data::Bool(_) => "boolean",
        Data::DateTime(_) | Data::DateTimeIso(_) | Data::DurationIso(_) => "date/time",
        Data::Error(_) => "Excel error",
    }
}

fn is_blank_string(value: &Value) -> bool {
    value.as_str().is_some_and(|text| text.trim().is_empty())
}

fn is_stable_code(code: &str) -> bool {
    let bytes = code.as_bytes();
    (3..=64).contains(&bytes.len())
        && bytes[0].is_ascii_uppercase()
        && bytes[1..]
            .iter()
            .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit() || *byte == b'_')
}

fn cell_to_json(cell: &Data) -> Value {
    match cell {
        Data::Empty => Value::Null,
        Data::String(value) | Data::DateTimeIso(value) | Data::DurationIso(value) => {
            Value::String(value.clone())
        }
        Data::DateTime(value) => Value::String(value.to_string()),
        Data::Int(value) => Value::Number((*value).into()),
        Data::Float(value) => Number::from_f64(*value)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        Data::Bool(value) => Value::Bool(*value),
        Data::Error(error) => Value::String(format!("#ERROR:{error}")),
    }
}

fn validate_references(
    config: &WorkbookConfig,
    tables: &BTreeMap<String, MatrixTable>,
) -> ImportCoreResult<()> {
    let mut indexes: HashMap<(&str, &str), HashSet<String>> = HashMap::new();
    for sheet in &config.sheets {
        let Some(table) = tables.get(&sheet.name) else {
            continue;
        };
        for column in &sheet.columns {
            if column.unique || sheet.id_column.as_deref() == Some(column.name.as_str()) {
                let values = indexes.entry((&sheet.name, &column.name)).or_default();
                for row in &table.rows {
                    if let Some(value) = row.get(&column.name).and_then(Value::as_str) {
                        values.insert(value.to_string());
                    }
                }
            }
        }
    }
    let mut errors = Vec::new();
    for sheet in &config.sheets {
        let Some(table) = tables.get(&sheet.name) else {
            continue;
        };
        for column in &sheet.columns {
            let Some(reference) = column.reference.as_deref() else {
                continue;
            };
            let (target_table, target_column) = split_reference(reference)?;
            let targets = indexes.get(&(target_table, target_column));
            for (row_index, row) in table.rows.iter().enumerate() {
                let Some(value) = row.get(&column.name).and_then(Value::as_str) else {
                    continue;
                };
                if !targets.is_some_and(|targets| targets.contains(value)) {
                    errors.push(format!(
                        "sheet {:?}, row {}, column {:?}: reference {:?} does not exist in {}",
                        sheet.name,
                        table
                            .source_rows
                            .get(row_index)
                            .copied()
                            .unwrap_or(row_index + 1),
                        column.name,
                        value,
                        reference
                    ));
                }
            }
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(invalid(errors.join("\n")))
    }
}

fn sha256_file(path: &Path) -> ImportCoreResult<String> {
    let mut file = File::open(path)?;
    let mut hash = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hash.update(&buffer[..read]);
    }
    Ok(hex::encode(hash.finalize()))
}

fn write_atomically(path: &Path, content: &[u8]) -> ImportCoreResult<()> {
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent)?;
    let mut temp = NamedTempFile::new_in(parent)?;
    temp.write_all(content)?;
    temp.as_file().sync_all()?;
    temp.persist(path).map_err(|error| error.error)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stable_code_grammar_is_ascii_and_bounded() {
        assert!(is_stable_code("ENT_WOOD"));
        assert!(is_stable_code("A__"));
        assert!(!is_stable_code("AB"));
        assert!(!is_stable_code("ent_wood"));
        assert!(!is_stable_code("1ENT"));
        assert!(!is_stable_code("ENT-WOOD"));
        assert!(!is_stable_code("ÉNT"));
        assert!(!is_stable_code(&format!("A{}", "B".repeat(64))));
    }

    #[test]
    fn malformed_reference_is_rejected() {
        assert!(split_reference("Fields.field_id").is_ok());
        assert!(split_reference("Fields").is_err());
        assert!(split_reference(".field_id").is_err());
        assert!(split_reference("Fields.").is_err());
        assert!(split_reference("Fields.a.b").is_err());
    }
}
