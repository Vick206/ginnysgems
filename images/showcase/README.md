# Showcase photographs

Place the six gemstone photos in this folder when they are ready:

- `emerald-001.jpg`
- `sapphire-001.jpg`
- `diamond-001.jpg`
- `ruby-001.jpg`
- `topaz-001.jpg`
- `aquamarine-001.jpg`

In `index.html`, add the matching `src="images/showcase/emerald-001.jpg"` (or other filename) to each `showcase-image` element. Each slot includes a comment with its path. Other image formats work too; use the actual extension in `src`.

Use landscape photos, ideally 1200 × 900 pixels or larger. Frames use a 4:3 ratio and crop with `object-fit: cover`; adjust `object-position` on an individual image to position its subject. Update the image's `alt` text to describe the actual photograph.

Until a photo is supplied and successfully loads, the card displays its photography placeholder. This static site has no browser upload service; add photos to the repository with the site files.
