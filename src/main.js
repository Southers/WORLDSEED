import * as THREE from 'three';

import { WorldseedAudio } from './audio.js?v=20260813-6a';

import {
  countRestoredWorlds,
  getRestorableWorlds,
  getRouteChoices,
  isSystemRestored,
} from './campaign.js?v=20260813-6a';

import {
  calculateDistanceSquared,
  createVector,
  findCollidingWorld,
  predictTrajectory,
  simulatePhysicsStep,
} from './physics.js?v=20260813-6a';
import {
  calculateNormalizedSphericalDistance,
  calculateRestorationWaveProgress,
  calculateStagedGrowthProgress,
} from './restoration.js?v=20260813-6a';

/**
 * WORLDSEED — First Light branching-system prototype.
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
const RouteLabelElements = [...document.querySelectorAll('.route-label')];
const VictoryPanelElement = document.querySelector('#VictoryPanel');
const PlayAgainButtonElement = document.querySelector('#PlayAgainButton');
const ResetButtonElement = document.querySelector('#ResetButton');
const AudioButtonElement = document.querySelector('#AudioButton');
GameCanvas.dataset.build = '20260813-6a';

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
const MaximumDrawCallBudget = 180;
const MinimumAdaptivePixelRatio = 1;

const Scene = new THREE.Scene();
Scene.background = new THREE.Color(0x06101a);
Scene.fog = new THREE.FogExp2(0x06101a, 0.012);

const Renderer = new THREE.WebGLRenderer({
  canvas: GameCanvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
Renderer.outputColorSpace = THREE.SRGBColorSpace;
Renderer.toneMapping = THREE.ACESFilmicToneMapping;
Renderer.toneMappingExposure = 1.15;
Renderer.shadowMap.enabled = true;
Renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
const LocalSwayAxis = new THREE.Vector3(0, 0, 1);
const SurfaceSwayQuaternion = new THREE.Quaternion();
const RouteLabelProjection = new THREE.Vector3();

let PhysicsAccumulatorSeconds = 0;
let GameElapsedTimeSeconds = 0;
let IsPageActive = !document.hidden;
let IsWebGLContextAvailable = true;
let AdaptivePixelRatioCap = 2;
let PerformanceSampleElapsedSeconds = 0;
let PerformanceSampleFrameCount = 0;
let PerformanceSampleDeltaSeconds = 0;
let MaximumObservedDrawCalls = 0;
let GamePhase = 'attached';
let CurrentWorldIdentifier = StartingWorldIdentifier;
let LaunchIgnoredWorldIdentifier = null;
let IsPointerAiming = false;
let ActivePointerIdentifier = null;
let LastSafeSeedPosition = createVector();
let LastSafeWorldIdentifier = StartingWorldIdentifier;
let RecoveryTimeoutIdentifier = null;
let StatusToastTimeoutIdentifier = null;
let HasLaunchedOnce = false;
let LaunchPulseLifeSeconds = 0;
let ImpactPulseLifeSeconds = 0;
let CameraImpactLifeSeconds = 0;
let SeedPhysicsState = {
  position: createVector(),
  velocity: createVector(),
};
const WorldseedSound = new WorldseedAudio();

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
    restoration: {
      durationSeconds: 2.2,
      waveWidth: 0.045,
      growthTrailWidth: 0.18,
      waveColor: new THREE.Color(0xe8ffc5),
      atmosphereOpacity: 0.15,
      rotationSpeed: 0.00035,
      surfaceVariation: 0.1,
    },
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
    restoration: {
      durationSeconds: 2.35,
      waveWidth: 0.05,
      growthTrailWidth: 0.18,
      waveColor: new THREE.Color(0xffdfa1),
      atmosphereOpacity: 0.16,
      rotationSpeed: 0.00125,
      surfaceVariation: 0.045,
    },
  },
  {
    id: 'grove',
    label: 'GROVE',
    position: createVector(-8.8, 3.0, 0),
    radius: 2.05,
    gravitationalParameter: 44,
    aliveColor: new THREE.Color(0x78aa66),
    atmosphereColor: new THREE.Color(0xb7e5a4),
    restored: false,
    isStartingWorld: false,
    isPrototypeWorld: true,
    restoration: {
      durationSeconds: 1.85,
      waveWidth: 0.055,
      growthTrailWidth: 0.2,
      waveColor: new THREE.Color(0xddffbc),
      atmosphereOpacity: 0,
      rotationSpeed: 0.0007,
      surfaceVariation: 0.08,
    },
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
    restoration: {
      durationSeconds: 2.65,
      waveWidth: 0.042,
      growthTrailWidth: 0.2,
      waveColor: new THREE.Color(0xe4fbff),
      atmosphereOpacity: 0.18,
      rotationSpeed: 0.001,
      surfaceVariation: 0.035,
    },
  },
  {
    id: 'tide',
    label: 'TIDE',
    position: createVector(9.7, 6.0, 0),
    radius: 2.15,
    gravitationalParameter: 48,
    aliveColor: new THREE.Color(0x4d91aa),
    atmosphereColor: new THREE.Color(0x9ce7ef),
    restored: false,
    isStartingWorld: false,
    isPrototypeWorld: true,
    restoration: {
      durationSeconds: 1.95,
      waveWidth: 0.052,
      growthTrailWidth: 0.2,
      waveColor: new THREE.Color(0xb9fbff),
      atmosphereOpacity: 0,
      rotationSpeed: 0.00085,
      surfaceVariation: 0.06,
    },
  },
];

const WorldRuntimeByIdentifier = new Map();
const DeadWorldColor = new THREE.Color(0x575d60);
const DarkWorldColor = new THREE.Color(0x2c3337);
const RestorableWorldCount = getRestorableWorlds(WorldDefinitions).length;

/**
 * Adds restrained scene lighting. The tiny-world art pass can later replace this with a
 * more authored lighting rig without changing gameplay code.
 */
function createLighting() {
  const HemisphereLight = new THREE.HemisphereLight(0xa9c6d8, 0x17212a, 1.55);
  Scene.add(HemisphereLight);

  const KeyLight = new THREE.DirectionalLight(0xfff4dc, 3.2);
  KeyLight.position.set(-12, 18, 24);
  KeyLight.castShadow = true;
  KeyLight.shadow.mapSize.set(1024, 1024);
  KeyLight.shadow.camera.left = -24;
  KeyLight.shadow.camera.right = 24;
  KeyLight.shadow.camera.top = 24;
  KeyLight.shadow.camera.bottom = -24;
  KeyLight.shadow.camera.near = 4;
  KeyLight.shadow.camera.far = 80;
  KeyLight.shadow.bias = -0.0004;
  KeyLight.shadow.normalBias = 0.035;
  Scene.add(KeyLight);

  const FillLight = new THREE.DirectionalLight(0x7aa3d1, 1.0);
  FillLight.position.set(18, -10, 14);
  Scene.add(FillLight);

  const RimLight = new THREE.DirectionalLight(0x83d7ff, 1.15);
  RimLight.position.set(8, 12, -18);
  Scene.add(RimLight);
}

