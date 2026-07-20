/**
 * 7th Sea 3e — Advantage Automation Engine
 *
 * Two halves:
 *  1. Roll-time bonus dice — any Advantage with `system.scope !== "none"` can
 *     be offered as an opt-in checkbox on a matching roll (see
 *     eligibleRollAdvantages / renderAdvantageChoices / commitAdvantageChoices,
 *     wired into module/dice/dice.mjs).
 *  2. Activate button — Advantages whose `system.key` matches an entry in
 *     ADVANTAGE_DEFS get a dedicated "Activate" control in the Advantages
 *     tab (see hero-sheet.mjs), for effects a dice pool can't express.
 */

import { SKILL_GROUPS, getAdvantageDef } from "./advantage-defs.mjs";

const FLAG_SCOPE = "seventh-sea-3e";

// ── Roll-time bonus dice ──────────────────────────────────────────────────

/**
 * Returns the actor's advantage Items that could plausibly apply to a roll
 * using `skillKey` and/or `traitKey`, along with whether they're currently
 * available (Hero Points for heroic, uses remaining for extraordinary).
 */
export function eligibleRollAdvantages(actor, { skillKey = null, skillKeys = null, traitKey = null } = {}) {
  if (!actor) return [];
  const heroPoints = actor.system?.heroPoints ?? 0;
  const keys = skillKeys ?? (skillKey ? [skillKey] : []);

  return actor.items
    .filter(i => i.type === "advantage" && i.system.scope && i.system.scope !== "none")
    .filter(i => {
      const sys = i.system;
      if (sys.scope === "always") return true;
      if (sys.scope === "skill") {
        if (!keys.length) return false;
        return keys.some(k => sys.scopeSkills?.includes(k));
      }
      if (sys.scope === "trait") {
        return !!traitKey && sys.scopeTrait === traitKey;
      }
      return false;
    })
    .map(item => {
      const sys      = item.system;
      const cost     = sys.category === "heroic" ? (sys.hpCost ?? 1) : 0;
      const limited  = sys.usesMax > 0;
      const available = limited ? sys.usesRemaining > 0 : (cost === 0 || heroPoints >= cost);
      return { item, cost, limited, available };
    });
}

/** Small inline block of checkboxes for a Dialog's `content` string. */
export function renderAdvantageChoices(list) {
  if (!list.length) return "";
  const rows = list.map(({ item, cost, limited, available }) => {
    const costNote = cost > 0 ? ` — ${cost} HP` : limited ? " — free, once/session" : " — free";
    const disabled = available ? "" : "disabled";
    const strike   = available ? "" : "style=\"opacity:0.5;\"";
    return `
      <label class="dialog-advantage-row" ${strike}>
        <input type="checkbox" class="ss-adv-check" data-adv-id="${item.id}"
               data-cost="${cost}" data-dice="${item.system.bonusDice}" ${disabled} />
        ${item.name} (+${item.system.bonusDice} die${item.system.bonusDice === 1 ? "" : "s"})${costNote}
      </label>`;
  }).join("");

  return `
    <div class="dialog-field dialog-advantages">
      <label>Advantages</label>
      ${rows}
    </div>`;
}

/** Reads which checkboxes the player ticked out of a rendered dialog. */
export function readAdvantageChoices(html, list) {
  const checked = new Set(
    [...html.find(".ss-adv-check:checked")].map(el => el.dataset.advId)
  );
  return list.filter(({ item }) => checked.has(item.id));
}

/**
 * Applies the chosen advantages: increments usesSpent on limited ones, and
 * returns the total bonus dice, total Hero Point cost, and chat footer
 * lines to append to the roll's chat card. Does NOT touch the actor's Hero
 * Points itself — the caller combines this cost with its own generic Hero
 * Point spend and applies a single update, to avoid clobbering each other.
 */
