/**
 * 7th Sea 3e — NPC Sheet (Step 9)
 * Brutes Squad / Henchman / Villain.
 */

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
    const dramaticCount = actor.system.wounds.dramatic.filter(Boolean).length;
    const currentTotal  = dramaticCount * (toughness + 1) + actor.system.wounds.minor;
    const newTotal       = flatIndex === currentTotal - 1 ? flatIndex : flatIndex + 1;

    await actor.setWoundLevel(newTotal, { dramaticLimit });
  }
}
