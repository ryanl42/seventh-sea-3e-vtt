/**
 * 7th Sea 3e — Sorte Strega Logic (Step 16)
 */

import { SeventhSeaDice } from "../dice/dice.mjs";

// ── Arcana reference data ──────────────────────────────────────────────────────
export const ARCANA = [
  {
    name: "Backfire",
    minor: "If the target succeeds at their next Action, they suffer a minor complication (1 Wound by default).",
    major: "If the target succeeds at their next Action, they achieve their goal but at the cost of a serious consequence or advantage granted to their opponents (1 Dramatic Wound by default).",
  },
  {
    name: "Blessing",
    minor: "One of the target's Traits is increased by 1, which affects their Combat Aptitudes.",
    major: "The target succeeds at their next action.",
  },
  {
    name: "Clairvoyance",
    minor: "The GM must reveal the direct and true intention of the target: what they are about to do and how.",
    major: "The Strega may anticipate the target's choices, granting allies one additional action against that target.",
  },
  {
    name: "Curse",
    minor: "One of the target's Traits is reduced by 1, which affects their Combat Aptitudes.",
    major: "The target fails their next action.",
  },
  {
    name: "False Omen",
    minor: "The target misreads a situation. Difficulty of any action against them is reduced by 1 (min 1).",
    major: "The target makes a poor decision. Their next important action must be guided by this false certainty.",
  },
  {
    name: "Inevitability",
    minor: "The target gains +1 die to continue an action already begun, or to uphold a clearly stated resolve.",
    major: "An action already undertaken by the target can no longer be interrupted by ordinary means.",
  },
  {
    name: "Knot of Fate",
    minor: "When one of the two targets receives a bonus or penalty, the other necessarily receives the same one.",
    major: "Any effect suffered by one of the two targets is necessarily shared with the other: wounds, healing, consequences, advantages.",
  },
  {
    name: "Transfer",
    minor: "The Strega suffers a negative consequence in place of the target, provided she can justify the transfer.",
    major: "The Strega causes another person present in the scene to suffer a negative consequence intended for her target.",
  },
];

// ── Sorte actions ──────────────────────────────────────────────────────────────

/**
 * Read Threads — Wits + Sorcery, difficulty = target's Wits.
 * Costs nothing if the Strega only reads (doesn't touch) the threads.
 */
export async function sorteRead(actor) {
  const system   = actor.system;
  const wits     = system.traits.wits?.value ?? 0;
  const sorcery  = system.skills.sorcery?.value ?? 0;
  const specialty = system.skills.sorcery?.specialty ?? false;

  await SeventhSeaDice.roll({
    actor,
    label:     "Read Threads of Fate (Wits + Sorcery)",
    poolSize:  Math.max(1, wits + sorcery),
    skillRank: sorcery,
    specialty,
    difficulty: 2, // player sets to target's Wits in dialog
  });
}

/**
 * Weave Minor Arcana — costs 1 Hero Point OR 1 Backlash (player chooses).
 * Posts a dialog to pick the cost, then posts the Arcana list to chat.
 */
export async function sorteWeaveMinor(actor) {
  const hp = actor.system.heroPoints;

  const choice = await new Promise(resolve => {
    new Dialog({
      title: "Weave Minor Arcana",
      content: `
        <div class="ss-roll-dialog">
          <p>Choose how to pay the cost for a Minor Arcana effect.</p>
          <p style="font-size:0.85em; color:#6a5a44;">
            Current Hero Points: <strong>${hp}</strong> |
            Current Backlash: <strong>${actor.system.sorcery.backlash}</strong>
          </p>
        </div>`,
      buttons: {
        hp: {
          label: "Spend 1 Hero Point",
          callback: () => resolve("hp"),
          disabled: hp < 1,
        },
        backlash: {
          label: "Take 1 Backlash",
          callback: () => resolve("backlash"),
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      default: hp >= 1 ? "hp" : "backlash",
    }).render(true);
  });

  if (!choice) return;

  if (choice === "hp") {
    await actor.update({ "system.heroPoints": Math.max(0, hp - 1) });
  } else {
    await actor.update({ "system.sorcery.backlash": actor.system.sorcery.backlash + 1 });
  }

  await _postArcanaChat(actor, "minor", choice);
}

/**
 * Weave Major Arcana — always costs 1 Backlash.
 */
export async function sorteWeaveMajor(actor) {
  const confirmed = await Dialog.confirm({
    title:   "Weave Major Arcana",
    content: "<p>This costs <strong>1 Backlash</strong>. Proceed?</p>",
  });
  if (!confirmed) return;

  await actor.update({ "system.sorcery.backlash": actor.system.sorcery.backlash + 1 });
  await _postArcanaChat(actor, "major", "backlash");
}

/**
 * Post full Arcana reference card to chat.
 */
export async function sorteReference(actor) {
  const rows = ARCANA.map(a => `
    <div class="arcana-entry">
      <div class="arcana-name">${a.name}</div>
      <div class="arcana-tier"><strong>Minor:</strong> ${a.minor}</div>
      <div class="arcana-tier"><strong>Major:</strong> ${a.major}</div>
    </div>`).join("");

  const content = `
    <div class="seventh-sea chat-roll sorte-reference">
      <div class="chat-roll-label">Sorte Strega — Arcana Reference</div>
      <div class="arcana-list">${rows}</div>
      <div class="chat-roll-footer">
        Sorte Strega do not appear in the threads of Fate — they cannot read information
        that concerns them directly or indirectly.
      </div>
    </div>`;

  await ChatMessage.create({
    user:    game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
}

// ── Internal helpers ───────────────────────────────────────────────────────────

async function _postArcanaChat(actor, tier, cost) {
  const costLabel = cost === "hp" ? "1 Hero Point spent" : "1 Backlash taken";
  const rows = ARCANA.map(a => `
    <div class="arcana-entry">
      <div class="arcana-name">${a.name}</div>
      <div class="arcana-tier arcana-active">${a[tier]}</div>
    </div>`).join("");

  const content = `
    <div class="seventh-sea chat-roll sorte-weave">
      <div class="chat-roll-label">
        ${tier === "minor" ? "◈ Minor" : "★ Major"} Arcana — ${costLabel}
      </div>
      <p class="sorte-instruction">Choose one Arcana effect to apply to your target:</p>
      <div class="arcana-list">${rows}</div>
      <div class="chat-roll-footer">
        Must be preceded by a Reading of the target's Fate threads this scene.
      </div>
    </div>`;

  await ChatMessage.create({
    user:    game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
}
