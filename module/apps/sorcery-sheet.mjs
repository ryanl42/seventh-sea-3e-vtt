/**
 * 7th Sea 3e — Sorcery Item Sheet
 */

import { getTradition, traditionChoices } from "../sorcery/traditions.mjs";

const { ItemSheetV2 }                = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SorcerySheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["seventh-sea", "item-sheet", "sorcery"],
    position: { width: 460, height: 420 },
    window:   { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
  };

  static PARTS = {
    body: { template: "systems/seventh-sea-3e/templates/item/sorcery-sheet.hbs" },
  };

  get title() {
    const t = getTradition(this.document.system.tradition);
    return `${this.document.name} [${t?.label ?? "Sorcery"}]`;
  }

  async _prepareContext(options) {
    const tradition = getTradition(this.document.system.tradition);
    return {
      item:             this.document,
      system:           this.document.system,
      isEditable:       this.isEditable,
      tradition,
      traditionChoices: traditionChoices(),
    };
  }
}
