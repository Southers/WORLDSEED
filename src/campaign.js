/**
 * Pure campaign helpers shared by browser gameplay and deterministic tests.
 * Rendering state deliberately stays out of this module.
 */

/** Returns worlds that count toward system restoration. */
export function getRestorableWorlds(WorldDefinitions) {
  return WorldDefinitions.filter((WorldDefinition) => !WorldDefinition.isStartingWorld);
}

/** Counts restored objective worlds without counting the initial launch platform. */
export function countRestoredWorlds(WorldDefinitions) {
  return getRestorableWorlds(WorldDefinitions).filter(
    (WorldDefinition) => WorldDefinition.restored,
  ).length;
}

/** Reports whether every objective world in the current system is awake. */
export function isSystemRestored(WorldDefinitions) {
  const RestorableWorlds = getRestorableWorlds(WorldDefinitions);
  return RestorableWorlds.length > 0 && RestorableWorlds.every(
    (WorldDefinition) => WorldDefinition.restored,
  );
}

/**
 * Suggests the nearest unrestored destinations from the current launch node.
 *
 * This does not restrict physics or force a target. It gives the player readable options
 * while every world remains a valid deterministic collision body.
 */
export function getRouteChoices(
  WorldDefinitions,
  CurrentWorldIdentifier,
  MaximumChoiceCount = 2,
) {
  const CurrentWorldDefinition = WorldDefinitions.find(
    (WorldDefinition) => WorldDefinition.id === CurrentWorldIdentifier,
  );
  if (!CurrentWorldDefinition || MaximumChoiceCount <= 0) {
    return [];
  }

  return getRestorableWorlds(WorldDefinitions)
    .filter((WorldDefinition) => !WorldDefinition.restored)
    .map((WorldDefinition, DefinitionIndex) => {
      const DifferenceX = WorldDefinition.position.x - CurrentWorldDefinition.position.x;
      const DifferenceY = WorldDefinition.position.y - CurrentWorldDefinition.position.y;
      const DifferenceZ = WorldDefinition.position.z - CurrentWorldDefinition.position.z;
      return {
        definition: WorldDefinition,
        definitionIndex: DefinitionIndex,
        distanceSquared: (
          (DifferenceX * DifferenceX)
          + (DifferenceY * DifferenceY)
          + (DifferenceZ * DifferenceZ)
        ),
      };
    })
    .sort((FirstChoice, SecondChoice) => (
      (FirstChoice.distanceSquared - SecondChoice.distanceSquared)
      || (FirstChoice.definitionIndex - SecondChoice.definitionIndex)
    ))
    .slice(0, MaximumChoiceCount)
    .map((Choice) => Choice.definition);
}
