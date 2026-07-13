/**
 * 7th Sea 3e — Brute Squad Token Sizing
 *
 * A Brute Squad's token grows on the canvas as its bruteCount grows, so a
 * squad of 6 visually reads as bigger/scarier than a squad of 2 without the
 * GM having to remember to resize it by hand.
 *
 * Sizing is a simple step table (in grid-square units); tweak
 * BRUTE_SIZE_STEPS to change the thresholds or the max footprint.
 */

// [minBruteCount, tokenSize] pairs, checked from highest to lowest.
const BRUTE_SIZE_STEPS = [
  [7, 2.5],
  [5, 2],
  [3, 1.5],
  [0, 1],
];

export function bruteSquadTokenSize(bruteCount) {
  const count = Number(bruteCount) || 0;
  for (const [min, size] of BRUTE_SIZE_STEPS) {
    if (count >= min) return size;
  }
  return 1;
}

/**
 * Resize an actor's prototype token and any placed tokens to match its
 * current bruteCount. Safe to call on any actor — non-Brute actors are
 * ignored, and no update is written if the size already matches.
 */
export async function syncBruteSquadTokenSize(actor) {
  if (actor?.type !== "npc" || actor.system?.npcType !== "brute") return;

  const size = bruteSquadTokenSize(actor.system.bruteCount);

  if (actor.prototypeToken.width !== size || actor.prototypeToken.height !== size) {
    await actor.update({
      "prototypeToken.width":  size,
      "prototypeToken.height": size,
    });
  }

  // prototypeToken changes only affect *future* tokens, so placed tokens
  // (linked or unlinked) need to be resized directly.
  for (const token of actor.getActiveTokens(true)) {
    if (token.document.width !== size || token.document.height !== size) {
      await token.document.update({ width: size, height: size });
    }
  }
}

export function registerBruteSquadTokenSizeHooks() {
  // Covers bruteCount changes from the sheet, applyWounds(), macros, etc.
  Hooks.on("updateActor", (actor) => {
    syncBruteSquadTokenSize(actor);
  });

  // Covers a Brute Squad actor being dragged to the canvas for the first
  // time, before any bruteCount change has fired the hook above.
  Hooks.on("preCreateToken", (tokenDoc) => {
    const actor = tokenDoc.actor;
    if (actor?.type !== "npc" || actor.system?.npcType !== "brute") return;

    const size = bruteSquadTokenSize(actor.system.bruteCount);
    tokenDoc.updateSource({ width: size, height: size });
  });
}