/** Adds a soft generated colour field behind the stars without an external texture. */
function createBackgroundGlow(Position, Scale, InnerRed, InnerGreen, InnerBlue, InnerAlpha) {
  const GlowCanvas = document.createElement('canvas');
  GlowCanvas.width = 128;
  GlowCanvas.height = 128;
  const GlowContext = GlowCanvas.getContext('2d');
  const GlowGradient = GlowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  GlowGradient.addColorStop(
    0,
    `rgba(${InnerRed}, ${InnerGreen}, ${InnerBlue}, ${InnerAlpha})`,
  );
  GlowGradient.addColorStop(
    0.45,
    `rgba(${InnerRed}, ${InnerGreen}, ${InnerBlue}, ${InnerAlpha * 0.36})`,
  );
  GlowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  GlowContext.fillStyle = GlowGradient;
  GlowContext.fillRect(0, 0, 128, 128);

  const GlowTexture = new THREE.CanvasTexture(GlowCanvas);
  GlowTexture.colorSpace = THREE.SRGBColorSpace;
  const GlowMaterial = new THREE.SpriteMaterial({
    map: GlowTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const GlowSprite = new THREE.Sprite(GlowMaterial);
  GlowSprite.position.copy(Position);
  GlowSprite.scale.set(Scale.x, Scale.y, 1);
  Scene.add(GlowSprite);
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

  createBackgroundGlow(
    new THREE.Vector3(-15, -9, -24),
    new THREE.Vector2(35, 27),
    40,
    106,
    92,
    0.16,
  );
  createBackgroundGlow(
    new THREE.Vector3(14, 10, -26),
    new THREE.Vector2(31, 25),
    52,
    75,
    130,
    0.14,
  );
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
 * Extends a standard lit material with the spherical dead-to-alive colour wave.
 *
 * @param {object} WorldDefinition - Gameplay and visual definition for the world.
 * @returns {{material:THREE.MeshStandardMaterial, uniforms:object}} Material and live uniforms.
 */
function createRestorationSurfaceMaterial(WorldDefinition) {
  const RestorationUniforms = {
    restorationOrigin: { value: new THREE.Vector3(1, 0, 0) },
    restorationProgress: { value: WorldDefinition.restored ? 1.2 : -0.1 },
    restorationWaveWidth: { value: WorldDefinition.restoration.waveWidth },
    deadColor: { value: DeadWorldColor.clone() },
    aliveColor: { value: WorldDefinition.aliveColor.clone() },
    waveColor: { value: WorldDefinition.restoration.waveColor.clone() },
    surfaceVariation: { value: WorldDefinition.restoration.surfaceVariation },
  };
  const SurfaceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: false,
  });

  SurfaceMaterial.onBeforeCompile = (Shader) => {
    Object.assign(Shader.uniforms, RestorationUniforms);
    Shader.vertexShader = Shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vRestorationNormal;',
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nvRestorationNormal = normalize(objectNormal);',
      );
    Shader.fragmentShader = Shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRestorationNormal;
        uniform vec3 restorationOrigin;
        uniform float restorationProgress;
        uniform float restorationWaveWidth;
        uniform vec3 deadColor;
        uniform vec3 aliveColor;
        uniform vec3 waveColor;
        uniform float surfaceVariation;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float restorationDistance = acos(clamp(dot(
          normalize(vRestorationNormal),
          normalize(restorationOrigin)
        ), -1.0, 1.0)) / PI;
        float restoredSurface = 1.0 - smoothstep(
          restorationProgress - restorationWaveWidth,
          restorationProgress + restorationWaveWidth,
          restorationDistance
        );
        float activeRestorationWave = 1.0 - step(1.001, restorationProgress);
        float restorationBand = 1.0 - smoothstep(
          restorationWaveWidth * 0.35,
          restorationWaveWidth * 2.2,
          abs(restorationDistance - restorationProgress)
        );
        float surfacePattern = sin(vRestorationNormal.x * 17.0)
          * sin(vRestorationNormal.y * 23.0)
          * sin(vRestorationNormal.z * 19.0);
        vec3 variedAliveColor = aliveColor * (1.0 + (surfacePattern * surfaceVariation));
        diffuseColor.rgb = mix(deadColor, variedAliveColor, restoredSurface);
        diffuseColor.rgb += waveColor * restorationBand * activeRestorationWave * 0.9;`,
      );
  };
  SurfaceMaterial.customProgramCacheKey = () => 'worldseed-restoration-surface-v1';

  return { material: SurfaceMaterial, uniforms: RestorationUniforms };
}

/**
 * Creates a transparent additive shell that blooms along the active wavefront.
 *
 * @param {object} WorldDefinition - Gameplay and visual definition for the world.
 * @param {object} RestorationUniforms - Uniforms shared with the surface material.
 * @returns {{mesh:THREE.Mesh, material:THREE.ShaderMaterial}} Shell render components.
 */
function createRestorationWaveShell(WorldDefinition, RestorationUniforms) {
  const WaveMaterial = new THREE.ShaderMaterial({
    uniforms: {
      restorationOrigin: RestorationUniforms.restorationOrigin,
      restorationProgress: RestorationUniforms.restorationProgress,
      restorationWaveWidth: RestorationUniforms.restorationWaveWidth,
      waveColor: RestorationUniforms.waveColor,
    },
    vertexShader: `
      varying vec3 vSurfaceNormal;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;

      void main() {
        vSurfaceNormal = normalize(normal);
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vSurfaceNormal;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      uniform vec3 restorationOrigin;
      uniform float restorationProgress;
      uniform float restorationWaveWidth;
      uniform vec3 waveColor;

      void main() {
        float restorationDistance = acos(clamp(dot(
          normalize(vSurfaceNormal),
          normalize(restorationOrigin)
        ), -1.0, 1.0)) / 3.141592653589793;
        float waveBand = 1.0 - smoothstep(
          restorationWaveWidth * 0.45,
          restorationWaveWidth * 1.8,
          abs(restorationDistance - restorationProgress)
        );
        float fresnel = pow(1.0 - max(dot(vViewNormal, vViewDirection), 0.0), 2.0);
        float activeWave = step(-0.001, restorationProgress)
          * (1.0 - step(1.001, restorationProgress));
        float alpha = waveBand * (0.52 + (fresnel * 0.58)) * activeWave;
        gl_FragColor = vec4(waveColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const WaveGeometry = new THREE.SphereGeometry(
    WorldDefinition.radius * 1.018,
    WorldDefinition.isPrototypeWorld ? 32 : 64,
    WorldDefinition.isPrototypeWorld ? 20 : 40,
  );
  const WaveMesh = new THREE.Mesh(WaveGeometry, WaveMaterial);
  WaveMesh.visible = false;
  WaveMesh.renderOrder = 5;

  return { mesh: WaveMesh, material: WaveMaterial };
}

/** Records a prop material's authored colour so the restoration wave can reveal it. */
function registerRestorableMaterial(PropObject, Material, AliveColor = Material.color) {
  if (!PropObject.userData.restorationMaterials) {
    PropObject.userData.restorationMaterials = [];
  }
  PropObject.userData.restorationMaterials.push({
    material: Material,
    aliveColor: AliveColor.clone(),
    aliveEmissive: Material.emissive ? Material.emissive.clone() : null,
    aliveEmissiveIntensity: Material.emissiveIntensity ?? 0,
  });
}

/** Applies dead-to-alive colour to every material owned by a surface prop. */
function setSurfacePropRestorationProgress(PropObject, RestorationProgress) {
  const RestorationMaterials = PropObject.userData.restorationMaterials ?? [];
  for (const RestorationMaterial of RestorationMaterials) {
    RestorationMaterial.material.color.copy(DarkWorldColor).lerp(
      RestorationMaterial.aliveColor,
      RestorationProgress,
    );
    if (RestorationMaterial.aliveEmissive && RestorationMaterial.material.emissive) {
      RestorationMaterial.material.emissive.set(0x000000).lerp(
        RestorationMaterial.aliveEmissive,
        RestorationProgress,
      );
      RestorationMaterial.material.emissiveIntensity = (
        RestorationMaterial.aliveEmissiveIntensity * RestorationProgress
      );
    }
  }
}

/** Places a local-Y-up prop against a spherical surface and registers wave metadata. */
function placeSurfaceProp(
  PropObject,
  SurfaceDirection,
  WorldRadius,
  BaseScale = 1,
  SurfaceOffset = 0,
) {
  const NormalizedDirection = SurfaceDirection.clone().normalize();
  PropObject.position.copy(NormalizedDirection).multiplyScalar(WorldRadius + SurfaceOffset);
  PropObject.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), NormalizedDirection);
  PropObject.userData.baseQuaternion = PropObject.quaternion.clone();
  PropObject.scale.setScalar(BaseScale);
  PropObject.userData.surfaceDirection = NormalizedDirection;
  PropObject.userData.baseScale = BaseScale;
  PropObject.userData.restorationDistance = 1;
  return PropObject;
}

/** Creates a compact placeholder prop set for worlds awaiting their authored art pass. */
function createPlaceholderSurfaceProps(WorldDefinition) {
  const SurfacePropGroup = new THREE.Group();
  const MarkerGeometry = new THREE.ConeGeometry(0.16, 0.55, 5);

  for (let MarkerIndex = 0; MarkerIndex < 9; MarkerIndex += 1) {
    const MarkerMaterial = new THREE.MeshStandardMaterial({
      color: WorldDefinition.restored
        ? WorldDefinition.aliveColor.clone().offsetHSL(0, 0, 0.16)
        : DarkWorldColor,
      roughness: 0.92,
    });
    const MarkerMesh = new THREE.Mesh(MarkerGeometry, MarkerMaterial);
    const MarkerAngle = (MarkerIndex / 9) * Math.PI * 2;
    const MarkerLatitudeOffset = Math.sin(MarkerIndex * 1.7) * 0.42;
    const SurfaceDirection = new THREE.Vector3(
      Math.cos(MarkerAngle) * Math.cos(MarkerLatitudeOffset),
      Math.sin(MarkerAngle) * Math.cos(MarkerLatitudeOffset),
      Math.sin(MarkerLatitudeOffset),
    );
    const MarkerBaseScale = 0.9 + ((MarkerIndex % 3) * 0.2);

    placeSurfaceProp(MarkerMesh, SurfaceDirection, WorldDefinition.radius + 0.22, MarkerBaseScale);
    registerRestorableMaterial(
      MarkerMesh,
      MarkerMaterial,
      WorldDefinition.aliveColor.clone().offsetHSL(0, 0, 0.16),
    );
    SurfacePropGroup.add(MarkerMesh);
  }

  return SurfacePropGroup;
}

/** Creates Meadow's authored low-poly cottage landmark. */
function createMeadowCottage(WorldDefinition, SurfaceDirection) {
  const Cottage = new THREE.Group();
  const WallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2dfad,
    roughness: 0.9,
  });
  const RoofMaterial = new THREE.MeshStandardMaterial({
    color: 0xb65446,
    roughness: 0.86,
  });
  const DoorMaterial = new THREE.MeshStandardMaterial({
    color: 0x503a31,
    roughness: 0.94,
  });
  const WindowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe9a3,
    emissive: 0xffbd62,
    emissiveIntensity: 0.75,
    roughness: 0.4,
  });

  const Walls = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, 0.62), WallMaterial);
  Walls.position.y = 0.34;
  Cottage.add(Walls);

  const Roof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.48, 4), RoofMaterial);
  Roof.position.y = 0.84;
  Roof.rotation.y = Math.PI * 0.25;
  Cottage.add(Roof);

  const Door = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.04), DoorMaterial);
  Door.position.set(0, 0.23, 0.33);
  Cottage.add(Door);

  const WindowGeometry = new THREE.BoxGeometry(0.16, 0.15, 0.035);
  for (const WindowX of [-0.23, 0.23]) {
    const WindowMesh = new THREE.Mesh(WindowGeometry, WindowMaterial);
    WindowMesh.position.set(WindowX, 0.42, 0.335);
    Cottage.add(WindowMesh);
  }

  placeSurfaceProp(Cottage, SurfaceDirection, WorldDefinition.radius, 1.12, 0.02);
  registerRestorableMaterial(Cottage, WallMaterial);
  registerRestorableMaterial(Cottage, RoofMaterial);
  registerRestorableMaterial(Cottage, DoorMaterial);
  registerRestorableMaterial(Cottage, WindowMaterial);
  Cottage.userData.kind = 'cottage';
  Cottage.userData.windowMaterial = WindowMaterial;
  return Cottage;
}

