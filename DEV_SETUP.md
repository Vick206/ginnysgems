# Development Setup - Ginnysgems Visualizer

**Note:** This is a pure client-side project. No Node.js or build tools needed. Just HTML, CSS, and JavaScript.

## Why a Local Server?

Modern browsers block CORS and storage access when opening files via `file://` protocol. Three.js and other resources need proper HTTP headers. Simply open `visualizer.html` from disk won't work.

## Quick Start

You need a simple local HTTP server. Pick whichever tool you have available:

### Option 1: Using Python 3 (Recommended)

```bash
cd ginnysgems
python3 -m http.server 8000
```

Then open: **http://localhost:8000/visualizer.html**

### Option 2: Using Python 2 (Legacy)

```bash
cd ginnysgems
python -m SimpleHTTPServer 8000
```

Then open: **http://localhost:8000/visualizer.html**

## Hard Refresh

After starting the server, make sure to **hard refresh** your browser to clear cache:
- **Windows/Linux**: `Ctrl+Shift+R`
- **Mac**: `Cmd+Shift+R`

## Why a Local Server?

Browser security blocks file:// protocol from accessing external resources and using certain storage APIs. Running even a basic HTTP server fixes this.

## Production

### Renderer checks

The studio renderer needs WebGL 2 or WebGL 1 with floating-point texture support. Its Studio and Fine quality settings trace more internal bounces; use Interactive on slower devices. Still views progressively refine over 12 subpixel samples. Rotation uses a lower-resolution preview, returning to full resolution when still.

With Node.js installed, run the dependency-free geometry and refraction checks:

```bash
node tests/renderer-check.cjs
```

The checks cover default and extreme parameters for all eight cuts, closed surfaces, convex optical volumes, outward normals, and Snell refraction. Browser checks are still necessary to verify GPU shaders and visual appearance.

Deploy to any static host (GitHub Pages, Netlify, Vercel, plain web server). No build step or backend required—it's all client-side.

## Troubleshooting

**Still seeing "Tracking Prevention blocked" or CORS errors?**
- Verify server is running on http://localhost:8000
- Hard refresh with `Ctrl+Shift+R`
- Check browser console (F12) for errors

**Gems not rendering?**
- Open DevTools Console (F12)
- Check for JavaScript errors
- Verify Three.js loaded: type `THREE` in console—should return an object

## Studio collection checks

Run `node tests/catalog-check.cjs` for the real catalog, photo paths, source-plane geometry and peridot reconstruction checks. The existing renderer check still covers the retained generic generators. Serve over HTTP; `collection-viewer.js` fetches normalized JSON when a render is requested. WebGL is loaded on demand and photographs remain usable without it.

Exclude `TemporaryResources/`, `tmp/`, `.git/` and private local files from any deployment that copies the working directory. Git-based deployment naturally omits ignored sources. Only the selected processed photos, cut JSON and render thumbnails belong in the published collection.

For binary GEM imports, use `node tools/decode-gem.cjs input.gem output.json cut-id`. The source need not be served publicly. Run `node tests/gem-decoder-check.cjs`; see GEM_FORMAT.md for the supported layout and unsupported preform sections.

For the Mini-Portuguese PDF reconstruction, run `node tools/build-mini-portuguese.cjs` and `node tests/mini-portuguese-check.cjs`. Ruby and red garnet share geometry, with separate material settings; sunstone remains photo-only. The plan documents inferred offsets and source discrepancies.

## Overlay baking

Run `node tools/bake-previews.cjs` with Node 22+ and Chrome/Edge installed. Set `BAKE_BROWSER` if the executable is elsewhere. This uses one hidden browser page and one renderer sequentially; no npm packages are required. Run `node tools/bake-previews.cjs --check` before deployment, plus `node tests/bake-check.cjs`. Serve SVG with `image/svg+xml`. See RENDER_BAKING.md for the export contract.

## Render lifecycle checks

Run `node tests/render-performance-check.cjs` for moving-frame compositing, settled GPU idle and animation suspension/resumption. The generic geometry test now loads its reference implementation from `legacy/parametric-previews.js`; these demos are not loaded by the public site. See PERFORMANCE_REVIEW.md for measurements and remaining profiling limits.
