/**
 * WORLDSEED physics helpers.
 *
 * This module intentionally has no Three.js dependency. Keeping the core trajectory
 * calculations framework-agnostic makes the launch model deterministic, easy to test,
 * and suitable for use both by the live seed simulation and the trajectory preview.
 */

/**
 * Creates a small immutable-style vector object used by the deterministic physics layer.
 *
 * @param {number} PositionX - X component in world units.
 * @param {number} PositionY - Y component in world units.
 * @param {number} PositionZ - Z component in world units.
 * @returns {{x: number, y: number, z: number}} A vector value.
 */
export function createVector(PositionX = 0, PositionY = 0, PositionZ = 0) {
  return { x: PositionX, y: PositionY, z: PositionZ };
}

/**
 * Calculates the squared distance between two positions.
 *
 * @param {{x:number,y:number,z:number}} FirstPosition - First position.
 * @param {{x:number,y:number,z:number}} SecondPosition - Second position.
 * @returns {number} Squared distance in world units.
 */
export function calculateDistanceSquared(FirstPosition, SecondPosition) {
  const DifferenceX = SecondPosition.x - FirstPosition.x;
  const DifferenceY = SecondPosition.y - FirstPosition.y;
  const DifferenceZ = SecondPosition.z - FirstPosition.z;

  return (DifferenceX * DifferenceX) + (DifferenceY * DifferenceY) + (DifferenceZ * DifferenceZ);
}

/**
 * Calculates gravitational acceleration from every world at a supplied position.
 *
 * Each world uses a tuned gravitational parameter rather than real-world units. A small
 * softening term prevents extreme numerical acceleration very close to a world's centre,
 * while the maximum acceleration clamp keeps near-surface launches predictable.
 *
 * @param {{x:number,y:number,z:number}} SeedPosition - Current seed position.
 * @param {Array<{position:{x:number,y:number,z:number}, gravitationalParameter:number}>} WorldDefinitions - Gravity sources.
 * @param {number} GravitySofteningDistance - Softening distance used to stabilise the inverse-square calculation.
 * @param {number} MaximumAcceleration - Maximum total acceleration permitted per world.
 * @returns {{x:number,y:number,z:number}} Combined gravitational acceleration.
 */
export function calculateGravityAcceleration(
  SeedPosition,
  WorldDefinitions,
  GravitySofteningDistance = 0.75,
  MaximumAcceleration = 42,
) {
  const CombinedAcceleration = createVector();

  for (const WorldDefinition of WorldDefinitions) {
    const DifferenceX = WorldDefinition.position.x - SeedPosition.x;
    const DifferenceY = WorldDefinition.position.y - SeedPosition.y;
    const DifferenceZ = WorldDefinition.position.z - SeedPosition.z;
    const RawDistanceSquared = (DifferenceX * DifferenceX) + (DifferenceY * DifferenceY) + (DifferenceZ * DifferenceZ);
    const StabilisedDistanceSquared = Math.max(
      RawDistanceSquared,
      GravitySofteningDistance * GravitySofteningDistance,
    );
    const Distance = Math.sqrt(Math.max(RawDistanceSquared, 0.000001));
    const AccelerationMagnitude = Math.min(
      WorldDefinition.gravitationalParameter / StabilisedDistanceSquared,
      MaximumAcceleration,
    );

    CombinedAcceleration.x += (DifferenceX / Distance) * AccelerationMagnitude;
    CombinedAcceleration.y += (DifferenceY / Distance) * AccelerationMagnitude;
    CombinedAcceleration.z += (DifferenceZ / Distance) * AccelerationMagnitude;
  }

  return CombinedAcceleration;
}

/**
 * Advances one deterministic semi-implicit Euler physics step.
 *
 * @param {{position:{x:number,y:number,z:number},velocity:{x:number,y:number,z:number}}} SeedState - Current simulation state.
 * @param {Array<{position:{x:number,y:number,z:number}, gravitationalParameter:number}>} WorldDefinitions - Gravity sources.
 * @param {number} DeltaTimeSeconds - Fixed simulation step in seconds.
 * @returns {{position:{x:number,y:number,z:number},velocity:{x:number,y:number,z:number}}} New state after one step.
 */
export function simulatePhysicsStep(SeedState, WorldDefinitions, DeltaTimeSeconds) {
  const GravityAcceleration = calculateGravityAcceleration(SeedState.position, WorldDefinitions);
  const NewVelocity = createVector(
    SeedState.velocity.x + (GravityAcceleration.x * DeltaTimeSeconds),
    SeedState.velocity.y + (GravityAcceleration.y * DeltaTimeSeconds),
    SeedState.velocity.z + (GravityAcceleration.z * DeltaTimeSeconds),
  );
  const NewPosition = createVector(
    SeedState.position.x + (NewVelocity.x * DeltaTimeSeconds),
    SeedState.position.y + (NewVelocity.y * DeltaTimeSeconds),
    SeedState.position.z + (NewVelocity.z * DeltaTimeSeconds),
  );

  return {
    position: NewPosition,
    velocity: NewVelocity,
  };
}

