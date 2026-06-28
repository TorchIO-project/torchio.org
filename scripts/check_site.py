"""Static checks for the TorchIO landing page."""

from __future__ import annotations

import argparse
import html.parser
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML_FILES = "index.html", "404.html"
MAX_ASSET_BYTES = 250_000


class CheckFailure(RuntimeError):
    """Error raised when a static site check fails."""


class SiteParser(html.parser.HTMLParser):
    """Collect enough HTML structure for static site checks.

    Args:
        path: Path to the HTML file being parsed.
    """

    def __init__(self, path: pathlib.Path) -> None:
        super().__init__()
        self.path = path
        self.ids: set[str] = set()
        self.duplicate_ids: set[str] = set()
        self.local_refs: list[tuple[str, str, str]] = []
        self.external_urls: set[str] = set()
        self.image_attrs: list[dict[str, str]] = []
        self.svg_attrs: list[dict[str, str]] = []
        self.main_count = 0
        self.tab_role_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Collect attributes from each opening tag."""
        attr_map = {key: value or "" for key, value in attrs}

        if "id" in attr_map:
            element_id = attr_map["id"]
            if element_id in self.ids:
                self.duplicate_ids.add(element_id)
            self.ids.add(element_id)

        if tag == "main":
            self.main_count += 1
        if attr_map.get("role") == "tab":
            self.tab_role_count += 1
        if tag == "img":
            self.image_attrs.append(attr_map)
        if tag == "svg":
            self.svg_attrs.append(attr_map)

        rels = set(attr_map.get("rel", "").split())
        if tag == "link" and rels & {"preconnect", "dns-prefetch"}:
            return

        for attr_name in "href", "src":
            value = attr_map.get(attr_name)
            if value:
                self._record_reference(tag, attr_name, value)

    def _record_reference(self, tag: str, attr_name: str, value: str) -> None:
        """Record local and external references for later checks."""
        parsed = urllib.parse.urlparse(value)
        if parsed.scheme in {"http", "https"}:
            self.external_urls.add(value)
            return
        if parsed.scheme or value.startswith("//"):
            return
        self.local_refs.append((tag, attr_name, value))


def parse_html(path: pathlib.Path) -> SiteParser:
    """Parse an HTML file and return collected structure."""
    parser = SiteParser(path)
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def local_target_exists(value: str) -> bool:
    """Return whether a local link or asset target exists."""
    parsed = urllib.parse.urlparse(value)
    if not parsed.path:
        return True
    if parsed.path == "/":
        return (ROOT / "index.html").exists()
    target = ROOT / parsed.path.lstrip("/")
    return target.exists()


def check_html_structure(parsers: list[SiteParser]) -> list[str]:
    """Check local HTML semantics, references, and image metadata."""
    failures: list[str] = []
    known_ids = {parser.path.name: parser.ids for parser in parsers}

    for parser in parsers:
        if parser.duplicate_ids:
            failures.append(
                f"{parser.path.name}: duplicate ids: {sorted(parser.duplicate_ids)}"
            )

        if parser.path.name == "index.html" and parser.main_count != 1:
            failures.append("index.html: expected exactly one <main> element")

        if parser.tab_role_count:
            failures.append(
                f"{parser.path.name}: avoid incomplete tab semantics; use buttons or a complete tabs pattern"
            )

        for attrs in parser.image_attrs:
            missing = [
                name for name in ("width", "height", "decoding") if name not in attrs
            ]
            if missing:
                src = attrs.get("src", "<unknown>")
                failures.append(
                    f"{parser.path.name}: image {src} missing {', '.join(missing)}"
                )

        for attrs in parser.svg_attrs:
            if attrs.get("aria-hidden") != "true" or attrs.get("focusable") != "false":
                failures.append(
                    f'{parser.path.name}: decorative SVG missing aria-hidden="true" and focusable="false"'
                )

        for tag, attr_name, value in parser.local_refs:
            if value.startswith("#"):
                if value[1:] not in parser.ids:
                    failures.append(
                        f"{parser.path.name}: {tag} {attr_name} points to missing anchor {value}"
                    )
                continue

            if not local_target_exists(value):
                failures.append(
                    f"{parser.path.name}: {tag} {attr_name} points to missing local target {value}"
                )

            parsed = urllib.parse.urlparse(value)
            if parsed.fragment and pathlib.Path(parsed.path).name in known_ids:
                target_file = pathlib.Path(parsed.path).name
                if parsed.fragment not in known_ids[target_file]:
                    failures.append(
                        f"{parser.path.name}: {value} points to missing anchor in {target_file}"
                    )

    return failures


def check_css() -> list[str]:
    """Check CSS safeguards that keep content visible without JavaScript."""
    css = (ROOT / "assets/css/styles.css").read_text(encoding="utf-8")
    failures: list[str] = []
    if ".js .reveal" not in css:
        failures.append("styles.css: reveal animation must be gated by the .js class")
    if ".skip-link" not in css:
        failures.append("styles.css: skip-link styles are missing")
    if ".visually-hidden" not in css:
        failures.append("styles.css: visually-hidden utility is missing")
    return failures


def check_asset_budget() -> list[str]:
    """Check that public assets stay within a lightweight size budget."""
    failures: list[str] = []
    for path in (ROOT / "assets").rglob("*"):
        if path.is_file() and path.stat().st_size > MAX_ASSET_BYTES:
            failures.append(
                f"{path.relative_to(ROOT)}: {path.stat().st_size} bytes exceeds {MAX_ASSET_BYTES}"
            )
    return failures


def check_seo_files() -> list[str]:
    """Check crawl-discovery files for the canonical site URL."""
    failures: list[str] = []
    robots_path = ROOT / "robots.txt"
    sitemap_path = ROOT / "sitemap.xml"

    if not robots_path.exists():
        failures.append("robots.txt: file is missing")
    elif "Sitemap: https://torchio.org/sitemap.xml" not in robots_path.read_text(
        encoding="utf-8"
    ):
        failures.append("robots.txt: sitemap directive is missing or incorrect")

    if not sitemap_path.exists():
        failures.append("sitemap.xml: file is missing")
    elif "<loc>https://torchio.org/</loc>" not in sitemap_path.read_text(
        encoding="utf-8"
    ):
        failures.append("sitemap.xml: canonical homepage URL is missing")

    return failures


def check_external_links(urls: set[str]) -> list[str]:
    """Check external URLs collected from the HTML files.

    Args:
        urls: External URLs to check.
    """
    failures: list[str] = []
    opener = urllib.request.build_opener()
    for url in sorted(urls):
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "TorchIO site checker"},
            method="HEAD",
        )
        try:
            with opener.open(request, timeout=12) as response:
                status = response.status
        except urllib.error.HTTPError as error:
            if error.code in {403, 405}:
                try:
                    status = _check_external_link_with_get(opener, url)
                except urllib.error.URLError as retry_error:
                    failures.append(f"{url}: {retry_error.reason}")
                    continue
            else:
                failures.append(f"{url}: HTTP {error.code}")
                continue
        except urllib.error.URLError as error:
            failures.append(f"{url}: {error.reason}")
            continue

        if not 200 <= status < 400:
            failures.append(f"{url}: HTTP {status}")
    return failures


def _check_external_link_with_get(
    opener: urllib.request.OpenerDirector,
    url: str,
) -> int:
    """Retry a URL check with GET for servers that reject HEAD."""
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "TorchIO site checker"},
        method="GET",
    )
    try:
        with opener.open(request, timeout=12) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def run_checks(check_external: bool) -> None:
    """Run all static checks and raise if any fail.

    Args:
        check_external: Whether to check external HTTP links.
    """
    parsers = [parse_html(ROOT / html_file) for html_file in HTML_FILES]
    failures = []
    failures.extend(check_html_structure(parsers))
    failures.extend(check_css())
    failures.extend(check_asset_budget())
    failures.extend(check_seo_files())

    if check_external:
        urls = set().union(*(parser.external_urls for parser in parsers))
        failures.extend(check_external_links(urls))

    if failures:
        message = "\n".join(f" - {failure}" for failure in failures)
        raise CheckFailure(f"Site checks failed:\n{message}")


def main(argv: list[str] | None = None) -> int:
    """Run the command-line interface.

    Args:
        argv: Optional CLI arguments.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--external",
        action="store_true",
        help="check external HTTP links as well as local structure",
    )
    args = parser.parse_args(argv)

    try:
        run_checks(check_external=args.external)
    except CheckFailure as error:
        print(error, file=sys.stderr)
        return 1

    print("Site checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