/** Creates one rounded toy-like Meadow tree. */
function createMeadowTree(WorldDefinition, SurfaceDirection, Scale, Phase) {
  const Tree = new THREE.Group();
  const TrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x765139, roughness: 0.96 });
  const LeafMaterial = new THREE.MeshStandardMaterial({ color: 0x76b85d, roughness: 0.88 });
  const Trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.58, 6), TrunkMaterial);
  Trunk.position.y = 0.29;
  Tree.add(Trunk);

  const CanopyGeometry = new THREE.IcosahedronGeometry(0.32, 1);
  const CanopyPositions = [
    new THREE.Vector3(0, 0.69, 0),
    new THREE.Vector3(-0.18, 0.61, 0.04),
    new THREE.Vector3(0.17, 0.62, -0.03),
  ];
  for (const CanopyPosition of CanopyPositions) {
    const Canopy = new THREE.Mesh(CanopyGeometry, LeafMaterial);
    Canopy.position.copy(CanopyPosition);
    Tree.add(Canopy);
  }

  placeSurfaceProp(Tree, SurfaceDirection, WorldDefinition.radius, Scale, 0.02);
  registerRestorableMaterial(Tree, TrunkMaterial);
  registerRestorableMaterial(Tree, LeafMaterial);
  Tree.userData.kind = 'tree';
  Tree.userData.swayPhase = Phase;
  Tree.userData.swayAmount = 0.035;
  return Tree;
}

/** Creates a small readable cluster of flowers. */
function createMeadowFlowers(WorldDefinition, SurfaceDirection, FlowerColor, Phase) {
  const FlowerCluster = new THREE.Group();
  const StemMaterial = new THREE.MeshStandardMaterial({ color: 0x528f4c, roughness: 0.95 });
  const PetalMaterial = new THREE.MeshStandardMaterial({ color: FlowerColor, roughness: 0.8 });
  const CentreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffda68,
    emissive: 0x7a4b12,
    emissiveIntensity: 0.28,
    roughness: 0.82,
  });

  for (let FlowerIndex = 0; FlowerIndex < 3; FlowerIndex += 1) {
    const FlowerX = (FlowerIndex - 1) * 0.15;
    const FlowerHeight = 0.25 + ((FlowerIndex % 2) * 0.08);
    const Stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.025, FlowerHeight, 5),
      StemMaterial,
    );
    Stem.position.set(FlowerX, FlowerHeight * 0.5, (FlowerIndex % 2) * 0.05);
    FlowerCluster.add(Stem);

    const FlowerHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), PetalMaterial);
    FlowerHead.position.set(FlowerX, FlowerHeight, (FlowerIndex % 2) * 0.05);
    FlowerCluster.add(FlowerHead);

    const FlowerCentre = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), CentreMaterial);
    FlowerCentre.position.set(FlowerX, FlowerHeight + 0.012, 0.075 + ((FlowerIndex % 2) * 0.05));
    FlowerCluster.add(FlowerCentre);
  }

  placeSurfaceProp(FlowerCluster, SurfaceDirection, WorldDefinition.radius, 1, 0.025);
  registerRestorableMaterial(FlowerCluster, StemMaterial);
  registerRestorableMaterial(FlowerCluster, PetalMaterial);
  registerRestorableMaterial(FlowerCluster, CentreMaterial);
  FlowerCluster.userData.kind = 'flowers';
  FlowerCluster.userData.swayPhase = Phase;
  FlowerCluster.userData.swayAmount = 0.055;
  return FlowerCluster;
}

/** Creates a curved-surface grass tuft from three exaggerated blades. */
function createMeadowGrass(WorldDefinition, SurfaceDirection, Scale, Phase) {
  const Grass = new THREE.Group();
  const GrassMaterial = new THREE.MeshStandardMaterial({ color: 0x9acc68, roughness: 0.96 });
  const BladeGeometry = new THREE.ConeGeometry(0.045, 0.34, 4);

  for (let BladeIndex = 0; BladeIndex < 3; BladeIndex += 1) {
    const Blade = new THREE.Mesh(BladeGeometry, GrassMaterial);
    Blade.position.set((BladeIndex - 1) * 0.08, 0.17, 0);
    Blade.rotation.z = (BladeIndex - 1) * -0.15;
    Grass.add(Blade);
  }

  placeSurfaceProp(Grass, SurfaceDirection, WorldDefinition.radius, Scale, 0.02);
  registerRestorableMaterial(Grass, GrassMaterial);
  Grass.userData.kind = 'grass';
  Grass.userData.swayPhase = Phase;
  Grass.userData.swayAmount = 0.065;
  return Grass;
}

/** Creates Meadow's pond as a glossy tangent disc with a bright rim. */
function createMeadowPond(WorldDefinition, SurfaceDirection) {
  const Pond = new THREE.Group();
  const WaterMaterial = new THREE.MeshStandardMaterial({
    color: 0x58b7b1,
    emissive: 0x123e48,
    emissiveIntensity: 0.45,
    roughness: 0.24,
    metalness: 0.05,
  });
  const RimMaterial = new THREE.MeshStandardMaterial({ color: 0xbee58d, roughness: 0.9 });
  const Water = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), WaterMaterial);
  Water.rotation.x = -Math.PI * 0.5;
  Water.scale.z = 0.62;
  Water.position.y = 0.025;
  Pond.add(Water);

  const Rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 6, 32), RimMaterial);
  Rim.rotation.x = Math.PI * 0.5;
  Rim.scale.z = 0.62;
  Rim.position.y = 0.018;
  Pond.add(Rim);

  placeSurfaceProp(Pond, SurfaceDirection, WorldDefinition.radius, 1, 0.015);
  registerRestorableMaterial(Pond, WaterMaterial);
  registerRestorableMaterial(Pond, RimMaterial);
  Pond.userData.kind = 'pond';
  Pond.userData.waterMaterial = WaterMaterial;
  return Pond;
}

/** Builds Meadow's final procedural prop composition. */
function createMeadowSurfaceProps(WorldDefinition) {
  const SurfacePropGroup = new THREE.Group();
  const TreeDefinitions = [
    [-0.64, 0.22, 0.74, 1.1],
    [0.43, 0.58, 0.69, 0.92],
    [-0.42, -0.48, 0.77, 0.82],
    [0.7, -0.14, 0.7, 0.72],
  ];
  TreeDefinitions.forEach(([X, Y, Z, Scale], Index) => {
    SurfacePropGroup.add(createMeadowTree(
      WorldDefinition,
      new THREE.Vector3(X, Y, Z),
      Scale,
      Index * 1.7,
    ));
  });

  SurfacePropGroup.add(createMeadowCottage(
    WorldDefinition,
    new THREE.Vector3(-0.16, 0.7, 0.72),
  ));
  SurfacePropGroup.add(createMeadowPond(
    WorldDefinition,
    new THREE.Vector3(0.2, -0.34, 0.93),
  ));

  const FlowerDefinitions = [
    [-0.08, 0.1, 0.99, 0xf0a7c6],
    [0.48, 0.18, 0.87, 0xd8b0ff],
    [-0.52, -0.1, 0.85, 0xffd68a],
    [0.1, 0.55, 0.84, 0xf59cab],
  ];
  FlowerDefinitions.forEach(([X, Y, Z, Color], Index) => {
    SurfacePropGroup.add(createMeadowFlowers(
      WorldDefinition,
      new THREE.Vector3(X, Y, Z),
      Color,
      0.7 + (Index * 1.2),
    ));
  });

  const GrassDirections = [
    [-0.8, 0.52, 0.3], [0.12, 0.84, 0.52], [0.73, 0.42, 0.54],
    [-0.76, -0.48, 0.45], [-0.18, -0.76, 0.63], [0.63, -0.58, 0.52],
    [-0.35, 0.34, 0.88], [0.42, -0.02, 0.91],
  ];
  GrassDirections.forEach(([X, Y, Z], Index) => {
    SurfacePropGroup.add(createMeadowGrass(
      WorldDefinition,
      new THREE.Vector3(X, Y, Z),
      0.78 + ((Index % 3) * 0.1),
      Index * 0.8,
    ));
  });

  const RockGeometry = new THREE.DodecahedronGeometry(0.16, 0);
  const RockDirections = [
    [-0.72, 0.68, 0.18], [0.55, 0.72, 0.42], [-0.66, -0.68, 0.3], [0.54, -0.7, 0.46],
  ];
  RockDirections.forEach(([X, Y, Z], Index) => {
    const RockMaterial = new THREE.MeshStandardMaterial({ color: 0xa5ad92, roughness: 1 });
    const Rock = new THREE.Mesh(RockGeometry, RockMaterial);
    Rock.scale.set(1.25, 0.8, 1);
    placeSurfaceProp(
      Rock,
      new THREE.Vector3(X, Y, Z),
      WorldDefinition.radius,
      0.82 + ((Index % 2) * 0.18),
      0.04,
    );
    registerRestorableMaterial(Rock, RockMaterial);
    Rock.userData.kind = 'rock';
    SurfacePropGroup.add(Rock);
  });

  return SurfacePropGroup;
}

/** Creates a cluster of rising basalt columns with a restrained inner heat glow. */
function createEmberBasaltCluster(WorldDefinition, SurfaceDirection, Scale, Phase) {
  const BasaltCluster = new THREE.Group();
  const BasaltMaterial = new THREE.MeshStandardMaterial({
    color: 0x41353a,
    roughness: 0.82,
    metalness: 0.08,
  });
  const HeatMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8a42,
    emissive: 0xff461f,
    emissiveIntensity: 1.35,
    roughness: 0.45,
  });
  const ColumnHeights = [0.56, 0.82, 0.43, 0.67, 0.36];
  const ColumnPositions = [
    [-0.18, 0], [0, 0.03], [0.18, 0.02], [-0.08, 0.18], [0.13, 0.17],
  ];

  ColumnHeights.forEach((ColumnHeight, Index) => {
    const Column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.13, ColumnHeight, 6),
      BasaltMaterial,
    );
    Column.position.set(
      ColumnPositions[Index][0],
      ColumnHeight * 0.5,
      ColumnPositions[Index][1],
    );
    Column.rotation.y = (Index % 2) * 0.22;
    BasaltCluster.add(Column);

    if (Index < 2) {
      const HeatCap = new THREE.Mesh(new THREE.CircleGeometry(0.075, 6), HeatMaterial);
      HeatCap.rotation.x = -Math.PI * 0.5;
      HeatCap.position.set(
        ColumnPositions[Index][0],
        ColumnHeight + 0.003,
        ColumnPositions[Index][1],
      );
      BasaltCluster.add(HeatCap);
    }
  });

  placeSurfaceProp(BasaltCluster, SurfaceDirection, WorldDefinition.radius, Scale, 0.025);
  registerRestorableMaterial(BasaltCluster, BasaltMaterial);
  registerRestorableMaterial(BasaltCluster, HeatMaterial);
  BasaltCluster.userData.kind = 'basalt';
  BasaltCluster.userData.heatMaterial = HeatMaterial;
  BasaltCluster.userData.motionPhase = Phase;
  return BasaltCluster;
}

