# Insight section background (self-hosted shader bundle)

The Frame 27 / Insight card background (animated gradient → fluted glass) uses the
`shaders` library (Paper Shaders API + three.js) wrapped in a tiny React island.

- **Source (edit this):** `insight-background.js` — readable params (colors, speed,
  refraction, angle, etc.) and the React mount.
- **What the page loads:** `insight-background.bundle.js` — a single self-contained
  ESM bundle with React, react-dom, htm, the `shaders` library, and three.js all
  inlined. **No external CDN at runtime** (we used to load these from esm.sh).
- `index.html` loads the bundle via `<script type="module" src="js/insight-background.bundle.js">`.
  There is no `importmap` anymore.

## Why bundled

Loading from esm.sh meant an outage or compromise of that CDN would break (or inject
into) our site. The bundle removes that dependency — same code, same visual result,
just served from our own origin.

## Rebuilding the bundle (after editing params in insight-background.js)

`insight-background.bundle.js` is a build artifact. If you change anything in
`insight-background.js`, regenerate it:

```sh
# in any scratch dir
npm i shaders@2.5.128 react@18.3.1 react-dom@18.3.1 htm@3.1.1 esbuild

# copy this project's js/insight-background.js next to node_modules, then:
npx esbuild insight-background.js \
  --bundle --format=esm --minify \
  --define:process.env.NODE_ENV='"production"' \
  --outfile=insight-background.bundle.js

# copy the resulting insight-background.bundle.js back into this project's js/
```

Notes:
- `--define:process.env.NODE_ENV='"production"'` is **required** — without it the
  bundle references `process`, which is undefined in the browser and throws.
- Pin the same versions (`shaders@2.5.128`, `react@18.3.1`) to keep the visual output
  identical. Bumping them is a deliberate upgrade, not a routine rebuild.
- React must stay a single instance (it is, because everything is inlined into one
  bundle) — do not split React into a separate file, or hooks will break.
