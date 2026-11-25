# Performance review — revision-cleanup

## Findings and completed fixes

The live optical shader is the principal cost: default dispersion evaluates three color paths, each with up to 10 internal bounces against the cut's facet planes. Fine quality, dispersion, maximum initial zoom, side-profile orientation and one rotation per 40 seconds have been retained. The storefront uses baked images and creates no WebGL contexts.

| Area | Before | After |
| --- | --- | --- |
| Moving-frame render passes | 3: sample, history, presentation | 2: sample and presentation; history is unnecessary during motion |
| Hidden/offscreen visualizer | Animation continued while the canvas was offscreen | Visibility/viewport observers suspend and resume a single animation loop |
| Switching ruby ↔ red garnet | Rebuilt identical Mini-Portuguese geometry | Reuses geometry and changes material uniforms |
| Cut JSON loading | Requested on every selection | Cached and shared by cut ID; failed requests remain retryable |
| Scene lighting objects | Hemisphere plus three directional lights unused by the custom shader | One direction transform; shader cubemap lighting is unchanged |
| Canvas multisample AA | Enabled although gem geometry renders into offscreen targets | Disabled; the existing 12-sample still refinement remains |
| Per-frame temporary math objects | New size vectors and inverse matrices | Reused scratch objects; invisible sparkle updates skipped |
| Archived interfaces | Inert templates downloaded with live pages | Reference HTML in `legacy/`, never fetched by the site |
| Demo renderer | Generic generators, demo catalog and initializer downloaded with the live renderer | Moved into `legacy/parametric-previews.js`, with regression tests retained |
| Shared catalog | Included storefront card-building code on the visualizer | Data only; card construction belongs to `script.js` |

Stopping/resuming rendering resets the animation timestamp, so returning to the canvas does not cause a rotation jump. Visible rotation uses elapsed time rather than a capped frame delta, preserving the intended period on slower frames. Pausing rotation still allows the existing 12 still-image samples to finish; subsequent settled frames issue no GPU draws.

## File-size measurements

These are local raw bytes and Node gzip estimates, not claims about hosting compression or network timings.

| Public file | Before raw / gzip | After raw / gzip |
| --- | ---: | ---: |
| `index.html` | 13,956 / 3,943 | 9,190 / 3,196 |
| `visualizer.html` | 16,415 / 4,029 | 8,842 / 2,865 |
| `visualizer.js` | 26,609 / 8,086 | 19,992 / 6,306 |
| `catalog.js` | 5,282 / 1,955 | 2,934 / 1,149 |

Three.js is still the largest script at 603,451 raw bytes (149,999 gzip estimate). It is required by the interactive renderer and is not loaded on the storefront or for the pending sunstone design. No framework, package manager runtime, analytics library or new dependency was added.

## Dependency and resource inventory

- Storefront: `index.html`, `styles.css`, catalog data, `script.js`, fonts, responsive photos, baked PNG/SVG pairs. Both photo sizes are intentional: the browser selects the appropriate one. Geometry and Three.js are not loaded.
- Visualizer: its HTML/CSS, catalog data and selection controller, then Three.js, `visualizer.js`, `studio-renderer.js`, `cut-geometry.js`, and `optics-effects.js`. Each serves an existing feature. Rays and sparkle remain optional display toggles; they do not animate their effects while hidden. Each distinct cut is fetched once per page session.
- Normalized cut JSON: required by the live renderer and bake tools. Squartuguese's source polygon data also supports decoder verification. Its 67,251 raw bytes compress to about 5,837 bytes in the local gzip estimate; a separate stripped runtime format was not added merely to save this small compressed payload.
- `legacy/`: retained because preserving demo designs was requested. The public pages do not load these files. The old duplicate catalog snapshot was consolidated only after comparing its material/stone records with the retained demo module.
- `tools/`, `tests/`, bake recipe/manifest and documentation: development and reproducibility resources, not browser dependencies. They remain necessary to regenerate and verify the site's derived assets. The browser does not fetch or execute the Node tools.
- `TemporaryResources/`, `tmp/`, original email and reference attachments: ignored working files, not production inputs. Continue excluding them from directory-copy deployments.

The procedural studio environment is generated once per renderer and reused. Its cubemap remains necessary for the optical shader. The removed Three.js scene lights did not contribute to that shader's lighting; replacing them did not change any baked output.

## Validation

