/**
 * 7th Sea 3e — Dice Engine (Step 18)
 * - Skill rolls now let player choose any Trait in the dialog
 * - Attack/Defence rolls let player choose Aim, Athletics, or Melee
 */

import { adjustVP } from "../settings/villainy.mjs";
import { getExtendedActions, addExtendedActionProgress } from "../settings/extended-action.mjs";
import {
  eligibleRollAdvantages, renderAdvantageChoices, readAdvantageChoices, commitAdvantageChoices,
  consumeAssistBonus, consumeBladeTrap, consumeFortunateReady, markAdvantageUsed, findAvailableAdvantage,
} from "../advantages/advantage-engine.mjs";

const HIT_THRESHOLDS = [10, 9, 8, 7, 6, 5];

const SKILL_LABELS = {
  investigation: "Investigation", stealth: "Stealth", theft: "Theft",
  legends: "Legends", sorcery: "Sorcery", theology: "Theology",
  aim: "Aim", athletics: "Athletics", melee: "Melee",
  sailing: "Sailing", strategy: "Strategy", survival: "Survival",
  intrigue: "Intrigue", protocol: "Protocol", selfControl: "Self-Control",
  engineering: "Engineering", humanities: "Humanities", science: "Science",
  empathy: "Empathy", persuasion: "Persuasion", perform: "Perform",
};

export class SeventhSeaDice {

  /**
   * Standard skill roll — shows dialog with Trait selector.
   */
  static async roll({
    actor, label, skillKey, skillRank, specialty = false,
    difficulty = 2, defaultTrait = null,
  }) {
    const system     = actor?.system;
    const heroPoints = system?.heroPoints ?? 0;
    const traits     = system?.traits ?? {};
    const backlash   = actor?.items
      ?.filter(i => i.type === "sorcery")
      ?.reduce((sum, i) => sum + (i.system.resource.value ?? 0), 0) ?? 0;
    const extendedActions = getExtendedActions();
    const advList        = eligibleRollAdvantages(actor, { skillKey, traitKey: defaultTrait });
    const fortunateReady  = !!actor?.getFlag?.("seventh-sea-3e", "fortunateReady");
    const forceFateFreeReady = !!findAvailableAdvantage(actor, "sorte-strega-force-fate");

    const dialogResult = await SeventhSeaDice._showSkillDialog({
      label, skillRank, specialty, difficulty, heroPoints, traits, defaultTrait, backlash, extendedActions,
      advList, fortunateReady, forceFateFreeReady,
    });
    if (dialogResult === null) return null;

    const {
      finalDifficulty, extraDice, forceFate, chosenTrait, extendedActionId,
      advSelections = [], fortunateReroll = false, forceFateFreeRequested = false,
    } = dialogResult;

    const traitVal  = traits[chosenTrait]?.value ?? 0;
    const skillVal  = system?.skills?.[skillKey]?.value ?? skillRank;
    const rawPool   = traitVal + skillVal - backlash;

    const { bonusDice: advBonus, hpCost: advHpCost, footerLines: advFooterLines } =
      await commitAdvantageChoices(actor, advSelections);
    const assist = await consumeAssistBonus(actor);
    if (assist) advFooterLines.push(`Helping Hand from ${assist.from} (+${assist.dice})`);

    const finalPool = Math.max(1, rawPool + extraDice + advBonus + (assist?.dice ?? 0));

    const totalHpSpend = extraDice + advHpCost;
    if (totalHpSpend > 0 && actor) {
      await actor.update({ "system.heroPoints": Math.max(0, heroPoints - totalHpSpend) });
    }

    return SeventhSeaDice._resolveRoll({
      actor, label: `${label} [${chosenTrait}]`,
      finalPool, skillRank, specialty, finalDifficulty,
      extraDice, forceFate, includeDramaticWounds: false,
      extendedActionId, advFooterLines, fortunateReroll, forceFateFreeRequested,
    });
  }

