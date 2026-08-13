# WORLDSEED

**Bring the little worlds back to life.**

WORLDSEED is a five-day Three.js game-jam project for the **Tiny Worlds** theme. It is a one-input orbital slingshot game: drag the living seed backwards, release it into the gravity wells of miniature planets, and restore every dead world you touch.

The committed jam scope is one polished journey across Meadow, Ember and Frost.

## Play

The current `main` build is deployed at **https://southers.github.io/WORLDSEED/**.

### Release smoke test

Use a clean browser at a desktop viewport and again at a portrait mobile viewport:

1. Confirm the title, three worlds, glowing seed and first-shot pull guide render without console errors.
2. Drag the seed away from Ember until the landing ring appears, then release; confirm Ember awakens.
3. Launch into empty space; confirm the seed returns to its last world in under one second after leaving the play area.
4. Use Reset (and `R` on desktop); confirm the counter, worlds and opening seed position reset.
5. Awaken Ember and Frost; confirm the `2 / 2` counter and victory panel, then use Play again.

## Current checkpoint

The current build includes:

- deterministic spherical gravity;
- drag-to-launch pointer controls;
- trajectory prediction using the same physics model as the live seed;
- world collisions and landing;
- configurable planet-wrapping restoration waves driven by spherical distance from impact;
- staged surface growth, atmosphere bloom and world motion behind each restoration wave;
- an authored Meadow diorama with a cottage, pond, trees, flowers, grass, stones and ambient motes;
- miniature lighting, soft shadows and restrained biome motion;
- out-of-bounds recovery;
- victory and reset loops;
- mobile-friendly pointer input;
- framework-free physics tests.

Meadow establishes the authored visual grammar and mobile-scale silhouette bar. Ember and Frost still use placeholder props and are the next worlds to receive distinct art, motion and restoration choreography.

### Visual budget

- Keep the complete scene below roughly 180 draw calls during a restoration wave.
- Retain the device-pixel-ratio cap of 2 and the single 1024px key-light shadow map.
- Cast dynamic shadows only from planets, the seed and large silhouette props.
- Keep biome ambience pooled or fixed-size: Meadow uses 24 motes and flight uses 22 trail particles.
- Avoid per-frame geometry, material, vector or particle allocation in render loops.
- Treat stable 60 fps desktop and 30 fps mobile as the minimum final-profile targets.

## Run locally

Because the jam build uses a pinned Three.js ESM URL, no package installation is required. Serve the repository rather than opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Validate physics

```bash
npm test
npm run check
```

## Controls

- Drag backwards from the seed and release to launch.
- `R` resets the run.
- The Reset button provides the same action on touch devices.

## Jam constraint

This project is built from scratch for the August 2026 Three.js Tiny Worlds game jam. The deadline is **19 August 2026 at 00:00 UTC**.

## Project guide

- `AGENTS.md` defines the implementation objective, priorities and quality gates.
- `DESIGN.md` defines the player promise, core loop and scope.
- `JAM_PLAN.md` defines the five-day execution and cut plan.
- `CREDITS.md` tracks every external dependency and asset.
