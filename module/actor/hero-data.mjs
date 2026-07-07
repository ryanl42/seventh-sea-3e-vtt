/**
 * 7th Sea 3e — Hero Data Model (Step 22)
 * Adds derived wound values for token bars and proper wound tracking.
 */
const { fields } = foundry.data;

export class HeroData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      traits: new fields.SchemaField({
        brawn:   new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        finesse: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        resolve: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        panache: new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
        wits:    new fields.SchemaField({ value: new fields.NumberField({ integer: true, min: 1, max: 5, initial: 2 }) }),
      }),

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

      combatAptitudes: new fields.SchemaField({
        attack:    new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        defence:   new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        damage:    new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        toughness: new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
        manoeuvre: new fields.SchemaField({ trait: new fields.StringField({ initial: "", blank: true }) }),
      }),

      wounds: new fields.SchemaField({
        minor:    new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        dramatic: new fields.ArrayField(
          new fields.BooleanField({ initial: false }),
          { initial: [false, false, false, false] }
        ),
        helpless: new fields.BooleanField({ initial: false }),
      }),

      heroPoints: new fields.NumberField({ integer: true, min: 0, initial: 1 }),
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

    // ── Token bar objects ────────────────────────────────────────────────
    // Foundry reads {value, max} objects for token bars.
    // "wounds" bar: tracks total wound progress across all steps.
    const toughness = this.combatAptitudes.toughness.value ?? 2;
    this.toughnessValue      = toughness;
    this.dramaticWoundCount  = this.wounds.dramatic.filter(Boolean).length;
    this.woundTotal          = this.wounds.minor + (this.dramaticWoundCount * toughness);
    this.woundMax            = toughness * 4;

    // Expose as {value,max} objects that Foundry token bars can read
    this.wounds.value = this.woundTotal;
    this.wounds.max   = this.woundMax;

    // Hero Points bar
    this.heroPointsBar = {
      value: this.heroPoints,
      max:   Math.max(this.heroPoints, this.lowestTrait),
    };

    // ── Wound derivations ──────────────────────────────────────────────────
    // Toughness value = how many minor wounds per step - Cannot declare twice
    // const toughness = this.combatAptitudes.toughness.value ?? 2;
    // this.toughnessValue = toughness;

    // Total minor wound slots = toughness × 4 steps
    this.maxMinorTotal = toughness * 4;

    // Count marked dramatic wounds
    this.dramaticWoundCount = this.wounds.dramatic.filter(Boolean).length;

    // Total wounds as a single number for token bars:
    // Each dramatic wound = toughness minor wounds worth of damage
    // Current minor + (dramatic × toughness) gives a continuous scale
    this.woundTotal = this.wounds.minor + (this.dramaticWoundCount * toughness);

    // Max possible wounds before helpless = toughness × 4
    this.woundMax = toughness * 4;
  }
}
