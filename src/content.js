/**
 * Pure authored-system data and validation.
 *
 * Runtime factories inject vectors and colours so this module stays testable without WebGL.
 * Mutable play state is always cloned from these definitions.
 */

const RequiredRestorationNumbers = [
  'durationSeconds',
  'waveWidth',
  'growthTrailWidth',
  'atmosphereOpacity',
  'rotationSpeed',
  'surfaceVariation',
];
const SupportedTacticalBodyKinds = new Set(['seedstone', 'hazard', 'worldheart']);

function isFiniteVector(VectorValue) {
  return VectorValue
    && Number.isFinite(VectorValue.x)
    && Number.isFinite(VectorValue.y)
    && Number.isFinite(VectorValue.z);
}

function isColorValue(ColorValue) {
  return Number.isInteger(ColorValue) && ColorValue >= 0 && ColorValue <= 0xffffff;
}

function addDuplicateIdentifierErrors(Definitions, DefinitionType, SeenIdentifiers, Errors) {
  for (const Definition of Definitions) {
    if (!Definition?.id || typeof Definition.id !== 'string') {
      Errors.push(`${DefinitionType} requires a string id.`);
      continue;
    }
    if (SeenIdentifiers.has(Definition.id)) {
      Errors.push(`Duplicate authored identifier: ${Definition.id}.`);
    }
    SeenIdentifiers.add(Definition.id);
  }
}

