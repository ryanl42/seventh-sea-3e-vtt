/**
 * 7th Sea 3e — Advantage Item Sheet (Step 13)
 */

const { ItemSheetV2 }                = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class AdvantageSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["seventh-sea", "item-sheet", "advantage"],
    position: { width: 480, height: 460 },
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
    return {
      item:       this.document,
      system:     this.document.system,
      isEditable: this.isEditable,
    };
  }
}
