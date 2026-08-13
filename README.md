# WORLDSEED

**Bring the little worlds back to life.**

WORLDSEED began as a focused Three.js **Tiny Worlds** prototype and is now growing into an authored planetary campaign. It is a one-input orbital slingshot game: drag the living seed backwards, release it into the gravity wells of miniature planets, choose where to land, and rebuild a connected constellation one awakening at a time.

The polished Meadow → Ember → Frost journey is the prologue and visual benchmark. The current First Light prototype now adds Grove and Tide as lightweight route-test worlds, proving compact branching systems and persistent restored launch nodes before tactical Seedstones, predictable asteroids, optional route mastery and the wider Worldheart campaign are built.

## Play

The current `main` build is deployed at **https://southers.github.io/WORLDSEED/**.

### Release smoke test

Use a clean browser at a desktop viewport and again at a portrait mobile viewport:

1. Confirm five worlds, the glowing seed, two gold route rings and the GROVE/EMBER labels render without console errors.
2. Land on Grove first; confirm `1 / 4` and that the next suggestions become FROST/EMBER.
3. Reset, land on Ember first; confirm the next suggestions instead become TIDE/FROST.
4. Launch into empty space; confirm the seed returns to its last world in under one second after leaving the play area.
5. Use Reset (and `R` on desktop); confirm the counter, worlds, route labels and opening seed position reset.
6. Awaken Grove, Ember, Frost and Tide in any reachable order; confirm `4 / 4`, the First Light victory panel and Play again.

## Current checkpoint

The current build includes:

- deterministic spherical gravity;
- drag-to-launch pointer controls;
- trajectory prediction using the same physics model as the live seed;
- outcome-driven landings on any physical destination rather than a scripted target order;
- two suggested route choices with world-space HUD labels and a single instanced beacon draw call;
- persistent restored launch nodes, so landing order changes the next useful geometry;
- gold new-world locks, green safe-landing locks and explicit no-landing feedback;
- lightweight Grove and Tide route prototypes alongside the three authored worlds;
- world collisions and landing;
- configurable planet-wrapping restoration waves driven by spherical distance from impact;
- staged surface growth, atmosphere bloom and world motion behind each restoration wave;
- an authored Meadow diorama with a cottage, pond, trees, flowers, grass, stones and ambient motes;
- distinct Ember and Frost dioramas with volcanic basalt and lava, crystalline ice, authored landmarks and biome-specific ambience;
- procedural Web Audio cues for aim, launch, flight, close passes, impact, restoration, failure and victory;
- an adaptive three-layer ambient score that builds as worlds awaken, with a one-tap mute control;
- adaptive mobile pixel density, background pause/resume and WebGL context-recovery handling;
- versioned internal module and stylesheet URLs so rapid static deployments cannot mix stale assets;
- miniature lighting, soft shadows and restrained biome motion;
- out-of-bounds recovery;
- victory and reset loops;
- mobile-friendly pointer input;
- framework-free physics tests.

Meadow, Ember and Frost meet the authored diorama and mobile-scale silhouette bar. Grove and Tide intentionally remain low-cost greybox spheres: their purpose is to prove that choosing a destination, changing launch position and routing through restored worlds is fun before they receive final art.

The current playable build is the branching First Light prototype. Grove-first recommends Frost/Ember next, while Ember-first recommends Tide/Frost; every world remains physically landable regardless of the suggestion. Desktop and 390×844 mobile regression reach the complete `4 / 4` Worldheart-facing victory at a measured peak of 180 draw calls.

### Visual budget

- Keep the complete scene below roughly 180 draw calls during a restoration wave.
- Retain the device-pixel-ratio cap of 2 (1.5 on phone-sized viewports), adaptive fill-rate fallback and the single 1024px key-light shadow map.
- Cast dynamic shadows only from planets, the seed and large silhouette props.
- Keep biome ambience pooled or fixed-size: Meadow uses 24 motes, Ember 30 sparks, Frost 34 motes and flight uses 22 trail particles.
- Avoid per-frame geometry, material, vector or particle allocation in render loops.
- Treat stable 60 fps desktop and 30 fps mobile as the minimum final-profile targets.

## Run locally

The pinned Three.js ESM runtime modules are vendored, so no package installation or third-party CDN is required. Serve the repository rather than opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Validate physics

```bash
npm test
npm run check
```

## Validate the release package

The local audit verifies required release files, versioned internal URLs, credits, copy, all three 1200×600 showcase images and the H.264 review clip. The online audit additionally checks the deployed development page, runtime modules, public thumbnail and public clip MIME types.

```bash
npm run release:check
npm run release:online
```

## Controls

- Drag backwards from the seed and release to launch.
- `R` resets the run.
- `M` toggles all audio.
- The Reset button provides the same action on touch devices.

## Submission approval boundary

Submission preparation is part of the roadmap: keep the public build, credits, entry copy and showcase media current. The final external Submit or Publish action must never be triggered without the user's explicit confirmation at that moment.

## Project guide

- `AGENTS.md` defines the implementation objective, priorities and quality gates.
- `DESIGN.md` defines the player promise, core loop and scope.
- `JAM_PLAN.md` defines the campaign milestones, validation gates and cut order.
- `CREDITS.md` tracks every external dependency and asset.
- `SUBMISSION.md` is the working entry package and final user-approval checklist.
