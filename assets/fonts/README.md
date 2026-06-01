# Self-hosted webfonts

These fonts used to load from external CDNs (jsdelivr for Pretendard, Google Fonts
for the serifs). They're now served from this folder so the site has no external
font dependency. `css/fonts.css` declares the `@font-face` rules; `index.html` links it.

## Files

| Font | File(s) | Weights | Source / license |
|---|---|---|---|
| Pretendard (body) | `pretendard-400.woff2`, `pretendard-700.woff2` | 400, 700 | github.com/orioncactus/pretendard, OFL 1.1 |
| Cormorant Garamond (serif display) | `cormorant-garamond-600-latin*.woff2` | 600, 700 share one file | Google Fonts, OFL |
| Roboto Serif (serif label) | `roboto-serif-400-latin*.woff2` | 400 | Google Fonts, OFL |

Only the weights actually used in `css/style.css` (Pretendard 400/700, Cormorant
600/700, Roboto Serif 400) and only the **latin + latin-ext** subsets are included
(content is Korean + English; Cyrillic/Vietnamese/Greek subsets are not needed).

## Regenerating

Pretendard (pinned v1.3.9, static):

```sh
base="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2"
curl -sL "$base/Pretendard-Regular.woff2" -o assets/fonts/pretendard-400.woff2
curl -sL "$base/Pretendard-Bold.woff2"    -o assets/fonts/pretendard-700.woff2
```

Google serifs — fetch the css2 with a modern browser User-Agent (so it returns
woff2), then download the `latin` and `latin-ext` woff2 it references and rewrite
the `src` URLs to `../assets/fonts/...`:

```sh
curl -sL -A "Mozilla/5.0 ... Chrome/120 ..." \
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Roboto+Serif:wght@400&display=swap"
```

If the weights/families/subsets change, update both the downloaded files and the
`@font-face` rules in `css/fonts.css` to match.
