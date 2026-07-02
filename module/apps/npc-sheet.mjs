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
}
