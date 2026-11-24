# NEXORA — Enter a New Dimension of Shopping

> *Don't browse products. Enter their world.*

NEXORA is an explorable 3D shopping universe set in 2055. You start in deep space among floating islands, cathedral ribs and an orbital ring. You fly through a portal into the **Fashion Dimension**, pull garments out of the air, turn them in 360°, try them on an avatar, compose outfits and watch them walk a runway. A second working dimension, **Tech**, uses the same engine.

Built with React 19, TypeScript, Vite 8, Three.js r187, React Three Fiber 9, drei 10, GSAP, Framer Motion, Zustand 5, Tailwind CSS 4 and Lucide.

---

## Quick start

Requires **Node 20+** (tested on Node 25.7, npm 11.10).

```bash
npm install
npm run dev
```

Open **http://localhost:5180**, wait for the loader, then press **Enter NEXORA**.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload on port 5180 |
| `npm run build` | Type-check, then a production build into `dist/` |
| `npm run preview` | Serve the production build on http://localhost:4180 |
| `npm run typecheck` | TypeScript only |

### URL switches

| URL | Effect |
| --- | --- |
| `?quality=high` / `balanced` / `lite` | Force a render tier (normally auto-detected) and stop auto-downgrades |
| `?fallback=1` | Force the 2D catalogue that devices without WebGL get |
| `?fx=none` | Turn off post-processing on the Cinematic tier |

---

## The experience

1. **Loader.** The NEXORA wordmark resolves out of blur while real loading progress runs: engine chunk, fabric weaving, shader compile. You enter deliberately, with or without ambient sound.
2. **Universe.** A cinematic reveal flies you in through clearing fog. A glowing path of stepping islands leads to the **Fashion Dimension** portal. Tech is open too. Living, Lifestyle and Mobility are sealed portals marked as opening later.
3. **Portal.** Hovering changes the portal's architectural light: fins speed up, strips brighten, the field energises. Clicking or pressing Enter flies you up to the gate and through it. A warp tunnel covers the scene swap, and you emerge through an arrival ring inside the new world.
4. **Fashion Dimension.** Five zones surround an atrium, each with its own architecture and display system:
   - **A Streetwear:** a floating chrome rail, titanium slabs and a ring of hanging panels
   - **B Luxury:** a corridor of chrome arches, rotating plinths and a suspended mannequin
   - **C Essentials:** a wall of frosted glass fins and framed pieces
   - **D Sneakers:** a lit column with a helix of levitating platforms
   - **E Accessories:** a gyroscope of rings and glass orbs
5. **Discovery.** Drag, swipe, scroll or use the arrow keys. The carousel has inertia and snapping. The centred piece is active, and hovering shows a name tag.
6. **Extraction (signature).** Select a piece and it detaches from its fixture, lifts, and glides toward you. The camera moves to a studio position and the hall dims behind a veil. The key light becomes a studio light, and the product panel slides in.
7. **360° viewer.** Drag to rotate with inertia, scroll or pinch to zoom, and use the Front / Side / Back / Detail presets or reset. Hotspots cover fabric, stitching, pockets, buttons, zips and the logo, and hide when they face away. Detail mode turns the product to each hotspot. Closing puts the piece back in the exact slot it came from.
8. **Fitting pod.** At the atrium, the central sculpture rises away and a scan line reveals your avatar wearing the outfit. There are 4 preset avatars. You can change colours and sizes per piece and read a *simulated* fit meter.
9. **Outfit composer.** Candidates for each slot (tops, outerwear, bottoms, footwear, accessories) orbit behind the avatar. Tap one to wear or remove it. The composer shows the combined price, can save the outfit to the wishlist, or add it all to the bag.
10. **Runway.** Your current and saved outfits walk first, then 4 curated looks. A mannequin glides on a hover disc and the camera tracks it. You can shop or wear any look.
11. **Companion.** A floating assistant that knows the whole catalogue: weekend trip, matching jacket, minimalist outfit, something unusual, outfit under ₹10,000, sizing. Product cards fly you to the piece, even in another dimension.
12. **Commerce.** Bag as a spatial side panel: change colour, size and quantity, remove lines. The subtotal includes taxes (Indian MRP); delivery is free from ₹2,999. There's a **checkout preview** with an honest demo order, a wishlist (pieces and outfits), and persistence across scenes and reloads.

### Controls

