/**
 * 7th Sea 3e — Advantage Item Data Model (Step 2)
 */
const { fields } = foundry.data;

export class AdvantageData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      category: new fields.StringField({
        initial: "passive",
        choices: ["passive", "situational", "heroic", "extraordinary"],
        blank:   false,
      }),
      hpCost:      new fields.NumberField({ integer: true, min: 0, initial: 1 }),
      used:        new fields.BooleanField({ initial: false }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}
