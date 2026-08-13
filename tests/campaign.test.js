import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countRestoredWorlds,
  getRouteChoices,
  isSystemRestored,
} from '../src/campaign.js';

function createFirstLightDefinitions() {
  return [
    {
      id: 'meadow',
      label: 'MEADOW',
      position: { x: -8, y: -6.4, z: 0 },
      restored: true,
      isStartingWorld: true,
    },
    {
      id: 'ember',
      label: 'EMBER',
      position: { x: 7.8, y: -3.3, z: 0 },
      restored: false,
      isStartingWorld: false,
    },
    {
      id: 'grove',
      label: 'GROVE',
      position: { x: -8.8, y: 3, z: 0 },
      restored: false,
      isStartingWorld: false,
    },
    {
      id: 'frost',
      label: 'FROST',
      position: { x: 0.7, y: 8, z: 0 },
      restored: false,
      isStartingWorld: false,
    },
    {
      id: 'tide',
      label: 'TIDE',
      position: { x: 9.7, y: 6, z: 0 },
      restored: false,
      isStartingWorld: false,
    },
  ];
}

test('First Light opens with two spatially distinct route choices', () => {
  const WorldDefinitions = createFirstLightDefinitions();
  assert.deepEqual(
    getRouteChoices(WorldDefinitions, 'meadow').map((WorldDefinition) => WorldDefinition.id),
    ['grove', 'ember'],
  );
});

test('landing order changes the next suggested route geometry', () => {
  const GroveFirstDefinitions = createFirstLightDefinitions();
  GroveFirstDefinitions.find((WorldDefinition) => WorldDefinition.id === 'grove').restored = true;
  assert.deepEqual(
    getRouteChoices(GroveFirstDefinitions, 'grove').map(
      (WorldDefinition) => WorldDefinition.id,
    ),
    ['frost', 'ember'],
  );

  const EmberFirstDefinitions = createFirstLightDefinitions();
  EmberFirstDefinitions.find((WorldDefinition) => WorldDefinition.id === 'ember').restored = true;
  assert.deepEqual(
    getRouteChoices(EmberFirstDefinitions, 'ember').map(
      (WorldDefinition) => WorldDefinition.id,
    ),
    ['tide', 'frost'],
  );
});

test('system completion counts only objective worlds', () => {
  const WorldDefinitions = createFirstLightDefinitions();
  WorldDefinitions.push({
    id: 'seedstone',
    label: 'SEEDSTONE',
    position: { x: 0, y: -0.5, z: 0 },
    restored: true,
    countsTowardRestoration: false,
  });
  assert.equal(countRestoredWorlds(WorldDefinitions), 0);
  assert.equal(isSystemRestored(WorldDefinitions), false);

  for (const WorldDefinition of WorldDefinitions) {
    WorldDefinition.restored = true;
  }
  assert.equal(countRestoredWorlds(WorldDefinitions), 4);
  assert.equal(isSystemRestored(WorldDefinitions), true);
});
