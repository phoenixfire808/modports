"""Export an allowlisted, read-only snapshot of the native Jcode workbook draft.
Usage: python scripts/export_workbook_draft.py PATH_TO_JCODE NEW_OUTPUT_DIRECTORY [BASE_COMMIT]
Never modifies the source checkout, index, branch, or installed Jcode.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

TRACKED = [
    "Cargo.toml", "Cargo.lock", "crates/jcode-import-core/Cargo.toml",
    "crates/jcode-import-core/src/lib.rs", "src/cli/args.rs", "src/cli/args/tests.rs",
    "src/cli/dispatch.rs", "src/cli/mod.rs", "src/cli/proctitle.rs", "src/cli/startup.rs",
]
NEW = [
    "crates/jcode-import-core/src/workbook.rs", "src/cli/workbook.rs",
    "crates/jcode-import-core/tests/workbook.rs",
    "crates/jcode-import-core/tests/create_xlsx_fixtures.py", "docs/workbook-workflow.md",
] + [f"crates/jcode-import-core/tests/fixtures/{name}.xlsx" for name in
     ["model", "broken-reference", "formula", "wrong-type"]]

def main():
    source, output = map(Path, sys.argv[1:3])
    def git(*args):
        return subprocess.check_output(["git", "-C", str(source), *args])
    source_head = git("rev-parse", "HEAD").decode().strip()
    base = git("rev-parse", sys.argv[3] if len(sys.argv) > 3 else "HEAD").decode().strip()
    patch = git("diff", "--no-ext-diff", "--binary", base, "--", *TRACKED)
    files = {name: (source / name).read_bytes() for name in NEW}
    if not patch:
        raise SystemExit("No tracked draft changes to export")
    if git("rev-parse", "HEAD").decode().strip() != source_head or patch != git("diff", "--no-ext-diff", "--binary", base, "--", *TRACKED):
        raise SystemExit("Source changed during export. Retry after review.")
    if any((source / name).read_bytes() != content for name, content in files.items()):
        raise SystemExit("Source changed during export. Retry after review.")
    output.mkdir(parents=True, exist_ok=False)
    (output / "tracked-changes.patch").write_bytes(patch)
    for name, content in files.items():
        target = output / "new-files" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    artifacts = {"tracked-changes.patch": patch, **{f"new-files/{n}": b for n, b in files.items()}}
    manifest = {
        "status": "experimental-unreleased-source-snapshot",
        "upstream": "https://github.com/1jehuang/jcode",
        "base_commit": base,
        "sha256": {name: hashlib.sha256(data).hexdigest() for name, data in artifacts.items()},
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(artifacts)} reviewed artifacts at base {base}")

if __name__ == "__main__":
    main()
