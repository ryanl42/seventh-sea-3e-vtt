/**
 * 7th Sea 3e — Arcana Item Data Model
 *
 * Each Arcana (Backfire, Blessing, Curse, etc.) belonging to a sorcery
 * tradition a character possesses is stored as its own Item, flagged with
 * the id of the parent Sorcery Item (system.parentSorceryId) so it can
 * track/spend that tradition's resource (Backlash, Corruption, etc.).
 *
 * Name and description text are NOT duplicated here — they're looked up
 * live from the tradition's Arcana registry (see sorcery/*.mjs +
 * traditions.mjs) via `tradition` + `key`, so there is a single source of
 * truth for the mechanical text.
 */
const { fields } = foundry.data;

export class ArcanaData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      // Which tradition's Arcana registry this entry belongs to — keys into TRADITIONS
      tradition: new fields.StringField({
        required: true,
        initial:  "sorte",
        blank:    false,
      }),

      // Which Arcana within that tradition's registry (e.g. "blessing", "curse")
      key: new fields.StringField({
        required: true,
        blank:    false,
      }),

      // The id of the parent Sorcery Item on the same actor that tracks
      // this tradition's resource (Backlash, etc.)
      parentSorceryId: new fields.StringField({
        initial: "",
        blank:   true,
      }),
    };
  }
}
