# WORLDSEED Submission Working Package

> **FINAL APPROVAL REQUIRED:** Keep this package current and use it to prepare the entry, but do not trigger the final external Submit or Publish action without the user's explicit confirmation at that moment.

## Links

- Play: https://southers.github.io/WORLDSEED/
- Source: https://github.com/Southers/WORLDSEED
- Credits: https://github.com/Southers/WORLDSEED/blob/main/CREDITS.md

## Title

**WORLDSEED**

## One-line pitch

Slingshot a living seed across connected tiny planets, use one-shot Seedstones, outthink predictable asteroids and awaken a route to the Worldheart.

## Short description

WORLDSEED is a one-input orbital slingshot campaign built with Three.js. Drag the seed backwards, trust the gravity-curved trajectory, choose between tiny worlds and tactical launch bodies, and time your route around deterministic asteroids while reconnecting a path to the Worldheart.

## Long-form description

### Bring the little worlds back to life

WORLDSEED is a focused Three.js orbital slingshot game about carrying life through a sequence of miniature planetary systems.

Drag the glowing seed backwards and release it into the gravity wells of a connected miniature system. The trajectory preview uses the same deterministic fixed-step simulation as live flight—including the future position of moving hazards—so every curved shot is yours. Land successfully and a luminous restoration wave wraps around the planet from the exact impact point, growing its diorama, atmosphere, motion and music in sequence.

- **One expressive input:** drag and release with mouse, pen or touch.
- **A five-chapter journey:** First Light teaches the seed's purpose; Broken Belt introduces fractured routes; Wandering Garden adds a moving launch window; Long Night demands longer gravity commitments; and Worldheart recombines every decision before the campaign's largest restoration.
- **A trustworthy gravity toy:** prediction and live flight share one deterministic simulation.
- **Readable tactical routes:** one-use Seedstones and a moving moon create new launch geometry, while orbiting asteroids turn future collisions red before release.
- **Optional mastery:** each system's three-mote Arc rewards an expressive route; predicted pickups glow before release and bank only after a successful landing.
- **A clear objective:** awaken enough worlds to expose each physical Worldheart exit, or keep routing to earn the optional Bloom and Arc emblems before leaving.
- **Story through play:** every awakening reveals one short memory, while close passes and gravity assists celebrate expressive routes without interrupting the next choice.
- **Immediate recovery:** failed shots return the seed quickly, preserving experimentation.
- **An authored transformation:** every landing awakens colour, landmarks, ambience and another layer of the procedural score.
- **A true finale:** the physical Worldheart landing lights every restored route, sends a pulse across the whole system and resolves the last seed's journey before the final constellation appears.
- **Desktop and mobile ready:** responsive framing, touch controls, adaptive pixel density and a mute control.

No downloaded art or audio assets are used. The dioramas, particles, shaders, music and sound effects are generated in code; Three.js is the sole runtime dependency.

### Controls

- Drag backwards from the glowing seed and release to launch.
- Press **R** or tap **Reset** to restart.
- Press **M** or tap **Audio** to toggle sound.

### Theme: Tiny Worlds

The tiny worlds are both the subject and the mechanic. Their curved surfaces create the gravity puzzle, their miniature landmarks make each landing readable, and awakening an entire planet turns a successful shot into a visible world-scale reward. The game is deliberately scoped to a polished authored journey across connected desk-toy systems rather than an infinite universe.

### Technology

- Three.js r179, pinned and vendored for CDN-independent startup
- Framework-free JavaScript and Web Audio
- Deterministic 120 Hz fixed-step physics shared by prediction and live flight
- Procedural geometry, shaders, particles, music and sound effects

## Screenshot set

1. `submission/thumbnail.png` — 1200×600 Worldheart restoration hero with the system-scale route pulse.
2. `submission/opening.png` — 1200×600 finale opening showing the last seed, branching destinations, moving moon and Last Shadow.
3. `submission/victory.png` — 1200×600 final Worldheart constellation and campaign resolution.

## Showcase clip

`submission/worldseed-showcase.mp4` is a silent 10.5-second, 1200×600 H.264 progression through the authentic final campaign payoff: the Worldheart opening, Starwell awakening, physical route unlock, system-scale restoration pulse and final constellation. It is assembled only from captures produced by a completed deterministic playthrough of the deployed build.

## Verified entry route

Checked against the organizer's live announcement on 14 August 2026:

- **Entry destination:** reply to Dan Greenheck's original Three.js game-jam post: https://x.com/dangreenheck/status/2087399084940239337
- **Deadline:** Wednesday, 19 August 2026 at 00:00 UTC (01:00 BST).
- **Required reply content:** a playable-demo link and a short explanation of how the game incorporates **Tiny Worlds**.
- **Rules:** use Three.js; incorporate the theme significantly; build from scratch; AI tools are allowed; external assets are allowed when properly credited.
- **Judging:** Art, Creativity, Gameplay, Polish and Theme, each scored from 1–10.
- **Media:** the announcement does not require an image or video upload. The prepared images and clip remain available if the user chooses to attach one.

### Prepared reply

> WORLDSEED is a one-input Three.js gravity game where each tiny world is both terrain and trajectory: slingshot the last seed, awaken miniature dioramas, and reconnect the Worldheart. Play: https://southers.github.io/WORLDSEED/

The irreversible external action is posting that reply on X. Open the post and prepare the reply if useful, but do not press **Reply**, **Post** or an equivalent publishing control without the user's explicit confirmation at that moment.

## Final release evidence

- Public build: `20260814-7s` at https://southers.github.io/WORLDSEED/
- Pages deployment: https://github.com/Southers/WORLDSEED/actions/runs/31792011265 (passed)
- Automated gates: 52 deterministic tests, syntax checks, local release audit and online release audit passed.
- Browser coverage: all five chapters at 1280×720 and 390×844; rotation at 844×390; real portrait miss recovery, landing and Reset; public desktop/mobile smoke; clean consoles.
- Media: public opening, thumbnail, victory image and showcase clip match their reviewed local files byte-for-byte.
- Manual check still required at handoff: background the game during an unfinished drag, return, and confirm the shot is cancelled with no physics time jump. The automation browser does not expose a true `document.hidden` transition.

## Preparation checklist

- [x] Confirm the current submission fields, rules, deadline and media requirements.
- [x] Refresh the title, descriptions and Tiny Worlds explanation against the completed campaign.
- [x] Verify the public URL from a clean desktop and mobile browser.
- [x] Run `npm test`, `npm run check` and `npm run release:online`.
- [x] Confirm the source repository is public and `CREDITS.md` is current.
- [x] Refresh the thumbnail, screenshots and showcase clip from the final build.
- [x] Prepare every required entry field and present the final reply to the user for review.

## Final action

- [ ] Obtain the user's explicit confirmation at the final Reply or Post step.
- [ ] Only after that confirmation, publish the reply and record its URL.

Published submission URL: _pending_
