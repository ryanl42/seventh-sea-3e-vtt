/**
 * 7th Sea 3rd Edition — Step 16
 * Adds Sorte Strega sorcery panel and mechanics.
 */

import { HeroData }        from "./actor/hero-data.mjs";
import { NpcData }         from "./actor/npc-data.mjs";
import { AdvantageData }   from "./item/advantage-data.mjs";
import { HeroSheet }       from "./apps/hero-sheet.mjs";
import { NPCSheet }        from "./apps/npc-sheet.mjs";
import { AdvantageSheet }  from "./apps/advantage-sheet.mjs";
import { SeventhSeaDice }  from "./dice/dice.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars.mjs";
import { registerVillainySetting, initVillainHUD, adjustVP, getVP, setVP } from "./settings/villainy.mjs";

Hooks.once("init", () => {
  console.log("7thSea3e | init fired");

  CONFIG.Actor.dataModels = { hero: HeroData, npc: NpcData };
  CONFIG.Item.dataModels  = { advantage: AdvantageData };

  DocumentSheetConfig.registerSheet(Actor, "seventh-sea-3e", HeroSheet, {
    types: ["hero"], makeDefault: true, label: "7th Sea Hero Sheet",
  });
  DocumentSheetConfig.registerSheet(Actor, "seventh-sea-3e", NPCSheet, {
    types: ["npc"], makeDefault: true, label: "7th Sea NPC Sheet",
  });
  DocumentSheetConfig.registerSheet(Item, "seventh-sea-3e", AdvantageSheet, {
    types: ["advantage"], makeDefault: true, label: "7th Sea Advantage Sheet",
  });

  registerHandlebarsHelpers();
  registerVillainySetting();

  console.log("7thSea3e | init complete");
});

Hooks.once("ready", () => {
  game.seventhSea = { SeventhSeaDice, getVP, setVP, adjustVP };
  initVillainHUD();
  console.log("7thSea3e | ready fired");
});