  /**
   * Combat roll — shows dialog with Trait selector AND skill selector.
   */
  static async rollCombat({
    actor, label, aptitudeTrait = null, difficulty = 2, skillChoices,
  }) {
    const system     = actor?.system;
    const heroPoints = system?.heroPoints ?? 0;
    const traits     = system?.traits ?? {};
    const backlash   = actor?.items
      ?.filter(i => i.type === "sorcery")
      ?.reduce((sum, i) => sum + (i.system.resource.value ?? 0), 0) ?? 0;
    const advList        = eligibleRollAdvantages(actor, { skillKeys: skillChoices, traitKey: aptitudeTrait });
    const fortunateReady = !!actor?.getFlag?.("seventh-sea-3e", "fortunateReady");
    const forceFateFreeReady = !!findAvailableAdvantage(actor, "sorte-strega-force-fate");
    const bladeTrapPenalty = await consumeBladeTrap(actor);

    const dialogResult = await SeventhSeaDice._showCombatDialog({
      label, difficulty, heroPoints, traits, aptitudeTrait, skillChoices, backlash, system,
      advList, fortunateReady, forceFateFreeReady, bladeTrapPenalty,
    });
    if (dialogResult === null) return null;

    const {
      finalDifficulty, extraDice, forceFate, chosenTrait, chosenSkill,
      advSelections = [], fortunateReroll = false, forceFateFreeRequested = false,
    } = dialogResult;

    const traitVal   = traits[chosenTrait]?.value ?? 0;
    const skillVal   = system?.skills?.[chosenSkill]?.value ?? 0;
    const specialty  = system?.skills?.[chosenSkill]?.specialty ?? false;
    const rawPool    = traitVal + skillVal - backlash;

    const { bonusDice: advBonus, hpCost: advHpCost, footerLines: advFooterLines } =
      await commitAdvantageChoices(actor, advSelections);
    const assist = await consumeAssistBonus(actor);
    if (assist) advFooterLines.push(`Helping Hand from ${assist.from} (+${assist.dice})`);
    if (bladeTrapPenalty > 0) advFooterLines.push(`Blade trapped (Duelist Academy): −${bladeTrapPenalty} die`);

    const finalPool = Math.max(1, rawPool + extraDice + advBonus + (assist?.dice ?? 0) - bladeTrapPenalty);

    const totalHpSpend = extraDice + advHpCost;
    if (totalHpSpend > 0 && actor) {
      await actor.update({ "system.heroPoints": Math.max(0, heroPoints - totalHpSpend) });
    }

    return SeventhSeaDice._resolveRoll({
      actor, label: `${label} [${chosenTrait} + ${chosenSkill}]`,
      finalPool, skillRank: skillVal, specialty, finalDifficulty,
      extraDice, forceFate, includeDramaticWounds: true,
      advFooterLines, fortunateReroll, forceFateFreeRequested,
    });
  }

  // ── Dialogs ────────────────────────────────────────────────────────────────

  static _showSkillDialog({
    label, skillRank, specialty, difficulty, heroPoints, traits, defaultTrait, backlash,
    extendedActions = [], advList = [], fortunateReady = false, forceFateFreeReady = false,
  }) {
    const threshold   = HIT_THRESHOLDS[Math.clamp(skillRank, 0, 5)];
    const explodeNote = specialty ? "Specialty: explode on 9–10" : "Explode on 10";

    const traitOptions = Object.entries(traits).map(([key, t]) =>
      `<option value="${key}" ${key === defaultTrait ? "selected" : ""}>${_cap(key)} (${t.value})</option>`
    ).join("");

    const eaOptions = extendedActions.map(a =>
      `<option value="${a.id}">${a.label ? _cap(a.label) : "Extended Action"} (${a.current}/${a.target})</option>`
    ).join("");
    const eaField = extendedActions.length > 0 ? `
            <div class="dialog-field">
              <label>Contribute to</label>
              <select id="ss-contribute-ea">
                <option value="">— None (Hero Points as normal) —</option>
                ${eaOptions}
              </select>
              <p class="dialog-hint">Hits beyond Difficulty count toward the chosen Goal instead of granting Hero Points.</p>
            </div>` : "";

    const advField = renderAdvantageChoices(advList);
    const fortunateField = fortunateReady ? `
            <div class="dialog-field">
              <label><input id="ss-fortunate" type="checkbox" /> Fortunate: reroll non-hit dice (once)</label>
            </div>` : "";

    return new Promise(resolve => {
      new Dialog({
        title: `Roll: ${label}`,
        content: `
          <div class="ss-roll-dialog">
            <div class="dialog-pool-info">
              <span>Skill rank: <strong>${skillRank}</strong></span>
              <span>Hit on: <strong>${threshold}+</strong></span>
              <span class="dialog-explode-note">${explodeNote}</span>
              ${backlash > 0 ? `<span class="dialog-backlash-note">−${backlash} Backlash</span>` : ""}
            </div>
            <hr/>
            <div class="dialog-field">
              <label>Trait</label>
              <select id="ss-trait">${traitOptions}</select>
            </div>
            <div class="dialog-field">
              <label>Difficulty</label>
              <input id="ss-difficulty" type="number" value="${difficulty}" min="1" max="20" />
            </div>
            <div class="dialog-field">
              <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
              <input id="ss-hero-points" type="number" value="0" min="0" max="${heroPoints}" />
              <p class="dialog-hint">Each adds 1d10 to the pool.</p>
            </div>
            <div class="dialog-field">
              <label>Force Fate</label>
              <input id="ss-force-fate" type="checkbox" />
              <p class="dialog-hint">Auto-succeed; GM gains VP equal to missing hits.</p>
              ${forceFateFreeReady ? `
              <label><input id="ss-force-fate-free" type="checkbox" /> Sorte Strega: no VP for this Force Fate (once/session)</label>` : ""}
            </div>
            ${advField}
            ${fortunateField}
            ${eaField}
          </div>`,
        buttons: {
          roll: {
            label: "Roll",
            callback: html => resolve({
              chosenTrait:    html.find("#ss-trait").val(),
              finalDifficulty: parseInt(html.find("#ss-difficulty").val()) || difficulty,
              extraDice:      Math.min(parseInt(html.find("#ss-hero-points").val()) || 0, heroPoints),
              forceFate:      html.find("#ss-force-fate").is(":checked"),
              extendedActionId: extendedActions.length > 0 ? (html.find("#ss-contribute-ea").val() || null) : null,
              advSelections:  readAdvantageChoices(html, advList),
              fortunateReroll: html.find("#ss-fortunate").is(":checked"),
              forceFateFreeRequested: html.find("#ss-force-fate-free").is(":checked"),
            }),
          },
          cancel: { label: "Cancel", callback: () => resolve(null) },
        },
        default: "roll",
      }).render(true);
    });
  }