/** Creates Ember's volcanic landmark with a glowing caldera. */
function createEmberCaldera(WorldDefinition, SurfaceDirection) {
  const Caldera = new THREE.Group();
  const CrustMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3432,
    roughness: 0.96,
  });
  const LavaMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa33e,
    emissive: 0xff3c12,
    emissiveIntensity: 2.2,
    roughness: 0.28,
  });
  const Volcano = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.85, 7, 1, true), CrustMaterial);
  Volcano.position.y = 0.42;
  Caldera.add(Volcano);

  const LavaMouth = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), LavaMaterial);
  LavaMouth.rotation.x = -Math.PI * 0.5;
  LavaMouth.position.y = 0.84;
  Caldera.add(LavaMouth);

  const CraterRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.085, 6, 22), CrustMaterial);
  CraterRim.rotation.x = Math.PI * 0.5;
  CraterRim.position.y = 0.845;
  Caldera.add(CraterRim);

  placeSurfaceProp(Caldera, SurfaceDirection, WorldDefinition.radius, 1.08, 0.015);
  registerRestorableMaterial(Caldera, CrustMaterial);
  registerRestorableMaterial(Caldera, LavaMaterial);
  Caldera.userData.kind = 'volcano';
  Caldera.userData.lavaMaterial = LavaMaterial;
  return Caldera;
}

/** Creates a small molten pool set into Ember's curved crust. */
function createEmberLavaPool(WorldDefinition, SurfaceDirection) {
  const LavaPool = new THREE.Group();
  const LavaMaterial = new THREE.MeshStandardMaterial({
    color: 0xff9a38,
    emissive: 0xff3514,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });
  const RimMaterial = new THREE.MeshStandardMaterial({ color: 0x4e3735, roughness: 0.98 });
  const Lava = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), LavaMaterial);
  Lava.rotation.x = -Math.PI * 0.5;
  Lava.scale.z = 0.55;
  Lava.position.y = 0.026;
  LavaPool.add(Lava);
  const Rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 28), RimMaterial);
  Rim.rotation.x = Math.PI * 0.5;
  Rim.scale.z = 0.55;
  Rim.position.y = 0.02;
  LavaPool.add(Rim);

  placeSurfaceProp(LavaPool, SurfaceDirection, WorldDefinition.radius, 1, 0.015);
  registerRestorableMaterial(LavaPool, LavaMaterial);
  registerRestorableMaterial(LavaPool, RimMaterial);
  LavaPool.userData.kind = 'lavaPool';
  LavaPool.userData.lavaMaterial = LavaMaterial;
  return LavaPool;
}

/** Builds Ember's authored volcanic prop composition. */
function createEmberSurfaceProps(WorldDefinition) {
  const SurfacePropGroup = new THREE.Group();
  SurfacePropGroup.add(createEmberCaldera(
    WorldDefinition,
    new THREE.Vector3(0.24, 0.58, 0.79),
  ));
  SurfacePropGroup.add(createEmberLavaPool(
    WorldDefinition,
    new THREE.Vector3(-0.08, -0.42, 0.91),
  ));

  const ClusterDefinitions = [
    [-0.64, 0.34, 0.7, 1.0], [0.62, 0.12, 0.78, 0.86],
    [-0.54, -0.48, 0.69, 0.72], [0.58, -0.55, 0.6, 0.68],
  ];
  ClusterDefinitions.forEach(([X, Y, Z, Scale], Index) => {
    SurfacePropGroup.add(createEmberBasaltCluster(
      WorldDefinition,
      new THREE.Vector3(X, Y, Z),
      Scale,
      Index * 1.4,
    ));
  });

  const ShardGeometry = new THREE.TetrahedronGeometry(0.19, 0);
  const ShardDirections = [
    [-0.78, 0.58, 0.26], [0.72, 0.58, 0.38], [-0.72, -0.65, 0.25],
    [0.72, -0.62, 0.31], [0.05, 0.02, 1],
  ];
  ShardDirections.forEach(([X, Y, Z], Index) => {
    const ShardMaterial = new THREE.MeshStandardMaterial({
      color: Index % 2 === 0 ? 0x513a3a : 0x372f35,
      roughness: 0.88,
      metalness: 0.06,
    });
    const Shard = new THREE.Mesh(ShardGeometry, ShardMaterial);
    Shard.rotation.y = Index * 0.7;
    placeSurfaceProp(
      Shard,
      new THREE.Vector3(X, Y, Z),
      WorldDefinition.radius,
      0.8 + ((Index % 3) * 0.18),
      0.055,
    );
    registerRestorableMaterial(Shard, ShardMaterial);
    Shard.userData.kind = 'rock';
    SurfacePropGroup.add(Shard);
  });

  return SurfacePropGroup;
}

/** Creates one translucent-looking cluster of faceted Frost crystals. */
function createFrostCrystalCluster(WorldDefinition, SurfaceDirection, Scale, Phase) {
  const CrystalCluster = new THREE.Group();
  const CrystalMaterial = new THREE.MeshStandardMaterial({
    color: 0xbdebf2,
    emissive: 0x4b9db4,
    emissiveIntensity: 0.72,
    roughness: 0.2,
    metalness: 0.08,
  });
  const CrystalGeometry = new THREE.OctahedronGeometry(0.28, 0);
  const CrystalDefinitions = [
    [-0.2, 0.5, 0, 1.45], [0.02, 0.7, 0.02, 1.9], [0.23, 0.42, -0.02, 1.15],
  ];
  CrystalDefinitions.forEach(([X, Y, Z, HeightScale], Index) => {
    const Crystal = new THREE.Mesh(CrystalGeometry, CrystalMaterial);
    Crystal.position.set(X, Y * 0.52, Z);
    Crystal.scale.set(0.72, HeightScale, 0.72);
    Crystal.rotation.y = Index * 0.42;
    CrystalCluster.add(Crystal);
  });

  placeSurfaceProp(CrystalCluster, SurfaceDirection, WorldDefinition.radius, Scale, 0.025);
  registerRestorableMaterial(CrystalCluster, CrystalMaterial);
  CrystalCluster.userData.kind = 'crystal';
  CrystalCluster.userData.crystalMaterial = CrystalMaterial;
  CrystalCluster.userData.motionPhase = Phase;
  return CrystalCluster;
}

/** Creates Frost's large ice arch landmark. */
function createFrostIceArch(WorldDefinition, SurfaceDirection) {
  const IceArch = new THREE.Group();
  const IceMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9f6f8,
    emissive: 0x5cabc1,
    emissiveIntensity: 0.62,
    roughness: 0.22,
    metalness: 0.06,
  });
  for (const PillarX of [-0.4, 0.4]) {
    const Pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.66, 6), IceMaterial);
    Pillar.position.set(PillarX, 0.33, 0);
    IceArch.add(Pillar);
  }
  const Arch = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.11, 6, 24, Math.PI), IceMaterial);
  Arch.position.y = 0.64;
  IceArch.add(Arch);

  placeSurfaceProp(IceArch, SurfaceDirection, WorldDefinition.radius, 1.15, 0.02);
  registerRestorableMaterial(IceArch, IceMaterial);
  IceArch.userData.kind = 'iceArch';
  IceArch.userData.crystalMaterial = IceMaterial;
  return IceArch;
}

/** Creates a luminous frozen lake on Frost. */
function createFrostLake(WorldDefinition, SurfaceDirection) {
  const FrozenLake = new THREE.Group();
  const IceMaterial = new THREE.MeshStandardMaterial({
    color: 0x99dce8,
    emissive: 0x326f91,
    emissiveIntensity: 0.48,
    roughness: 0.16,
    metalness: 0.12,
  });
  const SnowMaterial = new THREE.MeshStandardMaterial({ color: 0xe8f5f2, roughness: 0.88 });
  const Ice = new THREE.Mesh(new THREE.CircleGeometry(0.58, 28), IceMaterial);
  Ice.rotation.x = -Math.PI * 0.5;
  Ice.scale.z = 0.62;
  Ice.position.y = 0.025;
  FrozenLake.add(Ice);
  const SnowRim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 6, 30), SnowMaterial);
  SnowRim.rotation.x = Math.PI * 0.5;
  SnowRim.scale.z = 0.62;
  SnowRim.position.y = 0.02;
  FrozenLake.add(SnowRim);

  placeSurfaceProp(FrozenLake, SurfaceDirection, WorldDefinition.radius, 1, 0.015);
  registerRestorableMaterial(FrozenLake, IceMaterial);
  registerRestorableMaterial(FrozenLake, SnowMaterial);
  FrozenLake.userData.kind = 'frozenLake';
  FrozenLake.userData.crystalMaterial = IceMaterial;
  return FrozenLake;
}

