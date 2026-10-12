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
- **Lighting Controls**: Adjust brightness for optimal viewing
- **Auto-Rotation**: Smooth automatic rotation of gems
- **Responsive Controls**: Mouse or touch drag to rotate, scroll to zoom, automatic canvas resizing
- **Download Specs**: Export the current preview material, cut, and parameters as JSON
- **Planned Features**: GemCAD file import and optical ray tracing are unavailable and their controls are disabled

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