export async function commitAdvantageChoices(actor, selections) {
  let bonusDice = 0;
  let hpCost    = 0;
  const footerLines = [];

  for (const { item, cost } of selections) {
    bonusDice += item.system.bonusDice;
    hpCost    += cost;
    footerLines.push(`${item.name} (+${item.system.bonusDice})`);
    if (item.system.usesMax > 0) {
      await item.update({ "system.usesSpent": item.system.usesSpent + 1, "system.used": true });
    }
  }

  return { bonusDice, hpCost, footerLines };
}

// ── Help Ally (base rule) + Team Player override ──────────────────────────

/**
 * "Add 3d10 to an ally's pool if you are actively helping them" (p.15).
 * Team Player bumps this to 4d10 for its owner. Stores the bonus as a flag
 * on the *target*, consumed automatically by their next roll.
 */
export async function grantHelpingHand({ helper, target }) {
  if (!helper || !target) return null;
  const heroPoints = helper.system?.heroPoints ?? 0;
  if (heroPoints < 1) {
    ui.notifications.warn(`${helper.name} has no Hero Points left to spend.`);
    return null;
  }

  const teamPlayer = helper.items.find(i => i.type === "advantage" && i.system.key === "team-player");
  const dice = teamPlayer ? 4 : 3;

  await helper.update({ "system.heroPoints": heroPoints - 1 });
  await target.setFlag(FLAG_SCOPE, "assist", { dice, from: helper.name });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: helper }),
    content: `<div class="seventh-sea chat-roll">
      <div class="chat-roll-label">Helping Hand</div>
      <div class="chat-roll-summary">
        <strong>${helper.name}</strong> spends 1 Hero Point to help <strong>${target.name}</strong>
        — their next roll gains <strong>+${dice}d10</strong>${teamPlayer ? " (Team Player)" : ""}.
      </div>
    </div>`,
  });

  return dice;
}

/** Reads and clears a pending Helping Hand bonus on `actor`, if any. */
export async function consumeAssistBonus(actor) {
  if (!actor) return null;
  const assist = actor.getFlag(FLAG_SCOPE, "assist");
  if (!assist) return null;
  await actor.unsetFlag(FLAG_SCOPE, "assist");
  return assist;
}

// ── Duelist Academy — "blade trapped" penalty ─────────────────────────────

/** Reads and clears a pending blade-trap penalty on `actor`, if any. */
export async function consumeBladeTrap(actor) {
  if (!actor) return 0;
  const penalty = actor.getFlag(FLAG_SCOPE, "bladeTrapped");
  if (!penalty) return 0;
  await actor.unsetFlag(FLAG_SCOPE, "bladeTrapped");
  return penalty;
}

// ── Force Fate — Sorte Strega free variant ────────────────────────────────

export function findAvailableAdvantage(actor, key) {
  return actor?.items?.find(i =>
    i.type === "advantage" && i.system.key === key &&
    (i.system.usesMax === 0 || i.system.usesRemaining > 0)
  ) ?? null;
}

export async function markAdvantageUsed(item) {
  if (!item) return;
  await item.update({ "system.usesSpent": item.system.usesSpent + 1, "system.used": true });
}

// ── Activate button dispatch ───────────────────────────────────────────────

/**
 * Generic "Activate" handler for Advantages that aren't roll-pool bonuses.
 * Returns true if it did something (so the caller can re-render/notify).
 */
export async function activateAdvantage(actor, item) {
  const key = item.system.key;
  const def = getAdvantageDef(key);
  if (!def) {
    ui.notifications.warn(`${item.name} has no automation configured yet — resolve it narratively with your GM.`);
    return false;
  }

  switch (def.mechanic) {
    case "grantHeroPoint":       return _activateGrantHeroPoint(actor, item, def);
    case "autoSuccess":          return _activateAutoSuccess(actor, item, def);
    case "reroll":               return _activateReroll(actor, item, def);
    case "campfire":             return _activateCampfire(actor, item, def);
    case "statusAnnounce":       return _activateStatusAnnounce(actor, item, def);
    case "redirectWounds":       return _activateRedirectWounds(actor, item, def);
    case "cancelWounds":         return _activateCancelWounds(actor, item, def);
    case "camaraderie":          return _activateCamaraderie(actor, item, def);
    case "oath":                 return _activateOath(actor, item, def);
    case "bladeTrap":            return _activateBladeTrap(actor, item, def);
    case "forceFateFree":
      ui.notifications.info(`${item.name} is offered automatically as a checkbox when you Force Fate — no need to Activate it separately.`);
      return false;
    case "specialtyGrant":
    case "assistOverride":
    case "none":
      ui.notifications.info(`${item.name} is always in effect — nothing to activate.`);
      return false;
    default:
      return false;
  }
}

