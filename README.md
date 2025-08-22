# Galaxy Night Sky (Canvas + Vanilla JS)

Parallax starfield with twinkling, Milky Way band, and occasional meteors — no libraries.

## Structure
```text
galaxy-night-sky/
├─ index.html
├─ styles.css
└─ script.js
```

## Quick Start
1. Save files as above.
2. Ensure `<link rel="stylesheet" href="styles.css">` and `<script src="script.js" defer></script>` are in `index.html`.
3. Open `index.html` in a browser (a simple local server is ideal).

## Controls (HUD)
- **Star twinkling** — `#toggleTwinkle`
- **Meteors** — `#toggleMeteors`
- **Milky Way band** — `#toggleMilky`
- **Parallax** — move mouse / touch
- **Click** — slightly nudges Milky Way angle (re-seeds band stars)

## Key Constants (in `script.js`)
```js
const STAR_COUNT = 420;        // background stars
const BAND_COUNT = 420;        // stars/dust along the Milky Way
const CLOUD_NODES = 800;       // fog nodes for offscreen band texture
const METEOR_MIN_GAP = 3800;   // ms between meteors (min)
const METEOR_MAX_GAP = 9500;   // ms between meteors (max)
const DPR = Math.min(window.devicePixelRatio || 1, 2); // rendering scale cap
```

## Customize
- **Density / performance:** lower `STAR_COUNT`, `BAND_COUNT`, `CLOUD_NODES`.
- **Meteor frequency:** adjust `METEOR_MIN_GAP` / `METEOR_MAX_GAP`.
- **Milky Way thickness:** width auto-scales; change `milky.width` logic if desired.
- **Palette / backdrop:** edit gradients in `.sky-gardient` (CSS).
- **Parallax strength:** tweak offsets in `drawStars(...)` (`*14`, `*10`).

## How It Works
- Stars (two layers) render as arcs with depth-based parallax and sinusoidal alpha for twinkle.
- Milky Way is an offscreen canvas: many soft “fog” blobs blended (`lighter`) then drawn as a texture.
- Meteors spawn diagonally, leave a fading trail (`lighter` blend), and auto-cleanup offscreen.
- Resize aware: canvas rescaled to viewport with DPR transform; scene re-seeded.

## Notes
- The CSS class is named `.sky-gardient` intentionally; if you prefer, rename to `.sky-gradient` in **both** HTML & CSS.
- Canvas context uses `{ desynchronized: true }` to reduce jank on some browsers.

## Troubleshooting
- **High CPU/GPU?** Reduce counts (above) or uncheck Milky/Meteors in the HUD.
- **Blurry canvas on HiDPI?** Raise the `DPR` cap (costs perf) or lower for speed.
- **No motion on touch?** Ensure passive touch listeners aren’t blocked by other handlers.
