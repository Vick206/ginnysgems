# Binary GemCAD decoding

The supplied `Squartuguese.gem` has been decoded directly. No new export is needed for this file. The converter is an independent implementation of the observed legacy layout, not an official GemCAD specification or a universal `.gem` importer.

```powershell
node tools/decode-gem.cjs TemporaryResources/Squartuguese.gem data/cuts/squartuguese.json squartuguese
node tests/gem-decoder-check.cjs
```

The source remains ignored. The normalized JSON contains its SHA-256 digest and byte length, recovered design metadata, 85 plane/polygon records, and 13 cutting tiers. The catalog now enables a static thumbnail and interactive Squartuguese model for the CZ. Source design IOR 1.83 is retained separately from representative CZ material IOR 2.15. The file's footnote mentions testing on YAG; it does not establish the material or measurements of the photographed stone.

## Observed record layout

All numeric fields are little endian. Each facet begins with three 64-bit floating-point components of a vector `p`, a 32-bit tier number, and a one-byte-length Windows-1252 string. The text contains a facet label and optional cutting instructions separated by a tab. For the supplied file, its plane equation is `p dot vertex = 1`; these vectors are not unit normals.

After the string, a 32-bit marker of 1 introduces a vertex with three 64-bit coordinates. More marker/vertex records follow; a marker of 0 ends that polygon. The next facet then starts immediately. No byte alignment or guessed string scanning is needed.

At a facet boundary, a 64-bit value of -99999 ends the facet section. It is followed by three 32-bit fields (stored symmetry value, mirror flag, signed gear), 64-bit design IOR, an opaque 32-bit trailer field, and 64-bit gear offset. Eight one-byte-length strings hold four heading slots and four footnote slots. Empty slots still consume their length byte. The supplied file ends exactly after these slots. Its opaque trailer field is 32767; the converter preserves it without assigning a meaning.

The converter normalizes each plane to unit normal `p / length(p)` and distance `1 / length(p)`. Geometry and normals rotate from source Z-up to viewer Y-up with `(x,y,z) -> (x,z,-y)`, preserving handedness. Source polygons are retained as independent validation data. Displayed tier angles and indices are derived from the stored planes; the explicit individual planes, not rounded cutting angles, drive rendering. The trailer symmetry value is retained as metadata and is not used to regenerate or duplicate facets.

## Validation and limits

Every stored polygon vertex satisfies its plane equation; the largest raw residual observed in this file is approximately 2.4e-15. All vertices lie within all source half-spaces. Rebuilding the volume from these planes recovers all 85 polygons and their original vertices within 1e-6 model units. The model has closed edges, outward triangle winding, positive volume and 85 optical planes. Browser tests verify shader compilation, catalog switching, controls, mobile layout and the photograph fallback without WebGL.

Tests include a separately constructed binary cube fixture, truncated input, nonfinite values, incorrect vertex markers, unsupported trailing data, and reproducibility against the local source when available. They do not require committing the private binary.

Supported inputs must match the observed layout: finite coordinates, planar polygons, a closed convex optical model, expected vertex markers and complete trailer strings. Inputs over 16 MiB, unsupported trailing sections (including preforms), and inconsistent/nonconvex geometry are rejected. Rendering is limited to 256 planes. Other binary variants and native GemCAD round-trip agreement have not been verified. Keep the original file; the converter never writes to it. A future readable export will provide a useful independent comparison, but is not required to render this recovered design.

## Research references

- [GemCAD's official manual](https://www.gemcad.com/downloads/gemcadman.pdf) describes its native binary format as proprietary and documents ASCII export.
- [The GemCAD File Reader author's binary reader](https://github.com/mbparker/gemcad-file-reader/blob/main/LibGemcadFileReader/Concrete/GemCadGemImport.cs) provided a structural cross-check for records and trailer fields. No library code or dependency was added to this repository.
- [Indicatrix format documentation](https://github.com/suitable-name/indicatrix/blob/main/crates/indicatrix-formats/README.md) describes the non-unit plane-vector convention and additional preform variants. The converter here rejects those unimplemented sections rather than silently dropping them.
