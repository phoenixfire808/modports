"""Local pre-publication checks. Heuristics supplement, not replace, human review."""
import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = [
    rb"gh[pousr]_[A-Za-z0-9]{30,}", rb"github_pat_[A-Za-z0-9_]{30,}",
    rb"AKIA[0-9A-Z]{16}", rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    rb"sk-(?:proj-)?[A-Za-z0-9_-]{35,}",
    rb"(?i)(?:client_secret|api_key|access_token|password)\s*[:=]\s*[\"'][A-Za-z0-9_/+=-]{24,}[\"']",
]

def git(*args, **kwargs):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], **kwargs)

def scan(label, data):
    for pattern in PATTERNS:
        if re.search(pattern, data):
            raise SystemExit(f'REVIEW REQUIRED: possible secret in {label} (value withheld)')
    if data.startswith(b'PK\x03\x04'):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for member in archive.infolist():
                if member.file_size > 10_000_000:
                    raise SystemExit(f'Unexpected large archive member: {label}')
                if 'vbaProject' in member.filename or 'externalLinks/' in member.filename:
                    raise SystemExit(f'Unexpected active/external workbook content: {label}')
                for pattern in PATTERNS:
                    if re.search(pattern, archive.read(member)):
                        raise SystemExit(f'REVIEW REQUIRED: possible archive secret in {label} (value withheld)')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--jcode-source', type=Path)
    args = parser.parse_args()
    files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').decode().split('\0')
    count = 0
    for name in filter(None, files):
        path = ROOT / name
        if not path.is_file():
            continue
        if any(part in {'.env', '.dev.vars', '.wrangler', 'node_modules', '.venv', '__pycache__'} for part in path.relative_to(ROOT).parts):
            raise SystemExit(f'Private path would be published: {name}')
        if path.suffix.lower() in {'.exe', '.dll', '.sqlite', '.db', '.pem', '.key'}:
            raise SystemExit(f'Unexpected executable/data/credential file: {name}')
        scan(name, path.read_bytes())
        count += 1
    print(f'PASS heuristic secret/path scan: {count} publication files')
    objects = git('rev-list', '--objects', '--all').decode().splitlines()
    types = git('cat-file', '--batch-check', input=('\n'.join(line.split(' ', 1)[0] for line in objects)+'\n').encode()).decode().splitlines()
    blobs = 0
    for entry, kind in zip(objects, types):
        if kind.split()[1] == 'blob':
            oid, _, name = entry.partition(' ')
            scan(f'history:{name}:{oid[:8]}', git('cat-file', 'blob', oid))
            blobs += 1
    print(f'PASS heuristic secret scan: {blobs} reachable historical blobs')
    snapshot = ROOT / 'toolkit/native-jcode/snapshot'
    manifest = json.loads((snapshot / 'manifest.json').read_text())
    for name, digest in manifest['sha256'].items():
        assert hashlib.sha256((snapshot / name).read_bytes()).hexdigest() == digest, name
    print('PASS native draft artifact checksums')
    docs = [ROOT/'README.md', *(ROOT/'toolkit').rglob('*.md')]
    for doc in docs:
        for target in re.findall(r'\]\(([^)]+)\)', doc.read_text(encoding='utf-8')):
            if re.match(r'\w+://|mailto:|#', target):
                continue
            assert (doc.parent / target.split('#')[0]).exists(), f'Broken local link in {doc.relative_to(ROOT)}: {target}'
    print('PASS toolkit documentation links')
    if args.jcode_source:
        with tempfile.TemporaryDirectory() as temporary:
            env = {**os.environ, 'GIT_INDEX_FILE': str(Path(temporary)/'index')}
            prefix = ['git', '-C', str(args.jcode_source)]
            subprocess.run([*prefix, 'read-tree', manifest['base_commit']], env=env, check=True)
            subprocess.run([*prefix, 'apply', '--cached', '--check', str(snapshot/'tracked-changes.patch')], env=env, check=True)
        print('PASS native patch applies to the public baseline using a private index; no source checkout modified')
    print('Publication checks passed. Native compilation, legal clearance and secret absence are not guaranteed by this script.')

if __name__ == '__main__':
    main()
