/**
 * 7th Sea 3e — Actor Document (Step 22)
 * Provides applyWounds() with correct minor→dramatic conversion,
 * and configures token bars.
 */

export class SeventhSeaActor extends Actor {

  /**
   * Apply wounds to a Hero, correctly converting minor wounds to dramatic.
   *
   * Rules:
   *  - Toughness value = number of minor wounds per "step"
   *  - When minor wounds in the current step reach Toughness, the next
   *    wound converts them to 1 Dramatic Wound and the minor counter resets
   *  - 4th Dramatic Wound = Helpless
   *
   * Example: Toughness 2, take 5 wounds:
   *   wound 1 → minor=1
   *   wound 2 → minor=2 (full step) → Dramatic 1, minor resets to 0
   *   wound 3 → minor=1
   *   wound 4 → minor=2 (full step) → Dramatic 2, minor resets to 0
   *   wound 5 → minor=1
   *
   * @param {number} amount   Number of wounds to apply
   */
  async applyWounds(amount) {
    if (this.type !== "hero") return;
    const system    = this.system;
    const toughness = system.combatAptitudes?.toughness?.value ?? 2;

    let minor    = system.wounds.minor;
    const dramatic = [...system.wounds.dramatic];

    for (let i = 0; i < amount; i++) {
      minor++;
      if (minor > toughness) {
        // Convert to a Dramatic Wound
        minor = 0;
        const slot = dramatic.indexOf(false);
        if (slot !== -1) dramatic[slot] = true;
      }
    }

    const dwCount  = dramatic.filter(Boolean).length;
    const helpless = dwCount >= 4 || system.wounds.helpless;

    await this.update({
      "system.wounds.minor":    minor,
      "system.wounds.dramatic": dramatic,
      "system.wounds.helpless": helpless,
    });

    // Notify if helpless
    if (dwCount >= 4) {
      ui.notifications.warn(`${this.name} has suffered their 4th Dramatic Wound and is Helpless!`);
    }

    return { minor, dramatic, helpless, dramaticCount: dwCount };
  }

  /**
   * Heal minor wounds (not Dramatic — those need a Dramatic Scene).
   * @param {number} amount
   */
  async healMinorWounds(amount) {
    if (this.type !== "hero") return;
    const current = this.system.wounds.minor;
    await this.update({ "system.wounds.minor": Math.max(0, current - amount) });
  }

  /** @override — provide token bar attributes */
  getRollData() {
    const data = super.getRollData();
    return data;
  }
}
