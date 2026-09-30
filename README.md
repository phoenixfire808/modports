# RustPorts

RustPorts is a community catalog concept for original Rust-inspired parody and survival-game projects. This folder contains a responsive, static frontend preview.

## Preview locally

Open `index.html` in a browser, or from this directory run:

```sh
npx wrangler pages dev .
```

The included project cards and activity rows are sample content. Search, status filters, sorting, picks, submission metadata, and optional cover images work in the preview and are saved in that browser's `localStorage` only.

## Important: not a live community service yet

This preview does **not** provide shared accounts, server-side uploads, moderation, global selection counts, or a shared database. A creator's local submission and a user's selection are visible only in that browser. Before inviting the public, add a backend and moderation workflow. A Cloudflare-based production setup could use Pages for this frontend, Workers for validated API routes, D1 for project/accounts/selection records, and R2 for reviewed images. Add authentication, rate limits, content reporting/takedown processes, server-side file validation, and a privacy/terms policy before accepting public uploads.

The browser demo accepts an optional image up to 2 MB, but that file is stored locally and is not uploaded anywhere. Do not collect real personal information in this preview.

## Cloudflare Pages deployment

No Cloudflare account was connected and nothing has been deployed. After setting up the production backend and choosing a Cloudflare Pages project, deploy the static files with Wrangler or connect this folder to Pages. Keep real secrets out of the repository. Verify domain ownership and DNS in the Cloudflare dashboard, then attach `rustports.com` to the Pages project. Do not expose a public submission form until the backend/moderation safeguards are ready.

## Asset and trademark policy

RustPorts is an independent fan catalog, not affiliated with Facepunch Studios or Rust. Submissions must use assets created by their contributors or assets they are licensed to use. Do not submit Rust's models, textures, audio, maps, code, branding, or other ripped game assets. Parody or inspiration does not grant rights to copy copyrighted assets. Submissions should not imply official endorsement. This is product policy copy, not legal advice.