  static _showCombatDialog({
    label, difficulty, heroPoints, traits, aptitudeTrait, skillChoices, backlash, system,
    advList = [], fortunateReady = false, forceFateFreeReady = false, bladeTrapPenalty = 0,
  }) {
    const traitOptions = Object.entries(traits).map(([key, t]) =>
      `<option value="${key}" ${key === aptitudeTrait ? "selected" : ""}>${_cap(key)} (${t.value})</option>`
    ).join("");

    const skillOptions = skillChoices.map(key => {
      const val = system?.skills?.[key]?.value ?? 0;
      const sp  = system?.skills?.[key]?.specialty ? " ◈" : "";
      return `<option value="${key}">${_cap(key)} (${val})${sp}</option>`;
    }).join("");

    // Build a note about where the difficulty came from
    const diffNote = difficulty !== 2
      ? `<p class="dialog-hint" style="color:#1a3a6b;">Auto-set from target aptitude. Change if needed.</p>`
      : `<p class="dialog-hint">Set to opponent's opposing aptitude value.</p>`;

    const advField = renderAdvantageChoices(advList);
    const fortunateField = fortunateReady ? `
            <div class="dialog-field">
              <label><input id="ss-fortunate" type="checkbox" /> Fortunate: reroll non-hit dice (once)</label>
            </div>` : "";
    const bladeTrapNote = bladeTrapPenalty > 0
      ? `<div class="dialog-pool-info"><span class="dialog-backlash-note">Blade trapped (Duelist Academy): −${bladeTrapPenalty} die</span></div>` : "";

    return new Promise(resolve => {
      new Dialog({
        title: `Roll: ${label}`,
        content: `
          <div class="ss-roll-dialog">
            ${backlash > 0 ? `<div class="dialog-pool-info"><span class="dialog-backlash-note">−${backlash} Backlash on pool</span></div><hr/>` : ""}
            ${bladeTrapNote}
            <div class="dialog-field">
              <label>Trait</label>
              <select id="ss-trait">${traitOptions}</select>
            </div>
            <div class="dialog-field">
              <label>Skill</label>
              <select id="ss-skill">${skillOptions}</select>
            </div>
            <div class="dialog-field">
              <label>Difficulty</label>
              <input id="ss-difficulty" type="number" value="${difficulty}" min="1" max="20" />
              ${diffNote}
            </div>
            <div class="dialog-field">
              <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
              <input id="ss-hero-points" type="number" value="0" min="0" max="${heroPoints}" />
              <p class="dialog-hint">Each adds 1d10 to the pool.</p>
            </div>
            <div class="dialog-field">
              <label>Force Fate</label>
              <input id="ss-force-fate" type="checkbox" />
              <p class="dialog-hint">Auto-succeed; GM gains VP equal to missing hits.</p>
              ${forceFateFreeReady ? `
              <label><input id="ss-force-fate-free" type="checkbox" /> Sorte Strega: no VP for this Force Fate (once/session)</label>` : ""}
            </div>
            ${advField}
            ${fortunateField}
          </div>`,
        buttons: {
          roll: {
            label: "Roll",
            callback: html => resolve({
              chosenTrait:     html.find("#ss-trait").val(),
              chosenSkill:     html.find("#ss-skill").val(),
              finalDifficulty: parseInt(html.find("#ss-difficulty").val()) || difficulty,
              extraDice:       Math.min(parseInt(html.find("#ss-hero-points").val()) || 0, heroPoints),
              forceFate:       html.find("#ss-force-fate").is(":checked"),
              advSelections:   readAdvantageChoices(html, advList),
              fortunateReroll: html.find("#ss-fortunate").is(":checked"),
              forceFateFreeRequested: html.find("#ss-force-fate-free").is(":checked"),
            }),
          },
          cancel: { label: "Cancel", callback: () => resolve(null) },
        },
        default: "roll",
      }).render(true);
    });
  }

