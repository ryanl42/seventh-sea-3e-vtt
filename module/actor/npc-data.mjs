/**
 * 7th Sea 3e — NPC Data Model
 * Covers Brutes, Henchmen, and Villains.
 *
 * Per the Types of Opponents rules (Quick Reference p.24): Brute Squads are
 * anonymous extras with only a rank-based Attack/Damage — no Traits, Skills,
 * or Advantages. Henchmen and Villains, however, are built exactly like
 * Heroes: full Traits, full Skills, Advantages, and Combat Aptitudes each
 * linked to a Trait (rather than a flat number).
 */
import { computeWoundTrack } from "../combat/wound-track.mjs";
const { fields } = foundry.data;

export class NpcData extends foundry.abstract.TypeDataModel {

  /**
   * Existing NPCs created before this update stored combatAptitudes as flat
   * numbers (e.g. `attack: 2`). Convert those to the new `{trait, value}`
   * shape so saved Brute/Henchman/Villain stat blocks aren't silently reset.
   */
  static migrateData(source) {
    const apts = source?.combatAptitudes;
    if (apts) {
      for (const key of Object.keys(apts)) {
        if (typeof apts[key] === "number") {
          apts[key] = { trait: "", value: apts[key] };
        }
      }
    }
    return super.migrateData(source);
  }

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

      // ── Traits (Henchmen/Villains only — Brutes have none, per p.24) ────
      traits: new fields.SchemaField({
        brawn:   new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        finesse: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        resolve: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        panache: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        wits:    new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
      }),

      // ── Skills (same 21 Skills / 7 Domains as Heroes) ───────────────────
      skills: new fields.SchemaField({
        investigation: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        stealth:       new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        theft:         new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        legends:       new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        sorcery:       new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        theology:      new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        aim:           new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        athletics:     new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        melee:         new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        sailing:       new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        strategy:      new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        survival:      new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        intrigue:      new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        protocol:      new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        selfControl:   new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        engineering:   new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        humanities:    new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        science:       new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        empathy:       new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        persuasion:    new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
        perform:       new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 0 }), specialty: new fields.BooleanField({ initial: false }) }),
      }),

      // ── Combat Aptitudes ─────────────────────────────────────────────────
      // Henchmen/Villains: `trait` links the Aptitude to a Trait exactly like
      // Heroes, and `.value` is derived from it in prepareDerivedData().
      // Brutes: `trait` stays blank and `value` is a directly-edited flat
      // number (Attack/Damage auto-set from bruteRank; no Defence).
      combatAptitudes: new fields.SchemaField({
        attack:    new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }), value: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }) }),
        defence:   new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }), value: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 0 }) }),
        damage:    new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }), value: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }) }),
        toughness: new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }), value: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }) }),
        manoeuvre: new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }), value: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 2 }) }),
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
    // Resolve trait-linked Aptitude values — Henchmen/Villains only, exactly
    // like Heroes. An Aptitude with no Trait assigned keeps its manually-set
    // flat `value` (this is the normal state for every Brute Aptitude).
    for (const apt of Object.values(this.combatAptitudes)) {
      if (apt.trait) apt.value = this.traits[apt.trait]?.value ?? apt.value;
    }

    // Brutes: rank sets Attack and Damage automatically; no Defence.
    if (this.npcType === "brute") {
      this.combatAptitudes.attack.value   = this.bruteRank;
      this.combatAptitudes.damage.value   = this.bruteRank;
      this.combatAptitudes.defence.value  = 0;
    }

    // Hit threshold per Skill rank (same table as Heroes)
    const thresholds = [10, 9, 8, 7, 6, 5];
    for (const skill of Object.values(this.skills)) {
      skill.hitThreshold = thresholds[Math.clamp(skill.value, 0, 5)];
    }

    // Helpless threshold: Henchmen at 2 Dramatic Wounds, others at 4
    this.dramaticWoundLimit = this.npcType === "henchman" ? 2 : 4;
    this.dramaticWoundCount = this.wounds.dramatic.filter(Boolean).length;

    // Token bar values
    const toughness      = this.combatAptitudes.toughness.value ?? 2;
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
