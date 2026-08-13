# WORLDSEED Agent Charter

## Objective

Build WORLDSEED into the strongest possible Three.js **Tiny Worlds** game-jam submission by **19 August 2026 at 00:00 UTC**.

Protect the core loop:

> launch → gravity → landing → world awakening

Prioritise visual impact, game feel, polish, reliability and theme integration over additional features.

## Non-negotiables

- Keep `main` playable at every checkpoint.
- Preserve deterministic fixed-step physics and use the same simulation for live flight and trajectory prediction.
- Retain one-input pointer/touch controls and fast recovery from failed shots.
- Treat the world-awakening transformation as the signature moment.
- Optimise for a complete three-world journey before adding mechanics or worlds.
- Add every external asset and licence to `CREDITS.md` when it enters the repository.
- Do not commit secrets, generated dependency folders or disposable capture files.

## Priority order

1. Deployable playable baseline.
2. First-shot clarity and game feel.
3. World-restoration visual system.
4. Meadow vertical-slice quality.
5. Ember and Frost at the established quality bar.
6. Audio and moment-to-moment juice.
7. Performance, mobile behaviour and reliability.
8. Submission page, screenshots, copy and final regression pass.

If work does not advance one of these priorities, defer it.

## Definition of done

For every meaningful checkpoint:

1. Run `npm test` and `npm run check`.
2. Play the complete loop in a browser at desktop and mobile aspect ratios.
3. Verify launch, landing, recovery, reset and victory behaviour.
4. Update documentation and credits when behaviour or assets change.
5. Commit a small, coherent change; merge or push only while `main` remains playable.

## Scope guardrails

Do not add walking, dialogue, inventory, combat, crafting, multiplayer, procedural simulation or complex menus during the jam. Prefer tuning, feedback and authored spectacle over new systems.
