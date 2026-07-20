/**
 * 7th Sea 3e — Advantage Item Sheet (Step 13)
 */

import { SKILL_GROUPS } from "../advantages/advantage-defs.mjs";
import { ADVANTAGE_DEFS } from "../advantages/advantage-defs.mjs";

const { ItemSheetV2 }                = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

const ALL_SKILLS = Object.values(SKILL_GROUPS).flat();

export class AdvantageSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["seventh-sea", "item-sheet", "advantage"],
    position: { width: 480, height: 560 },
    window:   { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
  };

  static PARTS = {
    body: { template: "systems/seventh-sea-3e/templates/item/advantage-sheet.hbs" },
  };

  get title() {
    return `${this.document.name} [Advantage]`;
  }

  async _prepareContext(options) {
    const scopeSkills = this.document.system.scopeSkills ?? [];
    return {
      item:       this.document,
      system:     this.document.system,
      isEditable: this.isEditable,
      skillOptions: ALL_SKILLS.map(key => ({ key, checked: scopeSkills.includes(key) })),
      knownKeys:  Object.keys(ADVANTAGE_DEFS),
      knownKeyLabels: ADVANTAGE_DEFS,
    };
  }
}
