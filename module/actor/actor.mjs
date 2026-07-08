/**
 * 7th Sea 3e — Actor Document (Step 22)
 * Provides applyWounds() with correct minor→dramatic conversion,
 * and configures token bars.
 */

export class SeventhSeaActor extends Actor {

  /**
   * Apply wounds to this actor, correctly converting minor wounds to dramatic.
   *
   * Rules:
   *  - Toughness value = number of minor wounds per "step"
   *  - When minor wounds in the current step EXCEED Toughness, the wound that
   *    pushes it over converts to 1 Dramatic Wound and the minor counter resets
   *  - dramaticLimit Dramatic Wounds = Helpless (4 for Heroes and most NPCs,
   *    2 for Henchmen)
   *
   * Example: Toughness 2, take 5 wounds:
   *   wound 1 → minor=1
   *   wound 2 → minor=2
   *   wound 3 → minor=3 (over Toughness) → Dramatic 1, minor resets to 0
   *   wound 4 → minor=1
   *   wound 5 → minor=2
   *
   * @param {number} amount         Number of wounds to apply.
   * @param {object} [options]
   * @param {number} [options.dramaticLimit=4]  Dramatic Wound boxes before Helpless.
   */
  async applyWounds(amount, { dramaticLimit = 4 } = {}) {
    const system      = this.system;
    const toughnessRaw = system.combatAptitudes?.toughness;
    const toughness   = (typeof toughnessRaw === "object" ? toughnessRaw?.value : toughnessRaw) ?? 2;

    let minor      = system.wounds.minor;
    const dramatic = [...system.wounds.dramatic];
    const dramaticBefore = dramatic.filter(Boolean).length;

    for (let i = 0; i < amount; i++) {
      minor++;
      if (minor > toughness) {
        minor = 0;
        if (dramatic.filter(Boolean).length < dramaticLimit) {
          const slot = dramatic.indexOf(false);
          if (slot !== -1) dramatic[slot] = true;
        }
      }
    }

    const dwCount        = dramatic.filter(Boolean).length;
    const dramaticGained = dwCount - dramaticBefore;
    const helpless       = dwCount >= dramaticLimit || system.wounds.helpless;

    await this.update({
      "system.wounds.minor":    minor,
      "system.wounds.dramatic": dramatic,
      "system.wounds.helpless": helpless,
    });

    if (dwCount >= dramaticLimit && dramaticBefore < dramaticLimit) {
      ui.notifications.warn(`${this.name} has suffered their ${dramaticLimit}th Dramatic Wound and is Helpless!`);
    }

    return { minor, dramatic, helpless, dramaticCount: dwCount, dramaticGained };
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
