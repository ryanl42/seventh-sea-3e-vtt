/**
 * 7th Sea 3e — shared Combat Aptitude / targeting helpers
 *
 * Heroes and NPCs (Henchmen/Villains) both store Combat Aptitudes as
 * { trait, value } objects, with `value` derived from the assigned Trait
 * in prepareDerivedData(). Brute Squads have no Traits, so their aptitudes
 * keep a manually-edited flat `value` with `trait` left blank. Either way,
 * reading `.value` off the aptitude object works for all three NPC types
 * and for Heroes.
 */

/**
 * Reads a Combat Aptitude's resolved value from any actor.
 * @param {Actor} actor
 * @param {string} aptitudeKey  e.g. "attack", "defence", "damage"
 * @returns {number|null}
 */
export function aptitudeValue(actor, aptitudeKey) {
  if (!actor) return null;
  const apt = actor.system?.combatAptitudes?.[aptitudeKey];
  if (apt === undefined || apt === null) return null;
  if (typeof apt === "object") return apt.value ?? null;
  if (typeof apt === "number") return apt;
  return null;
}

/**
 * Returns the Actor of the first targeted token, or null if nothing is
 * targeted. Used to auto-populate Difficulty from the target's opposing
 * aptitude, and to know who to apply Wounds to.
 */
export function firstTargetActor() {
  const target = game.user.targets.first();
  return target?.actor ?? null;
}
