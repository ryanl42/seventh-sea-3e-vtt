/**
 * 7th Sea 3e — Dice So Nice integration
 *
 * The system resolves rolls itself (custom hit-counting, exploding pools,
 * Dramatic Wound dice, etc.) rather than letting Foundry's default chat
 * card render a Roll, so Dice So Nice never sees these rolls unless we
 * explicitly hand them off. `SeventhSeaDice._rollPool()` does that; this
 * file only registers a couple of themed colorsets so the 3D dice can
 * match the sheet's color theme (see registerColorThemeSetting in
 * seventh-sea.mjs) and a distinct look for Dramatic Wound dice.
 *
 * Entirely optional: if Dice So Nice isn't installed/active, this hook
 * simply never fires and the system behaves exactly as before.
 */

export function registerDiceSoNice() {
  Hooks.once("diceSoNiceReady", dice3d => {
    dice3d.addColorset({
      name:        "seventhSea",
      description: "7th Sea 3e",
      category:    "7th Sea 3e",
      foreground:  "#f4e4c1",
      background:  "#1c3a5e",
      outline:     "#c9a227",
      edge:        "#c9a227",
      texture:     "ice",
      material:    "metal",
    }, "default");

    dice3d.addColorset({
      name:        "seventhSeaClassic",
      description: "7th Sea — 1st Edition",
      category:    "7th Sea 3e",
      foreground:  "#f4e4c1",
      background:  "#4a1220",
      outline:     "#c9a227",
      edge:        "#c9a227",
      texture:     "leather",
      material:    "wood",
    });

    dice3d.addColorset({
      name:        "seventhSeaWound",
      description: "7th Sea — Dramatic Wound",
      category:    "7th Sea 3e",
      foreground:  "#f4e4c1",
      background:  "#6e0f1a",
      outline:     "#1a0000",
      edge:        "#1a0000",
      texture:     "fire",
      material:    "glass",
    });

    // Default new players/worlds to the theme-matching colorset instead of
    // Dice So Nice's own default, without overriding anyone who has already
    // picked a preference in DSN's own settings.
    try {
      const current = game.settings.get("dice-so-nice", "colorset");
      if (!current || current === "custom") {
        const theme = game.settings.get("seventh-sea-3e", "colorTheme");
        dice3d.updateConfig({ colorset: theme === "classic" ? "seventhSeaClassic" : "seventhSea" });
      }
    } catch (err) {
      console.warn("7thSea3e | Could not read Dice So Nice's colorset setting", err);
    }
  });
}