# WORLDSEED Campaign Development Plan

This roadmap replaces the former five-day prototype plan with a campaign-scale development plan. Submission preparation remains a valid final milestone, but the final external action is always user-controlled.

> Never trigger the final Submit or Publish action without the user's explicit confirmation at that moment.

## Milestone 0 — Campaign foundation

- Lock the campaign premise, system loop and route-choice vocabulary.
- Treat Meadow → Ember → Frost as the polished prologue.
- Preserve deterministic shared physics, one-input controls, fast recovery and the restoration spectacle.
- Replace automatic submission language with an explicit final-confirmation gate.

Exit: the repository describes one coherent larger game and clearly separates submission preparation from the user-approved final action.

## Milestone 1 — Branching-system prototype

- Add two greybox destinations to a development version of the current system.
- Allow the trajectory outcome, rather than a scripted sequence, to select any valid target.
- Keep restored worlds available as persistent launch nodes.
- Make landing order change the next set of useful shots.
- Provide at least one safe route and one harder but strategically valuable route.

Exit: a playtester can make a meaningful destination choice and explain it.

Checkpoint: implemented in First Light with Grove/Ember opening choices, Tide/Frost route divergence, persistent safe launch nodes, gold/green outcome feedback and deterministic prediction/live tests. Awaiting player feedback before final art.

## Milestone 2 — Tactical small bodies

- Add one clearly identified Seedstone as a temporary launchpad.
- Add one deterministic orbiting asteroid with a legible trajectory.
- Represent future asteroid collisions in the same trusted prediction system.
- Add a small optional stardust route that rewards an expressive gravity assist.

Exit: asteroids introduce planning and timing without surprise failure or visual clutter.

Checkpoint: complete in First Light with a blue one-use Seedstone, the visible deterministic Wayfarer orbit, future-step red collision prediction, fast impact recovery and an authored three-mote Arc from Meadow to Frost. Prediction highlights every promised mote and reports `ARC +N`; live flight collects through the same fixed steps. Desktop and portrait-mobile prove the Arc's timing choice—an immediate attempt can meet Wayfarer, while waiting opens a safe 3 / 3 route—and remain within the 180-call budget.

## Milestone 3 — System objective and meta loop

- Add a compact life/Worldheart progress display.
- Open the system exit after an authored restoration threshold.
- Track the Heart, Bloom and Arc mastery emblems.
- Add a system-completion transition and a simple constellation overview.
- Decide whether campaign progress needs local persistence only after the loop is proven.

Exit: the player understands the immediate shot, the current system objective and the campaign purpose.

Checkpoint: complete in First Light with an always-visible three-pip Worldheart objective, a route that unlocks after three of four dormant worlds, a physical gold exit governed by the shared deterministic prediction/live simulation, and a constellation summary that awards Heart while independently recording full-world Bloom and three-mote Arc. The player may exit early or keep routing for mastery. Desktop and 390×844 portrait-mobile completion are proven through real launch, landing, route-opening, Worldheart and Play again flows. The portrait run stayed within budget at 179 peak draw calls with no console warnings or errors.

## Milestone 4 — Story and feedback

- Add one-line awakening memories without blocking control.
- Add route-opening, near-miss, gravity-assist and mastery feedback.
- Tell each system's miniature story through restored landmarks and motion.
- Ensure UI copy remains concise and readable on a narrow phone.

Exit: the player can describe what the seed is doing and why the journey matters.

Checkpoint: complete in First Light. The opening names the last living seed and its Worldheart destination; every world carries a concise awakening memory in the existing non-blocking restoration panel; and successful fixed-step flights can report `CLOSE PASS`, `GRAVITY ASSIST` or `CLEAN LANDING` without changing prediction or controls. Grove now awakens slow root veins, a joined-root arch and saplings; Tide awakens moving water bands and repeating crest relief around its circumference. Both landmark sets are merged into their existing surface draw call and grow through the same restoration shader. Desktop Grove, 390×844 Tide, reset, void recovery, changed follow-up routes and a full mobile Worldheart completion passed in-browser at 179 / 180 peak draw calls with a clean final console.

## Milestone 5 — The Broken Belt vertical slice

- Replace greybox destinations with five to seven authored worlds, moons and Seedstones.
- Give every destination a clear silhouette, route purpose and restoration identity.
- Tune multiple viable completion routes.
- Bring lighting, audio, restoration, camera work and mobile performance to the current prologue's quality bar.

Exit: one complete branching system feels like a real game chapter rather than an expanded demo.

Pipeline checkpoint: First Light now runs from a validated pure-data authored-system definition covering world physics, visual keys, restoration identity, story, tactical bodies, deterministic orbits, route emphasis, objective threshold and stardust. Runtime state is cloned from that definition, authored suggestions remain non-restrictive, and the release audit requires the content module. Twenty-seven deterministic tests plus desktop branch-order checks and a full 390×844 Worldheart run prove behavioural compatibility at 179 / 180 peak draw calls. The Broken Belt content itself remains the next checkpoint.

Presentation checkpoint: objective pips, completion copy, constellation nodes and edges now come from the selected authored definition. A registry-backed `?system=<id>` development route safely falls back to First Light and marks the active canvas, giving Broken Belt one presentation path instead of system-specific UI branches.

Playable slice checkpoint: Broken Belt now contains six authored worlds—Relay, Kiln, Loom, Shard, Drift and Vault—plus the one-use Splinter, deterministic Sentinel and physical Belt Heart exit. Relay offers a direct Kiln line or a high Loom line carrying the complete three-mote Arc; the central Vault changes follow-up geometry; three awakenings open the exit while two optional worlds preserve Bloom replay value. Every world has distinct merged landmark geometry, restoration colour and awakening memory. Deterministic tests cover both opening landings, the full Loom Arc and a Shard-to-Belt-Heart prediction/live match. Desktop branch checks and a 390×844 Relay → Kiln → Drift → Vault → Shard → Belt Heart completion establish the first complete chapter route at 22 peak draw calls.

