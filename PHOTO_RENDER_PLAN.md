# Photo and render replacement plan

The original card and catalog layout now displays six studio photographs, using a shared catalog with unknown facts left null. Sophia Dome and Squartuguese have source-plane models; peridot and Mini-Portuguese have documented diagram reconstructions. All five stones with supplied designs have baked transparent corner overlays and automatically loaded interactive renders. Sunstone remains photo-only until its pattern is supplied. Legacy demo records and interface markup remain archived in the codebase.

## Photo overlay baking

Implemented: shaded render at the upper right and wireframe at the upper left of each ready stone photo. The storefront uses only static PNG/SVG images, with no WebGL contexts. `render-bake.json` is the rendering recipe; `tools/bake-previews.cjs` reuses one renderer for all five jobs. `images/renders/manifest.json` records inputs, recipe, outputs and hashes for reproducible generation and future tool integration. See [RENDER_BAKING.md](RENDER_BAKING.md). Sunstone remains photo-only.

## Implementation status

- Implemented: shared catalog, six responsive photo pairs, factual alt text, separate photo/render labels, lazy WebGL, model selection, keyboard controls, old-ID handling, no-WebGL fallback, and retained demo code.
- Sophia Dome: 97 source facets reconstructed and checked for closure, convexity, outward winding and matching optical planes. Source design IOR 1.65 stays separate from illustrative garnet IOR 1.76.
- Peridot: 73 facets reconstructed from source angles and meet points. Girdle thickness/W is inferred as 0.020 to reproduce normalized volume approximately 0.201. Derived T/W is 0.567237 versus printed 0.570 (about 0.5% lower); C/W 0.151 and P/W 0.420 are preserved. These are disclosed assumptions, not measurements of the finished stone.
- Mini-Portuguese: Greg Glenn PDF design reconstructed into 113 facets using its published angles/indices, table ratio and vector profile. Both ruby and red garnet now share this cut, with separate representative materials. Offsets are reconstructed, not native GemCAD distances; normalized volume is 0.194641 versus printed 0.194 (about 0.33% higher). Stone-specific adjustments remain unverified.
- Squartuguese: binary GEM decoded directly: 85 facets, 13 tiers, Marco Voltolini, design IOR 1.83. Plane/polygon agreement and closed convex geometry are validated; CZ thumbnail and interactive model are enabled. See GEM_FORMAT.md. Sunstone: finished pattern still needed.
- Remaining studio input: confirm photo identity, measured specifications, material details and stone-specific design changes.
- Verification: all four Node checks pass; Chrome software-WebGL checks cover all five rendered stones, repeated switching, desktop/mobile layouts, photos, controls and WebGL failure fallback.


## Available source material

Working sources and decoded attachments are in ignored `TemporaryResources/`. Keep the email, headers, originals, and intermediate exports there. Promote only selected web assets and normalized cut data into tracked folders. Do not deploy this working folder; `.gitignore` does not control deployments that copy the whole working directory.

The email explicitly identifies these stone/design relationships. Photo associations below are visual candidates, not confirmed identities; attachment order provides no reliable mapping. Carat weights, dimensions, treatments, and most origins are not supplied. Do not reuse those claims from the old catalog.

| Proposed stone ID | Design established by email | Candidate photograph | Remaining work |
| --- | --- | --- | --- |
| peridot-001 | Peridot round brilliant, supplied diagram | PXL_20260922_030536764.jpg (green round) | Confirm identity; reconstruction implemented with disclosed assumptions |
| garnet-red-001 | Mini-Portuguese | PXL_20260922_030957481.jpg (small red/orange round) | Confirm photo and actual garnet adjustments; PDF reconstruction implemented |
| ruby-studio-001 | Mini-Portuguese | PXL_20260624_162853043.jpg (pink/red round in case) | Confirm photo and material details; PDF reconstruction implemented |
| cz-001 | Squartuguese | PXL_20260922_030845845.jpg (pale clipped square) | Confirm photo and actual cutting changes; binary source decoded and model implemented |
| garnet-ghana-001 | Sophia Dome, purple color-change Ghana garnet | PXL_20260922_030101702.jpg (purple round) | Confirm photo and stone-specific optical constants; source model implemented |
| sunstone-001 | Pattern in progress when email was sent | PXL_20260922_030403675.jpg (pale peach round) | Confirm identity and obtain finished pattern; photo-only until available |

