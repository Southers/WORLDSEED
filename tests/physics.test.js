import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateGravityAcceleration,
  findCollidingWorld,
  predictTrajectory,
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
