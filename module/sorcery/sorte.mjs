/**
 * 7th Sea 3e — Sorte Strega Logic
 *
 * Read Threads / Arcana Reference remain tradition-level actions on the
 * Sorte item itself. Reading is a targeted Wits + Sorcery roll opposed by
 * the target's Wits Trait (per the Quick Reference); a successful Read
 * flags that target on the Sorte item so its Arcana can be Woven against
 * them this scene (a flag cleared when Combat ends, as a stand-in for
 * "the scene," since the system has no other scene boundary to hook).
 *
 * Each Arcana below is its own Item (type "arcana", see arcana-data.mjs)
 * attached to a Sorte item via system.parentSorceryId, with its own
 * Minor/Major Weave buttons wired to weaveArcanaMinor/Major.
 *
 * On a successful Weave, the Arcana's effect is applied directly to the
 * targeted token(s)' actor(s) as a Foundry Active Effect. Where the Arcana
 * maps to a concrete mechanical value (a Trait, per Blessing/Curse), the
 * Active Effect carries a real `changes` entry. Where the sourcebook effect
 * is narrative/conditional (e.g. "fails their next action", "cannot be
 * interrupted") there is no existing system field to hook automatically,
 * so a marker Active Effect is applied instead — it shows on the target's
 * token/sheet with the full effect text so the table can track and rule on
 * it, without this system inventing new mechanical fields on its own.
 */

import { SeventhSeaDice } from "../dice/dice.mjs";

const TRAIT_CHOICES = {
  brawn:   "Brawn",
  finesse: "Finesse",
  resolve: "Resolve",
  wits:    "Wits",
  panache: "Panache",
};

export const ARCANA = [
  { key: "backfire", name: "Backfire",
    minor: "If the target succeeds at their next Action, they suffer a minor complication (1 Wound by default, though this may be adapted depending on the context).",
    major: "If the target succeeds at their next Action, they achieve their goal, but at the cost of a serious consequence or an advantage granted to their opponents (1 Dramatic Wound by default, though this may be adapted depending on the context).",
    targeting: "single" },

  { key: "blessing", name: "Blessing",
    minor: "One of the target's Traits is increased by 1, which affects their Combat Aptitudes.",
    major: "The target succeeds at their next action.",
    targeting: "single",
    minorEffect: async () => {
      const trait = await _promptTrait("Weave Blessing (Minor)", "Increase which Trait by 1?");
      if (!trait) return null;
      return {
        mechanical: true,
        label:   `Blessing (Minor) — +1 ${TRAIT_CHOICES[trait]}`,
        changes: [{ key: `system.traits.${trait}.value`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }],
      };
    } },

  { key: "clairvoyance", name: "Clairvoyance",
    minor: "The GM must reveal to the Strega the direct and true intention of her target: what they are about to do and how.",
    major: "The Strega may anticipate her target's choices. This grants the allies with whom she can communicate one additional action, but only against that target.",
    targeting: "single" },

  { key: "curse", name: "Curse",
    minor: "One of the target's Traits is reduced by 1, which affects their Combat Aptitudes.",
    major: "The target fails their next action.",
    targeting: "single",
    minorEffect: async () => {
      const trait = await _promptTrait("Weave Curse (Minor)", "Reduce which Trait by 1?");
      if (!trait) return null;
      return {
        mechanical: true,
        label:   `Curse (Minor) — −1 ${TRAIT_CHOICES[trait]}`,
        changes: [{ key: `system.traits.${trait}.value`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 }],
      };
    } },

  { key: "falseOmen", name: "False Omen",
    minor: "The target misreads a situation. The Difficulty of any action undertaken against them is reduced by 1, to a minimum of 1.",
    major: "The target makes a poor decision. Their next important action must be guided by this false certainty.",
    targeting: "single" },

  { key: "inevitability", name: "Inevitability",
    minor: "The target gains +1 die to continue an action already begun, or to uphold a clearly stated resolve.",
    major: "An action already undertaken by the target can no longer be interrupted by ordinary means. It will reach its conclusion, though its consequences may still be altered.",
    targeting: "single" },

  { key: "knotOfFate", name: "Knot of Fate",
    minor: "When one of the two targets receives a bonus or penalty, the other necessarily receives the same one.",
    major: "Any effect suffered by one of the two targets is necessarily shared with the other: wounds, healing, consequences, advantages, and so on.",
    targeting: "double" },

  { key: "transfer", name: "Transfer",
    minor: "The Strega suffers a negative consequence in place of the target, provided she can justify the transfer.",
    major: "The Strega causes another person present in the scene to suffer a negative consequence intended for her target, provided she can justify the transfer.",
    targeting: "self" },
];

