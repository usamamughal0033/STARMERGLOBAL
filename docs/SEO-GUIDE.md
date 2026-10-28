# SEO guide — starmerglobal.com

For whoever handles SEO and marketing for the site. It explains what is already in
place, where to change things and how changes go live.

---

## 1. How the site works (in short)

* Static HTML/CSS/JS on **GitHub Pages**. The `main` branch **is** the live site; a push
  is live in 1–2 minutes. Please work on a branch and open a pull request (see section 6).
* Line and machine pages are templates filled from the catalog
  (`line.html?id=CT-L-005`, `product.html?id=HC-L002-M16`). Google runs the JavaScript
  and reads the finished page, including the title, description and structured data
  set for that line or machine.

## 2. Already in place

| Item | Where |
|---|---|
| Unique title + meta description on every page | `scripts/build_seo.py` (static pages); line/machine pages from the catalog |
| Meta keywords | `scripts/build_seo.py` |
| Canonical URL on every page | generated |
| Open Graph + Twitter tags (WhatsApp/LinkedIn/Facebook previews) | generated; image `assets/images/og-image.jpg` (1200×630) |
| `robots` tags (search, 404 are `noindex`) | generated |
| `sitemap.xml` — 327 URLs: main pages, 5 categories, 21 lines, all machines | generated from the catalog |
| `robots.txt` with sitemap link | generated |
| Organization structured data (name, logo, phones, email, Lahore address) | home page |
| Product + BreadcrumbList structured data | every line and machine page |
| One `<h1>` per page, alt text on images, no broken internal links | checked |
| Custom 404 page | `404.html` |

## 3. Changing titles, descriptions and keywords

All static pages are configured in **one list** at the top of `scripts/build_seo.py`
(`PAGES`). For each page:

* `title` — aim for **50–60 characters**, main keyword near the start.
* `description` — aim for **140–160 characters**; this is the text under the link in Google.
* `keywords` — comma separated (Google ignores this tag, other engines may not).

Then run:

```bash
python scripts/build_seo.py
```

It rewrites the block between `<!-- seo:start -->` and `<!-- seo:end -->` in each page's
`<head>`, plus `sitemap.xml` and `robots.txt`. **Do not edit inside that block by hand**;
the next run overwrites it.

### Line and machine pages

These take their title and description from the catalog:

* Line page title: `<line name> (<rate>) | <category> | Starmer Global`; description = the
  line's `description` in `booklet-data/<category>/<line>.yaml`.
* Machine page title: `<machine name> <model> | <line name> | Starmer Global`; description =
  the machine's `description` (or `function`) in the same YAML.

To improve them, edit those `description` / `function` texts in the YAML and rebuild
(see the README, *The catalog*). The logic lives in `setPageSEO()` in `js/bundle.js`.

## 4. Google tools: first steps

1. **Google Search Console**: add the property `https://www.starmerglobal.com`, choose
   *HTML tag*, copy only the `content="…"` value into `GSC_VERIFY` in
   `scripts/build_seo.py`, run the script, push. Then verify.
   (Or verify through the domain's DNS, which needs no code change.)
2. In Search Console, submit the sitemap: `https://www.starmerglobal.com/sitemap.xml`.
3. **Google Analytics 4**: create a property, copy the measurement ID (`G-…`) into `GA4_ID`
   in `scripts/build_seo.py`, run the script, push. The tag is added to every public page.
4. **Google Business Profile** for the Lahore factory (no website change needed).

## 5. Ideas for the next SEO steps

* Keyword research per product line (e.g. *hard candy production line*, *lollipop making
  machine*, *toffee production line*, *bubble gum making machine*, *Uniplast forming
  machine*, *confectionery machinery Pakistan*), then refine titles/descriptions.
* Longer, unique descriptions for each line in the YAML files (currently 1–3 sentences).
* New content pages (about us, factory/case studies, FAQ, blog). Add each new page to
  `PAGES` in `scripts/build_seo.py` so it gets tags and a sitemap entry.
* Clean addresses for lines/machines (e.g. `/lines/toffee-400-kg-hr/` instead of
  `line.html?id=…`) would need pre-built pages: a development task to plan with the
  developer.

## 6. How to submit changes

1. `git checkout -b seo/<short-name>`
2. Change, run `python scripts/build_seo.py`, check locally (`python -m http.server 8099`).
3. Commit, push the branch, open a pull request.
4. The developer reviews and merges; it is live 1–2 minutes later.

Please **don't** edit `js/bundle.js`, `css/style.css`, `data/catalog.json` or
`js/catalog-data.js` directly without agreeing it with the developer first; the last
two are generated files.