/** Returns every authoring error without mutating or partially instantiating the system. */
export function validateAuthoredSystemDefinition(SystemDefinition) {
  const Errors = [];
  if (!SystemDefinition || typeof SystemDefinition !== 'object') {
    return ['Authored system must be an object.'];
  }

  if (!SystemDefinition.id || typeof SystemDefinition.id !== 'string') {
    Errors.push('Authored system requires a string id.');
  }
  if (!SystemDefinition.label || typeof SystemDefinition.label !== 'string') {
    Errors.push('Authored system requires a display label.');
  }
  if (!SystemDefinition.openingBody || typeof SystemDefinition.openingBody !== 'string') {
    Errors.push('Authored system requires openingBody story copy.');
  }
  const CompletionDefinition = SystemDefinition.completion;
  for (const CompletionField of [
    'eyebrow', 'title', 'perfectTitle', 'body', 'perfectBody',
  ]) {
    if (!CompletionDefinition?.[CompletionField]) {
      Errors.push(`Authored system completion.${CompletionField} is required.`);
    }
  }

  const WorldDefinitions = Array.isArray(SystemDefinition.worlds)
    ? SystemDefinition.worlds
    : [];
  const TacticalBodyDefinitions = Array.isArray(SystemDefinition.tacticalBodies)
    ? SystemDefinition.tacticalBodies
    : [];
  const StardustDefinitions = Array.isArray(SystemDefinition.stardust)
    ? SystemDefinition.stardust
    : [];
  if (WorldDefinitions.length < 3) {
    Errors.push('Authored system requires a starting world and at least two destinations.');
  }

  const SeenIdentifiers = new Set();
  addDuplicateIdentifierErrors(WorldDefinitions, 'World', SeenIdentifiers, Errors);
  addDuplicateIdentifierErrors(TacticalBodyDefinitions, 'Tactical body', SeenIdentifiers, Errors);
  addDuplicateIdentifierErrors(StardustDefinitions, 'Stardust pickup', SeenIdentifiers, Errors);

  const StartingWorldDefinition = WorldDefinitions.find(
    (WorldDefinition) => WorldDefinition.id === SystemDefinition.startingWorldIdentifier,
  );
  if (!StartingWorldDefinition) {
    Errors.push('startingWorldIdentifier must reference an authored world.');
  } else if (StartingWorldDefinition.initiallyRestored !== true) {
    Errors.push('The starting world must be initially restored.');
  }

  const OpeningGuideTargetDefinition = WorldDefinitions.find(
    (WorldDefinition) => WorldDefinition.id === SystemDefinition.openingGuideTargetIdentifier,
  );
  if (!OpeningGuideTargetDefinition) {
    Errors.push('openingGuideTargetIdentifier must reference an authored world.');
  } else if (OpeningGuideTargetDefinition.id === SystemDefinition.startingWorldIdentifier) {
    Errors.push('The opening guide target must differ from the starting world.');
  }

  for (const WorldDefinition of WorldDefinitions) {
    if (!WorldDefinition.label || !isFiniteVector(WorldDefinition.position)) {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} requires a label and finite position.`);
    }
    if (!(WorldDefinition.radius > 0) || !(WorldDefinition.gravitationalParameter > 0)) {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} requires positive physics values.`);
    }
    if (!WorldDefinition.visualKey || typeof WorldDefinition.visualKey !== 'string') {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} requires a visualKey.`);
    }
    if (!WorldDefinition.memory || typeof WorldDefinition.memory !== 'string') {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} requires an awakening memory.`);
    }
    if (!isColorValue(WorldDefinition.aliveColor)) {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} requires an aliveColor integer.`);
    }
    if (!isColorValue(WorldDefinition.atmosphereColor)) {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} requires an atmosphereColor integer.`);
    }
    const RestorationDefinition = WorldDefinition.restoration;
    if (!RestorationDefinition || !isColorValue(RestorationDefinition.waveColor)) {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} requires restoration colour data.`);
      continue;
    }
    for (const NumberField of RequiredRestorationNumbers) {
      if (!Number.isFinite(RestorationDefinition[NumberField])) {
        Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} restoration.${NumberField} is required.`);
      }
    }
    if (
      !(RestorationDefinition.durationSeconds > 0)
      || !(RestorationDefinition.waveWidth > 0)
      || !(RestorationDefinition.growthTrailWidth > 0)
      || RestorationDefinition.atmosphereOpacity < 0
      || RestorationDefinition.atmosphereOpacity > 1
      || RestorationDefinition.surfaceVariation < 0
    ) {
      Errors.push(`World ${WorldDefinition.id ?? '<unknown>'} has invalid restoration ranges.`);
    }
  }

  const ObjectiveWorldCount = WorldDefinitions.filter(
    (WorldDefinition) => WorldDefinition.id !== SystemDefinition.startingWorldIdentifier
      && WorldDefinition.countsTowardRestoration !== false,
  ).length;
  if (
    !Number.isInteger(SystemDefinition.worldheartUnlockThreshold)
    || SystemDefinition.worldheartUnlockThreshold < 1
    || SystemDefinition.worldheartUnlockThreshold > ObjectiveWorldCount
  ) {
    Errors.push('worldheartUnlockThreshold must fit the authored objective-world count.');
  }

  const WorldheartDefinitions = TacticalBodyDefinitions.filter(
    (BodyDefinition) => BodyDefinition.kind === 'worldheart',
  );
  const SeedstoneDefinitions = TacticalBodyDefinitions.filter(
    (BodyDefinition) => BodyDefinition.kind === 'seedstone',
  );
  const HazardDefinitions = TacticalBodyDefinitions.filter(
    (BodyDefinition) => BodyDefinition.kind === 'hazard',
  );
  if (WorldheartDefinitions.length !== 1) {
    Errors.push('Authored system requires exactly one Worldheart body.');
  }
  if (SeedstoneDefinitions.length !== 1) {
    Errors.push('Current authored-system runtime requires exactly one Seedstone body.');
  }
  if (HazardDefinitions.length !== 1) {
    Errors.push('Current authored-system runtime requires exactly one deterministic hazard.');
  }
  if (
    WorldheartDefinitions.length === 1
    && WorldheartDefinitions[0].isRouteDestination !== true
  ) {
    Errors.push('Worldheart must be authored as a physical route destination.');
  }

  for (const BodyDefinition of TacticalBodyDefinitions) {
    if (!SupportedTacticalBodyKinds.has(BodyDefinition.kind)) {
      Errors.push(`Tactical body ${BodyDefinition.id ?? '<unknown>'} has an unsupported kind.`);
    }
    if (!(BodyDefinition.radius > 0)) {
      Errors.push(`Tactical body ${BodyDefinition.id ?? '<unknown>'} requires a positive radius.`);
    }
    if (BodyDefinition.kind === 'hazard') {
      if (
        !BodyDefinition.orbit
        || !isFiniteVector(BodyDefinition.orbit.centre)
        || !(BodyDefinition.orbit.radius > 0)
        || !Number.isFinite(BodyDefinition.orbit.phaseRadians)
        || !Number.isFinite(BodyDefinition.orbit.angularSpeedRadiansPerSecond)
      ) {
        Errors.push(`Hazard ${BodyDefinition.id ?? '<unknown>'} requires a deterministic orbit.`);
      }
    } else if (!isFiniteVector(BodyDefinition.position)) {
      Errors.push(`Tactical body ${BodyDefinition.id ?? '<unknown>'} requires a finite position.`);
    }
    if (BodyDefinition.kind === 'seedstone' && !(BodyDefinition.uses > 0)) {
      Errors.push(`Seedstone ${BodyDefinition.id ?? '<unknown>'} requires at least one use.`);
    }
  }

  const RouteNodeIdentifiers = new Set([
    ...WorldDefinitions.map((WorldDefinition) => WorldDefinition.id),
    ...TacticalBodyDefinitions
      .filter((BodyDefinition) => BodyDefinition.kind !== 'hazard')
      .map((BodyDefinition) => BodyDefinition.id),
  ]);
  for (const [SourceIdentifier, TargetIdentifiers] of Object.entries(
    SystemDefinition.routeSuggestions ?? {},
  )) {
    if (!RouteNodeIdentifiers.has(SourceIdentifier)) {
      Errors.push(`Route source ${SourceIdentifier} does not exist.`);
    }
    if (!Array.isArray(TargetIdentifiers) || TargetIdentifiers.length === 0) {
      Errors.push(`Route source ${SourceIdentifier} requires at least one target.`);
      continue;
    }
    if (new Set(TargetIdentifiers).size !== TargetIdentifiers.length) {
      Errors.push(`Route source ${SourceIdentifier} contains duplicate targets.`);
    }
    for (const TargetIdentifier of TargetIdentifiers) {
      if (!RouteNodeIdentifiers.has(TargetIdentifier)) {
        Errors.push(`Route target ${TargetIdentifier} does not exist.`);
      }
      if (TargetIdentifier === SourceIdentifier) {
        Errors.push(`Route source ${SourceIdentifier} cannot target itself.`);
      }
    }
  }

  const OpeningSuggestions = SystemDefinition.routeSuggestions?.[
    SystemDefinition.startingWorldIdentifier
  ];
  if (!Array.isArray(OpeningSuggestions) || OpeningSuggestions.length < 2) {
    Errors.push('The starting world requires at least two authored route suggestions.');
  }

  for (const StardustDefinition of StardustDefinitions) {
    if (!isFiniteVector(StardustDefinition.position)) {
      Errors.push(`Stardust ${StardustDefinition.id ?? '<unknown>'} requires a finite position.`);
    }
  }

  const ConstellationDefinition = SystemDefinition.constellation;
  const ConstellationNodes = Array.isArray(ConstellationDefinition?.nodes)
    ? ConstellationDefinition.nodes
    : [];
  const ConstellationEdges = Array.isArray(ConstellationDefinition?.edges)
    ? ConstellationDefinition.edges
    : [];
  const ExpectedConstellationIdentifiers = new Set([
    ...WorldDefinitions.map((WorldDefinition) => WorldDefinition.id),
    ...WorldheartDefinitions.map((WorldheartDefinition) => WorldheartDefinition.id),
  ]);
  const ConstellationNodeIdentifiers = new Set();
  for (const ConstellationNode of ConstellationNodes) {
    if (ConstellationNodeIdentifiers.has(ConstellationNode.id)) {
      Errors.push(`Duplicate constellation node: ${ConstellationNode.id ?? '<unknown>'}.`);
    }
    if (!ExpectedConstellationIdentifiers.has(ConstellationNode.id)) {
      Errors.push(`Constellation node ${ConstellationNode.id ?? '<unknown>'} does not exist.`);
    }
    if (
      !Number.isFinite(ConstellationNode.x)
      || !Number.isFinite(ConstellationNode.y)
    ) {
      Errors.push(`Constellation node ${ConstellationNode.id ?? '<unknown>'} needs finite coordinates.`);
    }
    ConstellationNodeIdentifiers.add(ConstellationNode.id);
  }
  for (const ExpectedIdentifier of ExpectedConstellationIdentifiers) {
    if (!ConstellationNodeIdentifiers.has(ExpectedIdentifier)) {
      Errors.push(`Constellation is missing node ${ExpectedIdentifier}.`);
    }
  }
  for (const ConstellationEdge of ConstellationEdges) {
    if (
      !Array.isArray(ConstellationEdge)
      || ConstellationEdge.length !== 2
      || !ConstellationNodeIdentifiers.has(ConstellationEdge[0])
      || !ConstellationNodeIdentifiers.has(ConstellationEdge[1])
    ) {
      Errors.push('Constellation edges must reference two authored nodes.');
    }
  }

  return Errors;
}

