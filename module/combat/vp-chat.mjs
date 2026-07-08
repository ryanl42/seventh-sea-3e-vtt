/**
 * 7th Sea 3e — Villain Point Damage Chat Prompt
 *
 * Posts a GM-only chat card with a button after a Hero's failed Defence
 * roll, letting the GM spend Villain Points (1 VP = +1 wound) at their own
 * pace — regardless of whether the player or the GM rolled the Defence.
 */

import { getVP, adjustVP } from "../settings/villainy.mjs";

const FLAG_SCOPE = "seventh-sea-3e";
const FLAG_KEY   = "vpDamagePrompt";

/**
 * Post the prompt card. Whispered to GMs only.
 * @param {Actor} actor  The Hero who failed their Defence.
 */
export async function postVillainPointDamagePrompt(actor) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: _openCardHtml(actor.name),
    flags: {
      [FLAG_SCOPE]: {
        [FLAG_KEY]: { actorId: actor.id, resolved: false },
      },
    },
  });
}

function _openCardHtml(actorName) {
  return `
    <div class="seventh-sea chat-roll chat-vp-prompt">
      <div class="chat-roll-label">Villain Point Damage</div>
      <p class="vp-prompt-text"><strong>${actorName}</strong> failed their Defence. Spend Villain Points for bonus wounds?</p>
      <button type="button" class="vp-damage-btn" data-action="spend-vp-damage">🗡 Spend Villain Points</button>
    </div>`;
}

function _resolvedCardHtml(actorName, spent) {
  return `
    <div class="seventh-sea chat-roll chat-vp-prompt is-resolved">
      <div class="chat-roll-label">Villain Point Damage</div>
      <p class="vp-prompt-text">Spent <strong>${spent}</strong> Villain Point${spent > 1 ? "s" : ""} — <strong>${actorName}</strong> takes ${spent} additional wound${spent > 1 ? "s" : ""}.</p>
    </div>`;
}

function _skippedCardHtml(actorName) {
  return `
    <div class="seventh-sea chat-roll chat-vp-prompt is-resolved">
      <div class="chat-roll-label">Villain Point Damage</div>
      <p class="vp-prompt-text">No Villain Points spent against <strong>${actorName}</strong>.</p>
    </div>`;
}

/**
 * Wire up the click handler for the button. Call once during system init.
 */
export function registerVillainPointChatListeners() {
  Hooks.on("renderChatMessageHTML", (message, html) => _attachListener(message, html));
}

function _attachListener(message, html) {
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;

  const button = root.querySelector(".vp-damage-btn");
  if (!button || button.dataset.wired === "true") return;
  button.dataset.wired = "true";

  // Only the GM can act on this even though the card is already GM-whispered.
  if (!game.user.isGM) {
    button.style.display = "none";
    return;
  }

  button.addEventListener("click", () => _onClickSpendVP(message));
}

async function _onClickSpendVP(message) {
  const flagData = message.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!flagData || flagData.resolved) return;

  const actor = game.actors.get(flagData.actorId);
  if (!actor) {
    ui.notifications.error("Couldn't find the Hero for this Villain Point prompt.");
    return;
  }

  const vp = getVP();
  if (vp <= 0) {
    ui.notifications.warn("No Villain Points available to spend.");
    return;
  }

  const spent = await _promptSpendAmount(actor, vp);

  if (spent <= 0) {
    await message.update({
      content: _skippedCardHtml(actor.name),
      [`flags.${FLAG_SCOPE}.${FLAG_KEY}.resolved`]: true,
    });
    return;
  }

  await adjustVP(-spent);

  const { dramaticGained } = await actor.applyWounds(spent, { dramaticLimit: 4 });

  await message.update({
    content: _resolvedCardHtml(actor.name, spent),
    [`flags.${FLAG_SCOPE}.${FLAG_KEY}.resolved`]: true,
  });

  if (dramaticGained > 0) {
    ui.notifications.info(`${actor.name} suffers ${dramaticGained} additional Dramatic Wound${dramaticGained > 1 ? "s" : ""} from Villain Points!`);
  }
}

function _promptSpendAmount(actor, vp) {
  return new Promise(resolve => {
    new Dialog({
      title:   "Spend Villain Points for Damage",
      content: `
        <div class="ss-roll-dialog">
          <p><strong>${actor.name}</strong> failed their Defence.</p>
          <div class="dialog-field">
            <label>Spend Villain Points <em>(${vp} available)</em></label>
            <input id="ss-vp-damage" type="number" value="0" min="0" max="${vp}" />
            <p class="dialog-hint">Each Villain Point spent adds +1 wound to the Hero.</p>
          </div>
        </div>`,
      buttons: {
        confirm: {
          label: "Apply Damage",
          callback: html => resolve(Math.min(parseInt(html.find("#ss-vp-damage").val()) || 0, vp)),
        },
        skip: {
          label: "Skip",
          callback: () => resolve(0),
        },
      },
      default: "skip",
      close: () => resolve(0),
    }).render(true);
  });
}
