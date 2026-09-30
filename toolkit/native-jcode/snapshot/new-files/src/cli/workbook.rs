use anyhow::{Context, Result, anyhow, bail};
use serde::Serialize;
use std::path::{Path, PathBuf};

use super::args::WorkbookCommand;
use jcode_import_core::workbook::{
    WorkbookBuildReport, build_workbook_matrix, check_workbook_matrix, inspect_workbook,
};

const DEFAULT_CONFIG: &str = "jcode-workbook.toml";

#[derive(Serialize)]
struct CliBuildReport {
    config: String,
    workbook: String,
    output: String,
    source_sha256: String,
    rows: usize,
    tables: usize,
    current: bool,
}

pub(crate) fn run(command: WorkbookCommand) -> Result<()> {
    match command {
        WorkbookCommand::Inspect { input, json } => inspect(Path::new(&input), json),
        WorkbookCommand::Build { config, json } => {
            let config = resolve_config(config.as_deref())?;
            let report = build_workbook_matrix(&config)
                .map_err(|error| anyhow!(error.to_string()))
                .context("workbook build failed")?;
            print_build_report(&config, &report, json)?;
            Ok(())
        }
        WorkbookCommand::Check { config, json } => {
            let config = resolve_config(config.as_deref())?;
            let report = check_workbook_matrix(&config)
                .map_err(|error| anyhow!(error.to_string()))
                .context("workbook check failed")?;
            print_build_report(&config, &report, json)?;
            if !report.is_current {
                bail!(
                    "generated matrix is missing or stale; run `jcode workbook build --config {}`",
                    config.display()
                );
            }
            Ok(())
        }
    }
}

fn resolve_config(path: Option<&str>) -> Result<PathBuf> {
    if let Some(path) = path {
        return Ok(PathBuf::from(path));
    }
    let path = PathBuf::from(DEFAULT_CONFIG);
    if path.is_file() {
        Ok(path)
    } else {
        bail!(
            "no project mapping found at {}; create a mapping or pass `--config PATH`",
            path.display()
        )
    }
}

fn inspect(path: &Path, json: bool) -> Result<()> {
    let report = inspect_workbook(path, 3)
        .map_err(|error| anyhow!(error.to_string()))
        .with_context(|| format!("could not inspect workbook {}", path.display()))?;
    if json {
        println!("{}", serde_json::to_string_pretty(&report)?);
    } else {
        println!("Workbook: {}", report.file_name);
        for sheet in report.sheets {
            println!(
                "\n{} ({} rows x {} columns)",
                sheet.name, sheet.rows, sheet.columns
            );
            if !sheet.headers.is_empty() {
                println!("  headers: {}", display_row(&sheet.headers));
            }
            for row in sheet.preview {
                println!("  {}", display_row(&row));
            }
        }
    }
    Ok(())
}

fn display_row(values: &[serde_json::Value]) -> String {
    values
        .iter()
        .map(|value| match value {
            serde_json::Value::Null => String::new(),
            serde_json::Value::String(value) => value.clone(),
            other => other.to_string(),
        })
        .collect::<Vec<_>>()
        .join(" | ")
}

fn print_build_report(config: &Path, report: &WorkbookBuildReport, json: bool) -> Result<()> {
    if json {
        let payload = CliBuildReport {
            config: config.display().to_string(),
            workbook: report.workbook.display().to_string(),
            output: report.output.display().to_string(),
            source_sha256: report.source_sha256.clone(),
            rows: report.row_count,
            tables: report.table_count,
            current: report.is_current,
        };
        println!("{}", serde_json::to_string_pretty(&payload)?);
    } else {
        let status = if report.is_current {
            "current"
        } else {
            "STALE"
        };
        println!("Matrix {}: {}", status, report.output.display());
        println!(
            "{} rows across {} tables",
            report.row_count, report.table_count
        );
        println!("Workbook SHA-256: {}", report.source_sha256);
    }
    Ok(())
}