function _checkAvailable(item) {
  if (item.system.usesMax > 0 && item.system.usesRemaining <= 0) {
    ui.notifications.warn(`${item.name} has already been used this session.`);
    return false;
  }
  return true;
}

async function _spendCost(actor, item) {
  const cost = item.system.category === "heroic" ? (item.system.hpCost ?? 1) : 0;
  if (cost > 0) {
    if ((actor.system.heroPoints ?? 0) < cost) {
      ui.notifications.warn(`${actor.name} doesn't have ${cost} Hero Point(s) to spend on ${item.name}.`);
      return false;
    }
    await actor.update({ "system.heroPoints": actor.system.heroPoints - cost });
  }
  if (item.system.usesMax > 0) {
    await item.update({ "system.usesSpent": item.system.usesSpent + 1, "system.used": true });
  }
  return true;
}

async function _postAdvantageCard(actor, item, text) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="seventh-sea chat-roll">
      <div class="chat-roll-label">${item.name}</div>
      <div class="chat-roll-summary">${text}</div>
    </div>`,
  });
}

async function _activateGrantHeroPoint(actor, item, def) {
  if (!_checkAvailable(item)) return false;
  await item.update({ "system.usesSpent": item.system.usesSpent + 1, "system.used": true });
  await actor.update({ "system.heroPoints": (actor.system.heroPoints ?? 0) + 1 });
  await _postAdvantageCard(actor, item, `<strong>${actor.name}</strong> gains 1 Hero Point (${item.name}).`);
  return true;
}

async function _activateAutoSuccess(actor, item, def) {
  if (item.system.category === "extraordinary" && !_checkAvailable(item)) return false;

  let extra = false;
  if (def.allowExtra) {
    extra = await Dialog.confirm({
      title:   item.name,
      content: `<p>${def.extraLabel}?</p>`,
    });
  }

  const ok = await _spendCost(actor, item);
  if (!ok) return false;

  if (extra && (actor.system.heroPoints ?? 0) >= 1) {
    await actor.update({ "system.heroPoints": actor.system.heroPoints - 1 });
  }

  await _postAdvantageCard(actor, item,
    `<strong>${actor.name}</strong> ${def.text ?? "automatically succeeds."}${extra ? " (bringing someone along)" : ""}`);
  return true;
}

async function _activateReroll(actor, item, def) {
  if (!_checkAvailable(item)) return false;
  await actor.setFlag(FLAG_SCOPE, "fortunateReady", true);
  ui.notifications.info(`${item.name} armed — your next roll will offer a one-time "reroll non-hits" option.`);
  return true;
}

export async function consumeFortunateReady(actor) {
  if (!actor?.getFlag(FLAG_SCOPE, "fortunateReady")) return false;
  await actor.unsetFlag(FLAG_SCOPE, "fortunateReady");
  const item = actor.items.find(i => i.system.key === "fortunate");
  if (item) await markAdvantageUsed(item);
  return true;
}

async function _activateCampfire(actor, item, def) {
  if (!_checkAvailable(item)) return false;
  const question = await new Promise(resolve => {
    new Dialog({
      title:   item.name,
      content: `<div class="ss-roll-dialog"><div class="dialog-field">
        <label>${def.text}</label>
        <input id="ss-question" type="text" placeholder="What do you want to know?" />
      </div></div>`,
      buttons: {
        ask:    { label: "Ask", callback: html => resolve(html.find("#ss-question").val()) },
        cancel: { label: "Cancel", callback: () => resolve(null) },
      },
      default: "ask",
    }).render(true);
  });
  if (question === null) return false;

  await item.update({ "system.usesSpent": item.system.usesSpent + 1, "system.used": true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="seventh-sea chat-roll">
      <div class="chat-roll-label">${item.name}</div>
      <div class="chat-roll-summary"><strong>${actor.name}</strong> ${def.text}</div>
      ${question ? `<p class="dialog-hint">Question: <em>${question}</em></p>` : ""}
      <p class="dialog-hint">GM: please answer honestly, in character or in chat.</p>
    </div>`,
  });
  return true;
}

