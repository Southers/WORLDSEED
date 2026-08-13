import * as THREE from 'three';

import {
  calculateDistanceSquared,
  createVector,
  findCollidingWorld,
  predictTrajectory,
  simulatePhysicsStep,
} from './physics.js';

/**
 * WORLDSEED — Day 1 gameplay checkpoint.
 *
 * The game deliberately keeps the simulation in a flat orbital plane while rendering
 * fully three-dimensional worlds. This produces immediately readable slingshot controls
 * on mouse and touch devices, while preserving spherical gravity and the visual language
 * of tiny planets floating in space.
 */

const GameCanvas = document.querySelector('#GameCanvas');
const WorldCounterElement = document.querySelector('#WorldCounter');
const InstructionPanelElement = document.querySelector('#InstructionPanel');
const InstructionTitleElement = document.querySelector('#InstructionTitle');
const InstructionBodyElement = document.querySelector('#InstructionBody');
const AimPanelElement = document.querySelector('#AimPanel');
const AimLabelElement = document.querySelector('#AimLabel');
const AimPowerFillElement = document.querySelector('#AimPowerFill');
const AimPowerValueElement = document.querySelector('#AimPowerValue');
const StatusToastElement = document.querySelector('#StatusToast');
const VictoryPanelElement = document.querySelector('#VictoryPanel');
const PlayAgainButtonElement = document.querySelector('#PlayAgainButton');
const ResetButtonElement = document.querySelector('#ResetButton');

/** Fixed-step physics makes live movement and trajectory prediction agree across frame rates. */
const FixedPhysicsStepSeconds = 1 / 120;
const MaximumFrameDeltaSeconds = 0.05;
const SeedRadius = 0.46;
const MaximumDragDistance = 6.25;
const LaunchVelocityPerDragUnit = 2.95;
const MinimumLaunchDragDistance = 0.22;
const MaximumTrajectoryPredictionSteps = 520;
const OutOfBoundsDistance = 34;
const StartingWorldIdentifier = 'meadow';

const Scene = new THREE.Scene();
Scene.background = new THREE.Color(0x06101a);
Scene.fog = new THREE.FogExp2(0x06101a, 0.012);