// ── Tradition-level actions (Sorte item itself) ────────────────────────────────

export async function sorteRead(actor, sorceryItem) {
  const target = game.user.targets.first()?.actor ?? null;
  if (!target) { ui.notifications.warn("Target a token to Read their Threads of Fate."); return; }
  if (target === actor) { ui.notifications.warn("A Sorte Strega cannot read threads that concern herself."); return; }

  const system    = actor.system;
  const sorcery   = system.skills.sorcery?.value ?? 0;
  const specialty = system.skills.sorcery?.specialty ?? false;
  const difficulty = Math.max(1, target.system?.traits?.wits?.value ?? 2);

  const result = await SeventhSeaDice.roll({
    actor,
    label:        `Read Threads of Fate vs ${target.name} (Wits + Sorcery)`,
    skillKey:     "sorcery",
    skillRank:    sorcery,
    specialty,
    difficulty,
    defaultTrait: "wits",
  });

  if (result?.success) {
    const read = new Set(sorceryItem.getFlag("seventh-sea-3e", "readTargets") ?? []);
    read.add(target.uuid);
    await sorceryItem.setFlag("seventh-sea-3e", "readTargets", Array.from(read));
  }
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

// ── Per-Arcana actions (Arcana item) ───────────────────────────────────────────

export async function weaveArcanaMinor(actor, arcanaItem) {
  const def = _getArcanaDef(arcanaItem);
  if (!def) { console.warn("7thSea3e | No Arcana definition for", arcanaItem); return; }

  const sorceryItem = _getParentSorcery(actor, arcanaItem);
  if (!sorceryItem) { ui.notifications.warn("This Arcana's parent Sorte item could not be found."); return; }

  const targets = _resolveTargets(actor, def.targeting);
  if (!_checkTargetsResolved(def, targets)) return;
  if (!_checkTargetsRead(sorceryItem, def, targets)) return;

  const hp     = actor.system.heroPoints;
  const choice = await _promptMinorCost(hp, sorceryItem.system.resource.value);
  if (!choice) return;

  if (choice === "hp") {
    await actor.update({ "system.heroPoints": Math.max(0, hp - 1) });
  } else {
    await sorceryItem.update({ "system.resource.value": sorceryItem.system.resource.value + 1 });
  }

  const result = def.minorEffect ? await def.minorEffect() : null;
  if (def.minorEffect && result === null) return; // cancelled (e.g. trait picker dismissed)

  await _applyArcanaWeave(actor, def, "minor", result, targets, choice === "hp" ? "1 Hero Point spent" : "1 Backlash taken");
}

export async function weaveArcanaMajor(actor, arcanaItem) {
  const def = _getArcanaDef(arcanaItem);
  if (!def) { console.warn("7thSea3e | No Arcana definition for", arcanaItem); return; }

  const sorceryItem = _getParentSorcery(actor, arcanaItem);
  if (!sorceryItem) { ui.notifications.warn("This Arcana's parent Sorte item could not be found."); return; }

  const targets = _resolveTargets(actor, def.targeting);
  if (!_checkTargetsResolved(def, targets)) return;
  if (!_checkTargetsRead(sorceryItem, def, targets)) return;

  const confirmed = await Dialog.confirm({
    title:   `Weave ${def.name} (Major)`,
    content: "<p>This costs <strong>1 Backlash</strong>. Proceed?</p>",
  });
  if (!confirmed) return;

  await sorceryItem.update({ "system.resource.value": sorceryItem.system.resource.value + 1 });

  const result = def.majorEffect ? await def.majorEffect() : null;
  if (def.majorEffect && result === null) return;

  await _applyArcanaWeave(actor, def, "major", result, targets, "1 Backlash taken");
}

// ── Internal ───────────────────────────────────────────────────────────────────

function _getArcanaDef(arcanaItem) {
  return ARCANA.find(a => a.key === arcanaItem.system.key) ?? null;
}

function _getParentSorcery(actor, arcanaItem) {
  return actor.items.get(arcanaItem.system.parentSorceryId) ?? null;
}

function _promptMinorCost(hp, backlash) {
  return new Promise(resolve => {
    new Dialog({
      title:   "Weave Minor Arcana",
      content: `
        <div class="ss-roll-dialog">
          <p>Choose how to pay the cost for a Minor Arcana effect.</p>
          <p style="font-size:0.85em;color:#6a5a44;">
            Hero Points: <strong>${hp}</strong> |
            Backlash: <strong>${backlash}</strong>
          </p>
        </div>`,
      buttons: {
        hp:       { label: "Spend 1 Hero Point", callback: () => resolve("hp") },
        backlash: { label: "Take 1 Backlash",    callback: () => resolve("backlash") },
        cancel:   { label: "Cancel",             callback: () => resolve(null) },
      },
      default: hp >= 1 ? "hp" : "backlash",
    }).render(true);
  });
}

function _promptTrait(title, question) {
  return new Promise(resolve => {
    new Dialog({
      title,
      content: `
        <div class="ss-roll-dialog">
          <p>${question}</p>
          <div class="dialog-field">
            <select id="ss-trait-pick">
              ${Object.entries(TRAIT_CHOICES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
            </select>
          </div>
        </div>`,
      buttons: {
        ok:     { label: "Confirm", callback: html => resolve(html.find("#ss-trait-pick").val()) },
        cancel: { label: "Cancel",  callback: () => resolve(null) },
      },
      default: "ok",
    }).render(true);
  });
}

/**
 * Resolves which actor(s) an Arcana's effect should be applied to, based on
 * its targeting mode and the caster's current token target(s).
 */
function _resolveTargets(actor, targeting) {
  if (targeting === "self") return [actor];

  const targeted = Array.from(game.user.targets).map(t => t.actor).filter(Boolean);

  if (targeting === "double") {
    if (targeted.length < 2) return []; // caller warns
    return targeted.slice(0, 2);
  }

  return targeted; // "single" — applies to every currently-targeted token
}

function _checkTargetsResolved(def, targets) {
  if (def.targeting !== "self" && targets.length === 0) {
    const needed = def.targeting === "double" ? "two targets" : "a target";
    ui.notifications.warn(`Select ${needed} before weaving ${def.name}.`);
    return false;
  }
  return true;
}

/**
 * Per the Quick Reference: activating an Arcana must always be preceded by
 * a Reading of the target's Threads of Fate (a single Reading during the
 * scene is enough). Reads are tracked as a flag on the parent Sorte item,
 * keyed by target actor UUID, and cleared when a Combat ends (see
 * seventh-sea.mjs) as a proxy for "the scene."
 */
function _checkTargetsRead(sorceryItem, def, targets) {
  if (def.targeting === "self") return true; // Transfer (Minor) targets the Strega herself

  const read = new Set(sorceryItem.getFlag("seventh-sea-3e", "readTargets") ?? []);
  const unread = targets.filter(t => !read.has(t.uuid));

  if (unread.length) {
    ui.notifications.warn(
      `Read ${unread.map(t => t.name).join(" and ")}'s Threads of Fate before weaving ${def.name} on them this scene.`
    );
    return false;
  }
  return true;
}

async function _applyArcanaWeave(actor, def, tier, result, targets, costLabel) {
  const tierLabel   = tier === "minor" ? "Minor" : "Major";
  const description = def[tier];
  const effectName   = result?.label ?? `${def.name} (${tierLabel})`;
  const changes       = result?.mechanical ? result.changes : [];

  for (const targetActor of targets) {
    await targetActor.createEmbeddedDocuments("ActiveEffect", [{
      name:     effectName,
      img:      "icons/svg/daze.svg",
      origin:   actor.uuid,
      duration: { rounds: 1 },
      changes,
      flags: {
        "seventh-sea-3e": { sorteArcana: def.key, tier, description },
      },
    }]);
  }

  await ChatMessage.create({
    user:    game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="seventh-sea chat-roll sorte-weave">
        <div class="chat-roll-label">${tier === "minor" ? "◈ Minor" : "★ Major"} Arcana — ${def.name} (${costLabel})</div>
        <div class="arcana-entry">
          <div class="arcana-tier arcana-active">${description}</div>
        </div>
        <div class="chat-roll-summary">
          Applied to: <strong>${targets.map(t => t.name).join(", ")}</strong>
          ${changes.length ? "" : "<br><em>Narrative effect — no automatic mechanical change; ruled at the table.</em>"}
        </div>
      </div>`,
  });
}