/** Throws once with every authoring error so invalid content cannot silently reach gameplay. */
export function assertValidAuthoredSystemDefinition(SystemDefinition) {
  const Errors = validateAuthoredSystemDefinition(SystemDefinition);
  if (Errors.length > 0) {
    throw new Error(`Invalid authored system:\n- ${Errors.join('\n- ')}`);
  }
  return SystemDefinition;
}

function clonePosition(Position, CreateVector) {
  return CreateVector(Position.x, Position.y, Position.z);
}

/** Creates isolated mutable runtime state from one validated authored system. */
export function createAuthoredSystemRuntime(
  SystemDefinition,
  {
    createVector = (x = 0, y = 0, z = 0) => ({ x, y, z }),
    createColor = (ColorValue) => ColorValue,
  } = {},
) {
  assertValidAuthoredSystemDefinition(SystemDefinition);

  const Worlds = SystemDefinition.worlds.map((WorldDefinition) => ({
    ...WorldDefinition,
    position: clonePosition(WorldDefinition.position, createVector),
    aliveColor: createColor(WorldDefinition.aliveColor),
    atmosphereColor: createColor(WorldDefinition.atmosphereColor),
    accentColor: Number.isInteger(WorldDefinition.accentColor)
      ? createColor(WorldDefinition.accentColor)
      : undefined,
    restored: WorldDefinition.initiallyRestored === true,
    isStartingWorld: WorldDefinition.id === SystemDefinition.startingWorldIdentifier,
    restoration: {
      ...WorldDefinition.restoration,
      waveColor: createColor(WorldDefinition.restoration.waveColor),
    },
  }));

  const TacticalBodies = SystemDefinition.tacticalBodies.map((BodyDefinition) => ({
    ...BodyDefinition,
    position: BodyDefinition.position
      ? clonePosition(BodyDefinition.position, createVector)
      : undefined,
    orbit: BodyDefinition.orbit
      ? {
        ...BodyDefinition.orbit,
        centre: clonePosition(BodyDefinition.orbit.centre, createVector),
      }
      : undefined,
    restored: BodyDefinition.initiallyRestored === true,
    routeAvailable: BodyDefinition.routeAvailableInitially === true,
  }));

  return {
    id: SystemDefinition.id,
    label: SystemDefinition.label,
    openingBody: SystemDefinition.openingBody,
    completion: { ...SystemDefinition.completion },
    constellation: {
      nodes: SystemDefinition.constellation.nodes.map((NodeDefinition) => ({
        ...NodeDefinition,
      })),
      edges: SystemDefinition.constellation.edges.map((EdgeDefinition) => [
        ...EdgeDefinition,
      ]),
    },
    startingWorldIdentifier: SystemDefinition.startingWorldIdentifier,
    openingGuideTargetIdentifier: SystemDefinition.openingGuideTargetIdentifier,
    worldheartUnlockThreshold: SystemDefinition.worldheartUnlockThreshold,
    routeSuggestions: Object.fromEntries(Object.entries(SystemDefinition.routeSuggestions ?? {}).map(
      ([SourceIdentifier, TargetIdentifiers]) => [SourceIdentifier, [...TargetIdentifiers]],
    )),
    worlds: Worlds,
    tacticalBodies: TacticalBodies,
    stardust: (SystemDefinition.stardust ?? []).map((StardustDefinition) => ({
      ...StardustDefinition,
      position: clonePosition(StardustDefinition.position, createVector),
      collected: false,
    })),
  };
}

