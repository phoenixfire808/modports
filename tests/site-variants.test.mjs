import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicFiles, renderSiteFile } from '../scripts/site-variants.mjs';
const root = new URL('../', import.meta.url);
test('RustPorts source is preserved byte-for-byte by its renderer', async () => {
  for (const name of publicFiles) {
    const source = await readFile(new URL(name, root), 'utf8');
    assert.equal(renderSiteFile(name, source), source);
  }
});
test('ModPorts branding covers every page without changing URLs or consent', async () => {
  for (const name of publicFiles.filter(name => name.endsWith('.html'))) {
    const source = await readFile(new URL(name, root), 'utf8');
    const result = renderSiteFile(name, source, 'modports');
    assert.doesNotMatch(result, /RustPorts|RUSTPORTS/);
    assert.match(result, /<title>[^<]*ModPorts/);
    for (const [, url] of source.matchAll(/(?:href|src)="((?:https:|mailto:)[^"]+)"/g)) assert.ok(result.includes(url.replaceAll('RustPorts', 'ModPorts').replaceAll('https://github.com/phoenixfire808/rustports', 'https://github.com/phoenixfire808/modports')), `${name}: ${url}`);
    assert.doesNotMatch(result, /class="brand-mark"[^>]*>R/);
  }
  const index = renderSiteFile('index.html', await readFile(new URL('index.html', root), 'utf8'), 'modports');
  assert.match(index, /value="rustports-2026-10-02-v4"/);
  const resources = renderSiteFile('resources.html', await readFile(new URL('resources.html', root), 'utf8'), 'modports');
  assert.match(resources, /cd modports\\toolkit\\spreadsheet/);
});
test('ModPorts API and CSP target its same-site API, not the RustPorts API', async () => {
  for (const name of ['app.js', '_headers']) {
    const result = renderSiteFile(name, await readFile(new URL(name, root), 'utf8'), 'modports');
    assert.match(result, /api\.modports\.com/);
    assert.doesNotMatch(result, /api\.rustports\.com/);
  }
});
test('ModPorts primary text and buttons meet AA contrast', async () => {
  const css = renderSiteFile('styles.css', await readFile(new URL('styles.css', root), 'utf8'), 'modports');
  const tokens = Object.fromEntries([...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6});/g)].map(m => [m[1], m[2]]));
  const lum = hex => hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
  const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  for (const ink of ['ink','muted','accent','cool','error']) for (const bg of ['bg','surface','raised']) assert.ok(contrast(tokens[ink],tokens[bg]) >= 4.5, `${ink} on ${bg}`);
  assert.ok(contrast('#151116',tokens.accent) >= 4.5);
  assert.doesNotMatch(css, /#ff996f|#8fdde7/i);
});
