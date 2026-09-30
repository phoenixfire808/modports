import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const release = 'https://github.com/phoenixfire808/jcode-dev/releases/tag/jcodess-0.89.2-obsidian-preview';

test('JcodeSS resource links to a labeled preview and detailed flowchart', async () => {
  const html = await readFile(new URL('../resources.html', import.meta.url), 'utf8');
  const guide = await readFile(new URL('../toolkit/JCODE-DBVIEWER-OBSIDIAN.md', import.meta.url), 'utf8');
  assert.ok(html.includes(release));
  assert.match(html, /Unoptimized preview, not a stable release/);
  assert.match(html, /JCODE-DBVIEWER-OBSIDIAN\.md/);
  assert.ok(guide.includes(release));
  assert.match(guide, /```mermaid\s+flowchart TD/);
  assert.match(guide, /### What happens at each stage/);
  assert.match(guide, /not while Jcode is closed/);
  assert.match(guide, /Full interactive model conversations.*remain unverified/);
  assert.match(guide, /1e2feedd776524b9419e404b69ebe107843d234fabdeb4a38206a01967c4237e/);
});