  // ── Core resolver ──────────────────────────────────────────────────────────

  static async _resolveRoll({
    actor, label, finalPool, skillRank, specialty, finalDifficulty, extraDice, forceFate,
    includeDramaticWounds = false, extendedActionId = null,
    advFooterLines = [], fortunateReroll = false, forceFateFreeRequested = false,
  }) {
    const threshold = HIT_THRESHOLDS[Math.clamp(skillRank, 0, 5)];
    const explodeOn = specialty ? 9 : 10;

    const allFaces = [];
    let pending = finalPool;
    while (pending > 0) {
      const r = new Roll(`${pending}d10`);
      await r.evaluate();
      const faces = r.dice[0].results.map(res => res.result);
      allFaces.push(...faces);
      pending = faces.filter(f => f >= explodeOn).length;
    }

    /* ── Fortunate (Advantage): reroll all non-hit dice, once ─────────────── */
    let fortunateApplied = false;
    if (fortunateReroll) {
      const usedFortunate = await consumeFortunateReady(actor);
      if (usedFortunate) {
        const rerollCount = allFaces.filter(f => f < threshold).length;
        if (rerollCount > 0) {
          const r = new Roll(`${rerollCount}d10`);
          await r.evaluate();
          const newFaces = r.dice[0].results.map(res => res.result);
          let i = 0;
          for (let idx = 0; idx < allFaces.length; idx++) {
            if (allFaces[idx] < threshold) allFaces[idx] = newFaces[i++];
          }
        }
        fortunateApplied = true;
        advFooterLines = [...advFooterLines, "Fortunate: rerolled non-hit dice"];
      }
    }

    /* ── Dramatic Wound dice (Attack/Defence rolls only) ─────────────────────
        Each of the actor's current Dramatic Wounds adds a separate die to the
        roll. These always explode on a 10 (regardless of Specialty), count
        toward hits like any other die, but if any of them come up a 1 the
        character becomes Helpless on their next turn (Reactions still allowed). */

    const woundDiceCount = includeDramaticWounds ? (actor?.system?.dramaticWoundCount ?? 0) : 0;
    const woundFaces      = [];
    let woundDicePending  = woundDiceCount;
    let dramaticWoundHelplessTriggered = false;
    while (woundDicePending > 0) {
      const r = new Roll(`${woundDicePending}d10`);
      await r.evaluate();
      const faces = r.dice[0].results.map(res => res.result);
      woundFaces.push(...faces);
      if (faces.some(f => f === 1)) dramaticWoundHelplessTriggered = true;
      woundDicePending = faces.filter(f => f >= 10).length;
    }

    if (dramaticWoundHelplessTriggered && actor) {
      await actor.update({ "system.wounds.dramaticWoundHelpless": true });
      ui.notifications.warn(`${actor.name} suffers a 1 on a Dramatic Wound die — Helpless on their next turn (Reactions only)!`);
    }

    const combinedFaces = [...allFaces, ...woundFaces];
    const hits      = combinedFaces.filter(f => f >= threshold).length;
    let success     = hits >= finalDifficulty;
    let extraHits   = Math.max(0, hits - finalDifficulty);
    let vpGained    = 0;
    let forced      = false;

    if (!success && forceFate) {
      const missingHits = finalDifficulty - hits;
      forced    = true;
      success   = true;
      extraHits = 0;

      let freeForceFate = false;
      if (forceFateFreeRequested) {
        const advItem = findAvailableAdvantage(actor, "sorte-strega-force-fate");
        if (advItem) {
          await markAdvantageUsed(advItem);
          freeForceFate = true;
          advFooterLines = [...advFooterLines, "Sorte Strega: Force Fate without giving the GM Villainy Points"];
        }
      }
      if (!freeForceFate) {
        vpGained = missingHits;
        await adjustVP(vpGained);
      }
    }

    let hpGained = 0;
    let extendedActionState = null;
    if (!forced && extraHits > 0 && extendedActionId) {
      extendedActionState = await addExtendedActionProgress(extendedActionId, extraHits);
    } else if (!forced && extraDice === 0 && extraHits > 0 && actor) {
      hpGained = extraHits;
      await actor.update({ "system.heroPoints": actor.system.heroPoints + hpGained });
    }

    await SeventhSeaDice._postChatCard({
      actor, label, allFaces, woundFaces, threshold, specialty,
      finalDifficulty, hits, success, extraHits,
      hpGained, extraDice, forced, vpGained,
      dramaticWoundHelplessTriggered, extendedActionState, advFooterLines,
    });

    return {
      hits, success, extraHits, hpGained, forced, finalDifficulty,
      dramaticWoundHelplessTriggered, extendedActionState,
    };
  }