async function _activateStatusAnnounce(actor, item, def) {
  if (item.system.category === "extraordinary" && !_checkAvailable(item)) return false;
  const ok = await _spendCost(actor, item);
  if (!ok) return false;
  await actor.setFlag(FLAG_SCOPE, `status.${item.system.key}`, true);
  await _postAdvantageCard(actor, item, `<strong>${actor.name}</strong> ${def.text}`);
  return true;
}

async function _activateRedirectWounds(actor, item, def) {
  if (!_checkAvailable(item)) return false;
  const target = _firstTarget();
  if (!target) { ui.notifications.warn("Target the ally who is about to take the harm first."); return false; }

  const amount = await _promptNumber(item.name, `How many Wounds/penalty is ${target.name} suffering? ${actor.name} will take it instead.`);
  if (amount === null) return false;

  await item.update({ "system.usesSpent": item.system.usesSpent + 1, "system.used": true });
  await target.healMinorWounds(amount);
  await actor.applyWounds(amount);
  await _postAdvantageCard(actor, item,
    `<strong>${actor.name}</strong> suffers ${amount} Wound(s) in place of <strong>${target.name}</strong>.`);
  return true;
}

async function _activateCancelWounds(actor, item, def) {
  if (!_checkAvailable(item)) return false;
  const target = _firstTarget();
  if (!target) { ui.notifications.warn("Target the ally whose Wounds you want to cancel first."); return false; }

  const amount = await _promptNumber(item.name, `Cancel how many Wounds on ${target.name}? ${actor.name} suffers 1 Dramatic Wound instead.`);
  if (amount === null) return false;

  await item.update({ "system.usesSpent": item.system.usesSpent + 1, "system.used": true });
  await target.healMinorWounds(amount);
  await actor.applyDirectDramaticWound?.();
  await _postAdvantageCard(actor, item,
    `<strong>${actor.name}</strong> cancels ${amount} Wound(s) on <strong>${target.name}</strong>, taking 1 Dramatic Wound instead.`);
  return true;
}

async function _activateCamaraderie(actor, item, def) {
  const target = _firstTarget();
  if (!target) { ui.notifications.warn("Target the ally you want to help first."); return false; }

  const heroPoints = actor.system.heroPoints ?? 0;
  if (heroPoints < 1) { ui.notifications.warn(`${actor.name} has no Hero Points left.`); return false; }

  const choice = await new Promise(resolve => {
    new Dialog({
      title:   `${item.name} → ${target.name}`,
      content: `<div class="ss-roll-dialog">
        <div class="dialog-field">
          <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
          <input id="ss-cam-hp" type="number" value="1" min="1" max="${heroPoints}" />
        </div>
        <div class="dialog-field">
          <label>Effect</label>
          <select id="ss-cam-effect">
            <option value="dice">+1 die per Hero Point to their next roll</option>
            <option value="damage">+1 Damage per Hero Point to their next Attack</option>
          </select>
        </div>
      </div>`,
      buttons: {
        confirm: { label: "Help", callback: html => resolve({
          hp:     Math.min(parseInt(html.find("#ss-cam-hp").val()) || 1, heroPoints),
          effect: html.find("#ss-cam-effect").val(),
        }) },
        cancel: { label: "Cancel", callback: () => resolve(null) },
      },
      default: "confirm",
    }).render(true);
  });
  if (!choice) return false;

  await actor.update({ "system.heroPoints": heroPoints - choice.hp });
  if (choice.effect === "dice") {
    await target.setFlag(FLAG_SCOPE, "assist", { dice: choice.hp, from: actor.name });
  } else {
    await target.setFlag(FLAG_SCOPE, "assistDamage", { amount: choice.hp, from: actor.name });
  }

  await _postAdvantageCard(actor, item,
    `<strong>${actor.name}</strong> spends ${choice.hp} Hero Point(s) to grant <strong>${target.name}</strong> ` +
    (choice.effect === "dice" ? `+${choice.hp} dice on their next roll.` : `+${choice.hp} Damage on their next Attack.`));
  return true;
}

