#!/usr/bin/env python3
"""
SEO for the whole site, from ONE place.

Edit the settings and the PAGES list below (titles, descriptions, keywords),
then run:

    python scripts/build_seo.py

It will:
  * write the SEO tags into the <head> of every page, between the markers
    <!-- seo:start --> and <!-- seo:end --> (title, description, keywords,
    canonical, robots, Open Graph / Twitter link previews, and the company
    details Google reads on the home page);
  * add Google Analytics and the Search Console verification tag if their IDs
    are filled in below;
  * rebuild sitemap.xml (every page, category, line and machine) and robots.txt
    from data/catalog.json.

Line and machine pages (line.html?id=..., product.html?id=...) also set their
own title, description and structured data in the browser from the catalog,
so a new machine in the catalog is covered automatically.

Do not edit the tags between the markers by hand: the next run overwrites them.
"""

import json
import re
from datetime import date
from html import escape
from pathlib import Path

# ── Settings ──────────────────────────────────────────────────────────────────
SITE = "https://www.starmerglobal.com"
BRAND = "Starmer Global"
DEFAULT_IMAGE = "/assets/images/og-image.jpg"        # 1200x630 link-preview image
GA4_ID = ""            # Google Analytics 4 measurement ID, e.g. "G-ABC123XYZ"
GSC_VERIFY = ""        # Google Search Console "HTML tag" content value
ORG = {
    "email": "info@starmerglobal.com",
    "phones": ["+92 322 6666899", "+92 309 8829999", "+92 306 8996666"],
    "city": "Lahore", "region": "Punjab", "country": "PK",
    "founded": "1966",
}

# ── Pages ─────────────────────────────────────────────────────────────────────
# title: 50-60 characters is ideal.  description: 140-160 characters.
# index: False keeps the page out of Google (and out of the sitemap).
PAGES = {
    "index.html": {
        "path": "/",
        "title": "Candy & Confectionery Machinery Manufacturer | Starmer Global",
        "description": "Starmer Global, Lahore, builds complete hard candy, lollipop, toffee, "
                       "bubble gum and pharma lozenge production lines, machines, dies and "
                       "spare parts since 1966.",
        "keywords": "confectionery machinery manufacturer, candy making machine, hard candy "
                    "production line, lollipop making machine, toffee production line, bubble "
                    "gum production line, lozenge production line, candy machine Pakistan, "
                    "confectionery equipment Lahore",
        "priority": "1.0", "changefreq": "weekly",
    },
    "catalog.html": {
        "path": "/catalog.html",
        "title": "Confectionery Production Lines & Machines | Starmer Global",
        "description": "Browse complete production lines and individual machines for hard "
                       "candy, lollipop, chew & toffee, bubble gum and pharma lozenges, from "
                       "200 to 1000 kg/hr.",
        "keywords": "confectionery production lines, candy production line, lollipop "
                    "production line, toffee machine, bubble gum machine, candy machinery "
                    "catalog",
        "priority": "0.9", "changefreq": "weekly",
    },
    "dies.html": {
        "path": "/dies.html",
        "title": "Candy Forming Dies & Spare Parts | Starmer Global",
        "description": "Rotary dies, chain dies, lollipop dies and spare parts for "
                       "confectionery machines, precision made and matched to your "
                       "production line.",
        "keywords": "candy forming die, rotary die, chain die, lollipop die, confectionery "
                    "machine spare parts, Uniplast die",
        "priority": "0.8", "changefreq": "monthly",
    },
    "quote.html": {
        "path": "/quote.html",
        "title": "Request a Quote for Confectionery Machinery | Starmer Global",
        "description": "Request a quote for a complete candy production line, individual "
                       "machines, dies or spare parts. Our engineers reply within 24 hours.",
        "keywords": "confectionery machinery quote, candy production line price, candy "
                    "machine quotation",
        "priority": "0.6", "changefreq": "yearly",
    },
    "custom-quote.html": {
        "path": "/custom-quote.html",
        "title": "Custom Machine Parts Manufacturing | Starmer Global",
        "description": "Send your drawing or requirements and our engineers design and "
                       "manufacture the part: precision machining, full technical support and "
                       "worldwide delivery.",
        "keywords": "custom machine parts, custom confectionery parts, precision machining, "
                    "custom die manufacturing",
        "priority": "0.7", "changefreq": "yearly",
    },
    # line.html / product.html: the browser replaces these with the line's or
    # machine's own title and description; these are the fallbacks.
    "line.html": {
        "path": "/line.html",
        "title": "Complete Confectionery Production Line | Starmer Global",
        "description": "A complete confectionery production line by Starmer Global: every "
                       "machine in order with full technical specifications.",
        "keywords": "", "sitemap": False,
    },
    "product.html": {
        "path": "/product.html",
        "title": "Confectionery Machine Specifications | Starmer Global",
        "description": "Confectionery machine by Starmer Global with full technical "
                       "specifications, dies and spare parts.",
        "keywords": "", "sitemap": False,
    },
    "search.html": {
        "path": "/search.html",
        "title": "Search Equipment | Starmer Global",
        "description": "Search Starmer Global production lines, machines, dies and spare parts.",
        "keywords": "", "index": False,
    },
    "404.html": {
        "path": "/404.html",
        "title": "Page Not Found | Starmer Global",
        "description": "The page you were looking for could not be found.",
        "keywords": "", "index": False,
    },
}

CATEGORY_PRIORITY = "0.8"
LINE_PRIORITY = "0.8"
MACHINE_PRIORITY = "0.6"


def abs_url(p: str) -> str:
    return p if p.startswith("http") else SITE + p


