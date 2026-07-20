/**
 * 7th Sea 3e — Actor Document (Step 22)
 * Provides applyWounds() with correct minor→dramatic conversion,
 * and configures token bars.
 *
 * Wounds are tracked per-segment: `wounds.minorPerSegment[i]` is how many of
 * that segment's Toughness dots are filled, and `wounds.dramatic[i]` is
 * whether that segment has converted into a Dramatic Wound. A segment's fill
 * and its Dramatic flag are independent once set — First Aid can heal the
 * dots back down without ever touching the Dramatic Wound flag.
 */

/**
 * Distributes `amount` new Wounds across segments in order, starting from
 * the first not-yet-Dramatic segment. Each segment fills up to `toughness`
 * dots; the wound that pushes it past `toughness` converts it to a Dramatic
 * Wound (capped at `toughness` dots shown) and moves on to the next segment.
 */
function distributeWounds(minorPerSegment, dramatic, toughness, dramaticLimit, amount) {
  const nextMinor    = [...minorPerSegment];
  const nextDramatic = [...dramatic];
  let seg = nextDramatic.findIndex(marked => !marked);
  if (seg === -1) seg = dramaticLimit; // already fully Helpless

  for (let i = 0; i < amount && seg < dramaticLimit; i++) {
    nextMinor[seg] = (nextMinor[seg] ?? 0) + 1;
    if (nextMinor[seg] > toughness) {
      nextMinor[seg] = toughness;
      nextDramatic[seg] = true;
      seg++;
    }
  }

  return { minorPerSegment: nextMinor, dramatic: nextDramatic };
}

/**
 * Pure calculation: given a total wound count, compute the resulting
 * {minorPerSegment, dramatic} state from scratch. Used only by
 * setWoundLevel() (the click-to-set dot track), which is an absolute
 * override — unlike applyWounds()/healMinorWounds(), it does not preserve
 * any existing partial-heal state within a Dramatic segment.
 */
function woundStateFromTotal(totalWounds, toughness, dramaticLimit) {
  const blankMinor    = new Array(dramaticLimit).fill(0);
  const blankDramatic = new Array(dramaticLimit).fill(false);
  return distributeWounds(blankMinor, blankDramatic, toughness, dramaticLimit, totalWounds);
}

export class SeventhSeaActor extends Actor {
  _toughnessValue() {
    const raw = this.system.combatAptitudes?.toughness;
    return (typeof raw === "object" ? raw?.value : raw) ?? 2;
  }

  /**
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

    const toughness = this._toughnessValue();
    const dramaticBefore = this.system.wounds.dramatic.filter(Boolean).length;

    const { minorPerSegment, dramatic } = distributeWounds(
      this.system.wounds.minorPerSegment, this.system.wounds.dramatic,
      toughness, dramaticLimit, amount,
    );
    const dwCount   = dramatic.filter(Boolean).length;
    const dramaticGained = dwCount - dramaticBefore;
    const helpless  = dwCount >= dramaticLimit || this.system.wounds.helpless;

    await this.update({
      "system.wounds.minorPerSegment": minorPerSegment,
      "system.wounds.dramatic":        dramatic,
      "system.wounds.helpless":        helpless,
    });

    if (dwCount >= dramaticLimit && dramaticBefore < dramaticLimit) {
      ui.notifications.warn(`${this.name} has suffered their ${dramaticLimit}th Dramatic Wound and is Helpless!`);
    }

    return { minorPerSegment, dramatic, helpless, dramaticCount: dwCount, dramaticGained };
  }

  /**
   * Set the wound track to an absolute total (used by the click-to-set dot
   * track UI — clicking position K sets the total to K+1, recomputing the
   * whole track from scratch so it's always internally consistent). This is
   * a manual override tool: unlike applyWounds()/healMinorWounds(), it does
   * not preserve a partially-healed Dramatic segment's fill level.
   *
   * @param {number} totalWounds
   * @param {object} [options]
   * @param {number} [options.dramaticLimit=4]
   */
  async setWoundLevel(totalWounds, { dramaticLimit = 4 } = {}) {
    const toughness = this._toughnessValue();
    const { minorPerSegment, dramatic } = woundStateFromTotal(Math.max(0, totalWounds), toughness, dramaticLimit);
    const dwCount   = dramatic.filter(Boolean).length;
    const helpless  = dwCount >= dramaticLimit;

    await this.update({
      "system.wounds.minorPerSegment": minorPerSegment,
      "system.wounds.dramatic":        dramatic,
      "system.wounds.helpless":        helpless,
    });

    return { minorPerSegment, dramatic, helpless };
  }

  /**
   * Heal minor wounds (not Dramatic — those need a Dramatic Scene).
   * Works for Heroes and non-Brute NPCs (Henchmen/Villains); Brutes track
   * losses via bruteCount instead and have no Minor Wounds to heal.
   *
   * Heals from the most recently-filled dots backward: starts at the
   * current (not-yet-Dramatic) segment, then spills into the fill of the
   * most recently completed segment, and so on — but a segment's Dramatic
   * Wound flag is never cleared, even if its fill reaches 0.
   *
   * @param {number} amount
   * @returns {number} the number of Wounds actually healed (capped by what
   *   was marked).
   */
  async healMinorWounds(amount) {
    if (this.type === "npc" && this.system.npcType === "brute") return 0;

    const dramatic = this.system.wounds.dramatic;
    const minorPerSegment = [...this.system.wounds.minorPerSegment];
    const activeIndex = dramatic.findIndex(marked => !marked);
    const startSeg = activeIndex === -1 ? minorPerSegment.length - 1 : Math.min(activeIndex, minorPerSegment.length - 1);

    let remaining = amount;
    let healed    = 0;
    for (let seg = startSeg; seg >= 0 && remaining > 0; seg--) {
      const current = minorPerSegment[seg] ?? 0;
      const take    = Math.min(current, remaining);
      minorPerSegment[seg] = current - take;
      remaining -= take;
      healed += take;
    }

    if (healed > 0) await this.update({ "system.wounds.minorPerSegment": minorPerSegment });
    return healed;
  }

  /**
   * Directly marks the next available segment as a Dramatic Wound, without
   * requiring its Minor Wound dots to be filled first. Used by advantages
   * like Passionate, which have a Hero "take a Dramatic Wound" as a direct
   * cost rather than as the result of accumulated damage.
   *
   * @param {object} [options]
   * @param {number} [options.dramaticLimit=4]
   * @returns {boolean} whether a Dramatic Wound was actually applied
   *   (false if the character is already fully Helpless).
   */
  async applyDirectDramaticWound({ dramaticLimit = 4 } = {}) {
    const dramatic = [...this.system.wounds.dramatic];
    const toughness = this._toughnessValue();
    const minorPerSegment = [...this.system.wounds.minorPerSegment];
    const seg = dramatic.findIndex(marked => !marked);
    if (seg === -1 || seg >= dramaticLimit) return false;

    dramatic[seg] = true;
    minorPerSegment[seg] = toughness;
    const dwCount  = dramatic.filter(Boolean).length;
    const helpless = dwCount >= dramaticLimit;

    await this.update({
      "system.wounds.minorPerSegment": minorPerSegment,
      "system.wounds.dramatic":        dramatic,
      "system.wounds.helpless":        helpless,
    });

    if (helpless) ui.notifications.warn(`${this.name} has suffered their ${dramaticLimit}th Dramatic Wound and is Helpless!`);
    return true;
  }

  /** @override — provide token bar attributes */
  getRollData() {
    const data = super.getRollData();
    return data;
  }
}
