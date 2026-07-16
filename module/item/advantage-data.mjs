/**
 * 7th Sea 3e — Advantage Item Data Model
 *
 * Advantages are mostly free text (name/category/description), but each one
 * can optionally be wired up to a piece of automation via `key`, which maps
 * to an entry in `ADVANTAGE_DEFS` (see module/advantages/advantage-defs.mjs).
 * An Advantage with a blank `key` behaves exactly as before — a manual,
 * GM-adjudicated note on the sheet.
 *
 * Fields used by the automation engine:
 * - key:         slug identifying which automation hook (if any) applies.
 * - scope:       what the bonus/effect is conditioned on.
 *                  "always"  → offered on every roll (player judges fit)
 *                  "skill"   → offered only when rolling one of scopeSkills
 *                  "trait"   → offered only when rolling with scopeTrait
 *                  "none"    → not a roll-time bonus (handled via Activate button)
 * - scopeSkills:  array of skill keys (used when scope === "skill")
 * - scopeTrait:   trait key (used when scope === "trait")
 * - bonusDice:    dice granted when the advantage is applied to a roll
 * - usesMax:      0 = unlimited (passive/situational or per-HP heroic),
 *                  1+ = limited uses that refresh at the start of a session
 *                  (Extraordinary advantages are usually usesMax: 1)
 * - usesSpent:    how many uses have been spent since the last reset
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

      // ── Automation hook ──────────────────────────────────────────────────
      key:         new fields.StringField({ initial: "", blank: true }),
      scope:       new fields.StringField({
        initial: "none",
        choices: ["none", "always", "skill", "trait"],
        blank:   false,
      }),
      scopeSkills: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      scopeTrait:  new fields.StringField({ initial: "", blank: true }),
      bonusDice:   new fields.NumberField({ integer: true, min: 0, initial: 1 }),
      usesMax:     new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      usesSpent:   new fields.NumberField({ integer: true, min: 0, initial: 0 }),

      // ── Persistent effect state (e.g. Oath) ─────────────────────────────
      active:      new fields.BooleanField({ initial: false }),
      activeValue: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      activeNote:  new fields.StringField({ initial: "", blank: true }),
    };
  }

  prepareDerivedData() {
    // Legacy `used` stays in sync with the new uses counter so the old
    // checkbox (and any content that still reads it) keeps working.
    if (this.usesMax > 0) {
      this.usesRemaining = Math.max(0, this.usesMax - this.usesSpent);
      this.available     = this.usesRemaining > 0;
    } else {
      this.usesRemaining = null;
      this.available     = !this.used;
    }
  }
}