/** Builds Frost's authored crystalline prop composition. */
function createFrostSurfaceProps(WorldDefinition) {
  const SurfacePropGroup = new THREE.Group();
  SurfacePropGroup.add(createFrostIceArch(
    WorldDefinition,
    new THREE.Vector3(-0.18, 0.68, 0.73),
  ));
  SurfacePropGroup.add(createFrostLake(
    WorldDefinition,
    new THREE.Vector3(0.22, -0.36, 0.91),
  ));

  const CrystalDefinitions = [
    [-0.64, 0.25, 0.73, 1.0], [0.55, 0.43, 0.71, 0.9],
    [-0.5, -0.53, 0.69, 0.78], [0.64, -0.45, 0.63, 0.72],
    [0.2, 0.15, 0.97, 0.64],
  ];
  CrystalDefinitions.forEach(([X, Y, Z, Scale], Index) => {
    SurfacePropGroup.add(createFrostCrystalCluster(
      WorldDefinition,
      new THREE.Vector3(X, Y, Z),
      Scale,
      Index * 1.15,
    ));
  });

  const SnowGeometry = new THREE.IcosahedronGeometry(0.24, 1);
  const SnowDirections = [
    [-0.75, 0.6, 0.27], [0.7, 0.63, 0.34], [-0.72, -0.65, 0.27],
    [0.72, -0.62, 0.31], [-0.12, 0.04, 0.99],
  ];
  SnowDirections.forEach(([X, Y, Z], Index) => {
    const SnowMaterial = new THREE.MeshStandardMaterial({ color: 0xe5f1ee, roughness: 0.94 });
    const SnowMound = new THREE.Mesh(SnowGeometry, SnowMaterial);
    SnowMound.scale.set(1.2, 0.55, 1);
    placeSurfaceProp(
      SnowMound,
      new THREE.Vector3(X, Y, Z),
      WorldDefinition.radius,
      0.78 + ((Index % 2) * 0.18),
      0.035,
    );
    registerRestorableMaterial(SnowMound, SnowMaterial);
    SnowMound.userData.kind = 'snow';
    SurfacePropGroup.add(SnowMound);
  });

  return SurfacePropGroup;
}

