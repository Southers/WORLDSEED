# WORLDSEED

**Bring the little worlds back to life.**

WORLDSEED is a five-day Three.js game-jam project for the **Tiny Worlds** theme. It is a one-input orbital slingshot game: drag the living seed backwards, release it into the gravity wells of miniature planets, and restore every dead world you touch.

The committed jam scope is one polished journey across Meadow, Ember and Frost.

## Current checkpoint

`main` begins with a preserved Day 1 gameplay proof:

- deterministic spherical gravity;
- drag-to-launch pointer controls;
- trajectory prediction using the same physics model as the live seed;
- world collisions and landing;
- world restoration state;
- out-of-bounds recovery;
- victory and reset loops;
- mobile-friendly pointer input;
- framework-free physics tests.

The art is intentionally placeholder geometry at this checkpoint. The next milestones are public deployment, first-shot game-feel tuning and the restoration transformation.

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
