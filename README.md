# Ginny's Gemstones

A custom cut gemstone studio website and interactive GemCAD visualizer built with modern web technologies.

## Project Structure

```
ginnysgems/
├── index.html              # Main storefront landing page
├── visualizer.html         # 3D GemCAD visualizer interface
├── styles.css              # Storefront styles
├── visualizer-styles.css   # Visualizer interface styles
├── script.js               # Storefront interactions
├── visualizer.js           # 3D visualization engine (Three.js)
├── optics-effects.js        # Glowing ray ribbons and facet glints
├── studio-renderer.js       # Convex facets, internal ray tracing, progressive antialiasing
└── README.md               # This file
```

## Features

### Storefront (index.html)
- **Hero Section**: Eye-catching introduction to Ginny's Gemstones studio
- **Studio Overview**: Philosophy and approach to lapidary work
- **Services**: Custom cut gems, jeweler partnerships, bespoke jewelry
- **Showcase Gallery**: Featured stones with links to 3D visualizer
- **GemCAD Visualizer Promo**: Direct entry point to the renderer
- **Process Explanation**: How we work with clients
- **Inquiry Form**: Contact form for commissions and partnerships

### GemCAD Visualizer (visualizer.html)
- **3D Interactive Canvas**: Powered by Three.js
- **Display Modes**: Toggle the shaded mesh and wireframe edges
- **Parametric Previews**: Eight adjustable cut shapes with closed, faceted geometry; these are illustrations, not measured GemCAD models
- **Catalog Stones**: Gallery links select the preview material and cut
- **Lighting Controls**: Studio, daylight, and contrast presets with adjustable light direction and brightness; polished surface highlights preserve stone color
- **Auto-Rotation**: Smooth automatic rotation of gems
- **Responsive Controls**: Mouse or touch drag to rotate, scroll to zoom, automatic canvas resizing
- **Download Specs**: Export the current preview material, cut, and parameters as JSON
- **Transparency**: Dielectric transmission through a closed facet volume, with Fresnel reflection and path-length color absorption
- **Studio Renderer**: GPU tracing of actual convex preview facets, refraction, total internal reflection, and Fresnel-weighted exits against asymmetric neutral softboxes. Choose 4, 8, or 10 internal bounces. Still views progressively accumulate 12 subpixel samples; rotation and decorative overlays update immediately.
- **Brilliance & Refraction**: Adjustable polish and refraction with optional RGB dispersion. Star-shaped sparkle accents are off by default; natural brilliance comes from the traced facet geometry.
- **Ray Appearance**: Soft glowing ribbons with luminous cores and moving light pulses; pulse and glint animation respect reduced-motion preferences
- **Light Rays**: Color-coded paths traced against preview facets using refraction and total internal reflection, updating with stone rotation and light direction; illustrative paths are capped at eight internal reflections, without dispersion or intensity splitting
- **Limitations**: Synthetic convex cuts and representative material constants, with bounded RGB tracing. No measured GemCAD input, spectral transport, inclusions, polarization, or scene caustics; the preview is not a light-performance certification. GemCAD import is unavailable and its control is disabled.

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **3D Rendering**: Three.js
- **Design**: Custom CSS with mobile responsiveness
- **Fonts**: Google Fonts (DM Sans, Italiana)

## Color Scheme

- **Primary Dark**: #091211 (ink)
- **Forest Green**: #102523
- **Jade**: #2a6a5e
- **Gold Accent**: #d8b66d (brand gold)
- **Cream**: #f2eddf (text/light backgrounds)

## Getting Started

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/Vick206/ginnysgems.git
cd ginnysgems
```

2. Serve locally (any simple HTTP server):
```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server)
npx http-server
```

3. Open in browser:
- Storefront: `http://localhost:8000/index.html`
- Visualizer: `http://localhost:8000/visualizer.html`

## Roadmap

### Phase 1: Storefront (Current)
- [x] Landing page design
- [x] Gallery showcase
- [x] Contact form
- [x] Visualizer entry point
- [ ] Product database/CMS integration
- [ ] E-commerce functionality

### Phase 2: GemCAD Renderer
- [x] Three.js setup and basic 3D gem
- [ ] Full GemCAD file parser
- [ ] Precise facet rendering
- [ ] Measurement and angle display
- [x] Preview parameter export (JSON)
- [ ] Advanced lighting models

### Phase 3: Enhanced Features
- [ ] Stone inventory management
- [ ] Commission tracking dashboard
- [ ] Customer portal
- [ ] Augmented reality preview (AR.js)

## GemCAD File Format Support

Currently working on full support for:
- `.gem` files (standard GemCAD format)
- `.txt` files with facet data
- `.csv` files with structured facet information

