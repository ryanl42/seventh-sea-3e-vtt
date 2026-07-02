/**
 * 7th Sea 3e — Dice Engine (Step 15)
 * Adds Force Fate: auto-success but GM gains Villainy Points.
 */

import { adjustVP, getVP } from "../settings/villainy.mjs";

const HIT_THRESHOLDS = [10, 9, 8, 7, 6, 5];

export class SeventhSeaDice {

  static async roll({ actor, label, poolSize, skillRank, specialty = false, difficulty = 2 }) {

    const heroPoints = actor?.system?.heroPoints ?? 0;
    const dialogResult = await SeventhSeaDice._showDialog({
      label, poolSize, skillRank, specialty, difficulty, heroPoints,
    });
    if (dialogResult === null) return null;

    const { finalDifficulty, extraDice, forceFate } = dialogResult;
    const finalPool = Math.max(1, poolSize + extraDice);

    // Deduct spent Hero Points
    if (extraDice > 0 && actor) {
      await actor.update({ "system.heroPoints": Math.max(0, actor.system.heroPoints - extraDice) });
    }

    const threshold = HIT_THRESHOLDS[Math.clamp(skillRank, 0, 5)];
    const explodeOn = specialty ? 9 : 10;

    // ── Roll the pool ────────────────────────────────────────────────────────
    const allFaces = [];
    let pending = finalPool;
    while (pending > 0) {
      const r = new Roll(`${pending}d10`);
      await r.evaluate();
      const faces = r.dice[0].results.map(res => res.result);
      allFaces.push(...faces);
      pending = faces.filter(f => f >= explodeOn).length;
    }

    const hits    = allFaces.filter(f => f >= threshold).length;
    let success   = hits >= finalDifficulty;
    let extraHits = Math.max(0, hits - finalDifficulty);
    let vpGained  = 0;
    let forced    = false;

    // ── Force Fate ──────────────────────────────────────────────────────────
    if (!success && forceFate) {
      vpGained = finalDifficulty - hits; // missing hits → VP for GM
      await adjustVP(vpGained);
      success   = true;
      extraHits = 0;
      forced    = true;
    }

    // ── Extra Hits → Hero Points (only if no HP spent and no Force Fate) ────
    let hpGained = 0;
    if (!forced && extraDice === 0 && extraHits > 0 && actor) {
      hpGained = extraHits;
      await actor.update({ "system.heroPoints": actor.system.heroPoints + hpGained });
    }

    await SeventhSeaDice._postChatCard({
      actor, label, allFaces, threshold, specialty,
      finalDifficulty, hits, success, extraHits, hpGained,
      extraDice, forced, vpGained,
    });

    return { hits, success, extraHits, hpGained, forced };
  }

  // ── Dialog ─────────────────────────────────────────────────────────────────

  static _showDialog({ label, poolSize, skillRank, specialty, difficulty, heroPoints }) {
    const threshold   = HIT_THRESHOLDS[Math.clamp(skillRank, 0, 5)];
    const explodeNote = specialty ? "Specialty active: explode on 9–10" : "Dice explode on 10";

    return new Promise(resolve => {
      new Dialog({
        title: `Roll: ${label}`,
        content: `
          <div class="ss-roll-dialog">
            <div class="dialog-pool-info">
              <span>Pool: <strong>${poolSize}d10</strong></span>
              <span>Hit on: <strong>${threshold}+</strong></span>
              <span class="dialog-explode-note">${explodeNote}</span>
            </div>
            <hr/>
            <div class="dialog-field">
              <label>Difficulty (1–5)</label>
              <input id="ss-difficulty" type="number" value="${difficulty}" min="1" max="20" />
            </div>
            <div class="dialog-field">
              <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
              <input id="ss-hero-points" type="number" value="0" min="0" max="${heroPoints}" />
              <p class="dialog-hint">Each Hero Point adds 1d10 to the pool.</p>
            </div>
            <hr/>
            <div class="dialog-field">
              <label>Force Fate</label>
              <input id="ss-force-fate" type="checkbox" />
              <p class="dialog-hint">Auto-succeed, but GM gains VP equal to missing hits.</p>
            </div>
          </div>`,
        buttons: {
          roll: {
            label: "Roll",
            callback: html => {
              const diff   = parseInt(html.find("#ss-difficulty").val()) || difficulty;
              const spend  = Math.min(parseInt(html.find("#ss-hero-points").val()) || 0, heroPoints);
              const force  = html.find("#ss-force-fate").is(":checked");
              resolve({ finalDifficulty: diff, extraDice: spend, forceFate: force });
            },
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null),
          },
        },
        default: "roll",
      }).render(true);
    });
  }

  // ── Chat card ──────────────────────────────────────────────────────────────

  static async _postChatCard({
    actor, label, allFaces, threshold, specialty,
    finalDifficulty, hits, success, extraHits, hpGained,
    extraDice, forced, vpGained,
  }) {
    const diceHtml = allFaces.map(f => {
      const isHit = f >= threshold;
      return `<span class="die ${isHit ? "hit" : ""}">${f}</span>`;
    }).join("");

    let footer = "";
    if (extraDice > 0)  footer += `<div class="chat-roll-footer">Spent ${extraDice} Hero Point${extraDice > 1 ? "s" : ""}</div>`;
    if (hpGained > 0)   footer += `<div class="chat-roll-footer hp-gained">+${hpGained} Hero Point${hpGained > 1 ? "s" : ""} gained</div>`;
    if (forced)         footer += `<div class="chat-roll-footer force-fate">⚖ Force Fate — GM gains ${vpGained} Villainy Point${vpGained > 1 ? "s" : ""}</div>`;
    if (specialty)      footer += `<div class="chat-roll-footer">◈ Specialty active</div>`;

    const resultText = forced
      ? "⚖ FORCED"
      : success ? "✓ SUCCESS" : "✗ FAILURE";

    const content = `
      <div class="seventh-sea chat-roll">
        <div class="chat-roll-label">${label}</div>
        <div class="chat-roll-dice">${diceHtml}</div>
        <div class="chat-roll-summary">
          Hits: <strong>${hits}</strong> vs Difficulty <strong>${finalDifficulty}</strong>
          — <span class="${success ? "result-success" : "result-failure"} ${forced ? "result-forced" : ""}">
              ${resultText}
            </span>
          ${extraHits > 0 ? `<span class="extra-hits">(+${extraHits} extra)</span>` : ""}
        </div>
        ${footer}
      </div>`;

    await ChatMessage.create({
      user:    game.user.id,
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : {},
      content,
    });
  }
}