  // ── Chat card ──────────────────────────────────────────────────────────────

  static async _postChatCard({
    actor, label, allFaces, woundFaces = [], threshold, specialty,
    finalDifficulty, hits, success, extraHits,
    hpGained, extraDice, forced, vpGained,
    dramaticWoundHelplessTriggered = false, extendedActionState = null, advFooterLines = [],
  }) {
    const diceHtml = allFaces.map(f =>
      `<span class="die ${f >= threshold ? "hit" : ""}">${f}</span>`
    ).join("");

    const woundDiceHtml = woundFaces.map(f =>
      `<span class="die wound-die ${f >= threshold ? "hit" : ""} ${f === 1 ? "wound-die-helpless" : ""}" title="Dramatic Wound die">${f}</span>`
    ).join("");

    let footer = "";
    if (extraDice > 0) footer += `<div class="chat-roll-footer">Spent ${extraDice} Hero Point${extraDice > 1 ? "s" : ""}</div>`;
    if (hpGained > 0)  footer += `<div class="chat-roll-footer hp-gained">+${hpGained} Hero Point${hpGained > 1 ? "s" : ""} gained</div>`;
    if (forced)        footer += `<div class="chat-roll-footer force-fate">⚖ Force Fate — GM gains ${vpGained} VP</div>`;
    if (specialty)     footer += `<div class="chat-roll-footer">◈ Specialty active</div>`;
    for (const line of advFooterLines) {
      footer += `<div class="chat-roll-footer advantage-note">✦ ${line}</div>`;
    }

    if (woundFaces.length > 0) {
      footer += `<div class="chat-roll-footer">${woundFaces.length} Dramatic Wound di${woundFaces.length > 1 ? "ce" : "e"} rolled (explode on 10)</div>`;
    }
    if (dramaticWoundHelplessTriggered) {
      footer += `<div class="chat-roll-footer result-failure">⚠ A Dramatic Wound die rolled a 1 — Helpless next turn (Reactions only)!</div>`;
    }
    if (extendedActionState) {
      const { label: eaLabel, current, target } = extendedActionState;
      const doneNote = current >= target ? " — 🎉 Goal reached!" : "";
      footer += `<div class="chat-roll-footer ea-progress">Extended Action${eaLabel ? ` (${eaLabel})` : ""}: +${extraHits} → ${current}/${target}${doneNote}</div>`;
    }

    const resultText = forced ? "⚖ FORCED" : success ? "✓ SUCCESS" : "✗ FAILURE";

    await ChatMessage.create({
      user:    game.user.id,
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : {},
      content: `
        <div class="seventh-sea chat-roll">
          <div class="chat-roll-label">${label}</div>
          <div class="chat-roll-dice">${diceHtml}${woundDiceHtml}</div>
          <div class="chat-roll-summary">
            Hits: <strong>${hits}</strong> vs Difficulty <strong>${finalDifficulty}</strong>
            — <span class="${success ? "result-success" : "result-failure"} ${forced ? "result-forced" : ""}">
                ${resultText}
              </span>
            ${extraHits > 0 ? `<span class="extra-hits">(+${extraHits} extra)</span>` : ""}
          </div>
          ${footer}
        </div>`,
    });
  }

