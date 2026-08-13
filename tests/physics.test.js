import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDistanceSquared,
  calculateGravityAcceleration,
  createVector,
  findCollidingWorld,
  predictTrajectory,
  simulatePhysicsStep,
} from '../src/physics.js';

/**
 * The tests below lock the core jam mechanic before visual work begins. They deliberately
 * validate behaviour rather than exact floating-point implementation details.
 */

test('gravity accelerates the seed toward a world', () => {
  const GravityAcceleration = calculateGravityAcceleration(
    { x: 10, y: 0, z: 0 },
    [{
      position: { x: 0, y: 0, z: 0 },
      gravitationalParameter: 100,
    }],
  );

  assert.ok(GravityAcceleration.x < 0, 'Gravity should pull toward the world centre.');
  assert.equal(GravityAcceleration.y, 0);
  assert.equal(GravityAcceleration.z, 0);
});

test('collision expands the world radius by the seed radius', () => {
  const WorldDefinitions = [{
    id: 'meadow',
    position: { x: 0, y: 0, z: 0 },
    radius: 4,
    gravitationalParameter: 100,
  }];

  assert.equal(
    findCollidingWorld({ x: 4.4, y: 0, z: 0 }, 0.5, WorldDefinitions)?.id,
    'meadow',
  );
  assert.equal(
    findCollidingWorld({ x: 4.6, y: 0, z: 0 }, 0.5, WorldDefinitions),
    null,
  );
});

test('trajectory prediction reports a world landing', () => {
  const WorldDefinitions = [
    {
      id: 'origin',
      position: { x: -8, y: 0, z: 0 },
      radius: 2.5,
      gravitationalParameter: 30,
    },
    {
      id: 'target',
      position: { x: 8, y: 0, z: 0 },
      radius: 2.5,
      gravitationalParameter: 30,
    },
  ];

  const TrajectoryPrediction = predictTrajectory(
    { x: -5, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    WorldDefinitions,
    {
      seedRadius: 0.45,
      fixedStepSeconds: 1 / 120,
      maximumSteps: 360,
      ignoredWorldIdentifier: 'origin',
    },
  );

  assert.equal(TrajectoryPrediction.collisionWorldIdentifier, 'target');
  assert.ok(TrajectoryPrediction.points.length > 2);
});

test('the opening Meadow shot predicts and reaches Ember on the same fixed step', () => {
  const SeedRadius = 0.46;
  const FixedStepSeconds = 1 / 120;
  const WorldDefinitions = [
    {
      id: 'meadow',
      position: createVector(-8, -6.4, 0),
      radius: 3.35,
      gravitationalParameter: 92,
    },
    {
      id: 'ember',
      position: createVector(7.8, -3.3, 0),
      radius: 3,
      gravitationalParameter: 82,
    },
    {
      id: 'frost',
      position: createVector(0.7, 8, 0),
      radius: 3.55,
      gravitationalParameter: 102,
    },
  ];
  const MeadowToEmber = createVector(15.8, 3.1, 0);
  const MeadowToEmberLength = Math.hypot(MeadowToEmber.x, MeadowToEmber.y);
  const SurfaceDistance = WorldDefinitions[0].radius + SeedRadius + 0.03;
  const StartingPosition = createVector(
    WorldDefinitions[0].position.x + ((MeadowToEmber.x / MeadowToEmberLength) * SurfaceDistance),
    WorldDefinitions[0].position.y + ((MeadowToEmber.y / MeadowToEmberLength) * SurfaceDistance),
    0,
  );
  const OpeningVelocity = createVector(
    (MeadowToEmber.x / MeadowToEmberLength) * 8.85,
    (MeadowToEmber.y / MeadowToEmberLength) * 8.85,
    0,
  );

  const Prediction = predictTrajectory(
    StartingPosition,
    OpeningVelocity,
    WorldDefinitions,
    {
      seedRadius: SeedRadius,
      fixedStepSeconds: FixedStepSeconds,
      maximumSteps: 520,
      ignoredWorldIdentifier: 'meadow',
    },
  );

  let LiveState = { position: StartingPosition, velocity: OpeningVelocity };
  let IgnoredWorldIdentifier = 'meadow';
  let LiveCollision = null;
  let LiveCollisionStep = null;

  for (let StepIndex = 1; StepIndex <= 520; StepIndex += 1) {
    LiveState = simulatePhysicsStep(LiveState, WorldDefinitions, FixedStepSeconds);
    if (IgnoredWorldIdentifier) {
      const ClearDistance = WorldDefinitions[0].radius + SeedRadius + 0.35;
      if (
        calculateDistanceSquared(LiveState.position, WorldDefinitions[0].position)
        > (ClearDistance * ClearDistance)
      ) {
        IgnoredWorldIdentifier = null;
      }
    }
    LiveCollision = findCollidingWorld(
      LiveState.position,
      SeedRadius,
      WorldDefinitions,
      IgnoredWorldIdentifier,
    );
    if (LiveCollision) {
      LiveCollisionStep = StepIndex;
      break;
    }
  }

  assert.equal(Prediction.collisionWorldIdentifier, 'ember');
  assert.equal(LiveCollision?.id, 'ember');
  assert.equal(LiveCollisionStep, Prediction.points.length - 1);
});
