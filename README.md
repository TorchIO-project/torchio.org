# torchio.org

Source for the TorchIO landing page at **<https://torchio.org>**.

It is a static, dependency-free site (HTML + CSS + a little vanilla JS) that
introduces the project and links out to the documentation at
**<https://docs.torchio.org>**.

> Documentation lives in the main
> [`TorchIO-project/torchio`](https://github.com/TorchIO-project/torchio)
> repository and is deployed separately. This repo is **only** the marketing
> landing page.

## Structure

```text
.
├── index.html              # the landing page
├── 404.html                # custom not-found page
├── CNAME                    # custom domain (torchio.org)
├── robots.txt               # crawler policy and sitemap pointer
├── sitemap.xml              # canonical URLs for search engines
├── assets/
│   ├── css/styles.css       # styles + light/dark theme
│   ├── js/main.js           # copy button, scroll reveal, footer year
│   ├── fonts/               # self-hosted variable fonts (woff2) + OFL licenses
│   └── img/                 # logo + favicon
├── scripts/check_site.py     # local structure, asset, and link checks
└── .github/workflows/        # checks and deployment
```

## Brand

The palette is derived from the TorchIO logo. The purple is the exact logo
color (sampled from `assets/img/torchio-logo.png`); every other purple in the
stylesheet is derived from it with `color-mix`.

| Token  | Value     |
| ------ | --------- |
| Purple | `#812CE5` |
| Ink    | `#262626` |
| Gray   | `#BBBBBB` |

Typography pairs a distinctive display face with a readable body face, both
self-hosted from `assets/fonts/` as variable `woff2` (no third-party request):

| Role    | Face                 | License |
| ------- | -------------------- | ------- |
| Display | Bricolage Grotesque  | SIL OFL |
| Body    | Hanken Grotesk       | SIL OFL |
| Code    | JetBrains Mono       | SIL OFL |

## Local preview and checks

No build step is required. Open `index.html` directly, or serve the folder:

```bash
mise run serve
# then visit http://localhost:8000
```

You can still use any static file server, for example
`uv run python -m http.server`.

Run local checks before opening a pull request:

```bash
mise run check
mise run check:links
```

Stage the public site artifact locally:

```bash
mise run build
```

## License

Apache-2.0, matching the TorchIO library.