  // ── First Aid (Manoeuvre + Science, Action Scene) ───────────────────────────
  //
  // Dramatic Wounds cannot be healed during an Action Scene — only regular
  // Wounds, treated on the fly. The Hero rolls Manoeuvre + Science; each Hit
  // heals one Wound. A given Hero can give First Aid to a given character
  // only once per Action Scene (tracked against the active Combat's id).
  // Neither the healer nor the patient may take a Heroic or Defence action
  // that turn.

  static async rollFirstAid({ healer, target }) {
    if (!healer || !target) return null;

    if (healer.type !== "hero") {
      ui.notifications.warn("Only a Hero can give First Aid (Manoeuvre + Science).");
      return null;
    }

    const combat = game.combat;
    if (!combat) {
      ui.notifications.warn("First Aid during an Action Scene requires an active Combat encounter.");
      return null;
    }

    if (target.type === "npc" && target.system.npcType === "brute") {
      ui.notifications.warn("Brute Squads have no individual Wounds to treat with First Aid.");
      return null;
    }

    const firstAid = target.system.wounds?.firstAid ?? { combatId: "", healedBy: [] };
    const healedBy = firstAid.combatId === combat.id ? (firstAid.healedBy ?? []) : [];
    if (healedBy.includes(healer.id)) {
      ui.notifications.warn(`${healer.name} has already given First Aid to ${target.name} this Action Scene.`);
      return null;
    }

    const manoeuvreVal = healer.system.combatAptitudes?.manoeuvre?.value ?? 0;
    const scienceSkill = healer.system.skills?.science ?? { value: 0, specialty: false };
    const heroPoints   = healer.system.heroPoints ?? 0;

    const dialogResult = await SeventhSeaDice._showFirstAidDialog({
      healerName: healer.name, targetName: target.name,
      manoeuvreVal, scienceRank: scienceSkill.value, specialty: scienceSkill.specialty, heroPoints,
    });
    if (dialogResult === null) return null;

    const { extraDice } = dialogResult;
    const finalPool = Math.max(1, manoeuvreVal + scienceSkill.value + extraDice);

    if (extraDice > 0) {
      await healer.update({ "system.heroPoints": Math.max(0, heroPoints - extraDice) });
    }

    const threshold = HIT_THRESHOLDS[Math.clamp(scienceSkill.value, 0, 5)];
    const explodeOn = scienceSkill.specialty ? 9 : 10;

    const allFaces = [];
    let pending = finalPool;
    while (pending > 0) {
      const r = new Roll(`${pending}d10`);
      await r.evaluate();
      const faces = r.dice[0].results.map(res => res.result);
      allFaces.push(...faces);
      pending = faces.filter(f => f >= explodeOn).length;
    }
    const hits = allFaces.filter(f => f >= threshold).length;

    const woundsHealed = await target.healMinorWounds(hits);

    await target.update({
      "system.wounds.firstAid": { combatId: combat.id, healedBy: [...healedBy, healer.id] },
    });

    await SeventhSeaDice._postFirstAidChatCard({
      healer, target, allFaces, threshold, hits, woundsHealed, extraDice,
    });

    ui.notifications.warn(`${healer.name} and ${target.name} cannot take a Heroic or Defence action this turn — First Aid takes their full attention.`);

    return { hits, woundsHealed };
  }

