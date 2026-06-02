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

# IMPORTANT: re-apply the render-scale patch (the library hardcodes the canvas
# pixel ratio and exposes no prop for it), or the shader renders at full dpr again:
perl -i -pe 's/setPixelRatio\(Math\.min\(window\.devicePixelRatio,2\)\)/setPixelRatio(Math.min(window.devicePixelRatio,2)*.65)/g' insight-background.bundle.js
```

Notes:
- **Render scale 0.65 (dpr-AWARE)**: the patch keeps the library's dynamic
  `setPixelRatio(Math.min(devicePixelRatio,2))` and just multiplies it by `0.65`, so on a
  retina (dpr 2) screen the buffer renders at an effective pixelRatio of 1.3 — same as the
  `fractal_fluted.html` playground at renderScale 0.65. This is the SMOOTH setting.
  Do NOT replace it with a flat `setPixelRatio(1)`: that hardcode ignores dpr and breaks the
  library's resize path, so on retina the buffer drops to half-resolution and the diagonal
  flutes alias/stair-step (worst when the window is small). The earlier `setPixelRatio(1)`
  patch was exactly that bug.
- **The shader plane (`#insight-shader`) must be sized to the FRAME, not an oversized fixed
  1520px.** The library caps the render buffer at the viewport size, so a fixed 1520 plane on
  a smaller viewport gets a viewport-sized buffer stretched onto 1520 → upscale → aliasing.
  Sizing the plane to the frame (same clamps) keeps buffer ≈ display (1.3x) at every viewport.
  See `.insight-card #insight-shader` in css/style.css. A rebuild WIPES the perl patch — re-run it.
- `--define:process.env.NODE_ENV='"production"'` is **required** — without it the
  bundle references `process`, which is undefined in the browser and throws.
- Pin the same versions (`shaders@2.5.128`, `react@18.3.1`) to keep the visual output
  identical. Bumping them is a deliberate upgrade, not a routine rebuild.
- React must stay a single instance (it is, because everything is inlined into one
  bundle) — do not split React into a separate file, or hooks will break.