async function _activateOath(actor, item, def) {
  const heroPoints = actor.system.heroPoints ?? 0;
  const result = await new Promise(resolve => {
    new Dialog({
      title:   item.name,
      content: `<div class="ss-roll-dialog">
        <div class="dialog-field">
          <label>Promise</label>
          <input id="ss-oath-note" type="text" placeholder="What are you promising?" />
        </div>
        <div class="dialog-field">
          <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
          <input id="ss-oath-hp" type="number" value="1" min="1" max="${Math.max(1, heroPoints)}" />
          <p class="dialog-hint">+1 die per Hero Point invested, for the rest of the Scene, on actions keeping this promise.</p>
        </div>
      </div>`,
      buttons: {
        confirm: { label: "Swear", callback: html => resolve({
          note: html.find("#ss-oath-note").val() || "Keep the promise",
          hp:   Math.min(parseInt(html.find("#ss-oath-hp").val()) || 1, Math.max(1, heroPoints)),
        }) },
        cancel: { label: "Cancel", callback: () => resolve(null) },
      },
      default: "confirm",
    }).render(true);
  });
  if (!result || heroPoints < result.hp) return false;

  await actor.update({ "system.heroPoints": heroPoints - result.hp });
  await item.update({
    "system.active":      true,
    "system.activeValue": result.hp,
    "system.activeNote":  result.note,
    "system.scope":       "always",
    "system.bonusDice":   result.hp,
  });
  await _postAdvantageCard(actor, item,
    `<strong>${actor.name}</strong> swears an Oath: <em>${result.note}</em> (+${result.hp} dice on actions keeping it, until the Scene ends).`);
  return true;
}

/** Clears an Oath's persistent bonus (called manually or at Scene/Combat end). */
export async function clearOath(item) {
  await item.update({
    "system.active":      false,
    "system.activeValue": 0,
    "system.scope":       "none",
    "system.bonusDice":   0,
  });
}

async function _activateBladeTrap(actor, item, def) {
  const target = _firstTarget();
  if (!target) { ui.notifications.warn("Target the opponent whose blade you just trapped."); return false; }
  const ok = await _spendCost(actor, item);
  if (!ok) return false;

  await target.setFlag(FLAG_SCOPE, "bladeTrapped", 1);
  await _postAdvantageCard(actor, item,
    `<strong>${actor.name}</strong> traps <strong>${target.name}</strong>'s blade — their Attack and Defence rolls are at -1 die until they spend an action pulling free.`);
  return true;
}

// ── Small local helpers ────────────────────────────────────────────────────

function _firstTarget() {
  return game.user.targets.first()?.actor ?? null;
}

function _promptNumber(title, label) {
  return new Promise(resolve => {
    new Dialog({
      title,
      content: `<div class="ss-roll-dialog"><div class="dialog-field">
        <label>${label}</label>
        <input id="ss-num" type="number" value="1" min="1" max="20" />
      </div></div>`,
      buttons: {
        confirm: { label: "Confirm", callback: html => resolve(parseInt(html.find("#ss-num").val()) || 0) },
        cancel:  { label: "Cancel",  callback: () => resolve(null) },
      },
      default: "confirm",
    }).render(true);
  });
}

export { SKILL_GROUPS };