  static _showFirstAidDialog({ healerName, targetName, manoeuvreVal, scienceRank, specialty, heroPoints }) {
    const threshold   = HIT_THRESHOLDS[Math.clamp(scienceRank, 0, 5)];
    const explodeNote = specialty ? "Specialty: explode on 9–10" : "Explode on 10";

    return new Promise(resolve => {
      new Dialog({
        title: `First Aid: ${healerName} → ${targetName}`,
        content: `
          <div class="ss-roll-dialog">
            <div class="dialog-pool-info">
              <span>Manoeuvre + Science: <strong>${manoeuvreVal} + ${scienceRank}</strong></span>
              <span>Hit on: <strong>${threshold}+</strong></span>
              <span class="dialog-explode-note">${explodeNote}</span>
            </div>
            <hr/>
            <div class="dialog-field">
              <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
              <input id="ss-hero-points" type="number" value="0" min="0" max="${heroPoints}" />
              <p class="dialog-hint">Each adds 1d10 to the pool.</p>
            </div>
            <p class="dialog-hint">
              Each Hit heals one Wound (Dramatic Wounds cannot be healed this way).
              Neither ${healerName} nor ${targetName} may take a Heroic or Defence action this turn.
            </p>
          </div>`,
        buttons: {
          roll: {
            label: "Give First Aid",
            callback: html => resolve({
              extraDice: Math.min(parseInt(html.find("#ss-hero-points").val()) || 0, heroPoints),
            }),
          },
          cancel: { label: "Cancel", callback: () => resolve(null) },
        },
        default: "roll",
      }).render(true);
    });
  }

