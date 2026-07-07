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
    actions: {
      // key → { label, fn, hint }
      read: {
        label: "👁 Read Threads",
        hint:  "Wits + Sorcery — free, reveals links & Arcana",
        fn:    Sorte.sorteRead,
      },
      weaveMinor: {
        label: "◈ Minor Arcana",
        hint:  "Costs 1 Hero Point or 1 Backlash",
        fn:    Sorte.sorteWeaveMinor,
      },
      weaveMajor: {
        label: "★ Major Arcana",
        hint:  "Always costs 1 Backlash",
        fn:    Sorte.sorteWeaveMajor,
      },
      reference: {
        label: "📖 Arcana Reference",
        hint:  "Post all Arcana effects to chat",
        fn:    Sorte.sorteReference,
      },
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
