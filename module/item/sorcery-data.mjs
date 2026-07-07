/**
 * 7th Sea 3e — Sorcery Item Data Model
 *
 * Each sorcery tradition the character possesses is stored as a Sorcery Item.
 * The `tradition` field keys into the TRADITIONS registry.
 * The `resource` schema holds the tradition's unique tracked value
 * (Backlash for Sorte, Corruption for future traditions, etc.)
 */
const { fields } = foundry.data;

export class SorceryData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      // Which tradition this item represents — keys into TRADITIONS registry
      tradition: new fields.StringField({
        required: true,
        initial:  "sorte",
        blank:    false,
      }),

      // The tradition's unique resource (Backlash, Corruption, etc.)
      resource: new fields.SchemaField({
        label: new fields.StringField({ initial: "Resource", blank: false }),
        value: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      }),

      // Free-text notes specific to this tradition
      notes: new fields.HTMLField({ initial: "" }),
    };
  }
}
