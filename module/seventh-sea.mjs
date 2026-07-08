/**
 * 7th Sea 3rd Edition — Step 22
 * Adds Actor document class, applyWounds, and token bar configuration.
 */

import { HeroData }       from "./actor/hero-data.mjs";
import { NpcData }        from "./actor/npc-data.mjs";
import { SeventhSeaActor } from "./actor/actor.mjs";
import { AdvantageData }  from "./item/advantage-data.mjs";
import { SorceryData }    from "./item/sorcery-data.mjs";
import { HeroSheet }      from "./apps/hero-sheet.mjs";
import { NPCSheet }       from "./apps/npc-sheet.mjs";
import { AdvantageSheet } from "./apps/advantage-sheet.mjs";
import { SorcerySheet }   from "./apps/sorcery-sheet.mjs";
import { SeventhSeaDice } from "./dice/dice.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars.mjs";
import { registerVillainySetting, initVillainHUD, adjustVP, getVP, setVP } from "./settings/villainy.mjs";
import { registerVillainPointChatListeners } from "./combat/vp-chat.mjs";

Hooks.once("init", () => {
  console.log("7thSea3e | init fired");

  // ── Document classes ─────────────────────────────────────────────────────
  CONFIG.Actor.documentClass = SeventhSeaActor;

  // ── Data models ──────────────────────────────────────────────────────────
  CONFIG.Actor.dataModels = { hero: HeroData, npc: NpcData };
  CONFIG.Item.dataModels  = { advantage: AdvantageData, sorcery: SorceryData };

  // ── Token bar attributes ─────────────────────────────────────────────────
  // Paths are relative to actor.system. Bar paths need {value,max} objects.
  CONFIG.Actor.trackableAttributes = {
    hero: {
      bar:   ["wounds", "heroPointsBar"],
      value: ["wounds.minor", "wounds.dramaticWoundCount",
              "heroPoints",   "toughnessValue"],
    },
    npc: {
      bar:   ["wounds"],
      value: ["wounds.minor", "extendedAction.current"],
    },
  };

  // ── Sheet registration ───────────────────────────────────────────────────
  DocumentSheetConfig.registerSheet(Actor, "seventh-sea-3e", HeroSheet, {
    types: ["hero"], makeDefault: true, label: "7th Sea Hero Sheet",
  });
  DocumentSheetConfig.registerSheet(Actor, "seventh-sea-3e", NPCSheet, {
    types: ["npc"], makeDefault: true, label: "7th Sea NPC Sheet",
  });
  DocumentSheetConfig.registerSheet(Item, "seventh-sea-3e", AdvantageSheet, {
    types: ["advantage"], makeDefault: true, label: "7th Sea Advantage Sheet",
  });
  DocumentSheetConfig.registerSheet(Item, "seventh-sea-3e", SorcerySheet, {
    types: ["sorcery"], makeDefault: true, label: "7th Sea Sorcery Sheet",
  });

  registerHandlebarsHelpers();
  registerVillainySetting();
  registerVillainPointChatListeners();
  registerDramaticWoundHelplessHook();

    console.log("7thSea3e | init complete");
});

Hooks.once("ready", () => {
  game.seventhSea = { SeventhSeaDice, getVP, setVP, adjustVP };
  initVillainHUD();
  console.log("7thSea3e | ready fired");
});

// ── Dramatic Wound dice — "Helpless" resolves at the start of the next turn ───
// When a Dramatic Wound die rolls a 1, the character is marked Helpless for
// their next turn (they may still take Reactions). That status is applied for
// the duration of that one upcoming turn and clears automatically once combat
// advances to — and then past — them.
function registerDramaticWoundHelplessHook() {
  Hooks.on("updateCombat", async (combat, changed) => {
    if (!("turn" in changed) && !("round" in changed)) return;

    const actor = combat.combatant?.actor;
    if (!actor) return;
    if (!actor.system?.wounds?.dramaticWoundHelpless) return;

    ui.notifications.warn(`${actor.name} is Helpless this turn from a Dramatic Wound — they may only take Reactions.`);
    await actor.update({ "system.wounds.dramaticWoundHelpless": false });
  });
}

// ── Token right-click context menu — Apply Wounds ─────────────────────────────
Hooks.on("getActorContextOptions", (html, options) => {
  options.push({
    name:  "Apply Wounds",
    icon:  '<i class="fas fa-heart-broken"></i>',
    condition: li => {
      const id    = li instanceof HTMLElement ? li.dataset.documentId : li.data?.("documentId") ?? li.data?.("actorId");
      const actor = game.actors.get(id);
      return actor?.type === "hero" && game.user.isGM;
    },
    callback: async li => {
      const id    = li instanceof HTMLElement ? li.dataset.documentId : li.data?.("documentId") ?? li.data?.("actorId");
      const actor = game.actors.get(id);
      if (!actor) return;

      const amount = await new Promise(resolve => {
        new Dialog({
          title:   `Apply Wounds to ${actor.name}`,
          content: `
            <div class="ss-roll-dialog">
              <div class="dialog-field">
                <label>Wounds to apply</label>
                <input id="wound-amount" type="number" value="1" min="0" max="20" />
              </div>
              <p class="dialog-hint">
                Toughness: ${actor.system.toughnessValue ?? "?"} —
                wounds will automatically convert to Dramatic Wounds.
              </p>
            </div>`,
          buttons: {
            apply: {
              label:    "Apply",
              callback: html => resolve(parseInt(html.find("#wound-amount").val()) || 0),
            },
            cancel: { label: "Cancel", callback: () => resolve(null) },
          },
          default: "apply",
        }).render(true);
      });

      if (amount === null || amount <= 0) return;
      const result = await actor.applyWounds(amount);
      ChatMessage.create({
        content: `<div class="seventh-sea chat-roll">
          <div class="chat-roll-label">${actor.name} — Wounds Applied</div>
          <div class="chat-roll-summary">
            Applied <strong>${amount}</strong> wound${amount > 1 ? "s" : ""}.
            Minor: <strong>${result.minor}</strong> |
            Dramatic: <strong>${result.dramaticCount}</strong>
            ${result.helpless ? " | <span class='result-failure'>⚠ HELPLESS</span>" : ""}
          </div>
        </div>`,
        speaker: ChatMessage.getSpeaker({ actor }),
      });
    },
  });
});
