# WORLDSEED

**Bring the little worlds back to life.**

WORLDSEED began as a focused Three.js **Tiny Worlds** prototype and is now a five-chapter authored planetary campaign. It is a one-input orbital slingshot game: drag the living seed backwards, release it into the gravity wells of miniature planets, choose where to land, and rebuild a connected constellation one awakening at a time.

The polished Meadow → Ember → Frost journey is the prologue and visual benchmark. First Light expands it with branching routes, a one-use Seedstone, a deterministic asteroid, optional Arc mastery and a physical system exit. Broken Belt, Wandering Garden and Long Night then deepen spatial, moving-body and timing decisions before the Worldheart finale recombines them into the campaign's largest restoration payoff.

## Play

The current `main` build is deployed at **https://southers.github.io/WORLDSEED/**.

The authored chapters can also be selected directly for development and replay:

- **Broken Belt:** https://southers.github.io/WORLDSEED/?system=broken-belt
- **Wandering Garden:** https://southers.github.io/WORLDSEED/?system=wandering-garden
- **The Long Night:** https://southers.github.io/WORLDSEED/?system=long-night
- **Worldheart finale:** https://southers.github.io/WORLDSEED/?system=worldheart

### Release smoke test

Use a clean browser at a desktop viewport and again at a portrait mobile viewport:

1. Confirm five worlds, the glowing seed, two gold route rings, three cyan stardust motes, the blue `SEEDSTONE · 1 USE` and the labelled orbiting asteroid render without console errors. Confirm the HUD reads `WORLDS 0 / 4 · ARC 0 / 3` and the separate Worldheart objective reads `0 / 3` without overlap.
2. Land on the Seedstone; confirm the counter remains `0 / 4`, the next world suggestions are shown from its new launch position, and the stone disappears after one launch.
3. Land on Grove first; confirm its joined-root arch, saplings and slow root-vein pattern awaken, `1 / 4` is shown and the next suggestions become FROST/EMBER. Reset, reach Tide through Ember or a gravity assist, and confirm its moving water bands and repeating crest relief awaken without losing the route UI.
4. Aim across the asteroid's visible orbit; confirm a future collision turns the prediction red. Release and confirm `ASTEROID IMPACT`, fast recovery to the last restored world, and that waiting can open the same route.
5. Aim the expressive Meadow-to-Frost arc through the three motes; confirm the predicted motes turn gold and the outcome reports `ARC +3`. Release in a clear Wayfarer window, then confirm live flight collects exactly `3 / 3` and awakens Frost.
6. Launch into empty space; confirm the seed returns to its last world in under one second after leaving the play area.
7. Use Reset (and `R` on desktop); confirm the world and Arc counters, all three motes, Seedstone use, asteroid phase, worlds, route labels and opening seed position reset.
8. Awaken any three dormant worlds; confirm `WORLDHEART ROUTE OPEN`, a gold physical Worldheart destination and copy explaining the choice between leaving and earning Bloom.
9. Aim at the Worldheart; confirm a gold `WORLDHEART LOCKED` prediction. Land there and verify the constellation summary awards Heart while Bloom and Arc reflect the actual run.
10. On another run, awaken all four worlds and complete the Arc before entering the Worldheart; confirm Heart, Bloom and Arc are all earned, then use Play again and verify a clean reset.
11. Rotate or resize during an attached shot; confirm the current launch node, counters and instruction remain unchanged and the system reframes without clipping.
12. Check keyboard focus: the canvas and buttons show a visible outline, `M` toggles audio, `R` resets, completion focuses Replay/Continue, and replay returns focus to the canvas.
13. With reduced motion enabled at operating-system or browser level, confirm camera follow and impact shake stop and the Worldheart resolves directly to its final restored state.

## Current checkpoint

The current build includes:

- deterministic spherical gravity;
- drag-to-launch pointer controls;
- trajectory prediction using the same physics model as the live seed;
- outcome-driven landings on any physical destination rather than a scripted target order;
- a validated authored-system definition that keeps world physics, visual identity, story, tactical bodies, route emphasis, objectives and mastery content together;
- isolated mutable runtime state cloned from authored content so Reset and future systems do not mutate their source definitions;
- a selectable six-world Broken Belt chapter with Relay/Kiln/Loom/Shard/Drift/Vault routes, a tactical Splinter, the orbiting Sentinel and a physical Belt Heart exit;
- a selectable six-world Wandering Garden chapter with a deterministic orbiting Pollen Moon that carries the attached seed, a moving Thornwing hazard and a physical Garden Heart exit;
- six new low-cost Garden silhouettes—sheltering arches, flower lamps, clustered treetops, giant petals, droplets and woven ribs—restored through the existing planet-wrapping wave;
- a selectable six-world Long Night chapter with heavier gravity wells, longer routes, an authored dark lighting palette, deterministic Eclipse timing and a four-world Night Heart gate;
- six Long Night silhouettes—watchfires, swept flames, empty bells, star rays, crescents and a prism—merged into their restoration surfaces;
- a selectable six-world Worldheart finale that recombines safe and long openings, a moving Memory Moon, Last Shadow timing, a gravity Arc and a physical four-world core gate;
- six finale silhouettes that braid the campaign's arches, roots, flames, signal rings, petals, star fins and memory prisms into new one-call worlds;
- a 3.4-second system-scale ending where the restored routes light from the physical core, five pulse rings cross the system, sparks fill the constellation and the environment blooms before the final summary;
- six low-cost authored silhouettes whose signal rings, vents, linked arches, crystal crown, wave crests and vault ribs grow inside the same one-call restoration surface;
- two suggested route choices with world-space HUD labels and a single instanced beacon draw call;
- persistent restored launch nodes, so landing order changes the next useful geometry;
- gold new-world locks, green safe-landing locks and explicit no-landing feedback;
- a blue one-use Seedstone that provides a temporary launch position without increasing world progress;
- a deterministic asteroid on a visible authored orbit, sampled at the same future fixed steps by prediction and live flight;
- red predicted-collision feedback plus fast `ASTEROID IMPACT` recovery;
- a three-pickup Meadow-to-Frost Arc whose motes turn gold under a matching prediction and persist as `ARC 3 / 3` mastery for the run;
- provisional flight pickups that bank only on a valid landing, so crashing after an Arc restores that shot's motes instead of awarding failed mastery;
- a compact three-world Worldheart threshold, gold physical exit shot and honest Heart/Bloom/Arc completion summary;
- a concise awakening memory for every world, shown inside the existing restoration flow without pausing control;
- deterministic `CLOSE PASS`, `GRAVITY ASSIST` and `CLEAN LANDING` accolades derived from the successful live flight;
- one-call Grove root-arch and Tide wave-crest landmarks with animated biome patterns alongside the three benchmark worlds;
- world collisions and landing;
- configurable planet-wrapping restoration waves driven by spherical distance from impact;
- staged surface growth, atmosphere bloom and world motion behind each restoration wave;
- an authored Meadow diorama with a cottage, pond, trees, flowers, grass, stones and ambient motes;
- distinct Ember and Frost dioramas with volcanic basalt and lava, crystalline ice, authored landmarks and biome-specific ambience;
- procedural Web Audio cues for aim, launch, flight, close passes, impact, restoration, failure and victory;
- an adaptive three-layer ambient score that builds as worlds awaken, with a one-tap mute control;
- adaptive mobile pixel density, background pause/resume and WebGL context-recovery handling;
- polite route announcements, completion-dialog focus management, visible focus rings, 44px touch controls and a reduced-motion presentation path;
- versioned internal module and stylesheet URLs so rapid static deployments cannot mix stale assets;
- miniature lighting, soft shadows and restrained biome motion;
- out-of-bounds recovery;
- victory and reset loops;
- mobile-friendly pointer input;
- framework-free physics tests.

Meadow, Ember and Frost remain the full diorama benchmark. Grove and Tide now carry a deliberate lightweight identity without spending extra draw calls: Grove reveals a joined-root arch, clustered saplings and slow root veins, while Tide reveals moving water bands and repeating crest relief around its circumference. They remain compact route worlds rather than full dioramas, preserving room for the larger authored systems.

The current playable build is the tactical First Light prototype and compatibility fixture for the authored-system pipeline. Grove-first recommends Frost/Ember next, while Ember-first recommends Tide/Frost; authored suggestions prioritise those useful branches but every world remains physically landable. The Seedstone creates an optional setup route, while the asteroid turns launch timing into a visible decision instead of a random failure. The Arc places three optional motes on an expressive Meadow-to-Frost curve: prediction promises the pickup count, and timing Wayfarer determines whether the player completes it. Three awakenings open the Worldheart route; entering it completes Heart immediately, while all four worlds and all three motes separately earn Bloom and Arc. Pipeline browser evidence covers both desktop opening branches, portrait void recovery, the complete Ember → Tide → Frost → Worldheart path and Play again. The measured run peaked at 179 draw calls with a clean console.

Broken Belt is the first content-pipeline chapter. Relay opens toward the safe direct Kiln route or the higher Loom route, whose curved prediction collects all three Arc motes. Kiln continues naturally toward Drift, while Vault offers a compact setup angle toward Shard and the Belt Heart. Three awakenings open the exit; Shard and Loom remain optional depending on route order, so Heart, Bloom and Arc represent genuinely different goals. Browser evidence covers both desktop openings and a complete 390×844 Relay → Kiln → Drift → Vault → Shard → Belt Heart run at 22 peak draw calls.