/** Current prologue authored through the same contract future systems will use. */
export const FirstLightSystemDefinition = {
  id: 'first-light',
  label: 'FIRST LIGHT',
  openingBody: 'Carry the last living seed onward. Pull away from a gold ring, then release.',
  completion: {
    eyebrow: 'FIRST LIGHT RECONNECTED',
    title: 'The Worldheart hears you.',
    perfectTitle: 'First Light blooms perfectly.',
    body: 'A living path reaches onward. Return for the dim emblems whenever you like.',
    perfectBody: 'Every world and every arc now shines in the living constellation.',
  },
  constellation: {
    nodes: [
      { id: 'meadow', label: 'Meadow', x: 24, y: 70 },
      { id: 'grove', label: 'Grove', x: 64, y: 32 },
      { id: 'frost', label: 'Frost', x: 120, y: 18 },
      { id: 'tide', label: 'Tide', x: 184, y: 30 },
      { id: 'ember', label: 'Ember', x: 118, y: 70 },
      { id: 'worldheart', label: 'Worldheart', x: 214, y: 68, isHeart: true },
    ],
    edges: [
      ['meadow', 'grove'], ['grove', 'frost'], ['frost', 'tide'],
      ['tide', 'worldheart'], ['meadow', 'ember'], ['ember', 'tide'],
      ['grove', 'ember'],
    ],
  },
  startingWorldIdentifier: 'meadow',
  openingGuideTargetIdentifier: 'ember',
  worldheartUnlockThreshold: 3,
  routeSuggestions: {
    meadow: ['grove', 'ember'],
    grove: ['frost', 'ember'],
    ember: ['tide', 'frost'],
    frost: ['worldheart', 'tide', 'grove'],
    tide: ['worldheart', 'frost', 'ember'],
    seedstone: ['ember', 'grove'],
  },
  worlds: [
    {
      id: 'meadow', label: 'MEADOW', visualKey: 'meadow',
      position: { x: -8, y: -6.4, z: 0 }, radius: 3.35, gravitationalParameter: 92,
      aliveColor: 0x5f9b63, atmosphereColor: 0x9bcfb4, initiallyRestored: true,
      memory: 'The seed remembered rain.',
      restoration: {
        durationSeconds: 2.2, waveWidth: 0.045, growthTrailWidth: 0.18,
        waveColor: 0xe8ffc5, atmosphereOpacity: 0.15, rotationSpeed: 0.00035,
        surfaceVariation: 0.1,
      },
    },
    {
      id: 'ember', label: 'EMBER', visualKey: 'ember',
      position: { x: 7.8, y: -3.3, z: 0 }, radius: 3, gravitationalParameter: 82,
      aliveColor: 0xc47a46, atmosphereColor: 0xffbe78, initiallyRestored: false,
      memory: 'One spark had waited beneath the stone.',
      restoration: {
        durationSeconds: 2.35, waveWidth: 0.05, growthTrailWidth: 0.18,
        waveColor: 0xffdfa1, atmosphereOpacity: 0.16, rotationSpeed: 0.00125,
        surfaceVariation: 0.045,
      },
    },
    {
      id: 'grove', label: 'GROVE', visualKey: 'grove',
      position: { x: -8.8, y: 3, z: 0 }, radius: 2.05, gravitationalParameter: 44,
      aliveColor: 0x78aa66, atmosphereColor: 0xb7e5a4, accentColor: 0xc6e886,
      initiallyRestored: false, isPrototypeWorld: true, biomeStyle: 1,
      memory: 'The roots were still holding hands.',
      restoration: {
        durationSeconds: 1.85, waveWidth: 0.055, growthTrailWidth: 0.2,
        waveColor: 0xddffbc, atmosphereOpacity: 0, rotationSpeed: 0.0007,
        surfaceVariation: 0.08,
      },
    },
    {
      id: 'frost', label: 'FROST', visualKey: 'frost',
      position: { x: 0.7, y: 8, z: 0 }, radius: 3.55, gravitationalParameter: 102,
      aliveColor: 0x81b6c9, atmosphereColor: 0xbbe8f5, initiallyRestored: false,
      memory: 'Under the ice, the old ocean was still dreaming.',
      restoration: {
        durationSeconds: 2.65, waveWidth: 0.042, growthTrailWidth: 0.2,
        waveColor: 0xe4fbff, atmosphereOpacity: 0.18, rotationSpeed: 0.001,
        surfaceVariation: 0.035,
      },
    },
    {
      id: 'tide', label: 'TIDE', visualKey: 'tide',
      position: { x: 9.7, y: 6, z: 0 }, radius: 2.15, gravitationalParameter: 48,
      aliveColor: 0x4d91aa, atmosphereColor: 0x9ce7ef, accentColor: 0x9de9df,
      initiallyRestored: false, isPrototypeWorld: true, biomeStyle: 2,
      memory: 'The moon-pulled water found its rhythm.',
      restoration: {
        durationSeconds: 1.95, waveWidth: 0.052, growthTrailWidth: 0.2,
        waveColor: 0xb9fbff, atmosphereOpacity: 0, rotationSpeed: 0.00085,
        surfaceVariation: 0.06,
      },
    },
  ],
  tacticalBodies: [
    {
      id: 'seedstone', label: 'SEEDSTONE', kind: 'seedstone',
      position: { x: 0.15, y: -0.55, z: 0 }, radius: 0.72, uses: 1,
      initiallyRestored: true, countsTowardRestoration: false,
    },
    {
      id: 'wayfarer', label: 'WAYFARER', kind: 'hazard', radius: 0.66,
      countsTowardRestoration: false,
      orbit: {
        centre: { x: 0.7, y: 8, z: 0 }, radius: 5.35,
        phaseRadians: -1.18, angularSpeedRadiansPerSecond: 0.34,
      },
    },
    {
      id: 'worldheart', label: 'WORLDHEART', kind: 'worldheart',
      position: { x: -4.35, y: 8.75, z: 0 }, radius: 0.9,
      initiallyRestored: false, countsTowardRestoration: false,
      isRouteDestination: true, routeAvailableInitially: false,
    },
  ],
  stardust: [
    { id: 'first-light-arc-1', position: { x: -1.56, y: -2.72, z: 0 } },
    { id: 'first-light-arc-2', position: { x: -1.2, y: -0.45, z: 0 } },
    { id: 'first-light-arc-3', position: { x: -0.99, y: 1.45, z: 0 } },
  ],
};

