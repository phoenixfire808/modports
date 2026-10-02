// Reuse the original public site without rewriting repository links, inboxes or consent IDs.
export const publicFiles = ['index.html', 'app.js', 'styles.css', 'terms.html', 'privacy.html', 'contact.html', 'hosting.html', 'resources.html', 'resources.js', '404.html', '_headers'];
const palette = {
  '#101116': '#0b1220', '#191b23': '#131e30', '#22252f': '#1d2b42',
  '#f4f3ef': '#f1f5fc', '#b0b4c2': '#b7c5da', '#383d4b': '#344762',
  '#ff996f': '#66e2cf', '#8fdde7': '#c0b4ff', '#ffb18f': '#94efdf',
  '#20202a': '#142035', '#1a1b23': '#131e30', '#15171e': '#101a2b',
  '#20202b': '#17263b', '#5a4a43': '#344762'
};
export function renderSiteFile(name, source, brand = 'rustports') {
  if (!['rustports', 'modports'].includes(brand)) throw new Error(`Unknown site: ${brand}`);
  if (brand === 'rustports') return source;
  if (name.endsWith('.html')) {
    return source.replaceAll('RustPorts', 'ModPorts').replaceAll('RUSTPORTS', 'MODPORTS')
      .replaceAll('https://github.com/phoenixfire808/rustports', 'https://github.com/phoenixfire808/modports')
      .replaceAll('cd rustports', 'cd modports').replaceAll('<code>rustports</code>', '<code>modports</code>')
      .replaceAll('at rustports.com', 'at modports.com').replaceAll('api.rustports.com', 'api.modports.com')
      .replace(/(<span class="brand-name">)rustports/g, '$1modports')
      .replace(/(<span class="brand-mark"[^>]*>)R/g, '$1M')
      .replace(/(<meta name="theme-color" content=")[^"]+/g, '$1#0b1220')
      .replace(/\?v=(?:lab-20260930|legal-20261002)/g, '?v=modports-v1');
  }
  if (name === 'styles.css') {
    return source.replaceAll('RustPorts', 'ModPorts').replace(/#[0-9a-f]{6}/gi, color => palette[color.toLowerCase()] || color);
  }
  if (name === 'app.js') return source.replaceAll('RustPorts', 'ModPorts').replaceAll('https://api.rustports.com', 'https://api.modports.com');
  if (name === '_headers') return source.replaceAll('api.rustports.com', 'api.modports.com').replaceAll('rustports.pages.dev', 'modports.pages.dev');
  return source;
}
