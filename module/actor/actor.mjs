/**
 * 7th Sea 3e — Actor Document (Step 22)
 * Provides applyWounds() with correct minor→dramatic conversion,
 * and configures token bars.
 */

/**
 * Pure calculation: given a total wound count, compute the resulting
 * {minor, dramatic} state from scratch. Each full "segment" costs
 * (toughness + 1) wounds — toughness to fill the Minor Wound dots, plus 1
 * more to convert them into a Dramatic Wound and reset.
 */
function woundStateFromTotal(totalWounds, toughness, dramaticLimit) {
  let minor = 0;
  const dramatic = [false, false, false, false];

  for (let i = 0; i < totalWounds; i++) {
    minor++;
    if (minor > toughness) {
      minor = 0;
      if (dramatic.filter(Boolean).length < dramaticLimit) {
        const slot = dramatic.indexOf(false);
        if (slot !== -1) dramatic[slot] = true;
      }
    }
  }

  return { minor, dramatic };
}

export class SeventhSeaActor extends Actor {
  _toughnessValue() {
    const raw = this.system.combatAptitudes?.toughness;
    return (typeof raw === "object" ? raw?.value : raw) ?? 2;
  }
  /**
   *
   * @param {number} amount         Number of wounds to apply.
   * @param {object} [options]
   * @param {number} [options.dramaticLimit=4]  Dramatic Wound boxes before Helpless.
   */
  async applyWounds(amount, { dramaticLimit = 4 } = {}) {
    if (this.type === "npc" && this.system.npcType === "brute") {
      const current   = this.system.bruteCount;
      const remaining = Math.max(0, current - amount);
      const helpless  = remaining <= 0;
      const bruteLost = current - remaining;

      await this.update({
        "system.bruteCount":      remaining,
        "system.wounds.helpless": helpless,
      });

      if (bruteLost > 0) {
        ui.notifications.info(`${this.name} loses ${bruteLost} brute${bruteLost > 1 ? "s" : ""} (${remaining} remaining).`);
      }

      return { minor: 0, dramatic: [], helpless, dramaticCount: 0, dramaticGained: 0, bruteCount: remaining, bruteLost };
    }
    // const system      = this.system;
    // const toughnessRaw = system.combatAptitudes?.toughness;
    // const toughness   = (typeof toughnessRaw === "object" ? toughnessRaw?.value : toughnessRaw) ?? 2;

    // let minor      = system.wounds.minor;
    // const dramatic = [...system.wounds.dramatic];
    // const dramaticBefore = dramatic.filter(Boolean).length;

    // for (let i = 0; i < amount; i++) {
    //   minor++;
    //   if (minor > toughness) {
    //     minor = 0;
    //     if (dramatic.filter(Boolean).length < dramaticLimit) {
    //       const slot = dramatic.indexOf(false);
    //       if (slot !== -1) dramatic[slot] = true;
    //     }
    //   }
    // }
    const toughness = this._toughnessValue();
    const dramaticBefore = this.system.wounds.dramatic.filter(Boolean).length;
    const currentTotal   = dramaticBefore * (toughness + 1) + this.system.wounds.minor;
    const { minor, dramatic } = woundStateFromTotal(currentTotal + amount, toughness, dramaticLimit);
    const dwCount   = dramatic.filter(Boolean).length;
    // const dwCount        = dramatic.filter(Boolean).length;
    const dramaticGained = dwCount - dramaticBefore;
    // const helpless       = dwCount >= dramaticLimit || system.wounds.helpless;
    const helpless  = dwCount >= dramaticLimit || this.system.wounds.helpless;

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
   * Set the wound track to an absolute total (used by the click-to-set dot
   * track UI — clicking position K sets the total to K+1, recomputing the
   * whole minor/dramatic state from scratch so it's always internally
   * consistent, unlike editing minor/dramatic independently).
   *
   * @param {number} totalWounds
   * @param {object} [options]
   * @param {number} [options.dramaticLimit=4]
   */
  async setWoundLevel(totalWounds, { dramaticLimit = 4 } = {}) {
    const toughness = this._toughnessValue();
    const { minor, dramatic } = woundStateFromTotal(Math.max(0, totalWounds), toughness, dramaticLimit);
    const dwCount   = dramatic.filter(Boolean).length;
    const helpless  = dwCount >= dramaticLimit;

    await this.update({
      "system.wounds.minor":    minor,
      "system.wounds.dramatic": dramatic,
      "system.wounds.helpless": helpless,
    });

    return { minor, dramatic, helpless };
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
