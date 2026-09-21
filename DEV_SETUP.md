# Development Setup - Ginnysgems Visualizer

## Quick Start

Due to browser security restrictions with `file://` protocol, you need to run a local web server.

### Option 1: Using npx (Recommended, Node.js Required)

```bash
cd ginnysgems
npx -y http-server -p 8000 -c-1
```

Then open: **http://localhost:8000/visualizer.html**

The `-c-1` flag disables caching, so changes appear immediately.

### Option 2: Using Python 3

```bash
cd ginnysgems
python3 -m http.server 8000
```

Then open: **http://localhost:8000/visualizer.html**

### Option 3: Using Python 2 (Legacy)

```bash
cd ginnysgems
python -m SimpleHTTPServer 8000
```

Then open: **http://localhost:8000/visualizer.html**

### Option 4: Using Node.js (Alternative)

```bash
cd ginnysgems
node -e "require('http').createServer((req, res) => {
  const fs = require('fs');
  const url = require('url');
  const path = require('path');
  const file = path.join(__dirname, url.parse(req.url).pathname === '/' ? 'visualizer.html' : url.parse(req.url).pathname);
  
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(data);
  });
}).listen(8000);"
```

## Hard Refresh

After starting the server, make sure to **hard refresh** your browser to clear cache:
- **Windows/Linux**: `Ctrl+Shift+R`
- **Mac**: `Cmd+Shift+R`

## Why a Local Server?

1. **CORS Restrictions**: Three.js and other resources from CDN require proper HTTP headers
2. **Storage API**: Tracking Prevention blocks certain domains from storage access
3. **file:// Protocol**: Treated as separate security origin by modern browsers
4. **Cache Issues**: Local server allows hard-refresh to bypass browser cache

## Production Deployment

For production, deploy to a proper web host (GitHub Pages, Netlify, Vercel, etc.) or behind a web server (nginx, Apache).

The application uses only client-side code:
- HTML/CSS for layout
- Three.js for 3D rendering
- Vanilla JavaScript for controls
- No backend server required

## Troubleshooting

**Still seeing "Tracking Prevention blocked" errors?**
- Hard refresh with `Ctrl+Shift+R`
- Clear browser cache completely
- Close and reopen the browser tab

**Gems not rendering?**
- Open DevTools Console (F12)
- Check for any JavaScript errors
- Verify Three.js loaded: `console.log(THREE)` should show an object

**Params not updating?**
- Inspect the element (F12 > Elements)
- Check that cut selector has correct ID: `#cut-select`
- Check parameter container ID: `#params-container`