/** Creates a tiny deterministic halo of warm Meadow motes. */
function createMeadowMotes(WorldDefinition) {
  const MoteCount = 24;
  const MotePositions = new Float32Array(MoteCount * 3);

  for (let MoteIndex = 0; MoteIndex < MoteCount; MoteIndex += 1) {
    const GoldenAngle = Math.PI * (3 - Math.sqrt(5));
    const Longitude = MoteIndex * GoldenAngle;
    const VerticalPosition = 1 - ((MoteIndex + 0.5) / MoteCount) * 2;
    const HorizontalRadius = Math.sqrt(1 - (VerticalPosition * VerticalPosition));
    const MoteRadius = WorldDefinition.radius + 0.62 + ((MoteIndex % 4) * 0.08);
    const PositionOffset = MoteIndex * 3;
    MotePositions[PositionOffset] = Math.cos(Longitude) * HorizontalRadius * MoteRadius;
    MotePositions[PositionOffset + 1] = VerticalPosition * MoteRadius;
    MotePositions[PositionOffset + 2] = Math.sin(Longitude) * HorizontalRadius * MoteRadius;
  }

  const MoteGeometry = new THREE.BufferGeometry();
  MoteGeometry.setAttribute('position', new THREE.BufferAttribute(MotePositions, 3));
  const MoteMaterial = new THREE.PointsMaterial({
    color: 0xffef9d,
    size: 0.09,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(MoteGeometry, MoteMaterial);
}

/** Creates a fixed-size deterministic particle halo for a restored biome. */
function createBiomeMotes(WorldDefinition, MoteCount, Color, Size, BaseOpacity) {
  const MotePositions = new Float32Array(MoteCount * 3);

  for (let MoteIndex = 0; MoteIndex < MoteCount; MoteIndex += 1) {
    const GoldenAngle = Math.PI * (3 - Math.sqrt(5));
    const Longitude = MoteIndex * GoldenAngle;
    const VerticalPosition = 1 - ((MoteIndex + 0.5) / MoteCount) * 2;
    const HorizontalRadius = Math.sqrt(1 - (VerticalPosition * VerticalPosition));
    const RadiusVariation = ((MoteIndex * 7) % 5) * 0.09;
    const MoteRadius = WorldDefinition.radius + 0.48 + RadiusVariation;
    const PositionOffset = MoteIndex * 3;
    MotePositions[PositionOffset] = Math.cos(Longitude) * HorizontalRadius * MoteRadius;
    MotePositions[PositionOffset + 1] = VerticalPosition * MoteRadius;
    MotePositions[PositionOffset + 2] = Math.sin(Longitude) * HorizontalRadius * MoteRadius;
  }

  const MoteGeometry = new THREE.BufferGeometry();
  MoteGeometry.setAttribute('position', new THREE.BufferAttribute(MotePositions, 3));
  const MoteMaterial = new THREE.PointsMaterial({
    color: Color,
    size: Size,
    sizeAttenuation: true,
    transparent: true,
    opacity: WorldDefinition.restored ? BaseOpacity : 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const MoteGroup = new THREE.Points(MoteGeometry, MoteMaterial);
  MoteGroup.userData.baseOpacity = BaseOpacity;
  return MoteGroup;
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

  const SurfaceGeometry = new THREE.IcosahedronGeometry(
    WorldDefinition.radius,
    WorldDefinition.isPrototypeWorld ? 3 : 5,
  );
  const SurfaceRestoration = createRestorationSurfaceMaterial(WorldDefinition);
  const SurfaceMaterial = SurfaceRestoration.material;
  const SurfaceMesh = new THREE.Mesh(SurfaceGeometry, SurfaceMaterial);
  SurfaceMesh.castShadow = true;
  SurfaceMesh.receiveShadow = true;
  WorldGroup.add(SurfaceMesh);

  const RestorationWaveShell = createRestorationWaveShell(
    WorldDefinition,
    SurfaceRestoration.uniforms,
  );
  WorldGroup.add(RestorationWaveShell.mesh);

  let AtmosphereMaterial;
  let AtmosphereMesh;
  let ContourRingGroup;
  if (WorldDefinition.isPrototypeWorld) {
    /** Greybox choices use the restoration shader but deliberately add no extra draw calls. */
    AtmosphereMaterial = { opacity: 0 };
    AtmosphereMesh = new THREE.Object3D();
    ContourRingGroup = new THREE.Group();
  } else {
    const AtmosphereGeometry = new THREE.SphereGeometry(WorldDefinition.radius * 1.09, 48, 32);
    AtmosphereMaterial = new THREE.MeshBasicMaterial({
      color: WorldDefinition.atmosphereColor,
      transparent: true,
      opacity: WorldDefinition.restored ? 0.10 : 0.025,
      side: THREE.BackSide,
      depthWrite: false,
    });
    AtmosphereMesh = new THREE.Mesh(AtmosphereGeometry, AtmosphereMaterial);
    WorldGroup.add(AtmosphereMesh);

    ContourRingGroup = createWorldContourRings(
      WorldDefinition.radius,
      WorldDefinition.atmosphereColor,
    );
    ContourRingGroup.visible = WorldDefinition.restored;
    WorldGroup.add(ContourRingGroup);
  }

  const SurfacePropFactories = {
    meadow: createMeadowSurfaceProps,
    ember: createEmberSurfaceProps,
    frost: createFrostSurfaceProps,
  };
  const SurfaceMarkerGroup = WorldDefinition.isPrototypeWorld
    ? new THREE.Group()
    : (
      SurfacePropFactories[WorldDefinition.id] ?? createPlaceholderSurfaceProps
    )(WorldDefinition);

  for (const SurfacePropObject of SurfaceMarkerGroup.children) {
    const CastsUsefulShadow = [
      'cottage', 'tree', 'rock', 'basalt', 'volcano', 'crystal', 'iceArch',
    ].includes(
      SurfacePropObject.userData.kind,
    );
    SurfacePropObject.traverse((SurfaceObject) => {
      if (SurfaceObject.isMesh) {
        SurfaceObject.castShadow = CastsUsefulShadow;
        SurfaceObject.receiveShadow = true;
      }
    });
  }

  WorldGroup.add(SurfaceMarkerGroup);
  const AmbientMoteGroup = WorldDefinition.isPrototypeWorld
    ? null
    : (
      WorldDefinition.id === 'meadow'
        ? createMeadowMotes(WorldDefinition)
        : createBiomeMotes(
          WorldDefinition,
          WorldDefinition.id === 'ember' ? 30 : 34,
          WorldDefinition.id === 'ember' ? 0xff7b32 : 0xcdf8ff,
          WorldDefinition.id === 'ember' ? 0.105 : 0.085,
          WorldDefinition.id === 'ember' ? 0.78 : 0.64,
        )
    );
  if (AmbientMoteGroup) {
    AmbientMoteGroup.userData.baseOpacity ??= 0.72;
  }
  if (AmbientMoteGroup) {
    WorldGroup.add(AmbientMoteGroup);
  }
  Scene.add(WorldGroup);

  WorldRuntimeByIdentifier.set(WorldDefinition.id, {
    group: WorldGroup,
    surfaceMesh: SurfaceMesh,
    surfaceMaterial: SurfaceMaterial,
    restorationUniforms: SurfaceRestoration.uniforms,
    restorationWaveMesh: RestorationWaveShell.mesh,
    atmosphereMaterial: AtmosphereMaterial,
    atmosphereMesh: AtmosphereMesh,
    contourRingGroup: ContourRingGroup,
    surfaceMarkerGroup: SurfaceMarkerGroup,
    ambientMoteGroup: AmbientMoteGroup,
    restorationOriginLocal: new THREE.Vector3(1, 0, 0),
    restorationStartedAtSeconds: WorldDefinition.restored ? -Infinity : null,
    restorationCompleted: WorldDefinition.restored,
  });
}

for (const WorldDefinition of WorldDefinitions) {
  createWorld(WorldDefinition);
}

/** Two instanced beacons reveal suggested branches without turning choice into a menu. */
const TargetBeaconGeometry = new THREE.RingGeometry(1, 1.04, 72);
const TargetBeaconMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd98a,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const TargetBeaconMesh = new THREE.InstancedMesh(
  TargetBeaconGeometry,
  TargetBeaconMaterial,
  Math.max(2, RestorableWorldCount),
);
const TargetBeaconTransform = new THREE.Object3D();
TargetBeaconMesh.count = 0;
TargetBeaconMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
TargetBeaconMesh.frustumCulled = false;
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
SeedCoreMesh.castShadow = true;
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
 * Creates a small trail behind the flying seed as one instanced draw call. Pooling avoids
 * allocation spikes and protects the restoration draw-call budget during flight.
 */
const TrailParticlePool = [];
const TrailParticleCount = 22;
const TrailParticleGeometry = new THREE.SphereGeometry(0.10, 6, 4);
const TrailParticleMaterial = new THREE.MeshBasicMaterial({
  color: 0xc9efb8,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const TrailParticleMesh = new THREE.InstancedMesh(
  TrailParticleGeometry,
  TrailParticleMaterial,
  TrailParticleCount,
);
const TrailParticleTransform = new THREE.Object3D();
TrailParticleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
TrailParticleMesh.frustumCulled = false;
Scene.add(TrailParticleMesh);

for (let TrailParticleIndex = 0; TrailParticleIndex < TrailParticleCount; TrailParticleIndex += 1) {
  const TrailParticle = {
    index: TrailParticleIndex,
    position: new THREE.Vector3(),
    lifeRemainingSeconds: 0,
    maximumLifeSeconds: 0.42,
  };
  TrailParticlePool.push(TrailParticle);
  updateTrailParticleInstance(TrailParticle, 0);
}
TrailParticleMesh.instanceMatrix.needsUpdate = true;

let NextTrailParticleIndex = 0;
let TrailEmissionAccumulatorSeconds = 0;

/** Writes one pooled trail particle into the shared instanced mesh. */
function updateTrailParticleInstance(TrailParticle, Scale) {
  TrailParticleTransform.position.copy(TrailParticle.position);
  TrailParticleTransform.scale.setScalar(Scale);
  TrailParticleTransform.updateMatrix();
  TrailParticleMesh.setMatrixAt(TrailParticle.index, TrailParticleTransform.matrix);
}

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

/** Reveals the nearest useful routes while leaving every physical destination valid. */
function showRouteChoiceInstruction() {
  const RouteChoices = getRouteChoices(WorldDefinitions, CurrentWorldIdentifier, 2);
  if (RouteChoices.length === 0) {
    showInstruction('The First Light network is awake', 'The path to the Worldheart is opening.');
    return;
  }

  if (RouteChoices.length === 1) {
    showInstruction(
      RouteChoices[0].label + ' remains',
      'Use the bright path to find your final landing.',
    );
    return;
  }

  showInstruction(
    'Choose ' + RouteChoices[0].label + ' or ' + RouteChoices[1].label,
    'Gold rings suggest routes — every landing becomes your next launch point.',
  );
}

/** Updates the two suggested destination rings as a single draw call. */
function updateTargetBeacons(ElapsedTimeSeconds) {
  const ShouldShowChoices = GamePhase === 'attached';
  const RouteChoices = ShouldShowChoices
    ? getRouteChoices(WorldDefinitions, CurrentWorldIdentifier, 2)
    : [];
  const PulseScale = 1 + (Math.sin(ElapsedTimeSeconds * 3.4) * 0.025);

  TargetBeaconMesh.count = RouteChoices.length;
  TargetBeaconMesh.visible = RouteChoices.length > 0;
  TargetBeaconMaterial.opacity = 0.13 + (Math.sin(ElapsedTimeSeconds * 3.4) * 0.055);

  for (let ChoiceIndex = 0; ChoiceIndex < RouteChoices.length; ChoiceIndex += 1) {
    const WorldDefinition = RouteChoices[ChoiceIndex];
    const RingRadius = (WorldDefinition.radius + 0.55) * PulseScale;
    TargetBeaconTransform.position.set(
      WorldDefinition.position.x,
      WorldDefinition.position.y,
      0.08,
    );
    TargetBeaconTransform.rotation.set(0, 0, (
      (-ElapsedTimeSeconds * 0.35) + (ChoiceIndex * Math.PI * 0.18)
    ));
    TargetBeaconTransform.scale.setScalar(RingRadius);
    TargetBeaconTransform.updateMatrix();
    TargetBeaconMesh.setMatrixAt(ChoiceIndex, TargetBeaconTransform.matrix);
  }
  TargetBeaconMesh.instanceMatrix.needsUpdate = RouteChoices.length > 0;
}

/** Projects suggested world names into the HUD without spending WebGL draw calls. */
function updateRouteLabels() {
  const RouteChoices = GamePhase === 'attached'
    ? getRouteChoices(WorldDefinitions, CurrentWorldIdentifier, RouteLabelElements.length)
    : [];

  for (let LabelIndex = 0; LabelIndex < RouteLabelElements.length; LabelIndex += 1) {
    const RouteLabelElement = RouteLabelElements[LabelIndex];
    const WorldDefinition = RouteChoices[LabelIndex];
    if (!WorldDefinition) {
      RouteLabelElement.textContent = '';
      continue;
    }

    RouteLabelProjection.set(
      WorldDefinition.position.x,
      WorldDefinition.position.y + WorldDefinition.radius + 0.72,
      0,
    ).project(Camera);
    RouteLabelElement.textContent = WorldDefinition.label;
    RouteLabelElement.style.left = Math.round(
      (RouteLabelProjection.x * 0.5 + 0.5) * window.innerWidth,
    ) + 'px';
    RouteLabelElement.style.top = Math.round(
      (-RouteLabelProjection.y * 0.5 + 0.5) * window.innerHeight,
    ) + 'px';
  }
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
  const RestoredWorldCount = countRestoredWorlds(WorldDefinitions);
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
  InstructionPanelElement.setAttribute('aria-hidden', 'false');
}

/** Hides the helper once a launch is in progress. */
function hideInstruction() {
  InstructionPanelElement.classList.add('is-hidden');
  InstructionPanelElement.setAttribute('aria-hidden', 'true');
}

/**
 * Starts the lightweight greybox restoration animation and marks objective state.
 *
 * @param {object} WorldDefinition - World that has just been awakened.
 * @param {{x:number,y:number,z:number}} ImpactPosition - World-space landing point.
 */
function restoreWorld(WorldDefinition, ImpactPosition) {
  if (WorldDefinition.restored) {
    return;
  }

  WorldDefinition.restored = true;
  const WorldRuntime = WorldRuntimeByIdentifier.get(WorldDefinition.id);
  GamePhase = 'restoring';
  WorldRuntime.group.updateWorldMatrix(true, false);
  WorldRuntime.restorationOriginLocal.copy(
    WorldRuntime.group.worldToLocal(new THREE.Vector3(
      ImpactPosition.x,
      ImpactPosition.y,
      ImpactPosition.z,
    )),
  ).normalize();
  WorldRuntime.restorationUniforms.restorationOrigin.value.copy(
    WorldRuntime.restorationOriginLocal,
  );
  WorldRuntime.restorationUniforms.restorationProgress.value = -0.025;
  WorldRuntime.restorationStartedAtSeconds = GameElapsedTimeSeconds;
  WorldRuntime.restorationWaveMesh.visible = true;
  WorldRuntime.contourRingGroup.visible = true;

  for (const SurfacePropObject of WorldRuntime.surfaceMarkerGroup.children) {
    SurfacePropObject.userData.restorationDistance = calculateNormalizedSphericalDistance(
      WorldRuntime.restorationOriginLocal,
      SurfacePropObject.userData.surfaceDirection,
    );
    SurfacePropObject.scale.setScalar(SurfacePropObject.userData.baseScale * 0.05);
    setSurfacePropRestorationProgress(SurfacePropObject, 0);
  }

  updateWorldCounter();
  const RestoredWorldCount = countRestoredWorlds(WorldDefinitions);
  WorldseedSound.restore(WorldDefinition.id, RestoredWorldCount);
  showStatusToast(`${WorldDefinition.label} AWAKENING`, 1450);

  if (isSystemRestored(WorldDefinitions)) {
    GamePhase = 'victoryPending';
    hideInstruction();
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
  WorldseedSound.impact(WorldDefinition.id);

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

  const WasAlreadyRestored = WorldDefinition.restored;
  restoreWorld(WorldDefinition, ImpactPosition);

  if (GamePhase === 'restoring') {
    showInstruction(
      `Life is racing around ${WorldDefinition.label}`,
      'Watch the wave wrap around the tiny world.',
    );
  } else if (WasAlreadyRestored && GamePhase !== 'victory' && GamePhase !== 'victoryPending') {
    GamePhase = 'attached';
    showStatusToast('SAFE LANDING', 700);
    showRouteChoiceInstruction();
  }
}

/**
 * Emits one pooled trail particle at the current seed position.
 */
function emitTrailParticle() {
  const TrailParticle = TrailParticlePool[NextTrailParticleIndex];
  NextTrailParticleIndex = (NextTrailParticleIndex + 1) % TrailParticlePool.length;

  TrailParticle.position.copy(SeedGroup.position);
  TrailParticle.lifeRemainingSeconds = TrailParticle.maximumLifeSeconds;
  updateTrailParticleInstance(TrailParticle, 0.78);
  TrailParticleMesh.instanceMatrix.needsUpdate = true;
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
      updateTrailParticleInstance(TrailParticle, 0);
      continue;
    }

    const LifeRatio = TrailParticle.lifeRemainingSeconds / TrailParticle.maximumLifeSeconds;
    updateTrailParticleInstance(TrailParticle, 0.18 + (LifeRatio * 0.69));
  }
  TrailParticleMesh.instanceMatrix.needsUpdate = true;
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

  const PowerRatio = THREE.MathUtils.clamp(AimDragVector.length() / MaximumDragDistance, 0, 1);
  AimLaunchVelocity.copy(AimDragVector).multiplyScalar(LaunchVelocityPerDragUnit);

  if (AimDragVector.length() < MinimumLaunchDragDistance) {
    clearTrajectoryPreview();
    WorldseedSound.updateAim(PowerRatio, false);
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

  const PowerPercentage = Math.round(PowerRatio * 100);
  AimPowerFillElement.style.width = `${PowerPercentage}%`;
  AimPowerValueElement.textContent = `${PowerPercentage}%`;

  if (TrajectoryPrediction.collisionWorldIdentifier) {
    const LandingWorldDefinition = getWorldDefinition(TrajectoryPrediction.collisionWorldIdentifier);
    const IsNewWorldLanding = !LandingWorldDefinition.restored;
    TrajectoryMaterial.color.set(IsNewWorldLanding ? 0xffd98a : 0xbceca8);
    TrajectoryMaterial.opacity = 0.82;
    LandingMarkerMaterial.color.set(IsNewWorldLanding ? 0xffd98a : 0xbceca8);
    AimPanelElement.classList.add('is-locked');
    AimLabelElement.textContent = IsNewWorldLanding ? 'NEW WORLD LOCKED' : 'SAFE LANDING';
    showInstruction(
      (IsNewWorldLanding ? 'Release to awaken ' : 'Release to land on ')
        + LandingWorldDefinition.label,
      IsNewWorldLanding
        ? 'Gold means a new world. This landing becomes your next launch point.'
        : 'Green means a restored safe landing.',
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
    showInstruction('No landing yet', 'Pull farther or change the angle until the path turns gold or green.');
  }
  WorldseedSound.updateAim(PowerRatio, Boolean(TrajectoryPrediction.collisionWorldIdentifier));
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
  WorldseedSound.beginAim();
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
    WorldseedSound.endAim();
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
  WorldseedSound.launch(THREE.MathUtils.clamp(
    AimDragVector.length() / MaximumDragDistance,
    0,
    1,
  ));
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
  WorldseedSound.failure();
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
    showInstruction('Try another angle', 'Use the gold route rings and wait for a landing lock.');
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
 * Advances the signature spherical restoration wave, staged surface growth and atmosphere.
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

    const IsFullyRestoredAtStart = WorldRuntime.restorationStartedAtSeconds === -Infinity;
    const RestorationElapsedSeconds = IsFullyRestoredAtStart
      ? WorldDefinition.restoration.durationSeconds
      : Math.max(0, ElapsedTimeSeconds - WorldRuntime.restorationStartedAtSeconds);
    const LinearRestorationProgress = THREE.MathUtils.clamp(
      RestorationElapsedSeconds / WorldDefinition.restoration.durationSeconds,
      0,
      1,
    );
    const WaveProgress = calculateRestorationWaveProgress(LinearRestorationProgress);
    const ShaderWaveProgress = LinearRestorationProgress >= 1 ? 1.2 : WaveProgress;
    WorldRuntime.restorationUniforms.restorationProgress.value = ShaderWaveProgress;
    WorldRuntime.restorationWaveMesh.visible = LinearRestorationProgress < 1;

    const AtmosphereLinearProgress = THREE.MathUtils.clamp(
      (LinearRestorationProgress - 0.12) / 0.76,
      0,
      1,
    );
    const AtmosphereProgress = 1 - Math.pow(1 - AtmosphereLinearProgress, 3);
    WorldRuntime.atmosphereMaterial.opacity = THREE.MathUtils.lerp(
      0.025,
      WorldDefinition.restoration.atmosphereOpacity,
      AtmosphereProgress,
    );
    WorldRuntime.atmosphereMesh.scale.setScalar(
      THREE.MathUtils.lerp(0.96, 1, AtmosphereProgress),
    );

    for (const SurfacePropObject of WorldRuntime.surfaceMarkerGroup.children) {
      const GrowthProgress = IsFullyRestoredAtStart
        ? 1
        : calculateStagedGrowthProgress(
          WaveProgress,
          SurfacePropObject.userData.restorationDistance,
          WorldDefinition.restoration.growthTrailWidth,
        );
      const GrowthScale = SurfacePropObject.userData.baseScale * Math.max(0.05, GrowthProgress);
      SurfacePropObject.scale.setScalar(GrowthScale);
      setSurfacePropRestorationProgress(SurfacePropObject, GrowthProgress);
    }

    if (LinearRestorationProgress < 1) {
      const PulseScale = 1 + (Math.sin(LinearRestorationProgress * Math.PI) * 0.045);
      WorldRuntime.group.scale.setScalar(PulseScale);
    } else {
      WorldRuntime.group.scale.setScalar(1);
      if (!WorldRuntime.restorationCompleted) {
        WorldRuntime.restorationCompleted = true;
        WorldseedSound.restorationComplete(WorldDefinition.id);
        if (CurrentWorldIdentifier === WorldDefinition.id) {
          showStatusToast(`${WorldDefinition.label} AWAKENED`, 850);
          if (GamePhase === 'victoryPending') {
            VictoryPanelElement.hidden = false;
            GamePhase = 'victory';
            WorldseedSound.victory();
            hideInstruction();
          } else if (GamePhase === 'restoring') {
            GamePhase = 'attached';
            showRouteChoiceInstruction();
          }
        }
      }
    }

    const MotionProgress = THREE.MathUtils.smoothstep(LinearRestorationProgress, 0.28, 0.92);
    WorldRuntime.group.rotation.y += THREE.MathUtils.lerp(
      0.0005,
      WorldDefinition.restoration.rotationSpeed,
      MotionProgress,
    );
    WorldRuntime.contourRingGroup.rotation.z += 0.0007 * MotionProgress;
    WorldRuntime.contourRingGroup.scale.setScalar(
      THREE.MathUtils.lerp(0.88, 1, AtmosphereProgress),
    );
    if (WorldRuntime.ambientMoteGroup) {
      WorldRuntime.ambientMoteGroup.material.opacity = (
        WorldRuntime.ambientMoteGroup.userData.baseOpacity * AtmosphereProgress
      );
    }
  }
}

/** Maps live fixed-step flight state into a continuous procedural wind voice. */
function updateFlightAudio() {
  if (GamePhase !== 'flying') {
    return;
  }
  const Speed = Math.hypot(SeedPhysicsState.velocity.x, SeedPhysicsState.velocity.y);
  let NearestSurfaceDistance = Infinity;
  for (const WorldDefinition of WorldDefinitions) {
    const OffsetX = SeedPhysicsState.position.x - WorldDefinition.position.x;
    const OffsetY = SeedPhysicsState.position.y - WorldDefinition.position.y;
    const CentreDistance = Math.sqrt((OffsetX * OffsetX) + (OffsetY * OffsetY));
    NearestSurfaceDistance = Math.min(
      NearestSurfaceDistance,
      Math.max(0, CentreDistance - WorldDefinition.radius - SeedRadius),
    );
  }
  WorldseedSound.updateFlight(Speed, NearestSurfaceDistance);
}

/** Adds distinct, restrained biome motion without distracting from aiming. */
function updateWorldBiomeMotion(DeltaTimeSeconds, ElapsedTimeSeconds) {
  const MeadowRuntime = WorldRuntimeByIdentifier.get('meadow');
  const EmberRuntime = WorldRuntimeByIdentifier.get('ember');
  const FrostRuntime = WorldRuntimeByIdentifier.get('frost');

  for (const SurfacePropObject of MeadowRuntime.surfaceMarkerGroup.children) {
    if (SurfacePropObject.userData.swayAmount) {
      const SwayAngle = Math.sin(
        (ElapsedTimeSeconds * 1.55) + SurfacePropObject.userData.swayPhase,
      ) * SurfacePropObject.userData.swayAmount;
      SurfaceSwayQuaternion.setFromAxisAngle(LocalSwayAxis, SwayAngle);
      SurfacePropObject.quaternion.copy(SurfacePropObject.userData.baseQuaternion).multiply(
        SurfaceSwayQuaternion,
      );
    }

    if (SurfacePropObject.userData.kind === 'pond') {
      SurfacePropObject.userData.waterMaterial.emissiveIntensity = 0.4
        + (Math.sin(ElapsedTimeSeconds * 1.8) * 0.08);
    }

    if (SurfacePropObject.userData.kind === 'cottage') {
      SurfacePropObject.userData.windowMaterial.emissiveIntensity = 0.7
        + (Math.sin((ElapsedTimeSeconds * 2.1) + 0.6) * 0.08);
    }
  }

  if (MeadowRuntime.ambientMoteGroup) {
    MeadowRuntime.ambientMoteGroup.rotation.y += DeltaTimeSeconds * 0.09;
    MeadowRuntime.ambientMoteGroup.rotation.z += DeltaTimeSeconds * 0.025;
    MeadowRuntime.ambientMoteGroup.material.opacity = MeadowRuntime.ambientMoteGroup.userData.baseOpacity
      + (Math.sin(ElapsedTimeSeconds * 2.4) * 0.1);
  }

  for (const SurfacePropObject of EmberRuntime.surfaceMarkerGroup.children) {
    const LavaMaterial = SurfacePropObject.userData.lavaMaterial
      ?? SurfacePropObject.userData.heatMaterial;
    if (LavaMaterial && getWorldDefinition('ember').restored) {
      const Phase = SurfacePropObject.userData.motionPhase ?? 0;
      const BaseIntensity = SurfacePropObject.userData.kind === 'volcano' ? 2.2 : 1.8;
      LavaMaterial.emissiveIntensity = BaseIntensity
        + (Math.sin((ElapsedTimeSeconds * 4.2) + Phase) * 0.24);
    }
  }
  if (EmberRuntime.ambientMoteGroup) {
    EmberRuntime.ambientMoteGroup.rotation.y += DeltaTimeSeconds * 0.34;
    EmberRuntime.ambientMoteGroup.rotation.z -= DeltaTimeSeconds * 0.09;
  }

  for (const SurfacePropObject of FrostRuntime.surfaceMarkerGroup.children) {
    const CrystalMaterial = SurfacePropObject.userData.crystalMaterial;
    if (CrystalMaterial && getWorldDefinition('frost').restored) {
      const Phase = SurfacePropObject.userData.motionPhase ?? 0;
      const BaseIntensity = SurfacePropObject.userData.kind === 'iceArch' ? 0.62 : 0.58;
      CrystalMaterial.emissiveIntensity = BaseIntensity
        + (Math.sin((ElapsedTimeSeconds * 1.25) + Phase) * 0.1);
    }
  }
  if (FrostRuntime.ambientMoteGroup) {
    FrostRuntime.ambientMoteGroup.rotation.y += DeltaTimeSeconds * 0.045;
    FrostRuntime.ambientMoteGroup.rotation.x += DeltaTimeSeconds * 0.018;
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
  updateTargetBeacons(ElapsedTimeSeconds);
  if (IsOpeningCoachVisible) {
    PullGuideMaterial.dashOffset -= DeltaTimeSeconds * 0.9;
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
    Camera.position.x = Math.sin(GameElapsedTimeSeconds * 93) * ShakeStrength;
    Camera.position.y = Math.cos(GameElapsedTimeSeconds * 77) * ShakeStrength;
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

  const SmallestViewportDimension = Math.min(ViewportWidth, ViewportHeight);
  const DevicePixelRatioCap = SmallestViewportDimension <= 640 ? 1.5 : 2;
  AdaptivePixelRatioCap = Math.min(AdaptivePixelRatioCap, DevicePixelRatioCap);
  Renderer.setPixelRatio(Math.min(window.devicePixelRatio, AdaptivePixelRatioCap));
  Renderer.setSize(ViewportWidth, ViewportHeight, false);
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
 * Publishes a low-frequency render budget snapshot and lowers fill rate on persistently
 * slow devices without changing the deterministic physics or authored scene.
 */
function updatePerformanceBudget(DeltaTimeSeconds) {
  PerformanceSampleElapsedSeconds += DeltaTimeSeconds;
  PerformanceSampleDeltaSeconds += DeltaTimeSeconds;
  PerformanceSampleFrameCount += 1;
  const PreviousMaximumDrawCalls = MaximumObservedDrawCalls;
  MaximumObservedDrawCalls = Math.max(PreviousMaximumDrawCalls, Renderer.info.render.calls);

  if (PerformanceSampleFrameCount === 1 || MaximumObservedDrawCalls > PreviousMaximumDrawCalls) {
    GameCanvas.dataset.drawCalls = String(Renderer.info.render.calls);
    GameCanvas.dataset.maxDrawCalls = String(MaximumObservedDrawCalls);
    GameCanvas.dataset.triangles = String(Renderer.info.render.triangles);
    GameCanvas.dataset.withinDrawCallBudget = String(
      MaximumObservedDrawCalls <= MaximumDrawCallBudget,
    );
  }

  if (PerformanceSampleElapsedSeconds < 2) {
    return;
  }

  const AverageFrameSeconds = PerformanceSampleDeltaSeconds / PerformanceSampleFrameCount;
  GameCanvas.dataset.drawCalls = String(Renderer.info.render.calls);
  GameCanvas.dataset.maxDrawCalls = String(MaximumObservedDrawCalls);
  GameCanvas.dataset.triangles = String(Renderer.info.render.triangles);
  GameCanvas.dataset.frameRate = String(Math.round(1 / Math.max(AverageFrameSeconds, 0.001)));
  GameCanvas.dataset.withinDrawCallBudget = String(
    MaximumObservedDrawCalls <= MaximumDrawCallBudget,
  );

  if (
    AverageFrameSeconds > (1 / 34)
    && AdaptivePixelRatioCap > MinimumAdaptivePixelRatio
    && document.visibilityState === 'visible'
  ) {
    AdaptivePixelRatioCap = Math.max(
      MinimumAdaptivePixelRatio,
      AdaptivePixelRatioCap - 0.25,
    );
    Renderer.setPixelRatio(Math.min(window.devicePixelRatio, AdaptivePixelRatioCap));
    Renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  PerformanceSampleElapsedSeconds = 0;
  PerformanceSampleDeltaSeconds = 0;
  PerformanceSampleFrameCount = 0;
}

/**
 * Resets objective state, animations and player position to a deterministic opening shot.
 */
function resetGame() {
  if (RecoveryTimeoutIdentifier !== null) {
    window.clearTimeout(RecoveryTimeoutIdentifier);
    RecoveryTimeoutIdentifier = null;
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
  WorldseedSound.reset();

  for (const WorldDefinition of WorldDefinitions) {
    WorldDefinition.restored = WorldDefinition.isStartingWorld;
    const WorldRuntime = WorldRuntimeByIdentifier.get(WorldDefinition.id);
    WorldRuntime.restorationStartedAtSeconds = WorldDefinition.isStartingWorld ? -Infinity : null;
    WorldRuntime.restorationCompleted = WorldDefinition.isStartingWorld;
    WorldRuntime.restorationOriginLocal.set(1, 0, 0);
    WorldRuntime.restorationUniforms.restorationOrigin.value.set(1, 0, 0);
    WorldRuntime.restorationUniforms.restorationProgress.value = WorldDefinition.isStartingWorld
      ? 1.2
      : -0.1;
    WorldRuntime.restorationWaveMesh.visible = false;
    WorldRuntime.surfaceMaterial.color.set(0xffffff);
    WorldRuntime.atmosphereMaterial.opacity = WorldDefinition.isStartingWorld
      ? WorldDefinition.restoration.atmosphereOpacity
      : 0.025;
    WorldRuntime.atmosphereMesh.scale.setScalar(WorldDefinition.isStartingWorld ? 1 : 0.96);
    WorldRuntime.contourRingGroup.visible = WorldDefinition.isStartingWorld;
    WorldRuntime.contourRingGroup.rotation.set(0, 0, 0);
    WorldRuntime.contourRingGroup.scale.setScalar(1);
    WorldRuntime.group.rotation.set(0, 0, 0);
    WorldRuntime.group.scale.setScalar(1);
    if (WorldRuntime.ambientMoteGroup) {
      WorldRuntime.ambientMoteGroup.rotation.set(0, 0, 0);
      WorldRuntime.ambientMoteGroup.material.opacity = WorldDefinition.isStartingWorld
        ? WorldRuntime.ambientMoteGroup.userData.baseOpacity
        : 0;
    }

    for (const SurfacePropObject of WorldRuntime.surfaceMarkerGroup.children) {
      const RestorationProgress = WorldDefinition.isStartingWorld ? 1 : 0;
      setSurfacePropRestorationProgress(SurfacePropObject, RestorationProgress);
      SurfacePropObject.userData.restorationDistance = WorldDefinition.isStartingWorld ? 0 : 1;
      SurfacePropObject.scale.setScalar(
        SurfacePropObject.userData.baseScale * (WorldDefinition.isStartingWorld ? 1 : 0.05),
      );
    }
  }

  for (const TrailParticle of TrailParticlePool) {
    TrailParticle.lifeRemainingSeconds = 0;
    updateTrailParticleInstance(TrailParticle, 0);
  }
  TrailParticleMesh.instanceMatrix.needsUpdate = true;

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
  GameElapsedTimeSeconds = 0;

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

  updateWorldCounter();
  updateTargetBeacons(0);
  const OpeningRouteChoices = getRouteChoices(WorldDefinitions, StartingWorldIdentifier, 2);
  showInstruction(
    'Choose ' + OpeningRouteChoices[0].label + ' or ' + OpeningRouteChoices[1].label,
    'Grab the seed, pull away from a gold-ringed world, then release.',
  );
}

/** Main frame loop. */
function renderFrame() {
  window.requestAnimationFrame(renderFrame);
  if (!IsPageActive || !IsWebGLContextAvailable) {
    return;
  }

  const DeltaTimeSeconds = Math.min(Clock.getDelta(), MaximumFrameDeltaSeconds);
  GameElapsedTimeSeconds += DeltaTimeSeconds;
  const ElapsedTimeSeconds = GameElapsedTimeSeconds;

  PhysicsAccumulatorSeconds += DeltaTimeSeconds;
  while (PhysicsAccumulatorSeconds >= FixedPhysicsStepSeconds) {
    simulateSeedFixedStep();
    PhysicsAccumulatorSeconds -= FixedPhysicsStepSeconds;
  }

  updateWorldRestorationVisuals(ElapsedTimeSeconds);
  updateWorldBiomeMotion(DeltaTimeSeconds, ElapsedTimeSeconds);
  updateSeedVisuals(DeltaTimeSeconds, ElapsedTimeSeconds);
  updateCamera(DeltaTimeSeconds);
  updateRouteLabels();
  updateFlightAudio();

  Renderer.render(Scene, Camera);
  updatePerformanceBudget(DeltaTimeSeconds);
}

GameCanvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
GameCanvas.addEventListener('pointermove', handlePointerMove, { passive: false });
GameCanvas.addEventListener('pointerup', handlePointerUp, { passive: false });
GameCanvas.addEventListener('pointercancel', handlePointerUp, { passive: false });
window.addEventListener('resize', resizeRenderer);
window.addEventListener('orientationchange', () => {
  window.setTimeout(resizeRenderer, 120);
});
document.addEventListener('visibilitychange', () => {
  IsPageActive = !document.hidden;
  WorldseedSound.setPageActive(IsPageActive);
  if (IsPageActive) {
    Clock.getDelta();
    resizeRenderer();
  } else if (IsPointerAiming) {
    IsPointerAiming = false;
    ActivePointerIdentifier = null;
    GameCanvas.classList.remove('is-aiming');
    AimPanelElement.hidden = true;
    clearTrajectoryPreview();
    WorldseedSound.endAim();
    showInstruction('Aim again', 'Your shot was canceled while the game was in the background.');
  }
});
GameCanvas.addEventListener('webglcontextlost', (ContextEvent) => {
  ContextEvent.preventDefault();
  IsWebGLContextAvailable = false;
  WorldseedSound.setPageActive(false);
  showStatusToast('RESTORING GRAPHICS', 1800);
});
GameCanvas.addEventListener('webglcontextrestored', () => {
  IsWebGLContextAvailable = true;
  Clock.getDelta();
  Renderer.resetState();
  resizeRenderer();
  WorldseedSound.setPageActive(IsPageActive);
  showStatusToast('GRAPHICS RESTORED', 900);
});
window.addEventListener('keydown', (KeyboardEventData) => {
  if (KeyboardEventData.key.toLowerCase() === 'r') {
    resetGame();
  } else if (KeyboardEventData.key.toLowerCase() === 'm') {
    const IsMuted = WorldseedSound.toggleMute();
    AudioButtonElement.textContent = IsMuted ? 'Audio off [M]' : 'Audio on [M]';
    AudioButtonElement.setAttribute('aria-pressed', String(IsMuted));
  }
});
ResetButtonElement.addEventListener('click', resetGame);
PlayAgainButtonElement.addEventListener('click', resetGame);
AudioButtonElement.addEventListener('click', () => {
  const IsMuted = WorldseedSound.toggleMute();
  AudioButtonElement.textContent = IsMuted ? 'Audio off [M]' : 'Audio on [M]';
  AudioButtonElement.setAttribute('aria-pressed', String(IsMuted));
});

createLighting();
createStarField();
resizeRenderer();
resetGame();
renderFrame();