/** The first full chapter: a fractured relay system held together by remembered routes. */
export const BrokenBeltSystemDefinition = {
  id: 'broken-belt',
  label: 'BROKEN BELT',
  openingBody: 'The Belt is coming apart. Choose which lost signal to wake first.',
  completion: {
    eyebrow: 'THE BROKEN BELT HOLDS',
    title: 'The first lost system answers.',
    perfectTitle: 'Every broken signal is singing.',
    body: 'A repaired path points deeper into the dark. Return for the dim emblems whenever you like.',
    perfectBody: 'Every world and every arc now carries life across the Belt.',
  },
  constellation: {
    nodes: [
      { id: 'relay', label: 'Relay', x: 22, y: 72 },
      { id: 'loom', label: 'Loom', x: 58, y: 34 },
      { id: 'shard', label: 'Shard', x: 112, y: 16 },
      { id: 'drift', label: 'Drift', x: 174, y: 30 },
      { id: 'kiln', label: 'Kiln', x: 112, y: 72 },
      { id: 'vault', label: 'Vault', x: 94, y: 46 },
      { id: 'belt-heart', label: 'Belt Heart', x: 216, y: 68, isHeart: true },
    ],
    edges: [
      ['relay', 'loom'], ['relay', 'kiln'], ['loom', 'shard'],
      ['loom', 'vault'], ['kiln', 'vault'], ['kiln', 'drift'],
      ['vault', 'shard'], ['vault', 'drift'], ['shard', 'drift'],
      ['drift', 'belt-heart'], ['shard', 'belt-heart'],
    ],
  },
  startingWorldIdentifier: 'relay',
  openingGuideTargetIdentifier: 'kiln',
  worldheartUnlockThreshold: 3,
  routeSuggestions: {
    relay: ['loom', 'kiln'],
    loom: ['belt-heart', 'shard', 'vault', 'kiln'],
    kiln: ['belt-heart', 'drift', 'vault', 'shard'],
    vault: ['belt-heart', 'shard', 'drift', 'loom'],
    shard: ['belt-heart', 'drift', 'loom'],
    drift: ['belt-heart', 'shard', 'kiln'],
    splinter: ['kiln', 'vault'],
  },
  worlds: [
    {
      id: 'relay', label: 'RELAY', visualKey: 'relay',
      position: { x: -8, y: -6.4, z: 0 }, radius: 3.35, gravitationalParameter: 92,
      aliveColor: 0x658f84, atmosphereColor: 0xa7e1c7, accentColor: 0xf4dc8f,
      initiallyRestored: true, usesMergedSurfaceLandmarks: true, biomeStyle: 1,
      memory: 'One relay had kept calling into the dark.',
      restoration: {
        durationSeconds: 2.2, waveWidth: 0.045, growthTrailWidth: 0.18,
        waveColor: 0xf6edbd, atmosphereOpacity: 0, rotationSpeed: 0.00045,
        surfaceVariation: 0.08,
      },
    },
    {
      id: 'kiln', label: 'KILN', visualKey: 'kiln',
      position: { x: 7.8, y: -3.3, z: 0 }, radius: 3, gravitationalParameter: 82,
      aliveColor: 0xb76545, atmosphereColor: 0xffad72, accentColor: 0xffcf76,
      initiallyRestored: false, usesMergedSurfaceLandmarks: true, biomeStyle: 2,
      memory: 'The furnaces had guarded one patient coal.',
      restoration: {
        durationSeconds: 2.3, waveWidth: 0.048, growthTrailWidth: 0.18,
        waveColor: 0xffd9a0, atmosphereOpacity: 0, rotationSpeed: 0.00115,
        surfaceVariation: 0.05,
      },
    },
    {
      id: 'loom', label: 'LOOM', visualKey: 'loom',
      position: { x: -8.8, y: 3, z: 0 }, radius: 2.05, gravitationalParameter: 44,
      aliveColor: 0x789a7c, atmosphereColor: 0xb9e2c5, accentColor: 0xcfe89a,
      initiallyRestored: false, usesMergedSurfaceLandmarks: true, biomeStyle: 1,
      memory: 'Its old bridges still remembered every neighbour.',
      restoration: {
        durationSeconds: 1.9, waveWidth: 0.055, growthTrailWidth: 0.2,
        waveColor: 0xe4f8bd, atmosphereOpacity: 0, rotationSpeed: 0.00065,
        surfaceVariation: 0.09,
      },
    },
    {
      id: 'shard', label: 'SHARD', visualKey: 'shard',
      position: { x: 0.7, y: 8, z: 0 }, radius: 3.55, gravitationalParameter: 102,
      aliveColor: 0x7085a8, atmosphereColor: 0xb9cdf9, accentColor: 0xd8e5ff,
      initiallyRestored: false, usesMergedSurfaceLandmarks: true, biomeStyle: 2,
      memory: 'The broken crystal held a map in every face.',
      restoration: {
        durationSeconds: 2.55, waveWidth: 0.042, growthTrailWidth: 0.2,
        waveColor: 0xe9f2ff, atmosphereOpacity: 0, rotationSpeed: 0.00095,
        surfaceVariation: 0.04,
      },
    },
    {
      id: 'drift', label: 'DRIFT', visualKey: 'drift',
      position: { x: 9.7, y: 6, z: 0 }, radius: 2.15, gravitationalParameter: 48,
      aliveColor: 0x3e7895, atmosphereColor: 0x8fdbe6, accentColor: 0xb1f0e0,
      initiallyRestored: false, usesMergedSurfaceLandmarks: true, biomeStyle: 2,
      memory: 'A quiet current was still circling home.',
      restoration: {
        durationSeconds: 1.95, waveWidth: 0.052, growthTrailWidth: 0.2,
        waveColor: 0xbdf6ff, atmosphereOpacity: 0, rotationSpeed: 0.00082,
        surfaceVariation: 0.06,
      },
    },
    {
      id: 'vault', label: 'VAULT', visualKey: 'vault',
      position: { x: 3.5, y: 1, z: 0 }, radius: 1.45, gravitationalParameter: 18,
      aliveColor: 0x7c6c91, atmosphereColor: 0xcbb8e1, accentColor: 0xf2d59c,
      initiallyRestored: false, usesMergedSurfaceLandmarks: true, biomeStyle: 1,
      memory: 'Inside the little vault, names were waiting to be spoken.',
      restoration: {
        durationSeconds: 1.7, waveWidth: 0.06, growthTrailWidth: 0.22,
        waveColor: 0xf4ddbd, atmosphereOpacity: 0, rotationSpeed: 0.00055,
        surfaceVariation: 0.07,
      },
    },
  ],
  tacticalBodies: [
    {
      id: 'splinter', label: 'SPLINTER', kind: 'seedstone',
      position: { x: -2.3, y: -1.8, z: 0 }, radius: 0.68, uses: 1,
      initiallyRestored: true, countsTowardRestoration: false,
    },
    {
      id: 'sentinel', label: 'SENTINEL', kind: 'hazard', radius: 0.68,
      countsTowardRestoration: false,
      orbit: {
        centre: { x: 0.7, y: 8, z: 0 }, radius: 5.35,
        phaseRadians: -1.18, angularSpeedRadiansPerSecond: 0.34,
      },
    },
    {
      id: 'belt-heart', label: 'BELT HEART', kind: 'worldheart',
      position: { x: -4.35, y: 8.75, z: 0 }, radius: 0.9,
      initiallyRestored: false, countsTowardRestoration: false,
      isRouteDestination: true, routeAvailableInitially: false,
    },
  ],
  stardust: [
    { id: 'broken-belt-arc-1', position: { x: -4.946, y: -3.769, z: 0 } },
    { id: 'broken-belt-arc-2', position: { x: -5.718, y: -2.29, z: 0 } },
    { id: 'broken-belt-arc-3', position: { x: -6.525, y: -0.946, z: 0 } },
  ],
};

export const DefaultAuthoredSystemIdentifier = FirstLightSystemDefinition.id;

export const AuthoredSystemDefinitions = {
  [FirstLightSystemDefinition.id]: FirstLightSystemDefinition,
  [BrokenBeltSystemDefinition.id]: BrokenBeltSystemDefinition,
};

/** Resolves a requested authored system and safely falls back to the campaign entry. */
export function getAuthoredSystemDefinition(SystemIdentifier) {
  return AuthoredSystemDefinitions[SystemIdentifier]
    ?? AuthoredSystemDefinitions[DefaultAuthoredSystemIdentifier];
}
