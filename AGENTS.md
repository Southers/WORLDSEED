# WORLDSEED Agent Charter

## Objective

Develop WORLDSEED beyond its polished three-world prototype into a cohesive Three.js game about carrying life through authored planetary systems.

Protect the core loop:

> choose a destination → launch → bend through gravity → land → awaken a world → choose the next route

The campaign should preserve the immediacy and restoration spectacle of Meadow → Ember → Frost while adding meaningful route choice, tactical small bodies, lightweight story, system-level objectives and optional mastery.

## External-action approval boundary

- Keep submission copy, screenshots, video, credits and release checks current as the game develops.
- It is fine to inspect rules, prepare an entry and walk the user through the final submission.
- **Never perform the final external Submit, Publish, Enter or equivalent action without the user's explicit confirmation at that moment.**
- Never publish a marketing post or announcement on the user's behalf without the same explicit confirmation.
- Updating the existing GitHub Pages development build for approved playtesting is part of normal development; it does not authorise an external entry or announcement.

## Non-negotiables

- Keep `main` playable at every checkpoint.
- Preserve deterministic fixed-step physics and use the same simulation for live flight and trajectory prediction.
- Retain one-pointer/touch accessibility and fast recovery from failed shots.
- Treat the planet-wrapping world-awakening transformation as the signature reward.
- Make restored planets persistent launch nodes within a system so route order changes future options.
- Keep moving hazards deterministic, legible and represented by trustworthy feedback.
- Prefer authored systems and deliberate encounters over an infinite procedural universe.
- Deliver story through short awakening lines, environmental changes and system context rather than dialogue trees or cutscenes.
- Add every external asset and licence to `CREDITS.md` when it enters the repository.
- Do not commit secrets, generated dependency folders or disposable capture files.

## Priority order

1. Branching destination choice inside one compact system.
2. A clear system objective and Worldheart campaign purpose.
3. Tactical Seedstones and predictable asteroid interactions.
4. Shot feedback, route readability and optional mastery goals.
5. Lightweight story integrated into awakenings.
6. A repeatable authored-world and authored-system content pipeline.
7. Additional systems at the established visual and gameplay bar.
8. Mobile reliability, performance, accessibility and final polish.
9. Submission readiness and a user-controlled final handoff.

If work does not strengthen the core loop, player decisions, campaign progression or the signature awakening payoff, defer it.

## Definition of done

For every meaningful checkpoint:

1. Run `npm test` and `npm run check`.
2. Play the complete affected loop in a browser at desktop and mobile aspect ratios.
3. Verify launch, prediction agreement, landing, miss recovery, reset and system-completion behaviour.
4. For route changes, verify at least two valid destination choices and confirm that landing order changes the next launch position.
5. Update design documentation and credits when behaviour, scope, story or assets change.
6. Commit a small coherent change while `main` remains playable.

## Scope guardrails

Do not add walking, inventory, combat, crafting, multiplayer, randomised infinite worlds, complex dialogue, sprawling menus or an upgrade tree before the branching-system game is proven fun. Prefer spatial decisions, authored spectacle, concise feedback and replayable route mastery over feature accumulation.