File format documentation coming soon.

## License

© 2026 Ginny's Gemstones. All rights reserved.

## Contact

For inquiries about custom stones, trade partnerships, or bespoke jewelry:
- Website: [ginnysgems.com](https://ginnysgems.com)
- Submit an inquiry through the contact form on the site

---

Built with care by Ginny's Gemstones

## Studio photo catalog

The public showcase keeps the original card design and now reads six studio stone records from `catalog.js`. Photos are responsive 600/1200px JPEGs, cropped from the supplied originals without embedded source metadata. Photo identities remain provisional; unverified weights and dimensions stay null.

`visualizer.html` uses the same catalog and automatically loads the selected cut render. Sophia Dome is reconstructed from 97 explicit source facet planes. The 73-facet peridot is a diagram reconstruction with an inferred girdle thickness and a documented 0.5% table-ratio discrepancy. Squartuguese is decoded directly from its binary GEM file into 85 source facets. The ruby and red garnet share a 113-facet Mini-Portuguese PDF reconstruction with distinct material settings. All five have static render thumbnails and interactive renders. Sunstone stays photo-only pending its pattern. Optical material settings are representative, not measured.

- `cut-geometry.js`: convex half-space clipping, design facet identities and source optical planes.
- `data/cuts/`: normalized Sophia Dome, peridot, Squartuguese and Mini-Portuguese design data.
- `collection-viewer.js`: photo/model selection, lazy renderer loading, keyboard controls and fallback behavior.
- `legacy/parametric-previews.js`, `legacy/showcase.html` and `legacy/visualizer.html`: retained demo catalog and interface; generic cut generators and their legacy initializer are preserved in `legacy/parametric-previews.js` for reference and tests. The renderer feature list above includes those legacy capabilities.

Run `node tests/catalog-check.cjs`, `node tests/renderer-check.cjs`, `node tests/gem-decoder-check.cjs`, and `node tests/mini-portuguese-check.cjs`. Serve the repository over HTTP for cut-data loading. See [PHOTO_RENDER_PLAN.md](PHOTO_RENDER_PLAN.md) for remaining source dependencies. `TemporaryResources/` is ignored working material and must be excluded from directory-based deployments.

The reusable binary converter is `tools/decode-gem.cjs`; see [GEM_FORMAT.md](GEM_FORMAT.md) for usage, recovered fields, validation and supported-format limits.

Regenerate the shared Mini-Portuguese design with `node tools/build-mini-portuguese.cjs`. Plane offsets are reconstructed from the PDF drawing, with source proportions and limitations documented in PHOTO_RENDER_PLAN.md.

## Baked photo overlays

The gallery displays a transparent cut render in each photo's upper right and a wireframe in its upper left. These are static assets, with no gallery WebGL instances. Run `node tools/bake-previews.cjs` to regenerate five PNG/SVG pairs, then `node tools/bake-previews.cjs --check` and `node tests/bake-check.cjs`. [RENDER_BAKING.md](RENDER_BAKING.md) documents the recipe and machine-readable manifest for another renderer/tool.

The visualizer is render-only: it loads the selected stone automatically, reuses one renderer when switching stones, and falls back to a baked render if WebGL fails. Sunstone shows its pending-design message. The storefront retains the photo overlays.

Visualizer display defaults are Fine quality (10 internal bounces) with color dispersion enabled. Auto-rotation is a checkbox at one turn per 40 seconds, on by default. Brilliance and refraction use fixed internal settings; their sliders are removed from the public controls. Baked previews use the same quality/dispersion defaults and remain stationary.

The visualizer opens and resets to a side profile, with auto-rotation enabled at one turn per 40 seconds. The quality card is removed; Fine quality (10 internal bounces) is fixed internally. Baked photo overlays retain their explicit camera recipe.

The visualizer now combines the stone summary, design/material facts and basic facet count in the gem-name card. One generic disclaimer lives in the render card and remains identical across catalog selections.

## Performance cleanup

See [PERFORMANCE_REVIEW.md](PERFORMANCE_REVIEW.md) for measured loading/render-pass changes and the dependency inventory. Hidden/offscreen rendering now pauses, shared-cut geometry and JSON are reused, and archived demo interfaces/modules are excluded from public loading. Run `node tests/render-performance-check.cjs` alongside the geometry and bake checks.

The follow-up code review also archives legacy-only renderer methods and CSS, removes obsolete DOM/styles and redundant scrolling code, and releases unsupported WebGL contexts before retry. The contact form currently prepares a local confirmation only; a delivery backend is not implemented. See PERFORMANCE_REVIEW.md.
