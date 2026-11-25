# Baked photo overlays

Each ready stone has a 384 x 384 transparent PNG cut render and a matching transparent `{stone-id}-wireframe.svg`. Photos display the render at the upper right and wireframe at the upper left, with no extra WebGL instances. Sunstone remains photo-only.

Generate all pairs with `node tools/bake-previews.cjs`. Validate freshness with `node tools/bake-previews.cjs --check` and transparency with `node tests/bake-check.cjs`. Commit assets with manifest.json. See [RENDER_BAKING.md](../../RENDER_BAKING.md) for the recipe, reproducible export workflow and another-tool integration contract.

Geometry sources: Sophia Dome ASC, decoded binary Squartuguese GEM, reconstructed peridot diagram, and the shared Mini-Portuguese PDF reconstruction for ruby/red garnet. Materials are representative; these images are design illustrations rather than photographs or stone scans.
