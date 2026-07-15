/**
 * 7th Sea 3e — Sorcery Traditions Registry
 *
 * To add a new tradition:
 *   1. Create module/sorcery/your-tradition.mjs with the same exports as sorte.mjs
 *   2. Import it here and add an entry to TRADITIONS
 *   3. Add the tradition id to system.json documentTypes Item.sorcery (no code change needed)
 *
 * Each entry shape:
 * {
 *   label:         string         — display name shown in sheet and sheets
 *   resourceLabel: string         — name of the tradition's unique tracked resource
 *   resourceMax:   number|null    — if null, no upper cap displayed
 *   actions:       object         — keyed action functions (see sorte.mjs for signature)
 * }
 */

import * as Sorte from "./sorte.mjs";

export const TRADITIONS = {

  sorte: {
    label:         "Sorte Strega",
    resourceLabel: "Backlash",
    resourceMax:   null,          // Backlash has no hard cap
    description:   "Fate magic wielded by Vodacce women. Reading is free; Weaving costs Hero Points or Backlash. Each Backlash removes 1 die from all rolls and can only be cleared by taking Wounds.",
    // Tradition-level actions, shown once on the Sorte item itself.
    actions: {
      // key → { label, fn, hint }
      read: {
        label: "👁 Read Threads",
        hint:  "Wits + Sorcery — free, reveals links & Arcana",
        fn:    Sorte.sorteRead,
      },
      reference: {
        label: "📖 Arcana Reference",
        hint:  "Post all Arcana effects to chat",
        fn:    Sorte.sorteReference,
      },
    },
    // The 8 Arcana for this tradition — each becomes its own Item,
    // attached to the Sorte item via system.parentSorceryId.
    arcana: Sorte.ARCANA,
    // Generic per-Arcana Weave actions, shared across every Arcana entry.
    arcanaActions: {
      weaveMinor: Sorte.weaveArcanaMinor,
      weaveMajor: Sorte.weaveArcanaMajor,
    },
  },

  // ── Future traditions (uncomment and implement when ready) ────────────────
  //
  // porte: {
  //   label:         "Porté",
  //   resourceLabel: "Corruption",
  //   resourceMax:   null,
  //   description:   "Blood sorcery from Montaigne. ...",
  //   actions: { ... },
  // },
  //
  // glamour: {
  //   label:         "Glamour",
  //   resourceLabel: "Knacks Used",
  //   resourceMax:   3,
  //   description:   "Avalon faerie magic. ...",
  //   actions: { ... },
  // },
};

/**
 * Get a tradition entry by id, with a safe fallback.
 */
export function getTradition(id) {
  return TRADITIONS[id] ?? null;
}

/**
 * All tradition ids as an array — useful for select options.
 */
export function traditionChoices() {
  return Object.entries(TRADITIONS).map(([id, t]) => ({ id, label: t.label }));
}

/**
 * The full Arcana list for a tradition (name/minor/major/targeting/effect fns).
 */
export function getArcanaList(traditionId) {
  return TRADITIONS[traditionId]?.arcana ?? [];
}

/**
 * A single Arcana's definition within a tradition, by key.
 */
export function getArcanaDef(traditionId, key) {
  return getArcanaList(traditionId).find(a => a.key === key) ?? null;
}

/**
 * Creates one Arcana Item per entry in a tradition's Arcana list, each
 * flagged with the parent Sorcery item's id. Called once when a tradition
 * is first added to an actor.
 */
export async function createArcanaItemsForTradition(actor, sorceryItem) {
  const list = getArcanaList(sorceryItem.system.tradition);
  if (!list.length) return [];

  const data = list.map(def => ({
    name:   def.name,
    type:   "arcana",
    system: {
      tradition:       sorceryItem.system.tradition,
      key:             def.key,
      parentSorceryId: sorceryItem.id,
    },
  }));

  return actor.createEmbeddedDocuments("Item", data);
}
