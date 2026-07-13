/**
 * 7th Sea 3e — NPC Data Model (Step 2)
 * Covers Brutes, Henchmen, and Villains.
 */
import { computeWoundTrack } from "../combat/wound-track.mjs";
const { fields } = foundry.data;

export class NpcData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {

      // ── Type ────────────────────────────────────────────────────────────
      npcType: new fields.StringField({
        initial: "brute",
        choices: ["brute", "henchman", "villain"],
        blank:   false,
      }),

      // ── Brute-specific ──────────────────────────────────────────────────
      bruteRank:  new fields.NumberField({ integer: true, min: 1, max: 5, initial: 1 }),
      bruteCount: new fields.NumberField({ integer: true, min: 0, initial: 3 }),

      // ── Combat Aptitudes (stored as flat numbers for NPCs) ──────────────
      combatAptitudes: new fields.SchemaField({
        attack:    new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }),
        defence:   new fields.NumberField({ integer: true, min: 0, max: 10, initial: 0 }),
        damage:    new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }),
        toughness: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }),
        manoeuvre: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }),
      }),

      // ── Wounds ──────────────────────────────────────────────────────────
      wounds: new fields.SchemaField({
        minorPerSegment: new fields.ArrayField(
          new fields.NumberField({ integer: true, min: 0, initial: 0 }),
          { initial: [0, 0, 0, 0] }
        ),
        dramatic: new fields.ArrayField(
          new fields.BooleanField({ initial: false }),
          { initial: [false, false, false, false] }
        ),
        helpless: new fields.BooleanField({ initial: false }),
        dramaticWoundHelpless: new fields.BooleanField({ initial: false }),
        firstAid: new fields.SchemaField({
          combatId: new fields.StringField({ initial: "", blank: true }),
          healedBy: new fields.ArrayField(new fields.StringField()),
        }),
      }),

      // ── Extended Action tracker (Brute Squads) ──────────────────────────
      extendedAction: new fields.SchemaField({
        target:  new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        current: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      }),

      notes: new fields.HTMLField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    // Brutes: rank sets attack and damage automatically
    if (this.npcType === "brute") {
      this.combatAptitudes.attack   = this.bruteRank;
      this.combatAptitudes.damage   = this.bruteRank;
      this.combatAptitudes.defence  = 0;
    }

    // Helpless threshold: Henchmen at 2 Dramatic Wounds, others at 4
    this.dramaticWoundLimit = this.npcType === "henchman" ? 2 : 4;
    this.dramaticWoundCount = this.wounds.dramatic.filter(Boolean).length;

    // Token bar values
    const toughness      = this.combatAptitudes.toughness ?? 2;
    this.toughnessValue  = toughness;
    this.woundTotal      = this.wounds.minorPerSegment.reduce((sum, n) => sum + n, 0);
    this.woundMax        = toughness * this.dramaticWoundLimit;

    if (this.npcType === "brute") {
      this.bruteTrack = Array.from({ length: this.bruteCount }, () => true);
    } else {
      this.wounds.trackLength = toughness;
      this.wounds.track = computeWoundTrack(toughness, this.wounds.minorPerSegment, this.wounds.dramatic, this.dramaticWoundLimit);
    }
  }
}
