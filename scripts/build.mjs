import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const publicFiles = ['index.html', 'app.js', 'styles.css', 'terms.html', 'privacy.html', 'contact.html', 'hosting.html', '404.html', '_headers'];
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
// Refuse unexpected files rather than uploading private source or deleting unknown work.
for (const name of await readdir(output)) {
  if (!publicFiles.includes(name)) throw new Error(`Unexpected dist entry: ${name}. Review it before building.`);
}
for (const name of publicFiles) await copyFile(path.join(root, name), path.join(output, name));
console.log(`Built ${publicFiles.length} explicitly allowlisted public files in ${output}`);