/**
 * Returns the first world intersected by the seed at a point sample.
 *
 * The live game uses sufficiently small fixed simulation steps that a point-vs-expanded-
 * sphere collision is stable for the jam's launch speeds. The world's radius is expanded
 * by the seed radius so that the visual spheres touch rather than overlap.
 *
 * @param {{x:number,y:number,z:number}} SeedPosition - Sampled seed position.
 * @param {number} SeedRadius - Seed collision radius.
 * @param {Array<{id:string,position:{x:number,y:number,z:number},radius:number}>} WorldDefinitions - Candidate worlds.
 * @param {string|null} IgnoredWorldIdentifier - Optional world to ignore during launch grace.
 * @returns {object|null} The intersected world definition or null.
 */
export function findCollidingWorld(
  SeedPosition,
  SeedRadius,
  WorldDefinitions,
  IgnoredWorldIdentifier = null,
) {
  for (const WorldDefinition of WorldDefinitions) {
    if (WorldDefinition.id === IgnoredWorldIdentifier) {
      continue;
    }

    const CollisionDistance = WorldDefinition.radius + SeedRadius;
    const CollisionDistanceSquared = CollisionDistance * CollisionDistance;

    if (calculateDistanceSquared(SeedPosition, WorldDefinition.position) <= CollisionDistanceSquared) {
      return WorldDefinition;
    }
  }

  return null;
}

/**
 * Predicts a launch trajectory using the same deterministic physics step as live gameplay.
 *
 * @param {{x:number,y:number,z:number}} StartingPosition - Position where launch begins.
 * @param {{x:number,y:number,z:number}} StartingVelocity - Launch velocity.
 * @param {Array<object>} WorldDefinitions - World definitions used for gravity and collision.
 * @param {object} PredictionSettings - Tunable prediction parameters.
 * @param {number} PredictionSettings.seedRadius - Seed collision radius.
 * @param {number} PredictionSettings.fixedStepSeconds - Physics step duration.
 * @param {number} PredictionSettings.maximumSteps - Maximum points to predict.
 * @param {string|null} PredictionSettings.ignoredWorldIdentifier - Starting world ignored until the trajectory clears it.
 * @returns {{points:Array<{x:number,y:number,z:number}>, collisionWorldIdentifier:string|null}} Predicted points and optional landing world.
 */
export function predictTrajectory(
  StartingPosition,
  StartingVelocity,
  WorldDefinitions,
  PredictionSettings,
) {
  const PredictedPoints = [createVector(StartingPosition.x, StartingPosition.y, StartingPosition.z)];
  let PredictedState = {
    position: createVector(StartingPosition.x, StartingPosition.y, StartingPosition.z),
    velocity: createVector(StartingVelocity.x, StartingVelocity.y, StartingVelocity.z),
  };
  let CollisionWorldIdentifier = null;
  let IgnoredWorldIdentifier = PredictionSettings.ignoredWorldIdentifier;

  for (let PredictionStepIndex = 0; PredictionStepIndex < PredictionSettings.maximumSteps; PredictionStepIndex += 1) {
    PredictedState = simulatePhysicsStep(
      PredictedState,
      WorldDefinitions,
      PredictionSettings.fixedStepSeconds,
    );

    if (IgnoredWorldIdentifier) {
      const StartingWorldDefinition = WorldDefinitions.find(
        (WorldDefinition) => WorldDefinition.id === IgnoredWorldIdentifier,
      );

      if (StartingWorldDefinition) {
        const ClearDistance = StartingWorldDefinition.radius + PredictionSettings.seedRadius + 0.35;
        if (calculateDistanceSquared(PredictedState.position, StartingWorldDefinition.position) > (ClearDistance * ClearDistance)) {
          IgnoredWorldIdentifier = null;
        }
      } else {
        IgnoredWorldIdentifier = null;
      }
    }

    PredictedPoints.push(PredictedState.position);

    const CollisionWorldDefinition = findCollidingWorld(
      PredictedState.position,
      PredictionSettings.seedRadius,
      WorldDefinitions,
      IgnoredWorldIdentifier,
    );

    if (CollisionWorldDefinition) {
      CollisionWorldIdentifier = CollisionWorldDefinition.id;
      break;
    }
  }

  return {
    points: PredictedPoints,
    collisionWorldIdentifier: CollisionWorldIdentifier,
  };
}
