import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { publicFiles, renderSiteFile } from '../scripts/site-variants.mjs';
const root = new URL('../', import.meta.url);
test('actual ModPorts deployment contains only reviewed variant files', async () => {
  assert.deepEqual((await readdir(new URL('dist-modports/', root))).sort(), [...publicFiles].sort());
  for (const name of publicFiles) {
    const source = await readFile(new URL(name, root), 'utf8');
    const built = await readFile(new URL(`dist-modports/${name}`, root), 'utf8');
    assert.equal(built, renderSiteFile(name, source, 'modports'), name);
  }
});
test('actual ModPorts pages have resolvable local links and versioned assets', async () => {
  const pages = new Map();
  for (const name of publicFiles.filter(name => name.endsWith('.html'))) {
    const html = await readFile(new URL(`dist-modports/${name}`, root), 'utf8');
    pages.set(name, { html, ids: new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])) });
  }
  for (const [name, { html }] of pages) {
    assert.doesNotMatch(html, /RustPorts|RUSTPORTS|api\.rustports\.com|github\.com\/phoenixfire808\/rustports/);
    for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:)/.test(url)) continue;
      const [target, anchor] = url.split('#');
      const file = target ? target.replace(/^\//, '').split('?')[0] || 'index.html' : name;
      assert.ok(publicFiles.includes(file), `${name}: ${url}`);
      if (anchor) assert.ok(pages.get(file)?.ids.has(anchor), `${name}: ${url}`);
      if (/\.(?:css|js)/.test(file)) assert.ok(url.endsWith('?v=modports-v1'), `${name}: ${url}`);
    }
  }
});