Wandering Garden is the first moving-launch chapter. Bower again opens with two immediately legible worlds, but the orbiting Pollen Moon periodically crosses useful trajectories. Landing on it does not increase world progress: instead the seed rides the cyan orbit until the player chooses a changing launch angle, after which the moon crumbles. Thornwing guards the Crown side of the Garden and rewards waiting or changing destination. Three awakenings open the Garden Heart while two worlds remain optional for Bloom. Browser evidence covers the desktop Bower → Lantern → Pollen Moon interaction and a complete 390×844 timed Pollen Moon → Nest → Crown → Canopy → Garden Heart run, including hazard recovery and close-pass feedback, with no console warnings or errors.

Long Night escalates through route geometry instead of a new verb. Vigil offers the readable Pyre line or the much longer Hollow commitment; an optional three-mote arc bends all the way into Beacon, but Eclipse makes the immediate prediction red until its deterministic orbit clears. The chapter requires four awakenings before the Night Heart route opens and banks Arc motes only after survival. Browser evidence covers both desktop openings, the blocked and cleared full Arc, and a complete 390×844 Vigil → Pyre → Umbra → Beacon → Hollow → Night Heart run with failure recovery, close-pass feedback, Replay reset, 20 peak draw calls and no console warnings or errors.

Worldheart is the campaign payoff rather than another escalation mechanic. Confluence offers Kindle's readable line or Memory's four-second commitment; Memory exposes an orbiting one-use Moon, while the direct three-mote Starwell Arc begins behind Last Shadow's deterministic timing window. Four awakenings make the physical core the first suggested route from every launch node, while a fifth world remains optional for Bloom. The final landing delays the summary for a 3.4-second system-wide light pulse. Desktop and 390×844 runs both completed Confluence → Kindle → Dawn → Starwell → Memory → Worldheart, verified the corrected exit guidance, gravity-assist feedback and Replay reset, and peaked at 23 / 22 draw calls with clean consoles.

Campaign hardening now records viewport, orientation, page activity, WebGL availability and reduced-motion state on the canvas for browser evidence without changing simulation. All five chapters load cleanly at 1280×720 and 390×844, preserve their launch node across an 844×390 rotation and remain under the 180-call ceiling. A real portrait touch gesture missed, recovered to Meadow, then landed on Ember with the expected fixed-step launch; reset restored the authored opening and both footer controls measured 44px high. The browser console remained free of warnings and errors. Background-tab visibility could not be forced by the automation surface, so that handler remains an explicit manual release check rather than a claimed browser result.

Completing First Light offers **Continue to BROKEN BELT**, Broken Belt offers **Continue to WANDERING GARDEN**, the Garden offers **Continue to THE LONG NIGHT**, and Long Night offers **Continue to WORLDHEART**. The campaign frontier offers **Replay WORLDHEART**, preserving a clear journey without hiding direct `?system=<id>` chapter links used for testing and replay.

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

Registered authored systems can be selected during development with `?system=<id>`. Unknown identifiers safely fall back to the First Light campaign entry, and the canvas exposes the resolved system identifier for smoke-test automation.

## Validate physics

```bash
npm test
npm run check
```

## Validate the release package

The local audit verifies required release files, versioned internal URLs, credits, copy, all three 1200×600 showcase images and the H.264 review clip. The online audit additionally checks the deployed development page, runtime modules, public thumbnail and public clip MIME types.

The current media set comes from a completed build `20260814-7s` Worldheart playthrough. It shows the branching finale opening, a late awakening, the physical route unlock, the system-scale pulse and the final constellation rather than the superseded three-world prototype. The silent review clip is 10.5 seconds at 1200×600, H.264 High, 30 fps and standard `yuv420p` colour range.

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

For this jam, the verified final action is replying to the [organizer's announcement](https://x.com/dangreenheck/status/2087399084940239337) by 19 August 2026 at 00:00 UTC with the playable link and Tiny Worlds explanation prepared in `SUBMISSION.md`. That reply remains strictly user-controlled.

## Project guide

- `AGENTS.md` defines the implementation objective, priorities and quality gates.
- `DESIGN.md` defines the player promise, core loop and scope.
- `JAM_PLAN.md` defines the campaign milestones, validation gates and cut order.
- `src/content.js` defines and validates authored systems before mutable runtime state is created.
- `CREDITS.md` tracks every external dependency and asset.
- `SUBMISSION.md` is the working entry package and final user-approval checklist.