The three design attachments are `Miniportugese.Ruby.pdf`, `Squartuguese.gem`, and `pc45144.asc`. The ASC is readable GemCad 5.0 text, headed “PC 45.144 Sophia Dome”, with a 96 index and IOR 1.65. That IOR belongs to the design file and must not silently become the Ghana garnet's material IOR. The GEM is binary and is now decoded structurally by tools/decode-gem.cjs, preserving its explicit facet planes and polygons. The PDF text has now been decoded and its angle/index tiers transcribed to `data/cuts/mini-portuguese.json`; offsets have now been reconstructed from the drawing and validated against its proportions.

## Mini-Portuguese reconstruction

The user requested the supplied PDF design for the remaining red garnet and ruby, excluding sunstone. Both catalog entries reference the same normalized cut; existing peridot, Sophia Dome and Squartuguese assignments are preserved.

- Greg Glenn, "Mini-Portugese - For small gems"; design IOR 1.740; 96 index; 97 + 16 girdles = 113 design facets.
- Pavilion: P1 46 degrees, P2 43 degrees, P3 40 degrees. Crown: C1 32 degrees, C2 28 degrees, C3 25 degrees, table 0 degrees. Girdle 90 degrees.
- P1, girdle, P3, C1 and C3 use indices 03-09-15 through 93. P2 and C2 use 96-06-12 through 90. Angles are signed by hemisphere in JSON.
- Published T/W 0.583 and P/W 0.440 are preserved. The shared crown junction shown in the drawing determines C/W approximately 0.110832, which rounds to printed 0.111.
- The PDF profile has a measured width of 134.64 drawing points and a 3.35998-point girdle thickness. These infer a regular 16-sided girdle with thickness/W approximately 0.0249553. P2 is fitted to two profile junctions with the published angles fixed. The maximum checked silhouette discrepancy is below 0.276 drawing points (about 0.21% of width).
- Reconstructed volume/W^3 is approximately 0.194641, versus printed 0.194: about 0.33% higher. Quantized drawing coordinates and rounded printed proportions do not provide exact native offsets; this discrepancy is retained explicitly.
- Ruby material IOR 1.766 and red garnet material IOR 1.76 are representative rendering settings, independent of the design IOR. No stone scan, inclusions, measured color or actual cutting modifications are inferred.

Regenerate using `node tools/build-mini-portuguese.cjs`. Validate using `node tests/mini-portuguese-check.cjs`. The builder works from the transcribed source numbers and does not require shipping the private PDF. Tests verify all 113 polygon facets, per-tier counts, exact angle/index sets, table and pavilion proportions, crown-height rounding, approximate volume, silhouette, closed edges, outward winding, convex optical planes and the two catalog assignments. Sunstone has no cut or render path.

## Peridot reconstruction specification

Read directly from `PeridotDiagram.jpg`: “Computer Generated Peridot Round Brilliant”, Jim Perkins, copyright February 2019. Preserve attribution in normalized design metadata. Check permission before distributing the source diagram. The printed 92% face-up brilliance is a design claim, not a measurement of our stone or renderer.

- Design IOR 1.650; 8-fold mirror symmetry; 96 index.
- Printed count: 57 + 16 girdles = 73 facets.
- Ratios: L/W 1.000, T/W 0.570, U/W 0.570, P/W 0.420, C/W 0.151, volume/W^3 0.201.
- P1 41.50 degrees: 03-09-15-21-27-33-39-45-51-57-63-69-75-81-87-93; cut to T.C.P.
- P2 90.00 degrees: same indices as P1; size and polish girdle facets.
- P3 40.00 degrees: 96-12-24-36-48-60-72-84; P.C.P. and G.M.P.
- C1 41.00 degrees: same indices as P1; set girdle height and level girdle.
- C2 35.00 degrees: 96-12-24-36-48-60-72-84; G.M.P.
- C3 20.50 degrees: 06-18-30-42-54-66-78-90; meet point at C1, C1.
- C4 0.00 degrees: table; meet point at C2, C3.

Angles alone do not specify all plane offsets. Solve offsets using meet instructions and the printed proportions, documenting assumptions and any disagreement rather than forcing a match. The old round generator cannot represent these tiers faithfully.

## Implementation sequence

