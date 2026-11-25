# Reproducible photo overlays

Each finished-stone photo has a transparent wireframe in the upper left and a transparent shaded cut render in the upper right. They remain separate image assets so photos can be replaced without rendering again. Labels distinguish design illustrations from the real photograph. Sunstone has no overlays until its design exists.

The storefront creates no WebGL contexts and does not load Three.js. Its cards load static PNG/SVG images. The visualizer page shows no photograph and automatically loads one interactive render for the selected stone. If WebGL is unavailable, its baked cut render remains visible.

## Bake now

Install Node 22 or later and Chrome or Edge. No npm packages are required.

```powershell
# Optional: choose the browser explicitly if automatic discovery cannot find it.
$env:BAKE_BROWSER = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

node tools/bake-previews.cjs
node tools/bake-previews.cjs --check
node tests/bake-check.cjs
```

The command starts a temporary local HTTP server and a hidden headless browser. It visits the visualizer with `?bake=1` to suppress automatic startup and reuses one renderer sequentially for all five ready stones, then closes the browser and server. Raw email/reference folders are blocked by this bake server. The private originals are never needed at bake time: normalized cut JSON and the shared catalog are the inputs.

The recipe in `render-bake.json` fixes a 384 x 384 transparent canvas, perspective camera, rotation in radians, distance relative to the geometry's bounding sphere, studio lighting, transmission, brilliance, refraction, bounce limit, 12 accumulation samples and pixel ratio 1. Sparkle, illustrative rays and auto-rotation are disabled during baking. Color dispersion is enabled and Fine quality uses 10 internal bounces, matching the visualizer defaults. The existing optical shader still uses its lighting environment inside the gem; the exported image background has zero alpha.

For each ready stone, the command writes:

- `images/renders/{stone-id}.png`: RGBA cut render, with empty transparent corners.
- `images/renders/{stone-id}-wireframe.svg`: projected facet edges with a transparent background. Two strokes preserve contrast on different photos. Coplanar triangulation diagonals are excluded. Front and rear facet edges are included, as in the viewer's wireframe mode.

Both use the same camera and stone rotation. Ruby and red garnet share the Mini-Portuguese geometry while retaining their own material colors and IORs. Missing designs are recorded as skipped, never replaced by demo models.

## Export contract for another tool

`images/renders/manifest.json` is versioned, machine-readable input/output documentation. It includes the complete recipe and a job per stone: stable stone ID, cut ID, normalized cut JSON path, numeric color, material IOR, output paths, facet count and asset SHA-256 hashes. It also records source dependency hashes, one aggregate input hash, the browser version used, and skipped entries with reasons. It contains no private email data or absolute local source paths.

Another tool can consume this manifest without parsing HTML or decoding GEM/PDF files:

1. Read the recipe and job list; load each referenced normalized cut file.
2. Use explicit planes where supplied, or generate planes from the angle/index/distance tiers. Preserve the viewer's Y-up frame, geometry centering and camera recipe. Keep design IOR separate from the job's material IOR.
3. Render square transparent assets at the specified paths and project facet edges with the same camera. The current wireframe exporter is CPU-based and deterministic, so it can also be reused independently.
4. Write the images, update output hashes and retain source attribution/assumptions. Replace the manifest only after all jobs succeed. A future Blender or other renderer adapter should declare its own renderer/version and recipe version rather than claiming identical shading to the current shader.

The recipe and manifest make the work reproducible from source. Pixel-identical PNGs across browser versions, GPU drivers or alternate renderers are not guaranteed. Pin browser/Node versions and the software renderer for closer image reproducibility; compare visual output as well as hashes when upgrading. SVG output is tested byte-for-byte against the current exporter.

## Keeping assets current

`--check` is fast and opens no browser. It fails if a cut, catalog, recipe, renderer dependency or output asset has changed since the bake. Run it in CI before deployment. After adjusting inputs, rerun the bake and commit the resulting PNG/SVG files and manifest together. Layout/CSS changes do not require rebaking.

Future automation can compare per-job hashes to bake only affected stones, or invoke a different renderer adapter against the same job contract. The current batch is small and deliberately rebakes all five jobs in one pass. The gallery always serves the finished images; no rendering work is shifted to visitors.

Tests verify manifest/input/output consistency, PNG dimensions and alpha pixels, nonempty gem silhouettes, deterministic SVG generation, and the photo-only sunstone. Browser checks verify both upper corners, all ten overlays, mobile layouts, zero gallery WebGL instances and the optional interactive viewer. Serve `.svg` with `image/svg+xml` when previewing or deploying the site.

Source/material switching and centered geometry now share implementation with the live renderer. During each batch, the shared Mini-Portuguese geometry and its wireframe are reused for ruby/garnet. The exported job contract and image appearance are unchanged.

Source SHA-256 hashes normalize CRLF to LF; output assets are hashed as raw bytes. Repository text files, including SVGs, use LF via .gitattributes. Fresh checkouts therefore retain valid freshness checks across Windows and Linux.
