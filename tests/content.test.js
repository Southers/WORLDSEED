import test from 'node:test';
import assert from 'node:assert/strict';

import { getRouteChoices } from '../src/campaign.js';
import {
  DefaultAuthoredSystemIdentifier,
  FirstLightSystemDefinition,
  createAuthoredSystemRuntime,
  getAuthoredSystemDefinition,
  validateAuthoredSystemDefinition,
} from '../src/content.js';

test('First Light satisfies the authored-system content contract', () => {
  assert.deepEqual(validateAuthoredSystemDefinition(FirstLightSystemDefinition), []);
});

test('runtime creation isolates mutable play state from authored content', () => {
  const FirstRuntime = createAuthoredSystemRuntime(FirstLightSystemDefinition);
  const SecondRuntime = createAuthoredSystemRuntime(FirstLightSystemDefinition);

  FirstRuntime.worlds.find((WorldDefinition) => WorldDefinition.id === 'grove').restored = true;
  FirstRuntime.stardust[0].collected = true;
  FirstRuntime.routeSuggestions.meadow.reverse();
  FirstRuntime.constellation.nodes[0].x = 999;

  assert.equal(
    SecondRuntime.worlds.find((WorldDefinition) => WorldDefinition.id === 'grove').restored,
    false,
  );
  assert.equal(SecondRuntime.stardust[0].collected, false);
  assert.deepEqual(SecondRuntime.routeSuggestions.meadow, ['grove', 'ember']);
  assert.equal(SecondRuntime.constellation.nodes[0].x, 24);
  assert.equal(FirstLightSystemDefinition.worlds[2].initiallyRestored, false);
});

test('system selection falls back to the authored campaign entry', () => {
  assert.equal(DefaultAuthoredSystemIdentifier, 'first-light');
  assert.equal(getAuthoredSystemDefinition('first-light'), FirstLightSystemDefinition);
  assert.equal(getAuthoredSystemDefinition('missing-system'), FirstLightSystemDefinition);
});

test('authored route suggestions preserve First Light choices and spatial fallback', () => {
  const Runtime = createAuthoredSystemRuntime(FirstLightSystemDefinition);
  const WorldheartDefinition = Runtime.tacticalBodies.find(
    (BodyDefinition) => BodyDefinition.kind === 'worldheart',
  );
  const CampaignNodes = [
    ...Runtime.worlds,
    ...Runtime.tacticalBodies.filter((BodyDefinition) => BodyDefinition.kind !== 'hazard'),
  ];

  assert.deepEqual(
    getRouteChoices(
      CampaignNodes,
      'meadow',
      2,
      Runtime.routeSuggestions.meadow,
    ).map((WorldDefinition) => WorldDefinition.id),
    ['grove', 'ember'],
  );

  Runtime.worlds.find((WorldDefinition) => WorldDefinition.id === 'grove').restored = true;
  assert.deepEqual(
    getRouteChoices(
      CampaignNodes,
      'grove',
      2,
      Runtime.routeSuggestions.grove,
    ).map((WorldDefinition) => WorldDefinition.id),
    ['frost', 'ember'],
  );

  WorldheartDefinition.routeAvailable = true;
  assert.equal(
    getRouteChoices(
      CampaignNodes,
      'frost',
      2,
      Runtime.routeSuggestions.frost,
    )[0].id,
    'worldheart',
  );
});

test('content validation rejects broken references and incomplete restoration data', () => {
  const InvalidSystemDefinition = structuredClone(FirstLightSystemDefinition);
  InvalidSystemDefinition.routeSuggestions.meadow[0] = 'missing-world';
  InvalidSystemDefinition.worlds[1].restoration.waveWidth = undefined;
  InvalidSystemDefinition.worlds[2].id = 'ember';
  InvalidSystemDefinition.constellation.nodes.push({
    ...InvalidSystemDefinition.constellation.nodes[0],
  });

  const Errors = validateAuthoredSystemDefinition(InvalidSystemDefinition);
  assert.ok(Errors.includes('Duplicate authored identifier: ember.'));
  assert.ok(Errors.includes('Route target missing-world does not exist.'));
  assert.ok(Errors.includes('World ember restoration.waveWidth is required.'));
  assert.ok(Errors.includes('Duplicate constellation node: meadow.'));
});

test('content validation fails closed on an unplayable opening or body set', () => {
  const InvalidSystemDefinition = structuredClone(FirstLightSystemDefinition);
  InvalidSystemDefinition.routeSuggestions.meadow = ['ember'];
  InvalidSystemDefinition.tacticalBodies = InvalidSystemDefinition.tacticalBodies.filter(
    (BodyDefinition) => BodyDefinition.kind !== 'hazard',
  );
  InvalidSystemDefinition.worlds[0].restoration.atmosphereOpacity = 1.2;
  InvalidSystemDefinition.constellation.nodes = InvalidSystemDefinition.constellation.nodes.filter(
    (NodeDefinition) => NodeDefinition.id !== 'ember',
  );

  const Errors = validateAuthoredSystemDefinition(InvalidSystemDefinition);
  assert.ok(Errors.includes('The starting world requires at least two authored route suggestions.'));
  assert.ok(Errors.includes(
    'Current authored-system runtime requires exactly one deterministic hazard.',
  ));
  assert.ok(Errors.includes('World meadow has invalid restoration ranges.'));
  assert.ok(Errors.includes('Constellation is missing node ember.'));
});