1. Confirm the six filename-to-stone matches and any carat/dimension/material facts with the studio. Keep missing values null. Create one shared catalog source for storefront and visualizer with stable stone IDs, display names, photo paths, cut IDs, design attribution, optical settings, readiness status, and provenance. Preserve old catalog data separately as legacy reference. Reject old query IDs unless intentionally mapped; do not send an old ruby link to a different ruby automatically.
2. Prepare actual photo assets in `images/showcase/`: retain originals privately, produce consistently framed responsive JPEG/WebP variants, remove metadata, preserve visible color and inclusions, write factual alt text, and check the tiny red garnet crop at mobile size. Use photos as the primary gallery image. The old showcase README lists retired sample filenames; replace that guidance during this step.
3. Build normalized facet-plane data in a tracked `data/cuts/` folder. Start with peridot as the reconstruction reference. Then parse the Sophia Dome ASC, transcribe the Mini-Portuguese PDF, and validate the decoded Squartuguese binary against a readable export if one becomes available. Preserve angle/index conventions, offsets, symmetry, source references, and design versus material IOR separately. Share the Mini-Portuguese design between garnet and ruby only after checking actual cutting differences. Sunstone remains photo-only until its pattern is supplied.
4. Extend the existing renderer to consume the normalized planes/mesh directly instead of GeometryGenerator. Intersect half-spaces, triangulate polygons, preserve facet identities, and feed the same exact planes to the optical shader and illustrative rays. Verify the 256-plane texture limit; fail clearly rather than truncate. Keep the synthetic generators and their tests available as development reference, without public selection controls.
5. For each ready stone, publish a photograph plus clearly labeled “Cut render” with a matching camera orientation. Use a static render thumbnail first and load interactive WebGL on demand. Show “Render in preparation” for missing geometry; never substitute an unrelated preset. Materials approximate appearance; photos remain the record of the finished stone. Color-change garnet needs documented lighting examples before claiming a simulated color change.
6. Replace the public waiting sections with the shared catalog output, only enabling matching renders after validation. Keep all old templates and modules archived. Update README, showcase asset instructions, visualizer metadata/intro, and storefront promo to describe actual available content. Publish no invented stock, price, origin, weight, or availability.

## Acceptance checks

- Peridot has the intended 73 design facets (count polygons, not triangulation faces), the stated indices/angles and proportions within a recorded tolerance, closed edges, outward normals, and a convex volume. Resolve any source inconsistency explicitly.
- Validate ASC parsing against known tiers and handle unsupported records explicitly. Compare all reconstructed designs with their source top/side/pavilion diagrams; do not accept matching silhouettes alone.
- Confirm each photo, catalog entry, static thumbnail, interactive model, export, and URL uses the same stone ID. Check ruby/garnet shared-design handling and missing sunstone pattern.
- Browser checks at desktop and mobile: photos load, responsive crops retain the stone, keyboard controls work, photo/render labels stay clear, missing assets and WebGL failure have usable fallbacks, no horizontal overflow or console errors.
- Old sample cards, catalog options, default diamond, and generic cut selector must never appear publicly, including with legacy query strings. Retained renderer geometry tests must still pass.
- Verify ignored raw sources are absent from Git and deployment output. Review the selected images and verified renders before replacing the waiting sections.

## Visualizer control defaults

Fine quality and color dispersion are enabled by default. Dispersion is under Display Options. Auto-rotation is an enabled-by-default toggle at one turn per 40 seconds. Brilliance/refraction controls are removed from the public interface while their fixed optical settings remain in the renderer. Baked overlays have been regenerated with Fine quality and dispersion, without rotation.

The visualizer opens and resets to a side profile, with auto-rotation enabled at one turn per 40 seconds. The quality card is removed; Fine quality (10 internal bounces) is fixed internally. Baked photo overlays retain their explicit camera recipe.

## Consolidated visualizer information

The gem-name card contains the summary, cut name, designer/design attribution, material/design IORs, facet count and index gear. The former Stone information and Facet breakdown cards are removed. A shared generic disclaimer appears only on the render card; detailed source assumptions remain documented in the cut data and this plan. Pending designs clear previous facet details when selected.

## Performance cleanup

The retained demo interface is stored in legacy/showcase.html and legacy/visualizer.html, with its parametric renderer/catalog in legacy/parametric-previews.js. Public pages do not load them. Live rendering uses a two-pass motion path, pauses offscreen/hidden, and reuses cut data and shared Mini-Portuguese geometry. See PERFORMANCE_REVIEW.md for the dependency inventory and measurements. Baked image hashes are unchanged.
