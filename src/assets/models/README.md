# assets/models

No production 3D files ship with the prototype. Every product is built procedurally in `src/lib/garments` (fashion) and `src/lib/tech` (devices).

To use real models, put GLB files in `public/models/` and register them in `public/models/manifest.json` (or set `model.glb` on a catalogue entry). They lazy-load with the procedural model as the placeholder. Optimise first, for example `npx gltf-transform optimize in.glb out.glb --texture-compress webp`.

