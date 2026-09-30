# Contributing to RustPorts

RustPorts is in early development. Start with the [prioritized roadmap](IMPROVEMENTS.md) and [toolkit status](toolkit/STATUS.md). Small, reviewable improvements help more than broad rewrites.

## Useful first contributions

- Try the [spreadsheet starter](toolkit/spreadsheet/README.md) in a fresh folder and report the first confusing instruction, including OS and Python version.
- Reproduce a bug with the included original synthetic workbook. Add a regression test showing the intended failure.
- Improve keyboard navigation, narrow-screen layout, labels or recovery messages. Include before/after observations.
- Correct an official resource link or add a focused explanation with a maintained primary source.

Discuss new dependencies, schema changes, native integration work or product behavior in an issue before investing in a large patch. Native Jcode is an unfinished snapshot, not a tested release.

## Website development

Requires Node.js 22, npm and Git. Work in your own clone/fork. No production credentials are needed.

```text
npm --prefix api ci
npm test
npm run build
npm run preview:test
```

Open `http://127.0.0.1:8787/`. The preview uses the actual Worker with an isolated ephemeral D1 database. For the synthetic creator visit `/__test/login?user=1`, or `user=2` for the synthetic moderator. Only `https://github.com/maker/game` passes the preview's mocked GitHub repository lookup. These test routes are never deployed. Stop the preview with Ctrl+C.

Check: empty/error states, sign-in dialog without submitting consent, local creator submission, moderation, published catalogue, picks, search, editing back into review, desktop and 320/390px widths. Do not create test projects on the production site. Production OAuth and email acceptance need separate owner-authorized tests.

## Workbook development

Follow [the starter instructions](toolkit/spreadsheet/README.md). Keep authored data in sheets, preserve the example, and do not hand-edit generated JSON. Python and native Jcode schemas are not interchangeable.

```text
python -m unittest discover -s toolkit/spreadsheet/tests -v
python scripts/check_publication.py
```

The publication scan is a heuristic, not a guarantee that a change is safe. Inspect every staged file manually, including workbook contents and licenses.

## Before a pull request

1. Keep the change focused. Explain the user problem and observable acceptance check.
2. Run relevant tests and state exact results and anything you could not test.
3. For asset changes, update the release query in all HTML, static tests and the live-check script. The CDN may cache old JS/CSS despite revalidation headers.
4. For new public files, update the explicit build allowlist and live smoke checks. Never deploy the repository root.
5. Keep examples original/synthetic and retain upstream notices. The toolkit has its own MIT notices. Do not assume those notices license every file in the repository or third-party game material.
6. Never commit credentials, sessions, private captures, proprietary binaries/assets or personal data. Do not attach them to public issues either.

## Reports and conduct

Be specific, patient and respectful. Distinguish observations from hypotheses. Include minimal steps, expected/actual behavior and environment, not just screenshots of an error.

For rights concerns or sensitive account/security information, use the private contact instructions at [rustports.com/contact](https://rustports.com/contact). Do not publish exploit details or secrets in an issue. There is no promised response SLA yet.

## Boundaries

RustPorts stores metadata and public links, not user game files. It does not probe, secure, proxy or relay creator servers. Do not introduce game uploads, external tracking, broad OAuth permissions or production deployment automation in an unrelated PR. Architecture does not provide legal clearance. Use only material you are authorized to analyze and share.
