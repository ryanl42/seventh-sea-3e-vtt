/**
 * 7th Sea 3e — NPC Sheet (Step 9)
 * Brutes Squad / Henchman / Villain.
 */

import { computeWoundTrack } from "../combat/wound-track.mjs";

const { ActorSheetV2 }               = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class NPCSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["seventh-sea", "actor-sheet", "npc"],
    position: { width: 520, height: 620 },
    window:   { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
    actions: {
      toggleWoundTrack: NPCSheet._onToggleWoundTrack,
    },
  };

  static PARTS = {
    header: { template: "systems/seventh-sea-3e/templates/actor/npc-header.hbs" },
    body:   { template: "systems/seventh-sea-3e/templates/actor/npc-body.hbs" },
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    return {
      actor:      this.document,
      system:     this.document.system,
      isEditable: this.isEditable,
    };
  }
  // ── Wound track (dots + Dramatic Wound pips) ────────────────────────────
  // Henchmen/Villains only — Brute Squads use the header's Brute Count field
  // directly and don't have a Toughness-based track.
  static async _onToggleWoundTrack(event, target) {
    const flatIndex     = Number(target.dataset.index);
    const actor         = this.document;
    const dramaticLimit = actor.system.dramaticWoundLimit ?? 4;
    const toughness     = actor._toughnessValue();
    const track = computeWoundTrack(toughness, actor.system.wounds.minorPerSegment, actor.system.wounds.dramatic, dramaticLimit);

    let currentTotal = 0;
    for (const seg of track) {
      for (const dot of seg.dots) if (dot.filled) currentTotal = dot.flatIndex + 1;
      if (seg.marked) currentTotal = seg.dramaticFlatIndex + 1;
    }

    const newTotal = flatIndex === currentTotal - 1 ? flatIndex : flatIndex + 1;
    await actor.setWoundLevel(newTotal, { dramaticLimit });
  }
}