def head_block(name: str, cfg: dict) -> str:
    index = cfg.get("index", True)
    robots = "index, follow, max-image-preview:large" if index else "noindex, follow"
    lines = ["<!-- seo:start (generated by scripts/build_seo.py; edit there, not here) -->"]
    if not cfg.get("keep_title"):
        t, d = escape(cfg["title"]), escape(cfg["description"])
        url, img = abs_url(cfg["path"]), abs_url(DEFAULT_IMAGE)
        lines += [
            f'<meta name="description" content="{d}"/>',
        ]
        if cfg.get("keywords"):
            lines.append(f'<meta name="keywords" content="{escape(cfg["keywords"])}"/>')
        lines += [
            f'<meta name="robots" content="{robots}"/>',
            f'<link rel="canonical" href="{url}"/>',
            '<meta name="theme-color" content="#1A3A5C"/>',
            '<meta property="og:type" content="website"/>',
            f'<meta property="og:site_name" content="{BRAND}"/>',
            f'<meta property="og:title" content="{t}"/>',
            f'<meta property="og:description" content="{d}"/>',
            f'<meta property="og:url" content="{url}"/>',
            f'<meta property="og:image" content="{img}"/>',
            '<meta property="og:image:width" content="1200"/>',
            '<meta property="og:image:height" content="630"/>',
            '<meta name="twitter:card" content="summary_large_image"/>',
            f'<meta name="twitter:title" content="{t}"/>',
            f'<meta name="twitter:description" content="{d}"/>',
            f'<meta name="twitter:image" content="{img}"/>',
        ]
    else:
        lines.append(f'<meta name="robots" content="{robots}"/>')
    if GSC_VERIFY and name == "index.html":
        lines.append(f'<meta name="google-site-verification" content="{escape(GSC_VERIFY)}"/>')
    if name == "index.html":
        org = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": BRAND,
            "url": SITE + "/",
            "logo": SITE + "/LOGO.jpeg",
            "email": ORG["email"],
            "telephone": ORG["phones"][0],
            "foundingDate": ORG["founded"],
            "address": {"@type": "PostalAddress", "addressLocality": ORG["city"],
                        "addressRegion": ORG["region"], "addressCountry": ORG["country"]},
            "contactPoint": [{"@type": "ContactPoint", "telephone": p,
                              "contactType": "sales", "email": ORG["email"]}
                             for p in ORG["phones"]],
        }
        lines.append('<script type="application/ld+json">' + json.dumps(org, ensure_ascii=False) + "</script>")
    if GA4_ID and cfg.get("index", True) and not cfg.get("keep_title"):
        lines += [
            f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA4_ID}"></script>',
            "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
            f"gtag('js',new Date());gtag('config','{GA4_ID}');</script>",
        ]
    lines.append("<!-- seo:end -->")
    return "\n  ".join(lines)


def apply_head(path: Path, name: str, cfg: dict) -> None:
    html = path.read_text(encoding="utf-8")
    if not cfg.get("keep_title"):
        html = re.sub(r"<title>.*?</title>", f"<title>{escape(cfg['title'])}</title>", html, count=1, flags=re.S)
    block = head_block(name, cfg)
    if "<!-- seo:start" in html:
        html = re.sub(r"<!-- seo:start.*?<!-- seo:end -->", lambda _: block, html, count=1, flags=re.S)
    else:
        # drop a hand-written description; the block carries its own
        html = re.sub(r'\s*<meta name="description"[^>]*>', "", html, count=1)
        html = re.sub(r"(</title>)", lambda m: m.group(1) + "\n  " + block, html, count=1)
    path.write_text(html, encoding="utf-8")


def build_sitemap(catalog: dict) -> str:
    today = date.today().isoformat()
    urls = []

    def add(loc, prio, freq="monthly"):
        urls.append(f"  <url><loc>{escape(abs_url(loc))}</loc><lastmod>{today}</lastmod>"
                    f"<changefreq>{freq}</changefreq><priority>{prio}</priority></url>")

    for cfg in PAGES.values():
        if cfg.get("index", True) and cfg.get("sitemap", True) and not cfg.get("keep_title"):
            add(cfg["path"], cfg.get("priority", "0.5"), cfg.get("changefreq", "monthly"))
    for cat in catalog["categories"]:
        add(f"/catalog.html?category={cat['id']}", CATEGORY_PRIORITY)
        for line in cat["lines"]:
            add(f"/line.html?id={line['id']}", LINE_PRIORITY)
            for m in line["machines"]:
                add(f"/product.html?id={m['id']}", MACHINE_PRIORITY)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(urls) + "\n</urlset>\n")


def main() -> int:
    root = Path(".")
    for name, cfg in PAGES.items():
        p = root / name
        if not p.exists():
            print(f"  ! {name} not found, skipped")
            continue
        apply_head(p, name, cfg)
        print(f"  head  {name}")
    catalog = json.loads((root / "data/catalog.json").read_text(encoding="utf-8-sig"))
    sm = build_sitemap(catalog)
    (root / "sitemap.xml").write_text(sm, encoding="utf-8")
    print(f"  sitemap.xml  {sm.count('<url>')} URLs")
    # noindex pages are NOT blocked here: Google must be able to read their
    # noindex tag. Only internal folders are kept out.
    robots = ("User-agent: *\nAllow: /\n"
              "Disallow: /admin/\nDisallow: /admin-local/\nDisallow: /mockups/\n"
              f"\nSitemap: {SITE}/sitemap.xml\n")
    (root / "robots.txt").write_text(robots, encoding="utf-8")
    print("  robots.txt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
