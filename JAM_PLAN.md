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

## Milestone 6 — Authored campaign

- Build the Wandering Garden and Long Night systems using the proven content pipeline.
- Escalate spatial problems without stacking unrelated mechanics.
- Keep optional mastery routes separate from basic completion.
- Use short story fragments and constellation progress to connect the systems.

Exit: the campaign sustains choice, mastery and emotional progression across multiple systems.

## Milestone 7 — Worldheart finale, polish and submission readiness

- Build a final system that recombines the established route vocabulary.
- Deliver the largest restoration payoff without breaking the visual grammar.
- Profile desktop and mobile performance across the complete campaign.
- Test loading, resize/orientation, backgrounding, recovery, reset and completion paths.
- Finish accessibility, credits, documentation, public build, screenshots, showcase media and entry copy.
- Verify the intended submission surface and prepare a final handoff for the user.

Exit: WORLDSEED is a polished, reliable, submission-ready game. Stop before the final external Submit or Publish action and obtain the user's explicit confirmation.

## Validation gate for every milestone

1. Run `npm test` and `npm run check`.
2. Play the affected journey at desktop and portrait-mobile aspect ratios.
3. Verify deterministic prediction, launch, landing, failure recovery and reset.
4. Verify every newly introduced decision has distinct, understandable outcomes.
5. Record browser evidence and keep `main` playable.

## Cut order

If scope becomes too large, cut optional stardust layouts first, then secondary story fragments, then secondary worlds within a system. Never cut control clarity, deterministic prediction, meaningful route choice, fast recovery, the restoration wave, mobile reliability or the Worldheart through-line.