  static async _postFirstAidChatCard({ healer, target, allFaces, threshold, hits, woundsHealed, extraDice }) {
    const diceHtml = allFaces.map(f =>
      `<span class="die ${f >= threshold ? "hit" : ""}">${f}</span>`
    ).join("");

    let footer = "";
    if (extraDice > 0) footer += `<div class="chat-roll-footer">Spent ${extraDice} Hero Point${extraDice > 1 ? "s" : ""}</div>`;
    footer += `<div class="chat-roll-footer hp-gained">${woundsHealed} Wound${woundsHealed !== 1 ? "s" : ""} healed (Dramatic Wounds unaffected)</div>`;
    footer += `<div class="chat-roll-footer result-failure">⚠ Neither ${healer.name} nor ${target.name} may take a Heroic or Defence action this turn</div>`;

    await ChatMessage.create({
      user:    game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: healer }),
      content: `
        <div class="seventh-sea chat-roll">
          <div class="chat-roll-label">First Aid: ${healer.name} → ${target.name}</div>
          <div class="chat-roll-dice">${diceHtml}</div>
          <div class="chat-roll-summary">
            Hits: <strong>${hits}</strong>
          </div>
          ${footer}
        </div>`,
    });
  }

  // ── Manoeuvre (catch-all Action Scene action) ────────────────────────────────
  //
  // Manoeuvre isn't tied to one Skill — during an Action Scene it can pair
  // with whichever Skill fits what the Hero is trying to do (climb a mast,
  // talk down a guard, spot a threat, etc.). The Trait is always the one the
  // Hero has linked to Manoeuvre; the Skill is chosen at roll time.

  static async rollManoeuvre({ actor, difficulty = 2 }) {
    if (!actor) return null;
    if (actor.type !== "hero") {
      ui.notifications.warn("Only a Hero can roll Manoeuvre (it draws on a Skill list NPCs don't track individually).");
      return null;
    }

    const traitKey = actor.system.combatAptitudes?.manoeuvre?.trait;
    if (!traitKey) {
      ui.notifications.warn(`${actor.name} has no Trait linked to Manoeuvre yet — set one on the Combat tab.`);
      return null;
    }

    const traitVal     = actor.system.traits?.[traitKey]?.value ?? 0;
    const skills       = actor.system.skills ?? {};
    const heroPoints   = actor.system.heroPoints ?? 0;
    const extendedActions = getExtendedActions();
    const advList         = eligibleRollAdvantages(actor, { skillKeys: Object.keys(skills), traitKey });
    const fortunateReady  = !!actor.getFlag?.("seventh-sea-3e", "fortunateReady");
    const forceFateFreeReady = !!findAvailableAdvantage(actor, "sorte-strega-force-fate");

    const dialogResult = await SeventhSeaDice._showManoeuvreDialog({
      actorName: actor.name, traitKey, traitVal, skills, difficulty, heroPoints, extendedActions,
      advList, fortunateReady, forceFateFreeReady,
    });
    if (dialogResult === null) return null;

    const {
      chosenSkill, finalDifficulty, extraDice, forceFate, extendedActionId,
      advSelections = [], fortunateReroll = false, forceFateFreeRequested = false,
    } = dialogResult;
    const skill     = skills[chosenSkill] ?? { value: 0, specialty: false };

    const { bonusDice: advBonus, hpCost: advHpCost, footerLines: advFooterLines } =
      await commitAdvantageChoices(actor, advSelections);
    const assist = await consumeAssistBonus(actor);
    if (assist) advFooterLines.push(`Helping Hand from ${assist.from} (+${assist.dice})`);

    const finalPool = Math.max(1, traitVal + skill.value + extraDice + advBonus + (assist?.dice ?? 0));

    const totalHpSpend = extraDice + advHpCost;
    if (totalHpSpend > 0) {
      await actor.update({ "system.heroPoints": Math.max(0, heroPoints - totalHpSpend) });
    }

    return SeventhSeaDice._resolveRoll({
      actor, label: `Manoeuvre [${_cap(traitKey)} + ${SKILL_LABELS[chosenSkill] ?? _cap(chosenSkill)}]`,
      finalPool, skillRank: skill.value, specialty: skill.specialty, finalDifficulty,
      extraDice, forceFate, includeDramaticWounds: false, extendedActionId,
      advFooterLines, fortunateReroll, forceFateFreeRequested,
    });
  }

  static _showManoeuvreDialog({
    actorName, traitKey, traitVal, skills, difficulty, heroPoints, extendedActions = [],
    advList = [], fortunateReady = false, forceFateFreeReady = false,
  }) {
    const skillOptions = Object.entries(skills).map(([key, s]) =>
      `<option value="${key}">${SKILL_LABELS[key] ?? _cap(key)} (${s.value}${s.specialty ? " ◈" : ""})</option>`
    ).join("");

    const eaOptions = extendedActions.map(a =>
      `<option value="${a.id}">${a.label ? _cap(a.label) : "Extended Action"} (${a.current}/${a.target})</option>`
    ).join("");
    const eaField = extendedActions.length > 0 ? `
            <div class="dialog-field">
              <label>Contribute to</label>
              <select id="ss-contribute-ea">
                <option value="">— None (Hero Points as normal) —</option>
                ${eaOptions}
              </select>
              <p class="dialog-hint">Hits beyond Difficulty count toward the chosen Goal instead of granting Hero Points.</p>
            </div>` : "";

    const advField = renderAdvantageChoices(advList);
    const fortunateField = fortunateReady ? `
            <div class="dialog-field">
              <label><input id="ss-fortunate" type="checkbox" /> Fortunate: reroll non-hit dice (once)</label>
            </div>` : "";

    return new Promise(resolve => {
      new Dialog({
        title: `Manoeuvre: ${actorName}`,
        content: `
          <div class="ss-roll-dialog">
            <div class="dialog-pool-info">
              <span>Manoeuvre Trait: <strong>${_cap(traitKey)} (${traitVal})</strong></span>
            </div>
            <hr/>
            <div class="dialog-field">
              <label>Skill</label>
              <select id="ss-skill">${skillOptions}</select>
              <p class="dialog-hint">Pick whichever Skill fits what the Hero is trying to do.</p>
            </div>
            <div class="dialog-field">
              <label>Difficulty</label>
              <input id="ss-difficulty" type="number" value="${difficulty}" min="1" max="20" />
            </div>
            <div class="dialog-field">
              <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
              <input id="ss-hero-points" type="number" value="0" min="0" max="${heroPoints}" />
              <p class="dialog-hint">Each adds 1d10 to the pool.</p>
            </div>
            <div class="dialog-field">
              <label>Force Fate</label>
              <input id="ss-force-fate" type="checkbox" />
              <p class="dialog-hint">Auto-succeed; GM gains VP equal to missing hits.</p>
              ${forceFateFreeReady ? `
              <label><input id="ss-force-fate-free" type="checkbox" /> Sorte Strega: no VP for this Force Fate (once/session)</label>` : ""}
            </div>
            ${advField}
            ${fortunateField}
            ${eaField}
          </div>`,
        buttons: {
          roll: {
            label: "Roll",
            callback: html => resolve({
              chosenSkill:     html.find("#ss-skill").val(),
              finalDifficulty: parseInt(html.find("#ss-difficulty").val()) || difficulty,
              extraDice:       Math.min(parseInt(html.find("#ss-hero-points").val()) || 0, heroPoints),
              forceFate:       html.find("#ss-force-fate").is(":checked"),
              extendedActionId: extendedActions.length > 0 ? (html.find("#ss-contribute-ea").val() || null) : null,
              advSelections:   readAdvantageChoices(html, advList),
              fortunateReroll: html.find("#ss-fortunate").is(":checked"),
              forceFateFreeRequested: html.find("#ss-force-fate-free").is(":checked"),
            }),
          },
          cancel: { label: "Cancel", callback: () => resolve(null) },
        },
        default: "roll",
      }).render(true);
    });
  }
}

function _cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