| | Mouse / trackpad | Keyboard | Touch |
| --- | --- | --- | --- |
| Look around (universe) | Drag | ← → / A D | Swipe sideways |
| Move forward / back | Scroll | ↑ ↓ / W S | Swipe up / down, pinch |
| Enter the portal you face | Click it | Enter | Tap it |
| Browse products | Drag (inertia), scroll | ← → | Swipe |
| Change zone | Zone dial | 1–5, Q / E | Zone dial |
| Pull a piece out | Click the centred piece | Enter | Tap / product card |
| Rotate / zoom | Drag / scroll | ← → / + − (0 resets) | Drag / pinch |
| Hotspots on/off · try on | Buttons | H · T | Buttons |
| Back one step | ✕ buttons | Esc | ✕ buttons |
| Reset camera | Settings → Reset camera | R | Settings |

---

## Architecture

```
src/
  App.tsx                      WebGL check → 3D world (lazy) + DOM interface; crash → 2D catalogue
  types.ts                     Product, ModelRef (procedural spec + optional GLB), BodyProfile, ...
  data/
    dimensions.ts              DIMENSION REGISTRY: portals, zones, display systems, status
    products.ts + catalog/     26 products (21 fashion, 5 tech), INR prices, hotspots, sizes
    avatars.ts  looks.ts       preset avatars, curated runway looks
  store/
    experienceStore.ts         scene, dimension transition, zone, selection, mode, panels, audio, quality
    shoppingStore.ts           variants, bag, wishlist, outfits, avatar (persisted to localStorage)
    motion.ts                  per-frame interaction state outside React (no re-renders while dragging)
    rig.ts                     camera shot the CameraRig damps toward (3D chunk only)
  scenes/
    registry.ts                lazy scene chunks: add a dimension = data entry + one line here
    UniverseScene.tsx          the universe, explorer camera, portal focus, intro and return
    FashionScene.tsx  TechScene.tsx    DimensionWorld + a hall theme
    ProductScene.tsx           extraction + 360° inspection stage
    FittingRoomScene.tsx       fitting pod + spatial outfit composer
    RunwayScene.tsx            runway show
  components/
    experience/   Canvas, CameraRig, flight (GSAP), TransitionDirector, WarpTunnel, WarmUp, Effects, DimensionWorld
    universe/     SpaceSky (baked), FloatingIsland, Megastructures, Atmosphere (clouds, light shafts, dust, glow path)
    portals/      Portal
    fashion/      layout, hall, zone architecture, fixtures
    product/      ProductModel, ProductVisual, ProductGLB, DisplayItem, DiscoveryCarousel, Hotspots
    fitting-room/ WornOutfit, SuspendedMannequin, FittingPanel, RunwayPanel
    shopping/     ProductPanel, Pickers, SidePanel, BagPanel, CheckoutPreview, WishlistPanel
    interface/    Loader, TopBar, ZoneDial, Companion, Settings/Profile, Hint, Toasts, TransitionOverlay,
                  GestureLayer, KeyboardController, ProductImage, Fallback
  lib/
    garments/     procedural garment engine (lofted super-ellipse geometry), incl. new shield shades
    tech/         procedural headphones, watch, phone, earbuds, speaker
    fabric.ts     11 procedural fabric textures (normal + detail), generated at load
    tryon/        fit engine + integration contracts (body scan, cloth draper, fit model)
    companion/    CompanionProvider interface, local rule-based provider, remote provider stub
    audio.ts      WebAudio sound design (no audio files)
    assets.ts     GLB manifest loader
```

### Adding a shopping dimension

1. Add products with `dimension: 'living'` and zones to `data/catalog/`.
2. In `data/dimensions.ts`, set the dimension to `status: 'active'` and give it zones (each zone picks a display system).
3. Add `living: lazy(() => import('./LivingScene'))` to `scenes/registry.ts`. `LivingScene` is a `<DimensionWorld id="living" theme={...} />`.

The universe, portal, warp, inspector, bag, wishlist and companion all pick it up automatically. **Tech** was added exactly this way.

---

## What's real, what's simulated, what's a placeholder

