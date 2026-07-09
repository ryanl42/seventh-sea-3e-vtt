/**
 * 7th Sea 3e — Dice Engine (Step 18)
 * - Skill rolls now let player choose any Trait in the dialog
 * - Attack/Defence rolls let player choose Aim, Athletics, or Melee
 */

import { adjustVP } from "../settings/villainy.mjs";
import { getExtendedAction, addExtendedActionProgress } from "../settings/extended-action.mjs";
 
const HIT_THRESHOLDS = [10, 9, 8, 7, 6, 5];

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
    const extendedAction = getExtendedAction();

    const dialogResult = await SeventhSeaDice._showSkillDialog({
      label, skillRank, specialty, difficulty, heroPoints, traits, defaultTrait, backlash, extendedAction,
    });
    if (dialogResult === null) return null;

    const { finalDifficulty, extraDice, forceFate, chosenTrait, contributeToExtendedAction } = dialogResult;

    const traitVal  = traits[chosenTrait]?.value ?? 0;
    const skillVal  = system?.skills?.[skillKey]?.value ?? skillRank;
    const rawPool   = traitVal + skillVal - backlash;
    const finalPool = Math.max(1, rawPool + extraDice);

    if (extraDice > 0 && actor) {
      await actor.update({ "system.heroPoints": Math.max(0, heroPoints - extraDice) });
    }

    return SeventhSeaDice._resolveRoll({
      actor, label: `${label} [${chosenTrait}]`,
      finalPool, skillRank, specialty, finalDifficulty,
      extraDice, forceFate, includeDramaticWounds: false,
      contributeToExtendedAction,
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

    const dialogResult = await SeventhSeaDice._showCombatDialog({
      label, difficulty, heroPoints, traits, aptitudeTrait, skillChoices, backlash, system,
    });
    if (dialogResult === null) return null;

    const { finalDifficulty, extraDice, forceFate, chosenTrait, chosenSkill } = dialogResult;

    const traitVal   = traits[chosenTrait]?.value ?? 0;
    const skillVal   = system?.skills?.[chosenSkill]?.value ?? 0;
    const specialty  = system?.skills?.[chosenSkill]?.specialty ?? false;
    const rawPool    = traitVal + skillVal - backlash;
    const finalPool  = Math.max(1, rawPool + extraDice);

    if (extraDice > 0 && actor) {
      await actor.update({ "system.heroPoints": Math.max(0, heroPoints - extraDice) });
    }

    return SeventhSeaDice._resolveRoll({
      actor, label: `${label} [${chosenTrait} + ${chosenSkill}]`,
      finalPool, skillRank: skillVal, specialty, finalDifficulty,
      extraDice, forceFate, includeDramaticWounds: true,
    });
  }

  // ── Dialogs ────────────────────────────────────────────────────────────────

  static _showSkillDialog({ label, skillRank, specialty, difficulty, heroPoints, traits, defaultTrait, backlash, extendedAction = null }) {
    const threshold   = HIT_THRESHOLDS[Math.clamp(skillRank, 0, 5)];
    const explodeNote = specialty ? "Specialty: explode on 9–10" : "Explode on 10";

    const traitOptions = Object.entries(traits).map(([key, t]) =>
      `<option value="${key}" ${key === defaultTrait ? "selected" : ""}>${_cap(key)} (${t.value})</option>`
    ).join("");

    const eaActive = !!extendedAction?.active;
    const eaField = eaActive ? `
            <div class="dialog-field">
              <label>Extended Action${extendedAction.label ? `: ${extendedAction.label}` : ""}
                <em>(${extendedAction.current}/${extendedAction.target})</em></label>
              <input id="ss-contribute-ea" type="checkbox" checked />
              <p class="dialog-hint">Hits beyond Difficulty count toward the Goal instead of granting Hero Points.</p>
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
            </div>
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
              contributeToExtendedAction: eaActive && html.find("#ss-contribute-ea").is(":checked"),
            }),
          },
          cancel: { label: "Cancel", callback: () => resolve(null) },
        },
        default: "roll",
      }).render(true);
    });
  }

  static _showCombatDialog({ label, difficulty, heroPoints, traits, aptitudeTrait, skillChoices, backlash, system }) {
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

    return new Promise(resolve => {
      new Dialog({
        title: `Roll: ${label}`,
        content: `
          <div class="ss-roll-dialog">
            ${backlash > 0 ? `<div class="dialog-pool-info"><span class="dialog-backlash-note">−${backlash} Backlash on pool</span></div><hr/>` : ""}
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
            </div>
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
    includeDramaticWounds = false, contributeToExtendedAction = false,
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
      vpGained = finalDifficulty - hits;
      await adjustVP(vpGained);
      success   = true;
      extraHits = 0;
      forced    = true;
    }

    let hpGained = 0;
    let extendedActionState = null;
    if (!forced && extraHits > 0 && contributeToExtendedAction) {
      extendedActionState = await addExtendedActionProgress(extraHits);
    } else if (!forced && extraDice === 0 && extraHits > 0 && actor) {
      hpGained = extraHits;
      await actor.update({ "system.heroPoints": actor.system.heroPoints + hpGained });
    }

    await SeventhSeaDice._postChatCard({
      actor, label, allFaces, woundFaces, threshold, specialty,
      finalDifficulty, hits, success, extraHits,
      hpGained, extraDice, forced, vpGained,
      dramaticWoundHelplessTriggered, extendedActionState,
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
    dramaticWoundHelplessTriggered = false, extendedActionState = null,
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
}

function _cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
