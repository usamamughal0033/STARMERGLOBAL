# Starmer Global website

Website for Starmer Global (Lahore, Pakistan). It shows our complete production lines,
machines, dies and spare parts for hard candy, lollipop, chew & toffee, bubble gum and
pharma lozenges.

Live site: https://www.starmerglobal.com

## Hosting

The site is plain HTML, CSS and JavaScript. There is no build step for the pages.
It is hosted on GitHub Pages:

- whatever is on the `main` branch is the live site
- after a push to `main` the site updates in 1-2 minutes
- `CNAME` sets the domain, `.nojekyll` makes GitHub serve the files as they are

So please don't push to `main` directly. Send your changes to me and I will check and
publish them (see "Making changes" below).

## Files

| File / folder | What it is |
|---|---|
| `index.html` | Home page |
| `catalog.html` | Browse: category, then line, then machines |
| `line.html?id=...` | One production line (filled from the catalog data) |
| `product.html?id=...` | One machine, die or spare part (filled from the catalog data) |
| `dies.html` | Dies & spare parts |
| `quote.html` | Quote list / request a quote |
| `custom-quote.html` | Custom machine quote form |
| `enquiry.html` | "Talk to an Expert" form (general enquiry, no quote list needed) |
| `search.html` | Search page |
| `404.html` | Page not found |
| `css/style.css` | Our own styles (Tailwind comes from its CDN) |
| `js/bundle.js` | All the site JavaScript |
| `js/catalog-data.js` | Catalog data used by the pages (generated, don't edit) |
| `data/catalog.json` | Same catalog as JSON (generated, don't edit) |
| `assets/images/` | Category, gallery, line and page images |
| `assets/STARMER/_plated/` | Machine photos |
| `assets/videos/` | Home page videos |
| `booklet-data/` | Machine data, one YAML file per production line |
| `admin-local/`, `server.js` | Small admin panel that runs on your own computer |
| `scripts/` | Python scripts (catalog, SEO tags, line header images) |
| `sitemap.xml`, `robots.txt` | For Google (made by `scripts/build_seo.py`) |
| `docs/SEO-GUIDE.md` | Notes for SEO / marketing work |

## Run it locally

Any simple web server is fine, for example:

```bash
python -m http.server 8099
```

Then open http://localhost:8099 in the browser.

## Catalog data (lines, machines, specs)

All machine data comes from the YAML files in `booklet-data/`.

1. Edit the line file: `booklet-data/<category>/<line>.yaml`
2. Rebuild:

   ```bash
   python -m pip install pyyaml
   python scripts/templates_to_catalog.py --apply
   python scripts/build_seo.py
   ```

   This updates `data/catalog.json`, `js/catalog-data.js` and the sitemap.

### Admin panel

For small edits there is an admin panel (needs Node.js 18 or newer):

```bash
npm install
npm run admin
```

Open http://localhost:3333/admin-local/ to add, edit or delete machines and parts and
upload photos. It saves straight into `data/catalog.json` and `js/catalog-data.js`.

Note: running `templates_to_catalog.py --apply` rebuilds the catalog from the YAML files,
so anything changed only in the admin panel will be lost. Either use the YAML files or
the admin panel for a change, or copy the admin change into the YAML file too.

The admin panel only works on your computer (it needs `server.js`). The copy on the live
site at `/admin-local/` does nothing and is hidden from Google.

## SEO

Page titles, descriptions, keywords, social previews, structured data, the sitemap and
robots.txt are all set in `scripts/build_seo.py`. Line and machine pages get theirs from
the catalog data. More details in [docs/SEO-GUIDE.md](docs/SEO-GUIDE.md).

## Making changes

1. Download or clone the repo and make your changes.
2. Check everything locally (see "Run it locally").
3. Send the changes back to me (a branch / pull request on GitHub, or the changed files).
   I will check them and publish.

Please don't add big source files (raw photos, PDFs, scans, original videos).
`.gitignore` already keeps most of them out.