| Area | Status |
| --- | --- |
| 3D products | **Procedural placeholders, real geometry.** Garments are lofted around hanger or body forms with stitching, zips, pockets, buttons and logo patches. Devices are modelled from primitives. They are clearly labelled in the product panel. |
| Production GLBs | **Wired, none shipped.** Put a GLB in `public/models/` and map it in `public/models/manifest.json` (or set `model.glb`). It lazy-loads with the procedural model as placeholder and falls back to it on error. |
| Product images | Generated **vector silhouettes** (`ProductImage`). Icons, not photos. |
| Virtual try-on | **Simulated.** Garments are re-lofted around preset avatars with size-dependent ease. There is no cloth physics and no body scan. The fit meter compares size charts with preset measurements, and the UI says so. Seams for real scanning and cloth simulation are in `lib/tryon/contracts.ts`. |
| AI companion | **Local and rule-based.** It reads the real catalogue and builds real outfits (budget solver, pairing scores). `lib/companion/remote.ts` shows how to connect a model through your own backend endpoint. |
| Checkout | **Preview only.** No payment gateway, nothing is charged, and the demo order says so. |
| Sound | Generated in the browser. **Off by default.** |
| Sky | A procedural nebula baked once into a cube texture, with live twinkling stars on top. |

---

## Performance

| Tier | Auto-picked for | What changes |
| --- | --- | --- |
| **Cinematic** (`high`) | Discrete GPUs | Mirror floor (MeshReflectorMaterial), bloom + vignette + ACES via the composer, physical fabrics with sheen, full-detail worn garments |
| **Balanced** | Integrated GPUs, capable tablets | Glossy env-mapped floor, no post-processing, standard fabrics, lighter glass blur |
| **Lite** | Phones, software GPUs | Lower-poly garments, fewer particles and fins, no suspended mannequin, opaque glass, lower resolution |

- A performance monitor lowers render resolution below about 52 fps and steps the tier down if that isn't enough. Choosing a tier in Settings locks it.
- Three.js, R3F and drei are **code-split**. The entry bundle has no Three.js (UI about 140 kB gzip). The 3D engine (about 300 kB gzip across its chunks), each scene and post-processing load lazily while the loader plays.
- Garment parts are **merged per material**, and repeated parts (zip teeth, fins, columns, panels, discs) are **instanced**.
- The light count never changes. Changing it would recompile every shader, so there's one key spot that re-aims for zones, inspection and the fitting pod.
- New scenes compile their shaders with `compileAsync` while the warp tunnel plays. Fabrics are woven and fashion garments pre-built in idle callbacks.
- Interaction state (carousel inertia, rotation, camera targets) lives outside React.

**Measured on this laptop's Intel UHD Graphics (Chromium, Direct3D 11), Balanced tier:**

| View | 1280×760 | 1920×1080 |
| --- | --- | --- |
| Universe | 60 fps | 60 fps |
| Fashion Dimension (browsing) | 60 fps | 53 fps |
| Product inspection | 60 fps | 56 fps (adaptive resolution settles at 1.1×) |
| Fitting pod | 46–48 fps | not measured |
| Tech Dimension | 60 fps | not measured |
| Phone emulation 390×844, Lite | 60 fps | — |

Real phones have not been measured; the phone numbers come from desktop emulation on this GPU.

---

## Quality assurance

Automated Playwright scripts in `qa/` drive the real app on your GPU and save screenshots to `qa/shots/`:

```bash
npm i -D playwright && npx playwright install chromium
npm run dev
node qa/e2e.cjs        # 31 checks: loader, universe, portal, zones, carousel, extraction, 360, colour/size/bag/wishlist, fitting, composer, runway, bag, checkout, companion, Tech, inactive portals
node qa/mobile.cjs lite   # phone size + touch: swipes, tap portal, carousel, extraction, rotation, fallback
node qa/comfort.cjs    # reduced motion, sound off by default + toggle, Esc, persistence across reload
node qa/tiers.cjs high # a render tier at a given size: node qa/tiers.cjs balanced 1920 1080
```

The last run passed every check with no console errors. The only console message is a deprecation warning from inside React Three Fiber (`THREE.Clock`), which isn't NEXORA code.

## Known limits

- The garments are stylised procedural stand-ins, not photo-real scans.
- Try-on has no cloth physics, and sizing is chart-based on preset avatars.
- Only Fashion and Tech are open. Living, Lifestyle and Mobility are sealed portals.
- The fitting pod is the heaviest view: just under 50 fps on Intel UHD at 1280×760 on Balanced.
- Fonts come from Google Fonts; offline, the app falls back to system fonts.
- Prices are illustrative sample INR prices.
