/**
 * 7th Sea 3e — Hero Data Model (Step 22)
 * Adds derived wound values for token bars and proper wound tracking.
 */
import { computeWoundTrack } from "../combat/wound-track.mjs";

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
        dramaticWoundHelpless: new fields.BooleanField({ initial: false }),
        // Tracks which Heroes have already given this character First Aid
        // during the current Action Scene (Combat), so the same healer can't
        // do it twice in one scene. Reset automatically once the Combat id
        // changes (i.e. a new Action Scene starts).
        firstAid: new fields.SchemaField({
          combatId: new fields.StringField({ initial: "", blank: true }),
          healedBy: new fields.ArrayField(new fields.StringField()),
        }),
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
    const toughness = this.combatAptitudes.toughness.value ?? 2;
    this.toughnessValue     = toughness;
    this.dramaticWoundCount = this.wounds.dramatic.filter(Boolean).length;
    this.woundTotal         = this.wounds.minor + (this.dramaticWoundCount * toughness);
    this.woundMax           = toughness * 4;

    // Expose as {value,max} objects that Foundry token bars can read
    this.wounds.value = this.woundTotal;
    this.wounds.max   = this.woundMax;

    // Hero Points bar
    this.heroPointsBar = {
      value: this.heroPoints,
      max:   Math.max(this.heroPoints, this.lowestTrait),
    };

    // Minor Wound dot track: length = Toughness, filled up to current minor wounds.
    // Wound track: 4 segments (one per Dramatic Wound box). Each segment is
    // `toughness` Minor Wound dots followed by its Dramatic Wound box —
    // e.g. Toughness 2 renders as OO-D-OO-D-OO-D-OO-D.
    // The active (not-yet-marked) segment fills its dots up to current minor
    // wounds; already-marked segments show fully filled dots; later segments
    // show empty dots.
    this.wounds.trackLength = toughness;
    // const dramatic     = this.wounds.dramatic;
    // const activeIndex  = dramatic.findIndex(marked => !marked); // -1 = fully Helpless
    // this.wounds.track = dramatic.map((marked, segIndex) => {
    //   const isActive = segIndex === activeIndex;
    //   const dots = Array.from({ length: toughness }, (_, dotIndex) => {
    //     if (marked)   return true;                     // segment already converted — show full
    //     if (isActive) return dotIndex < this.wounds.minor;
    //     return false;                                   // not yet reached
    //   });
    //   return { dots, marked, active: isActive };
    // });
    this.wounds.track = computeWoundTrack(toughness, this.wounds.minor, this.wounds.dramatic, 4);
  }
}
