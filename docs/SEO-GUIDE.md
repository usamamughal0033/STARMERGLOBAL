# SEO notes - starmerglobal.com

Notes for whoever does the SEO and marketing work on the site: what is already done,
where to change things and how to send changes back.

## 1. How the site works

- Plain HTML/CSS/JS hosted on GitHub Pages. The `main` branch is the live site, so please
  don't push to it. Send changes to me and I will publish them (see section 6).
- Line and machine pages are one template each, filled from the catalog data
  (`line.html?id=CT-L-005`, `product.html?id=HC-L002-M16`). Google runs the JavaScript,
  so it sees the final title, description and structured data for each line/machine.

## 2. What is already done

| Item | Where |
|---|---|
| Own title and meta description on every page | `scripts/build_seo.py` (normal pages), catalog data (line/machine pages) |
| Meta keywords | `scripts/build_seo.py` |
| Canonical URL on every page | made by the script |
| Open Graph / Twitter tags (WhatsApp, LinkedIn, Facebook previews) | made by the script, image is `assets/images/og-image.jpg` (1200x630) |
| `noindex` on search and 404 pages | made by the script |
| `sitemap.xml` (main pages, categories, lines and all machines) | made from the catalog |
| `robots.txt` with the sitemap link | made by the script |
| Organization structured data (name, logo, phones, email, address) | home page |
| Product + breadcrumb structured data | every line and machine page |
| One `<h1>` per page, alt text on images | done |
| Custom 404 page | `404.html` |

## 3. Titles, descriptions and keywords

The normal pages are all in one list at the top of `scripts/build_seo.py` (`PAGES`).
For each page:

- `title`: about 50-60 characters, main keyword near the start
- `description`: about 140-160 characters, this is the text Google shows under the link
- `keywords`: comma separated (Google ignores this one, some other search engines use it)

Then run:

```bash
python scripts/build_seo.py
```

The script rewrites the part between `<!-- seo:start -->` and `<!-- seo:end -->` in the
`<head>` of each page, and also `sitemap.xml` and `robots.txt`. Don't edit inside that
part by hand, it gets overwritten next time the script runs.

### Line and machine pages

These use the catalog data:

- Line page title: `<line name> (<rate>) | <category> | Starmer Global`.
  Description is the line's `description` in `booklet-data/<category>/<line>.yaml`.
- Machine page title: `<machine name> <model> | <line name> | Starmer Global`.
  Description is the machine's `description` (or `function`) in the same YAML file.

To improve them, edit those texts in the YAML file and rebuild (see README, "Catalog
data"). The code for this is `setPageSEO()` in `js/bundle.js`.

## 4. Google setup

1. Google Search Console: add `https://www.starmerglobal.com`, pick "HTML tag", copy just
   the `content="..."` value into `GSC_VERIFY` in `scripts/build_seo.py`, run the script
   and send me the change. (Verifying through DNS also works and needs no code change.)
2. In Search Console, submit the sitemap: `https://www.starmerglobal.com/sitemap.xml`
3. Google Analytics 4: create a property, put the measurement ID (`G-...`) in `GA4_ID`
   in `scripts/build_seo.py` and run the script. The tag then goes on every public page.
4. Google Business Profile for the Lahore factory (no website change needed).

## 5. Ideas for next steps

- Keyword research per product line (hard candy production line, lollipop making
  machine, toffee production line, bubble gum making machine, Uniplast forming machine,
  confectionery machinery Pakistan, etc.) and then improve titles and descriptions.
- Longer descriptions for each line in the YAML files (most are 1-3 sentences now).
- New pages (about us, factory, case studies, FAQ, blog). Add every new page to `PAGES`
  in `scripts/build_seo.py` so it gets its tags and a sitemap entry.
- Cleaner links for lines/machines (like `/lines/toffee-400-kg-hr/` instead of
  `line.html?id=...`). This needs ready-made pages, talk to me first.

## 6. Sending changes

1. Make a branch, for example `seo/home-page-keywords`
2. Make the change, run `python scripts/build_seo.py`, check it locally
   (`python -m http.server 8099`)
3. Push the branch and open a pull request, or send me the changed files
4. I check it and publish, it is live 1-2 minutes after that

Please check with me before changing `js/bundle.js` or `css/style.css`. Don't edit
`data/catalog.json` or `js/catalog-data.js` by hand, they are generated.