## Milestone 6 — Authored campaign

- Build the Wandering Garden and Long Night systems using the proven content pipeline.
- Escalate spatial problems without stacking unrelated mechanics.
- Keep optional mastery routes separate from basic completion.
- Use short story fragments and constellation progress to connect the systems.

Exit: the campaign sustains choice, mastery and emotional progression across multiple systems.

Progression checkpoint: First Light's Worldheart summary now offers an explicit continuation into Broken Belt, while the current campaign frontier offers a chapter replay. Both use the same authored-system registry and URL entry path, so direct chapter links, recovery and browser smoke tests remain available without a second game loop. Wandering Garden and Long Night content remain the next checkpoints.

Wandering Garden checkpoint: the campaign now continues from Broken Belt into a six-world living system—Bower, Lantern, Canopy, Crown, Dew and Nest—with distinct one-call silhouettes and awakening memories. Its Pollen Moon is a true deterministic moving launch node: the trusted preview and live flight meet it on the same fixed step, an attached seed rides its orbit, aiming refreshes as the launch origin moves, and the moon disappears after its one launch. Thornwing creates a second readable moving risk, while three awakenings open the physical Garden Heart. Deterministic tests cover both opening branches and a timed Canopy-to-Moon route. Desktop proved Lantern and Moon landings; a 390×844 run proved timed Bower → Pollen Moon → Nest, Thornwing impact/recovery, close-pass feedback, alternate routing, three awakenings and Garden Heart completion with a clean console. Long Night remains the next campaign checkpoint.

Long Night checkpoint: the campaign now continues into six darker authored worlds—Vigil, Pyre, Hollow, Beacon, Umbra and Lumen—with a distinct environment palette and one-call silhouettes. The safe Vigil-to-Pyre shot takes more than two seconds, the alternate Hollow opening is a four-second commitment, and the full three-mote Vigil-to-Beacon gravity arc begins under a predicted Eclipse collision before a short wait opens the route. Failed flights now roll their provisional stardust back, so Arc mastery requires a landing. Four awakenings open the physical Night Heart while one world remains optional for Bloom. Forty-six deterministic tests cover both openings, the Eclipse timing window, full Arc, failed-flight rollback and Night Heart prediction/live agreement. Desktop proved both openings and the banked Arc; 390×844 proved Vigil → Pyre → Umbra → Beacon → Hollow → Night Heart, failure recovery, close-pass feedback, completion and Replay at 20 peak draw calls with a clean console. The authored campaign milestone is complete; the Worldheart finale is next.

## Milestone 7 — Worldheart finale, polish and submission readiness

- Build a final system that recombines the established route vocabulary.
- Deliver the largest restoration payoff without breaking the visual grammar.
- Profile desktop and mobile performance across the complete campaign.
- Test loading, resize/orientation, backgrounding, recovery, reset and completion paths.
- Finish accessibility, credits, documentation, public build, screenshots, showcase media and entry copy.
- Verify the intended submission surface and prepare a final handoff for the user.

Exit: WORLDSEED is a polished, reliable, submission-ready game. Stop before the final external Submit or Publish action and obtain the user's explicit confirmation.

Finale checkpoint: the campaign now advances from Long Night into a six-world Worldheart chapter—Confluence, Kindle, Memory, Starwell, Dawn and Chorus. It recombines the proven safe/long opening, orbiting one-use launch node, deterministic timing hazard, heavy gravity well and banked three-mote Arc before a four-world physical core gate. Once unlocked, the core becomes the first authored suggestion from every launch node. Landing there triggers a 3.4-second pooled system restoration—route lines, expanding rings, deterministic sparks and an environment bloom—before the final constellation summary. Fifty-two deterministic tests cover the finale contract, both openings, Last Shadow timing, full Arc, moving Memory Moon prediction/live agreement and core prediction/live agreement. Desktop and 390×844 completed Confluence → Kindle → Dawn → Starwell → Memory → Worldheart; mobile also verified corrected exit guidance and Replay reset. The runs peaked at 23 / 22 draw calls with clean consoles. Campaign-wide profiling, lifecycle/accessibility checks and final media remain before milestone exit.

Hardening checkpoint: the interface now separates polite route announcements from the rapid aim
meter, exposes canvas instructions and keyboard shortcuts, moves focus into and back out of the
completion dialog, guarantees visible focus and 44px touch targets, and honors reduced motion in
both CSS and the Three.js presentation path. Viewport/orientation and lifecycle state are published
for browser evidence. All five chapters loaded at 1280×720 and 390×844 within budget; Worldheart
preserved Confluence through rotation to 844×390; and a real portrait drag proved miss recovery,
Meadow-to-Ember landing, pointer focus and Reset with a clean console. The background visibility
transition remains on the manual release checklist because the browser test surface did not mark
its controlled tab hidden. Final screenshots, showcase media and the public release gate remain.

## Validation gate for every milestone

1. Run `npm test` and `npm run check`.
2. Play the affected journey at desktop and portrait-mobile aspect ratios.
3. Verify deterministic prediction, launch, landing, failure recovery and reset.
4. Verify every newly introduced decision has distinct, understandable outcomes.
5. Record browser evidence and keep `main` playable.

## Cut order

If scope becomes too large, cut optional stardust layouts first, then secondary story fragments, then secondary worlds within a system. Never cut control clarity, deterministic prediction, meaningful route choice, fast recovery, the restoration wave, mobile reliability or the Worldheart through-line.
