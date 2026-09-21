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
