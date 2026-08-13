# WORLDSEED

A five-day Three.js game-jam project for the **Tiny Worlds** theme.

WORLDSEED is a one-input orbital slingshot game: drag the living seed backwards, release it into the gravity wells of miniature planets, and restore every dead world you touch.

## Current checkpoint

The repository begins with the Day 1 gameplay proof:

- deterministic spherical gravity;
- drag-to-launch pointer controls;
- trajectory prediction using the same physics model as the live seed;
- world collisions and landing;
- world restoration state;
- out-of-bounds recovery;
- victory and reset loops;
- mobile-friendly pointer input;
- framework-free physics tests.

The art is intentionally placeholder geometry at this checkpoint. The next milestone is the restoration transformation and miniature-diorama art pass.

## Run locally

Because the jam build uses a pinned Three.js ESM URL, no package installation is required.

```bash
python3 -m http.server 8080
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

This project is built from scratch for the August 2026 Three.js Tiny Worlds game jam.