const Renderer = new THREE.WebGLRenderer({
  canvas: GameCanvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
Renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
Renderer.outputColorSpace = THREE.SRGBColorSpace;
Renderer.toneMapping = THREE.ACESFilmicToneMapping;
Renderer.toneMappingExposure = 1.15;

const Camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
Camera.position.set(0, 0, 42);
Camera.lookAt(0, 0, 0);

const Clock = new THREE.Clock();
const PointerRaycaster = new THREE.Raycaster();
const PointerNormalizedDeviceCoordinates = new THREE.Vector2();
const OrbitalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const PointerWorldPosition = new THREE.Vector3();
const TemporaryThreeVector = new THREE.Vector3();
const CameraLookTarget = new THREE.Vector3();
const DesiredCameraLookTarget = new THREE.Vector3();
const AimDragVector = new THREE.Vector3();
const AimLaunchVelocity = new THREE.Vector3();

let PhysicsAccumulatorSeconds = 0;
let GamePhase = 'attached';
let CurrentWorldIdentifier = StartingWorldIdentifier;
let LaunchIgnoredWorldIdentifier = null;
let IsPointerAiming = false;
let ActivePointerIdentifier = null;
let LastSafeSeedPosition = createVector();
let LastSafeWorldIdentifier = StartingWorldIdentifier;
let RecoveryTimeoutIdentifier = null;
let StatusToastTimeoutIdentifier = null;
let VictoryTimeoutIdentifier = null;
let HasLaunchedOnce = false;
let LaunchPulseLifeSeconds = 0;
let ImpactPulseLifeSeconds = 0;
let CameraImpactLifeSeconds = 0;
let SeedPhysicsState = {
  position: createVector(),
  velocity: createVector(),
};

/**
 * World definitions are intentionally compact for the greybox. `aliveColor` becomes the
 * basis of the later diorama identity, while `gravitationalParameter` is tuned for play,
 * not astronomical realism.
 */
const WorldDefinitions = [
  {
    id: 'meadow',
    label: 'MEADOW',
    position: createVector(-8.0, -6.4, 0),
    radius: 3.35,
    gravitationalParameter: 92,
    aliveColor: new THREE.Color(0x5f9b63),
    atmosphereColor: new THREE.Color(0x9bcfb4),
    restored: true,
    isStartingWorld: true,
  },
  {
    id: 'ember',
    label: 'EMBER',
    position: createVector(7.8, -3.3, 0),
    radius: 3.0,
    gravitationalParameter: 82,
    aliveColor: new THREE.Color(0xc47a46),
    atmosphereColor: new THREE.Color(0xffbe78),
    restored: false,
    isStartingWorld: false,
  },
  {
    id: 'frost',
    label: 'FROST',
    position: createVector(0.7, 8.0, 0),
    radius: 3.55,
    gravitationalParameter: 102,
    aliveColor: new THREE.Color(0x81b6c9),
    atmosphereColor: new THREE.Color(0xbbe8f5),
    restored: false,
    isStartingWorld: false,
  },
];

const WorldRuntimeByIdentifier = new Map();
const DeadWorldColor = new THREE.Color(0x575d60);
const DarkWorldColor = new THREE.Color(0x2c3337);
const RestorableWorldCount = WorldDefinitions.filter((WorldDefinition) => !WorldDefinition.isStartingWorld).length;

/**
 * Adds restrained scene lighting. The tiny-world art pass can later replace this with a
 * more authored lighting rig without changing gameplay code.
 */
function createLighting() {
  const HemisphereLight = new THREE.HemisphereLight(0xa9c6d8, 0x17212a, 1.55);
  Scene.add(HemisphereLight);

  const KeyLight = new THREE.DirectionalLight(0xfff4dc, 3.2);
  KeyLight.position.set(-12, 18, 24);
  Scene.add(KeyLight);

  const FillLight = new THREE.DirectionalLight(0x7aa3d1, 1.0);
  FillLight.position.set(18, -10, 14);
  Scene.add(FillLight);
}

/**
 * Creates a deterministic star field using a small seeded pseudo-random generator. The
 * fixed layout avoids visual popping between resets and keeps screenshots reproducible.
 */
function createStarField() {
  let RandomState = 732451;

  function nextRandomValue() {
    RandomState = (RandomState * 1664525 + 1013904223) % 4294967296;
    return RandomState / 4294967296;
  }

  const StarCount = 620;
  const StarPositions = new Float32Array(StarCount * 3);

  for (let StarIndex = 0; StarIndex < StarCount; StarIndex += 1) {
    const PositionOffset = StarIndex * 3;
    StarPositions[PositionOffset] = (nextRandomValue() - 0.5) * 92;
    StarPositions[PositionOffset + 1] = (nextRandomValue() - 0.5) * 68;
    StarPositions[PositionOffset + 2] = -8 - (nextRandomValue() * 28);
  }

  const StarGeometry = new THREE.BufferGeometry();
  StarGeometry.setAttribute('position', new THREE.BufferAttribute(StarPositions, 3));

  const StarMaterial = new THREE.PointsMaterial({
    color: 0xc9d8e1,
    size: 0.075,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });

  const StarField = new THREE.Points(StarGeometry, StarMaterial);
  Scene.add(StarField);
}

/**
 * Creates simple contour rings around a world. These are placeholder composition tools,
 * but they already make each sphere read as a self-contained miniature object rather than
 * as an arbitrary collision primitive.
 *
 * @param {number} WorldRadius - Radius of the world being decorated.
 * @param {THREE.Color} RingColor - Accent colour for restored-state rings.
 * @returns {THREE.Group} Group containing the ring meshes.
 */
function createWorldContourRings(WorldRadius, RingColor) {
  const RingGroup = new THREE.Group();

  for (let RingIndex = 0; RingIndex < 2; RingIndex += 1) {
    const RingGeometry = new THREE.TorusGeometry(
      WorldRadius * (1.01 + (RingIndex * 0.008)),
      0.015,
      4,
      96,
    );
    const RingMaterial = new THREE.MeshBasicMaterial({
      color: RingColor,
      transparent: true,
      opacity: RingIndex === 0 ? 0.12 : 0.07,
      depthWrite: false,
    });
    const RingMesh = new THREE.Mesh(RingGeometry, RingMaterial);
    RingMesh.rotation.x = Math.PI * (0.42 + (RingIndex * 0.19));
    RingMesh.rotation.y = Math.PI * (0.12 + (RingIndex * 0.17));
    RingGroup.add(RingMesh);
  }

  return RingGroup;
}

/**
 * Creates one world and records its render-time components by identifier.
 *
 * @param {object} WorldDefinition - Gameplay and visual definition for the world.
 */
function createWorld(WorldDefinition) {
  const WorldGroup = new THREE.Group();
  WorldGroup.position.set(
    WorldDefinition.position.x,
    WorldDefinition.position.y,
    WorldDefinition.position.z,
  );

  const SurfaceGeometry = new THREE.IcosahedronGeometry(WorldDefinition.radius, 5);
  const SurfaceMaterial = new THREE.MeshStandardMaterial({
    color: WorldDefinition.restored ? WorldDefinition.aliveColor : DeadWorldColor,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: false,
  });
  const SurfaceMesh = new THREE.Mesh(SurfaceGeometry, SurfaceMaterial);
  WorldGroup.add(SurfaceMesh);

  const AtmosphereGeometry = new THREE.SphereGeometry(WorldDefinition.radius * 1.09, 48, 32);
  const AtmosphereMaterial = new THREE.MeshBasicMaterial({
    color: WorldDefinition.atmosphereColor,
    transparent: true,
    opacity: WorldDefinition.restored ? 0.10 : 0.025,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const AtmosphereMesh = new THREE.Mesh(AtmosphereGeometry, AtmosphereMaterial);
  WorldGroup.add(AtmosphereMesh);

  const ContourRingGroup = createWorldContourRings(WorldDefinition.radius, WorldDefinition.atmosphereColor);
  ContourRingGroup.visible = WorldDefinition.restored;
  WorldGroup.add(ContourRingGroup);

  /**
   * Surface markers are deliberately abstract in the greybox. Their only job is to make
   * rotation and world scale legible. Day 2 replaces them with biome-specific props.
   */
  const SurfaceMarkerGroup = new THREE.Group();
  const MarkerGeometry = new THREE.ConeGeometry(0.16, 0.55, 5);

  for (let MarkerIndex = 0; MarkerIndex < 9; MarkerIndex += 1) {
    const MarkerMaterial = new THREE.MeshStandardMaterial({
      color: WorldDefinition.restored ? WorldDefinition.aliveColor.clone().offsetHSL(0, 0, 0.16) : DarkWorldColor,
      roughness: 0.92,
    });
    const MarkerMesh = new THREE.Mesh(MarkerGeometry, MarkerMaterial);
    const MarkerAngle = (MarkerIndex / 9) * Math.PI * 2;
    const MarkerLatitudeOffset = Math.sin(MarkerIndex * 1.7) * 0.42;
    const SurfaceDirection = new THREE.Vector3(
      Math.cos(MarkerAngle) * Math.cos(MarkerLatitudeOffset),
      Math.sin(MarkerAngle) * Math.cos(MarkerLatitudeOffset),
      Math.sin(MarkerLatitudeOffset),
    ).normalize();

    MarkerMesh.position.copy(SurfaceDirection).multiplyScalar(WorldDefinition.radius + 0.22);
    MarkerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SurfaceDirection);
    MarkerMesh.scale.setScalar(0.9 + ((MarkerIndex % 3) * 0.2));
    SurfaceMarkerGroup.add(MarkerMesh);
  }

  WorldGroup.add(SurfaceMarkerGroup);
  Scene.add(WorldGroup);

  WorldRuntimeByIdentifier.set(WorldDefinition.id, {
    group: WorldGroup,
    surfaceMesh: SurfaceMesh,
    surfaceMaterial: SurfaceMaterial,
    atmosphereMaterial: AtmosphereMaterial,
    contourRingGroup: ContourRingGroup,
    surfaceMarkerGroup: SurfaceMarkerGroup,
    restorationStartedAtSeconds: WorldDefinition.restored ? -Infinity : null,
  });
}

for (const WorldDefinition of WorldDefinitions) {
  createWorld(WorldDefinition);
}

/** A soft target beacon makes the intended first shot legible without adding a menu. */
const TargetBeaconGeometry = new THREE.RingGeometry(3.55, 3.68, 72);
const TargetBeaconMaterial = new THREE.MeshBasicMaterial({
  color: 0xd9f6cc,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const TargetBeaconMesh = new THREE.Mesh(TargetBeaconGeometry, TargetBeaconMaterial);
TargetBeaconMesh.position.set(7.8, -3.3, 0.08);
Scene.add(TargetBeaconMesh);

/** The seed is intentionally bright and oversized enough to remain readable on mobile. */
const SeedGroup = new THREE.Group();
const SeedCoreGeometry = new THREE.IcosahedronGeometry(SeedRadius, 2);
const SeedCoreMaterial = new THREE.MeshStandardMaterial({
  color: 0xeaf6df,
  emissive: 0x8dcc70,
  emissiveIntensity: 1.65,
  roughness: 0.35,
  metalness: 0.05,
});
const SeedCoreMesh = new THREE.Mesh(SeedCoreGeometry, SeedCoreMaterial);
SeedGroup.add(SeedCoreMesh);

const SeedHaloGeometry = new THREE.SphereGeometry(SeedRadius * 1.65, 24, 16);
const SeedHaloMaterial = new THREE.MeshBasicMaterial({
  color: 0xbceca8,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const SeedHaloMesh = new THREE.Mesh(SeedHaloGeometry, SeedHaloMaterial);
SeedGroup.add(SeedHaloMesh);

const SeedPointLight = new THREE.PointLight(0xbceca8, 2.3, 6, 2);
SeedGroup.add(SeedPointLight);
Scene.add(SeedGroup);

/**
 * An enlarged invisible sphere makes pointer acquisition forgiving on touchscreens.
 */
const SeedPointerHitGeometry = new THREE.SphereGeometry(SeedRadius * 2.3, 12, 8);
const SeedPointerHitMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const SeedPointerHitMesh = new THREE.Mesh(SeedPointerHitGeometry, SeedPointerHitMaterial);
SeedGroup.add(SeedPointerHitMesh);

/**
 * Launch preview uses a single line plus a terminal landing marker. The final art pass can
 * convert this to a dotted shader or particle trail without touching trajectory logic.
 */
const MaximumPreviewPointCount = Math.ceil(MaximumTrajectoryPredictionSteps / 4) + 2;
const TrajectoryPositionValues = new Float32Array(MaximumPreviewPointCount * 3);
const TrajectoryGeometry = new THREE.BufferGeometry();
const TrajectoryPositionAttribute = new THREE.BufferAttribute(TrajectoryPositionValues, 3);
TrajectoryPositionAttribute.setUsage(THREE.DynamicDrawUsage);
TrajectoryGeometry.setAttribute('position', TrajectoryPositionAttribute);
TrajectoryGeometry.setDrawRange(0, 0);
const TrajectoryMaterial = new THREE.LineBasicMaterial({
  color: 0xd9f6cc,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
});
const TrajectoryLine = new THREE.Line(TrajectoryGeometry, TrajectoryMaterial);
TrajectoryLine.visible = false;
TrajectoryLine.frustumCulled = false;
Scene.add(TrajectoryLine);

const LandingMarkerGeometry = new THREE.RingGeometry(0.42, 0.58, 32);
const LandingMarkerMaterial = new THREE.MeshBasicMaterial({
  color: 0xd9f6cc,
  transparent: true,
  opacity: 0.82,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const LandingMarkerMesh = new THREE.Mesh(LandingMarkerGeometry, LandingMarkerMaterial);
LandingMarkerMesh.visible = false;
LandingMarkerMesh.position.z = 0.18;
Scene.add(LandingMarkerMesh);

/** Reused rings provide launch snap and landing impact without allocating during play. */
const FeedbackPulseGeometry = new THREE.RingGeometry(0.42, 0.55, 36);
function createFeedbackPulse(Color) {
  const PulseMaterial = new THREE.MeshBasicMaterial({
    color: Color,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const PulseMesh = new THREE.Mesh(FeedbackPulseGeometry, PulseMaterial);
  PulseMesh.visible = false;
  Scene.add(PulseMesh);
  return PulseMesh;
}

const LaunchPulseMesh = createFeedbackPulse(0xd9f6cc);
const ImpactPulseMesh = createFeedbackPulse(0xfff2bc);

/** A dotted pull guide points away from the first target before the first launch. */
const PullGuideGeometry = new THREE.BufferGeometry();
const PullGuideMaterial = new THREE.LineDashedMaterial({
  color: 0xd9f6cc,
  transparent: true,
  opacity: 0.42,
  dashSize: 0.22,
  gapSize: 0.14,
  depthWrite: false,
  depthTest: false,
});
const PullGuideLine = new THREE.Line(PullGuideGeometry, PullGuideMaterial);
PullGuideLine.visible = false;
PullGuideLine.renderOrder = 20;
Scene.add(PullGuideLine);

/**
 * Creates a small trail behind the flying seed using a fixed pool of sprites represented
 * by meshes. Pooling avoids allocation spikes during rapid retries.
 */
const TrailParticlePool = [];
const TrailParticleGeometry = new THREE.SphereGeometry(0.10, 6, 4);
const TrailParticleMaterial = new THREE.MeshBasicMaterial({
  color: 0xc9efb8,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

for (let TrailParticleIndex = 0; TrailParticleIndex < 22; TrailParticleIndex += 1) {
  const TrailParticleMesh = new THREE.Mesh(TrailParticleGeometry, TrailParticleMaterial.clone());
  TrailParticleMesh.visible = false;
  Scene.add(TrailParticleMesh);
  TrailParticlePool.push({
    mesh: TrailParticleMesh,
    lifeRemainingSeconds: 0,
    maximumLifeSeconds: 0.42,
  });
}

let NextTrailParticleIndex = 0;
let TrailEmissionAccumulatorSeconds = 0;

/**
 * Converts pointer coordinates into the XY orbital plane.
 *
 * @param {PointerEvent} PointerEventData - Browser pointer event.
 * @returns {THREE.Vector3|null} Intersection position or null if the ray misses the plane.
 */
function getPointerWorldPosition(PointerEventData) {
  const CanvasBounds = GameCanvas.getBoundingClientRect();
  PointerNormalizedDeviceCoordinates.x = (
    ((PointerEventData.clientX - CanvasBounds.left) / CanvasBounds.width) * 2
  ) - 1;
  PointerNormalizedDeviceCoordinates.y = -(
    ((PointerEventData.clientY - CanvasBounds.top) / CanvasBounds.height) * 2
  ) + 1;

  PointerRaycaster.setFromCamera(PointerNormalizedDeviceCoordinates, Camera);
  const IntersectionResult = PointerRaycaster.ray.intersectPlane(OrbitalPlane, PointerWorldPosition);
  return IntersectionResult ? PointerWorldPosition : null;
}

/**
 * Returns true when the supplied pointer begins close enough to the visible seed.
 *
 * @param {PointerEvent} PointerEventData - Browser pointer event.
 * @returns {boolean} Whether the user acquired the seed.
 */
function isPointerOverSeed(PointerEventData) {
  const CanvasBounds = GameCanvas.getBoundingClientRect();
  PointerNormalizedDeviceCoordinates.x = (
    ((PointerEventData.clientX - CanvasBounds.left) / CanvasBounds.width) * 2
  ) - 1;
  PointerNormalizedDeviceCoordinates.y = -(
    ((PointerEventData.clientY - CanvasBounds.top) / CanvasBounds.height) * 2
  ) + 1;
  PointerRaycaster.setFromCamera(PointerNormalizedDeviceCoordinates, Camera);

  return PointerRaycaster.intersectObject(SeedPointerHitMesh, false).length > 0;
}

/**
 * Reads the current world definition by identifier.
 *
 * @param {string} WorldIdentifier - Stable world identifier.
 * @returns {object|undefined} Matching world definition.
 */
function getWorldDefinition(WorldIdentifier) {
  return WorldDefinitions.find((WorldDefinition) => WorldDefinition.id === WorldIdentifier);
}

/**
 * Computes a stable resting point on a world's surface.
 *
 * @param {object} WorldDefinition - World being landed on.
 * @param {{x:number,y:number,z:number}} ImpactPosition - Approximate collision position.
 * @returns {{x:number,y:number,z:number}} Snapped seed position on the surface.
 */
function calculateSurfaceRestPosition(WorldDefinition, ImpactPosition) {
  TemporaryThreeVector.set(
    ImpactPosition.x - WorldDefinition.position.x,
    ImpactPosition.y - WorldDefinition.position.y,
    0,
  );

  if (TemporaryThreeVector.lengthSq() < 0.0001) {
    TemporaryThreeVector.set(1, 0, 0);
  }

  TemporaryThreeVector.normalize().multiplyScalar(WorldDefinition.radius + SeedRadius + 0.03);

  return createVector(
    WorldDefinition.position.x + TemporaryThreeVector.x,
    WorldDefinition.position.y + TemporaryThreeVector.y,
    0,
  );
}

/**
 * Updates the HUD counter using only restorable worlds. The starting world is already alive
 * so it acts as the player's launch platform rather than as an objective.
 */
function updateWorldCounter() {
  const RestoredWorldCount = WorldDefinitions.filter(
    (WorldDefinition) => !WorldDefinition.isStartingWorld && WorldDefinition.restored,
  ).length;
  WorldCounterElement.textContent = `${RestoredWorldCount} / ${RestorableWorldCount}`;
}

/**
 * Displays a short centre-screen status message without queueing old messages.
 *
 * @param {string} Message - Text shown to the player.
 * @param {number} VisibleDurationMilliseconds - Duration before the toast fades.
 */
function showStatusToast(Message, VisibleDurationMilliseconds = 900) {
  if (StatusToastTimeoutIdentifier !== null) {
    window.clearTimeout(StatusToastTimeoutIdentifier);
  }

  StatusToastElement.textContent = Message;
  StatusToastElement.classList.add('is-visible');

  StatusToastTimeoutIdentifier = window.setTimeout(() => {
    StatusToastElement.classList.remove('is-visible');
    StatusToastTimeoutIdentifier = null;
  }, VisibleDurationMilliseconds);
}

/**
 * Sets instruction copy and reveals the helper panel.
 *
 * @param {string} Title - Strong instruction line.
 * @param {string} Body - Supporting instruction line.
 */
function showInstruction(Title, Body) {
  InstructionTitleElement.textContent = Title;
  InstructionBodyElement.textContent = Body;
  InstructionPanelElement.classList.remove('is-hidden');
}

/** Hides the helper once a launch is in progress. */
function hideInstruction() {
  InstructionPanelElement.classList.add('is-hidden');
}

/**
 * Starts the lightweight greybox restoration animation and marks objective state.
 *
 * @param {object} WorldDefinition - World that has just been awakened.
 */
function restoreWorld(WorldDefinition) {
  if (WorldDefinition.restored) {
    return;
  }

  WorldDefinition.restored = true;
  const WorldRuntime = WorldRuntimeByIdentifier.get(WorldDefinition.id);
  WorldRuntime.restorationStartedAtSeconds = Clock.elapsedTime;
  WorldRuntime.contourRingGroup.visible = true;

  updateWorldCounter();
  showStatusToast(`${WorldDefinition.label} AWAKENED`, 1050);

  const RemainingWorldCount = WorldDefinitions.filter(
    (CandidateWorldDefinition) => !CandidateWorldDefinition.isStartingWorld && !CandidateWorldDefinition.restored,
  ).length;

  if (RemainingWorldCount === 0) {
    GamePhase = 'victoryPending';
    hideInstruction();

    if (VictoryTimeoutIdentifier !== null) {
      window.clearTimeout(VictoryTimeoutIdentifier);
    }

    VictoryTimeoutIdentifier = window.setTimeout(() => {
      VictoryPanelElement.hidden = false;
      GamePhase = 'victory';
      VictoryTimeoutIdentifier = null;
    }, 1350);
  }
}

/**
 * Places the seed on a world and returns control to the player.
 *
 * @param {object} WorldDefinition - World that received the seed.
 * @param {{x:number,y:number,z:number}} ImpactPosition - Approximate impact position.
 */
function attachSeedToWorld(WorldDefinition, ImpactPosition) {
  const SurfaceRestPosition = calculateSurfaceRestPosition(WorldDefinition, ImpactPosition);

  ImpactPulseMesh.position.set(ImpactPosition.x, ImpactPosition.y, 0.22);
  ImpactPulseMesh.scale.setScalar(1);
  ImpactPulseMesh.visible = true;
  ImpactPulseLifeSeconds = 0.58;
  CameraImpactLifeSeconds = 0.24;

  SeedPhysicsState = {
    position: SurfaceRestPosition,
    velocity: createVector(),
  };
  SeedGroup.position.set(SurfaceRestPosition.x, SurfaceRestPosition.y, SurfaceRestPosition.z);

  CurrentWorldIdentifier = WorldDefinition.id;
  LastSafeWorldIdentifier = WorldDefinition.id;
  LastSafeSeedPosition = createVector(
    SurfaceRestPosition.x,
    SurfaceRestPosition.y,
    SurfaceRestPosition.z,
  );
  LaunchIgnoredWorldIdentifier = null;

  restoreWorld(WorldDefinition);

  if (GamePhase !== 'victoryPending' && GamePhase !== 'victory') {
    GamePhase = 'attached';
    if (WorldDefinition.id === 'ember' && !getWorldDefinition('frost').restored) {
      showInstruction('Ember is awake — aim for Frost', 'Pull down and right until the landing ring appears.');
    } else {
      showInstruction('Drag the seed backwards', 'Release to launch. Let gravity do the rest.');
    }
  }
}

/**
 * Emits one pooled trail particle at the current seed position.
 */
function emitTrailParticle() {
  const TrailParticle = TrailParticlePool[NextTrailParticleIndex];
  NextTrailParticleIndex = (NextTrailParticleIndex + 1) % TrailParticlePool.length;

  TrailParticle.mesh.position.copy(SeedGroup.position);
  TrailParticle.mesh.scale.setScalar(0.78);
  TrailParticle.mesh.material.opacity = 0.42;
  TrailParticle.mesh.visible = true;
  TrailParticle.lifeRemainingSeconds = TrailParticle.maximumLifeSeconds;
}

/**
 * Advances trail fade and scale animation.
 *
 * @param {number} DeltaTimeSeconds - Real frame delta.
 */
function updateTrailParticles(DeltaTimeSeconds) {
  for (const TrailParticle of TrailParticlePool) {
    if (TrailParticle.lifeRemainingSeconds <= 0) {
      continue;
    }

    TrailParticle.lifeRemainingSeconds -= DeltaTimeSeconds;

    if (TrailParticle.lifeRemainingSeconds <= 0) {
      TrailParticle.mesh.visible = false;
      continue;
    }

    const LifeRatio = TrailParticle.lifeRemainingSeconds / TrailParticle.maximumLifeSeconds;
    TrailParticle.mesh.material.opacity = LifeRatio * 0.42;
    TrailParticle.mesh.scale.setScalar(0.42 + (LifeRatio * 0.45));
  }
}

/**
 * Clears trajectory presentation after aiming ends.
 */
function clearTrajectoryPreview() {
  TrajectoryLine.visible = false;
  LandingMarkerMesh.visible = false;
  TrajectoryGeometry.setDrawRange(0, 0);
}

/**
 * Updates launch strength and trajectory from the current pointer position.
 *
 * @param {THREE.Vector3} CurrentPointerWorldPosition - Current pointer position in orbital space.
 */
function updateAimPreview(CurrentPointerWorldPosition) {
  AimDragVector.set(
    SeedPhysicsState.position.x - CurrentPointerWorldPosition.x,
    SeedPhysicsState.position.y - CurrentPointerWorldPosition.y,
    0,
  );

  if (AimDragVector.length() > MaximumDragDistance) {
    AimDragVector.setLength(MaximumDragDistance);
  }

  AimLaunchVelocity.copy(AimDragVector).multiplyScalar(LaunchVelocityPerDragUnit);

  if (AimDragVector.length() < MinimumLaunchDragDistance) {
    clearTrajectoryPreview();
    return;
  }

  const TrajectoryPrediction = predictTrajectory(
    SeedPhysicsState.position,
    createVector(AimLaunchVelocity.x, AimLaunchVelocity.y, 0),
    WorldDefinitions,
    {
      seedRadius: SeedRadius,
      fixedStepSeconds: FixedPhysicsStepSeconds,
      maximumSteps: MaximumTrajectoryPredictionSteps,
      ignoredWorldIdentifier: CurrentWorldIdentifier,
    },
  );

  /** Downsample the fixed-step prediction so a small line buffer remains cheap on mobile. */
  const PreviewSampleStride = 4;
  let PreviewPointCount = 0;
  for (
    let PredictionPointIndex = 0;
    PredictionPointIndex < TrajectoryPrediction.points.length;
    PredictionPointIndex += PreviewSampleStride
  ) {
    const PredictionPoint = TrajectoryPrediction.points[PredictionPointIndex];
    TrajectoryPositionAttribute.setXYZ(
      PreviewPointCount,
      PredictionPoint.x,
      PredictionPoint.y,
      0.12,
    );
    PreviewPointCount += 1;
  }

  const FinalPredictionPoint = TrajectoryPrediction.points[TrajectoryPrediction.points.length - 1];
  const LastPreviewOffset = Math.max(0, (PreviewPointCount - 1) * 3);
  const FinalPointDifferenceX = TrajectoryPositionValues[LastPreviewOffset] - FinalPredictionPoint.x;
  const FinalPointDifferenceY = TrajectoryPositionValues[LastPreviewOffset + 1] - FinalPredictionPoint.y;
  if (
    PreviewPointCount === 0
    || ((FinalPointDifferenceX * FinalPointDifferenceX) + (FinalPointDifferenceY * FinalPointDifferenceY)) > 0.01
  ) {
    TrajectoryPositionAttribute.setXYZ(
      PreviewPointCount,
      FinalPredictionPoint.x,
      FinalPredictionPoint.y,
      0.12,
    );
    PreviewPointCount += 1;
  }

  TrajectoryPositionAttribute.needsUpdate = true;
  TrajectoryGeometry.setDrawRange(0, PreviewPointCount);
  TrajectoryGeometry.computeBoundingSphere();
  TrajectoryLine.visible = PreviewPointCount > 1;

  const PowerRatio = THREE.MathUtils.clamp(AimDragVector.length() / MaximumDragDistance, 0, 1);
  const PowerPercentage = Math.round(PowerRatio * 100);
  AimPowerFillElement.style.width = `${PowerPercentage}%`;
  AimPowerValueElement.textContent = `${PowerPercentage}%`;

  if (TrajectoryPrediction.collisionWorldIdentifier) {
    const LandingWorldDefinition = getWorldDefinition(TrajectoryPrediction.collisionWorldIdentifier);
    TrajectoryMaterial.color.set(0xd9f6cc);
    TrajectoryMaterial.opacity = 0.82;
    AimPanelElement.classList.add('is-locked');
    AimLabelElement.textContent = 'LANDING LOCKED';
    showInstruction(
      `Release to awaken ${LandingWorldDefinition.label}`,
      'The bright ring marks your landing.',
    );
    const LandingDirection = TemporaryThreeVector.set(
      FinalPredictionPoint.x - LandingWorldDefinition.position.x,
      FinalPredictionPoint.y - LandingWorldDefinition.position.y,
      0,
    ).normalize();
    LandingMarkerMesh.position.set(
      LandingWorldDefinition.position.x + (LandingDirection.x * (LandingWorldDefinition.radius + 0.08)),
      LandingWorldDefinition.position.y + (LandingDirection.y * (LandingWorldDefinition.radius + 0.08)),
      0.2,
    );
    LandingMarkerMesh.visible = true;
  } else {
    TrajectoryMaterial.color.set(0x9db8c6);
    TrajectoryMaterial.opacity = 0.48;
    LandingMarkerMesh.visible = false;
    AimPanelElement.classList.remove('is-locked');
    AimLabelElement.textContent = 'PULL';
    showInstruction('Bend the path onto a grey world', 'Pull farther or change the angle.');
  }
}

/**
 * Begins a slingshot drag when the seed is attached and the pointer acquired it.
 *
 * @param {PointerEvent} PointerEventData - Browser pointer event.
 */
function handlePointerDown(PointerEventData) {
  if (GamePhase !== 'attached' || IsPointerAiming || !isPointerOverSeed(PointerEventData)) {
    return;
  }

  const CurrentPointerWorldPosition = getPointerWorldPosition(PointerEventData);
  if (!CurrentPointerWorldPosition) {
    return;
  }

  IsPointerAiming = true;
  ActivePointerIdentifier = PointerEventData.pointerId;
  GameCanvas.setPointerCapture(PointerEventData.pointerId);
  GameCanvas.classList.add('is-aiming');
  PullGuideLine.visible = false;
  AimPanelElement.hidden = false;
  updateAimPreview(CurrentPointerWorldPosition);
  PointerEventData.preventDefault();
}

/**
 * Updates a slingshot drag.
 *
 * @param {PointerEvent} PointerEventData - Browser pointer event.
 */
function handlePointerMove(PointerEventData) {
  if (!IsPointerAiming || PointerEventData.pointerId !== ActivePointerIdentifier) {
    return;
  }

  const CurrentPointerWorldPosition = getPointerWorldPosition(PointerEventData);
  if (!CurrentPointerWorldPosition) {
    return;
  }

  updateAimPreview(CurrentPointerWorldPosition);
  PointerEventData.preventDefault();
}

/**
 * Converts the final drag vector into launch velocity, or cancels if the gesture was tiny.
 *
 * @param {PointerEvent} PointerEventData - Browser pointer event.
 */
function handlePointerUp(PointerEventData) {
  if (!IsPointerAiming || PointerEventData.pointerId !== ActivePointerIdentifier) {
    return;
  }

  const CurrentPointerWorldPosition = getPointerWorldPosition(PointerEventData);
  if (CurrentPointerWorldPosition) {
    updateAimPreview(CurrentPointerWorldPosition);
  }

  IsPointerAiming = false;
  ActivePointerIdentifier = null;
  GameCanvas.classList.remove('is-aiming');
  AimPanelElement.hidden = true;
  clearTrajectoryPreview();

  if (AimDragVector.length() < MinimumLaunchDragDistance) {
    showInstruction('Grab the glowing seed', 'Pull away from your target, then release.');
    return;
  }

  SeedPhysicsState.velocity = createVector(
    AimLaunchVelocity.x,
    AimLaunchVelocity.y,
    0,
  );
  LaunchIgnoredWorldIdentifier = CurrentWorldIdentifier;
  GamePhase = 'flying';
  HasLaunchedOnce = true;
  LaunchPulseMesh.position.copy(SeedGroup.position);
  LaunchPulseMesh.scale.setScalar(1);
  LaunchPulseMesh.visible = true;
  LaunchPulseLifeSeconds = 0.42;
  TrailEmissionAccumulatorSeconds = 0;
  hideInstruction();

  PointerEventData.preventDefault();
}

/**
 * Returns the seed to its last safe world after a miss. Recovery is intentionally fast so
 * experimentation never becomes frustrating.
 */
function recoverSeedFromVoid() {
  if (GamePhase === 'recovering' || GamePhase === 'victory') {
    return;
  }

  GamePhase = 'recovering';
  SeedPhysicsState.velocity = createVector();
  showStatusToast('LOST TO THE VOID', 700);

  if (RecoveryTimeoutIdentifier !== null) {
    window.clearTimeout(RecoveryTimeoutIdentifier);
  }

  RecoveryTimeoutIdentifier = window.setTimeout(() => {
    SeedPhysicsState = {
      position: createVector(
        LastSafeSeedPosition.x,
        LastSafeSeedPosition.y,
        LastSafeSeedPosition.z,
      ),
      velocity: createVector(),
    };
    SeedGroup.position.set(
      LastSafeSeedPosition.x,
      LastSafeSeedPosition.y,
      LastSafeSeedPosition.z,
    );
    CurrentWorldIdentifier = LastSafeWorldIdentifier;
    LaunchIgnoredWorldIdentifier = null;
    GamePhase = 'attached';
    showInstruction('Try another angle', 'Use the bright path to bend around gravity wells.');
    RecoveryTimeoutIdentifier = null;
  }, 420);
}

/**
 * Advances live seed physics by one fixed step.
 */
function simulateSeedFixedStep() {
  if (GamePhase !== 'flying') {
    return;
  }

  SeedPhysicsState = simulatePhysicsStep(
    SeedPhysicsState,
    WorldDefinitions,
    FixedPhysicsStepSeconds,
  );

  if (LaunchIgnoredWorldIdentifier) {
    const StartingWorldDefinition = getWorldDefinition(LaunchIgnoredWorldIdentifier);
    const ClearDistance = StartingWorldDefinition.radius + SeedRadius + 0.35;
    if (
      calculateDistanceSquared(SeedPhysicsState.position, StartingWorldDefinition.position)
      > (ClearDistance * ClearDistance)
    ) {
      LaunchIgnoredWorldIdentifier = null;
    }
  }

  const CollisionWorldDefinition = findCollidingWorld(
    SeedPhysicsState.position,
    SeedRadius,
    WorldDefinitions,
    LaunchIgnoredWorldIdentifier,
  );

  if (CollisionWorldDefinition) {
    attachSeedToWorld(CollisionWorldDefinition, SeedPhysicsState.position);
    return;
  }

  if (
    (SeedPhysicsState.position.x * SeedPhysicsState.position.x)
    + (SeedPhysicsState.position.y * SeedPhysicsState.position.y)
    > (OutOfBoundsDistance * OutOfBoundsDistance)
  ) {
    recoverSeedFromVoid();
  }
}

/**
 * Updates the temporary restoration visual. Day 3 replaces this with the signature wave
 * that grows terrain, trees, water and atmosphere around the spherical surface.
 *
 * @param {number} ElapsedTimeSeconds - Total elapsed game time.
 */
function updateWorldRestorationVisuals(ElapsedTimeSeconds) {
  for (const WorldDefinition of WorldDefinitions) {
    const WorldRuntime = WorldRuntimeByIdentifier.get(WorldDefinition.id);

    if (!WorldDefinition.restored) {
      WorldRuntime.group.rotation.y += 0.0005;
      continue;
    }

    const RestorationElapsedSeconds = ElapsedTimeSeconds - WorldRuntime.restorationStartedAtSeconds;
    const RestorationProgress = WorldRuntime.restorationStartedAtSeconds === -Infinity
      ? 1
      : THREE.MathUtils.clamp(RestorationElapsedSeconds / 0.95, 0, 1);
    const SmoothedRestorationProgress = 1 - Math.pow(1 - RestorationProgress, 3);

    WorldRuntime.surfaceMaterial.color.copy(DeadWorldColor).lerp(
      WorldDefinition.aliveColor,
      SmoothedRestorationProgress,
    );
    WorldRuntime.atmosphereMaterial.opacity = THREE.MathUtils.lerp(
      0.025,
      0.12,
      SmoothedRestorationProgress,
    );

    for (const MarkerMesh of WorldRuntime.surfaceMarkerGroup.children) {
      MarkerMesh.material.color.copy(DarkWorldColor).lerp(
        WorldDefinition.aliveColor.clone().offsetHSL(0, 0, 0.16),
        SmoothedRestorationProgress,
      );
      MarkerMesh.scale.y = Math.max(0.08, SmoothedRestorationProgress) * MarkerMesh.scale.x;
    }

    if (RestorationProgress < 1) {
      const PulseScale = 1 + (Math.sin(RestorationProgress * Math.PI) * 0.055);
      WorldRuntime.group.scale.setScalar(PulseScale);
    } else {
      WorldRuntime.group.scale.setScalar(1);
    }

    WorldRuntime.group.rotation.y += 0.0011;
    WorldRuntime.contourRingGroup.rotation.z += 0.0007;
  }
}

/**
 * Updates seed animation and trail independent of fixed-step physics.
 *
 * @param {number} DeltaTimeSeconds - Real frame delta.
 * @param {number} ElapsedTimeSeconds - Total elapsed game time.
 */
function updateSeedVisuals(DeltaTimeSeconds, ElapsedTimeSeconds) {
  SeedGroup.position.set(
    SeedPhysicsState.position.x,
    SeedPhysicsState.position.y,
    SeedPhysicsState.position.z,
  );

  SeedCoreMesh.rotation.x += DeltaTimeSeconds * (GamePhase === 'flying' ? 4.5 : 0.8);
  SeedCoreMesh.rotation.y += DeltaTimeSeconds * (GamePhase === 'flying' ? 6.0 : 1.2);
  SeedHaloMesh.scale.setScalar(1 + (Math.sin(ElapsedTimeSeconds * 4.2) * 0.08));
  SeedHaloMaterial.opacity = 0.105 + (Math.sin(ElapsedTimeSeconds * 4.2) * 0.025);

  if (GamePhase === 'flying') {
    TrailEmissionAccumulatorSeconds += DeltaTimeSeconds;
    while (TrailEmissionAccumulatorSeconds >= 0.036) {
      emitTrailParticle();
      TrailEmissionAccumulatorSeconds -= 0.036;
    }
  }

  updateTrailParticles(DeltaTimeSeconds);

  if (LandingMarkerMesh.visible) {
    LandingMarkerMesh.rotation.z += DeltaTimeSeconds * 1.7;
    const LandingPulseScale = 1 + (Math.sin(ElapsedTimeSeconds * 6) * 0.11);
    LandingMarkerMesh.scale.setScalar(LandingPulseScale);
  }

  if (LaunchPulseLifeSeconds > 0) {
    LaunchPulseLifeSeconds = Math.max(0, LaunchPulseLifeSeconds - DeltaTimeSeconds);
    const LaunchProgress = 1 - (LaunchPulseLifeSeconds / 0.42);
    LaunchPulseMesh.scale.setScalar(1 + (LaunchProgress * 3.4));
    LaunchPulseMesh.material.opacity = (1 - LaunchProgress) * 0.68;
    LaunchPulseMesh.visible = LaunchPulseLifeSeconds > 0;
  }

  if (ImpactPulseLifeSeconds > 0) {
    ImpactPulseLifeSeconds = Math.max(0, ImpactPulseLifeSeconds - DeltaTimeSeconds);
    const ImpactProgress = 1 - (ImpactPulseLifeSeconds / 0.58);
    ImpactPulseMesh.scale.setScalar(1 + (ImpactProgress * 6.2));
    ImpactPulseMesh.material.opacity = (1 - ImpactProgress) * 0.9;
    ImpactPulseMesh.visible = ImpactPulseLifeSeconds > 0;
    SeedGroup.scale.setScalar(1 + (Math.sin(ImpactProgress * Math.PI) * 0.16));
  } else {
    SeedGroup.scale.setScalar(1);
  }

  const IsOpeningCoachVisible = GamePhase === 'attached'
    && CurrentWorldIdentifier === StartingWorldIdentifier
    && !HasLaunchedOnce;
  PullGuideLine.visible = IsOpeningCoachVisible;
  TargetBeaconMesh.visible = !getWorldDefinition('ember').restored;
  if (IsOpeningCoachVisible) {
    PullGuideMaterial.dashOffset -= DeltaTimeSeconds * 0.9;
  }
  if (TargetBeaconMesh.visible) {
    TargetBeaconMesh.rotation.z -= DeltaTimeSeconds * 0.35;
    TargetBeaconMaterial.opacity = 0.13 + (Math.sin(ElapsedTimeSeconds * 3.4) * 0.055);
    TargetBeaconMesh.scale.setScalar(1 + (Math.sin(ElapsedTimeSeconds * 3.4) * 0.025));
  }
}

/**
 * Adds gentle camera follow while the seed is flying without losing the level overview.
 * This is intentionally restrained for motion comfort on phones.
 *
 * @param {number} DeltaTimeSeconds - Real frame delta.
 */
function updateCamera(DeltaTimeSeconds) {
  if (GamePhase === 'flying') {
    DesiredCameraLookTarget.set(
      THREE.MathUtils.clamp(SeedPhysicsState.position.x * 0.12, -1.8, 1.8),
      THREE.MathUtils.clamp(SeedPhysicsState.position.y * 0.12, -1.5, 1.5),
      0,
    );
  } else {
    DesiredCameraLookTarget.set(0, 0, 0);
  }

  const CameraFollowAlpha = 1 - Math.exp(-DeltaTimeSeconds * 2.6);
  CameraLookTarget.lerp(DesiredCameraLookTarget, CameraFollowAlpha);

  if (CameraImpactLifeSeconds > 0) {
    CameraImpactLifeSeconds = Math.max(0, CameraImpactLifeSeconds - DeltaTimeSeconds);
    const ShakeStrength = (CameraImpactLifeSeconds / 0.24) * 0.13;
    Camera.position.x = Math.sin(Clock.elapsedTime * 93) * ShakeStrength;
    Camera.position.y = Math.cos(Clock.elapsedTime * 77) * ShakeStrength;
  } else {
    Camera.position.x = 0;
    Camera.position.y = 0;
  }
  Camera.lookAt(CameraLookTarget);
}

/**
 * Recalculates camera distance so the full tiny-world system remains visible on portrait
 * phones as well as desktop monitors.
 */
function resizeRenderer() {
  const ViewportWidth = window.innerWidth;
  const ViewportHeight = window.innerHeight;
  const ViewportAspectRatio = ViewportWidth / Math.max(ViewportHeight, 1);

  Renderer.setSize(ViewportWidth, ViewportHeight, false);
  Renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  Camera.aspect = ViewportAspectRatio;

  const RequiredWorldHeight = 29;
  const RequiredWorldWidth = 25;
  const HalfVerticalFieldOfViewRadians = THREE.MathUtils.degToRad(Camera.fov * 0.5);
  const DistanceForHeight = RequiredWorldHeight / (2 * Math.tan(HalfVerticalFieldOfViewRadians));
  const DistanceForWidth = RequiredWorldWidth / (
    2 * Math.tan(HalfVerticalFieldOfViewRadians) * Math.max(ViewportAspectRatio, 0.2)
  );
  Camera.position.z = Math.max(DistanceForHeight, DistanceForWidth, 34);
  Camera.updateProjectionMatrix();
}

/**
 * Resets objective state, animations and player position to a deterministic opening shot.
 */
function resetGame() {
  if (RecoveryTimeoutIdentifier !== null) {
    window.clearTimeout(RecoveryTimeoutIdentifier);
    RecoveryTimeoutIdentifier = null;
  }
  if (VictoryTimeoutIdentifier !== null) {
    window.clearTimeout(VictoryTimeoutIdentifier);
    VictoryTimeoutIdentifier = null;
  }
  if (StatusToastTimeoutIdentifier !== null) {
    window.clearTimeout(StatusToastTimeoutIdentifier);
    StatusToastTimeoutIdentifier = null;
  }

  IsPointerAiming = false;
  ActivePointerIdentifier = null;
  HasLaunchedOnce = false;
  LaunchPulseLifeSeconds = 0;
  ImpactPulseLifeSeconds = 0;
  CameraImpactLifeSeconds = 0;
  LaunchPulseMesh.visible = false;
  ImpactPulseMesh.visible = false;
  SeedGroup.scale.setScalar(1);
  Camera.position.x = 0;
  Camera.position.y = 0;
  GameCanvas.classList.remove('is-aiming');
  AimPanelElement.hidden = true;
  AimPanelElement.classList.remove('is-locked');
  clearTrajectoryPreview();
  VictoryPanelElement.hidden = true;
  StatusToastElement.classList.remove('is-visible');
  StatusToastElement.textContent = '';

  for (const WorldDefinition of WorldDefinitions) {
    WorldDefinition.restored = WorldDefinition.isStartingWorld;
    const WorldRuntime = WorldRuntimeByIdentifier.get(WorldDefinition.id);
    WorldRuntime.restorationStartedAtSeconds = WorldDefinition.isStartingWorld ? -Infinity : null;
    WorldRuntime.surfaceMaterial.color.copy(
      WorldDefinition.isStartingWorld ? WorldDefinition.aliveColor : DeadWorldColor,
    );
    WorldRuntime.atmosphereMaterial.opacity = WorldDefinition.isStartingWorld ? 0.10 : 0.025;
    WorldRuntime.contourRingGroup.visible = WorldDefinition.isStartingWorld;
    WorldRuntime.group.scale.setScalar(1);

    for (const MarkerMesh of WorldRuntime.surfaceMarkerGroup.children) {
      MarkerMesh.material.color.copy(
        WorldDefinition.isStartingWorld
          ? WorldDefinition.aliveColor.clone().offsetHSL(0, 0, 0.16)
          : DarkWorldColor,
      );
      MarkerMesh.scale.y = MarkerMesh.scale.x;
    }
  }

  for (const TrailParticle of TrailParticlePool) {
    TrailParticle.lifeRemainingSeconds = 0;
    TrailParticle.mesh.visible = false;
  }

  const StartingWorldDefinition = getWorldDefinition(StartingWorldIdentifier);
  const FirstTargetWorldDefinition = getWorldDefinition('ember');
  TemporaryThreeVector.set(
    FirstTargetWorldDefinition.position.x - StartingWorldDefinition.position.x,
    FirstTargetWorldDefinition.position.y - StartingWorldDefinition.position.y,
    0,
  ).normalize().multiplyScalar(StartingWorldDefinition.radius + SeedRadius + 0.03);

  const StartingSeedPosition = createVector(
    StartingWorldDefinition.position.x + TemporaryThreeVector.x,
    StartingWorldDefinition.position.y + TemporaryThreeVector.y,
    0,
  );

  SeedPhysicsState = {
    position: StartingSeedPosition,
    velocity: createVector(),
  };
  SeedGroup.position.set(StartingSeedPosition.x, StartingSeedPosition.y, 0);
  CurrentWorldIdentifier = StartingWorldIdentifier;
  LastSafeWorldIdentifier = StartingWorldIdentifier;
  LastSafeSeedPosition = createVector(
    StartingSeedPosition.x,
    StartingSeedPosition.y,
    StartingSeedPosition.z,
  );
  LaunchIgnoredWorldIdentifier = null;
  GamePhase = 'attached';
  PhysicsAccumulatorSeconds = 0;

  TemporaryThreeVector.set(
    StartingWorldDefinition.position.x - FirstTargetWorldDefinition.position.x,
    StartingWorldDefinition.position.y - FirstTargetWorldDefinition.position.y,
    0.14,
  ).normalize();
  const PullGuideStart = new THREE.Vector3(
    StartingSeedPosition.x + (TemporaryThreeVector.x * 0.45),
    StartingSeedPosition.y + (TemporaryThreeVector.y * 0.45),
    0.14,
  );
  const PullGuideEnd = new THREE.Vector3(
    StartingSeedPosition.x + (TemporaryThreeVector.x * 2.7),
    StartingSeedPosition.y + (TemporaryThreeVector.y * 2.7),
    0.14,
  );
  PullGuideGeometry.setFromPoints([PullGuideStart, PullGuideEnd]);
  PullGuideLine.computeLineDistances();
  PullGuideLine.visible = true;
  TargetBeaconMesh.visible = true;

  updateWorldCounter();
  showInstruction('Grab the glowing seed', 'Pull away from EMBER, then release.');
}

/** Main frame loop. */
function renderFrame() {
  const DeltaTimeSeconds = Math.min(Clock.getDelta(), MaximumFrameDeltaSeconds);
  const ElapsedTimeSeconds = Clock.elapsedTime;

  PhysicsAccumulatorSeconds += DeltaTimeSeconds;
  while (PhysicsAccumulatorSeconds >= FixedPhysicsStepSeconds) {
    simulateSeedFixedStep();
    PhysicsAccumulatorSeconds -= FixedPhysicsStepSeconds;
  }

  updateWorldRestorationVisuals(ElapsedTimeSeconds);
  updateSeedVisuals(DeltaTimeSeconds, ElapsedTimeSeconds);
  updateCamera(DeltaTimeSeconds);

  Renderer.render(Scene, Camera);
  window.requestAnimationFrame(renderFrame);
}

GameCanvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
GameCanvas.addEventListener('pointermove', handlePointerMove, { passive: false });
GameCanvas.addEventListener('pointerup', handlePointerUp, { passive: false });
GameCanvas.addEventListener('pointercancel', handlePointerUp, { passive: false });
window.addEventListener('resize', resizeRenderer);
window.addEventListener('keydown', (KeyboardEventData) => {
  if (KeyboardEventData.key.toLowerCase() === 'r') {
    resetGame();
  }
});
ResetButtonElement.addEventListener('click', resetGame);
PlayAgainButtonElement.addEventListener('click', resetGame);

createLighting();
createStarField();
resizeRenderer();
resetGame();
renderFrame();
