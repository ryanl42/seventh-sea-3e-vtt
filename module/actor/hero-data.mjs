/**
 * 7th Sea 3e — Hero Data Model (Step 16)
 * Adds sorcery flag and backlash tracker.
 */
const { fields } = foundry.data;

export class HeroData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {

      // ── Traits ──────────────────────────────────────────────────────────
      traits: new fields.SchemaField({
        brawn:   new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        finesse: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        resolve: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        panache: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        wits:    new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
      }),

      // ── Skills ──────────────────────────────────────────────────────────
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

      // ── Combat Aptitudes ────────────────────────────────────────────────
      combatAptitudes: new fields.SchemaField({
        attack:    new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        defence:   new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        damage:    new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        toughness: new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        manoeuvre: new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
      }),

      // ── Wounds ──────────────────────────────────────────────────────────
      wounds: new fields.SchemaField({
        minor:    new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        dramatic: new fields.ArrayField(
          new fields.BooleanField({ initial: false }),
          { initial: [false, false, false, false] }
        ),
        helpless: new fields.BooleanField({ initial: false }),
      }),

      // ── Hero Points ─────────────────────────────────────────────────────
      heroPoints: new fields.NumberField({ integer: true, min: 0, initial: 1 }),

      // ── Sorcery (Sorte Strega) ───────────────────────────────────────────
      sorcery: new fields.SchemaField({
        isSorteStrega: new fields.BooleanField({ initial: false }),
        backlash:      new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      }),

      // ── Biography ───────────────────────────────────────────────────────
      biography:  new fields.HTMLField({ initial: "" }),
      archetype:  new fields.StringField({ initial: "", blank: true }),
      nation:     new fields.StringField({ initial: "", blank: true }),
      background: new fields.StringField({ initial: "", blank: true }),
      notes:      new fields.HTMLField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    // Resolve combat aptitude values from assigned traits
    for (const [key, apt] of Object.entries(this.combatAptitudes)) {
      apt.value = apt.trait ? (this.traits[apt.trait]?.value ?? null) : null;
    }

    // Hit threshold per skill rank
    const thresholds = [10, 9, 8, 7, 6, 5];
    for (const skill of Object.values(this.skills)) {
      skill.hitThreshold = thresholds[Math.clamped(skill.value, 0, 5)];
    }

    this.lowestTrait = Math.min(...Object.values(this.traits).map(t => t.value));
  }
}
