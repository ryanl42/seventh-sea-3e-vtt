/**
 * 7th Sea 3e — Sorte Strega Logic
 * All action functions receive (actor, sorceryItem) so they can
 * update the item's resource (Backlash) directly.
 */

import { SeventhSeaDice } from "../dice/dice.mjs";

const ARCANA = [
  { name: "Backfire",
    minor: "If the target succeeds at their next Action, they suffer a minor complication (1 Wound by default).",
    major: "If the target succeeds at their next Action, they achieve their goal but at the cost of a serious consequence or advantage granted to their opponents (1 Dramatic Wound by default)." },
  { name: "Blessing",
    minor: "One of the target's Traits is increased by 1, affecting their Combat Aptitudes.",
    major: "The target succeeds at their next action." },
  { name: "Clairvoyance",
    minor: "The GM must reveal the direct and true intention of the target: what they are about to do and how.",
    major: "The Strega may anticipate the target's choices, granting allies one additional action against that target." },
  { name: "Curse",
    minor: "One of the target's Traits is reduced by 1, affecting their Combat Aptitudes.",
    major: "The target fails their next action." },
  { name: "False Omen",
    minor: "The target misreads a situation. Difficulty of actions against them is reduced by 1 (min 1).",
    major: "The target makes a poor decision. Their next important action must be guided by a false certainty." },
  { name: "Inevitability",
    minor: "The target gains +1 die to continue an action already begun, or to uphold a clearly stated resolve.",
    major: "An action already undertaken by the target can no longer be interrupted by ordinary means." },
  { name: "Knot of Fate",
    minor: "When one of the two targets receives a bonus or penalty, the other necessarily receives the same one.",
    major: "Any effect suffered by one target is necessarily shared with the other: wounds, healing, consequences, advantages." },
  { name: "Transfer",
    minor: "The Strega suffers a negative consequence in place of the target, provided she can justify the transfer.",
    major: "The Strega causes another person present in the scene to suffer a negative consequence intended for her target." },
];

// ── Actions ───────────────────────────────────────────────────────────────────

export async function sorteRead(actor, _item) {
  const system    = actor.system;
  const wits      = system.traits.wits?.value ?? 0;
  const sorcery   = system.skills.sorcery?.value ?? 0;
  const specialty = system.skills.sorcery?.specialty ?? false;

  await SeventhSeaDice.roll({
    actor,
    label:     "Read Threads of Fate (Wits + Sorcery)",
    poolSize:  Math.max(1, wits + sorcery),
    skillRank: sorcery,
    specialty,
    difficulty: 2,
  });
}

export async function sorteWeaveMinor(actor, item) {
  const hp = actor.system.heroPoints;

  const choice = await new Promise(resolve => {
    new Dialog({
      title: "Weave Minor Arcana",
      content: `
        <div class="ss-roll-dialog">
          <p>Choose how to pay the cost for a Minor Arcana effect.</p>
          <p style="font-size:0.85em;color:#6a5a44;">
            Hero Points: <strong>${hp}</strong> |
            Backlash: <strong>${item.system.resource.value}</strong>
          </p>
        </div>`,
      buttons: {
        hp: {
          label:    "Spend 1 Hero Point",
          callback: () => resolve("hp"),
        },
        backlash: {
          label:    "Take 1 Backlash",
          callback: () => resolve("backlash"),
        },
        cancel: {
          label:    "Cancel",
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
    await item.update({ "system.resource.value": item.system.resource.value + 1 });
  }

  await _postArcanaChat(actor, "minor", choice);
}

export async function sorteWeaveMajor(actor, item) {
  const confirmed = await Dialog.confirm({
    title:   "Weave Major Arcana",
    content: "<p>This costs <strong>1 Backlash</strong>. Proceed?</p>",
  });
  if (!confirmed) return;

  await item.update({ "system.resource.value": item.system.resource.value + 1 });
  await _postArcanaChat(actor, "major", "backlash");
}

export async function sorteReference(actor, _item) {
  const rows = ARCANA.map(a => `
    <div class="arcana-entry">
      <div class="arcana-name">${a.name}</div>
      <div class="arcana-tier"><strong>Minor:</strong> ${a.minor}</div>
      <div class="arcana-tier"><strong>Major:</strong> ${a.major}</div>
    </div>`).join("");

  await ChatMessage.create({
    user:    game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="seventh-sea chat-roll sorte-reference">
        <div class="chat-roll-label">Sorte Strega — Arcana Reference</div>
        <div class="arcana-list">${rows}</div>
        <div class="chat-roll-footer">Sorte Strega cannot read threads that concern themselves.</div>
      </div>`,
  });
}

// ── Internal ───────────────────────────────────────────────────────────────────

async function _postArcanaChat(actor, tier, cost) {
  const costLabel = cost === "hp" ? "1 Hero Point spent" : "1 Backlash taken";
  const rows = ARCANA.map(a => `
    <div class="arcana-entry">
      <div class="arcana-name">${a.name}</div>
      <div class="arcana-tier arcana-active">${a[tier]}</div>
    </div>`).join("");

  await ChatMessage.create({
    user:    game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="seventh-sea chat-roll sorte-weave">
        <div class="chat-roll-label">${tier === "minor" ? "◈ Minor" : "★ Major"} Arcana — ${costLabel}</div>
        <p class="sorte-instruction">Choose one Arcana effect to apply to your target:</p>
        <div class="arcana-list">${rows}</div>
        <div class="chat-roll-footer">Must be preceded by a Reading this scene.</div>
      </div>`,
  });
}
