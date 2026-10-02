import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { publicFiles, renderSiteFile } from './site-variants.mjs';
export { publicFiles };

// Importing the allowlist from tests or preview must not trigger another build.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const brand = process.argv.includes('--modports') ? 'modports' : 'rustports';
  const root = fileURLToPath(new URL('../', import.meta.url));
  const output = path.join(root, brand === 'modports' ? 'dist-modports' : 'dist');
  await mkdir(output, { recursive: true });
  // Refuse unexpected files instead of uploading private source or deleting unknown work.
  for (const name of await readdir(output)) {
    if (!publicFiles.includes(name)) throw new Error(`Unexpected dist entry: ${name}. Review it before building.`);
  }
  for (const name of publicFiles) {
    const source = await readFile(path.join(root, name), 'utf8');
    await writeFile(path.join(output, name), renderSiteFile(name, source, brand));
  }
  console.log(`Built ${publicFiles.length} allowlisted ${brand} files in ${output}`);
}