- Automated browser checks: correct catalog/photo overlays, zero storefront WebGL/canvas instances, one Mini-Portuguese JSON request for ruby/garnet, identical shared geometry ID across those selections, no rendering frames while offscreen, hidden-tab pause/resume, and no console exceptions or WebGL errors.
- Default behavior: 10 bounces, dispersion enabled and a 40-second visible rotation period remain verified.
- `node tests/render-performance-check.cjs`: two-pass motion, stationary refinement, settled GPU idle, hidden/offscreen suspension, and no parallel animation loops.
- Existing geometry/catalog/GEM/PDF reconstruction tests pass, including all retained generic cuts.
- All five baked PNGs and five SVGs were regenerated; their hashes are identical to the pre-cleanup outputs. The updated manifest passes freshness and transparency checks.

The short headless-browser timing samples were too small/quantized to justify an FPS or overall percentage-speedup claim. Two versus three render passes is a measured reduction in draw work, not a promise of 33% faster ray tracing. Physical mobile devices and native GPU profiling remain useful before release. Further reducing the shader cost would require an explicit quality/resolution/frame-rate tradeoff; the requested visual defaults were preserved in this pass.

This review was completed on the revision-cleanup branch.

## Follow-up code necessity review

Removed remaining legacy-only parameter controls, catalog selection and informational labels from the public renderer class. These methods now live in the legacy adapter, and all 24 generic-cut regression configurations still pass. The live constructor requires a supplied cut unless the legacy adapter has explicitly been loaded.

Archived the pre-cleanup visualizer stylesheet in legacy/visualizer-styles.css and removed live CSS selectors for the old viewer layout, removed information cards, photo panels and unused loading placeholder. Visualizer CSS fell from 7,866 to 6,103 bytes (about 22%). The public renderer also dropped from 19,992 to about 18,300 bytes.

Removed the redundant JavaScript smooth-scroll handler: native anchor navigation uses the existing CSS smooth scrolling, including its reduced-motion rule. Removed custom-material transmission properties that were only written and never read; the actual transmission uniform remains. Removed the unused scene.environment assignment; the optical shader still receives its required cubemap directly. Unsupported float-texture contexts are now explicitly disposed and released before a retry.

Retained resources have concrete roles: responsive photo variants, cut JSON and PNG/SVG overlays support the published catalog; optical effects support visible display toggles; Three.js supports interactive rendering; tools, recipe, manifest and tests support reproducible asset generation; legacy files preserve the requested references. Private source materials and temporary verification helpers remain ignored. No additional runtime library or package was introduced.

### Open functional finding

The commission form in script.js prevents normal submission and displays a local confirmation. It does not send the email/details anywhere. This is not unused code to delete: a real delivery workflow needs a separate implementation decision before calling the site production-ready. No external messages or submissions were added during cleanup.

Browser checks cover the public gallery, five designs, consolidated information card, same-stone reselection, mobile overflow, side profile, maximum initial zoom, Fine/dispersion defaults and rotation toggle. Geometry, decoding, lifecycle and baked-asset checks remain required. Review changes are maintained on revision-cleanup.

## Repeated-code sweep

Viewer and baker now use the same source/material assignment and source-switching methods. Zoom clamping and rotation-rate setup also have single implementations. Geometry centering is shared by live rendering and SVG export, including the required optical-plane distance adjustment. Tier trigonometry is calculated once per tier instead of once per facet.

The baker avoids rebuilding the initial geometry, reuses Mini-Portuguese geometry across ruby/garnet, and generates their identical SVG once per batch. Shared test helpers cover polygon closure, signed volume and mesh convexity; source-specific expected angles, counts, proportions and binary-source comparisons remain independent. Tests also cover centered optical bounds, zoom limits, rotation period and source-switch rebuild decisions. No runtime dependency or additional network-loaded script was added.

Browser checks retain Fine quality, dispersion, side profile, shared-cut reuse, offscreen suspension and the 40-second rotation period. All ten PNG/SVG outputs remain byte-for-byte identical after regeneration.

## Pre-push regression review

Invalid replacement cuts are built before disposing the last usable mesh; failed switches restore the previous source state and retry fetches fresh cut data. Bake validation now checks recipe and individual job bindings, including duplicate jobs and output paths. Regression tests cover both cases. Source hashes normalize line endings and .gitattributes keeps repository text at LF, so fresh Windows/Linux checkouts do not report stale bakes solely because of newline conversion.
