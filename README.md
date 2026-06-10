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
├── assets/
│   ├── css/styles.css       # styles + light/dark theme
│   ├── js/main.js           # copy button, scroll reveal, footer year
│   └── img/                 # logo + favicon
└── .github/workflows/deploy.yml
```

## Brand

The palette is derived from the TorchIO logo:

| Token   | Value     |
| ------- | --------- |
| Purple  | `#812CE5` |
| Ink     | `#262626` |
| Gray    | `#BBBBBB` |

## Local preview

No build step is required. Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which publishes
the site to GitHub Pages.

One-time setup on GitHub:

1. **Settings → Pages → Source** = _GitHub Actions_.
2. **Settings → Pages → Custom domain** = `torchio.org`.
3. Point the apex DNS at GitHub Pages (A/AAAA records, or a CNAME-flattened
   record to `torchio-project.github.io`).
4. Enable **Enforce HTTPS** once the certificate is issued.

The `docs.torchio.org` subdomain is unaffected; it continues to be served from
the `gh-pages` branch of the main `torchio` repository.

## License

Apache-2.0, matching the TorchIO library.
