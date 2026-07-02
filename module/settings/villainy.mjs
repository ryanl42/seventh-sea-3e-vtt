/**
 * 7th Sea 3e — Villainy Points (Step 15)
 *
 * Villainy Points are a session-level GM resource stored as a world setting.
 * - GM starts with VP equal to number of players at the table.
 * - GM gains VP whenever a Hero Forces Fate.
 * - GM spends VP to add complications, obstacles, reinforcements, etc.
 * - All unspent VP are lost at end of session.
 *
 * A small floating HUD is rendered for the GM only.
 */

export function registerVillainySetting() {
  game.settings.register("seventh-sea-3e", "villainPoints", {
    name:    "Villainy Points",
    hint:    "Current GM Villainy Point pool. Resets each session.",
    scope:   "world",       // stored server-side, shared for all clients
    config:  false,         // don't show in the normal settings menu
    type:    Number,
    default: 0,
  });
}

export function getVP() {
  return game.settings.get("seventh-sea-3e", "villainPoints");
}

export async function setVP(value) {
  const clamped = Math.max(0, Math.floor(value));
  await game.settings.set("seventh-sea-3e", "villainPoints", clamped);
  VillainHUD.rerender();
}

export async function adjustVP(delta) {
  await setVP(getVP() + delta);
}

// ── Villainy HUD ──────────────────────────────────────────────────────────────

export class VillainHUD extends Application {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:          "seventh-sea-villain-hud",
      template:    "systems/seventh-sea-3e/templates/hud/villain-hud.hbs",
      popOut:      false,
      resizable:   false,
    });
  }

  getData() {
    return {
      vp:    getVP(),
      isGM:  game.user.isGM,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='vp-increase']").click(() => adjustVP(1));
    html.find("[data-action='vp-decrease']").click(() => adjustVP(-1));
    html.find("[data-action='vp-reset']").click(async () => {
      const players = game.users.filter(u => u.active && !u.isGM).length;
      await setVP(players);
    });
  }

  // Re-render all active instances
  static rerender() {
    Object.values(ui.windows)
      .filter(w => w.id === "seventh-sea-villain-hud")
      .forEach(w => w.render());
    // Also re-render if mounted in #ui-bottom
    const hud = document.getElementById("seventh-sea-villain-hud");
    if (hud) window._7sVillainHUD?.render(true);
  }
}

// ── Mount the HUD for GM only ──────────────────────────────────────────────────

export function initVillainHUD() {
  if (!game.user.isGM) return;

  // Create a container in the UI layer
  const container = document.createElement("div");
  container.id = "ss-villain-hud-mount";
  document.getElementById("ui-bottom")?.appendChild(container);

  const hud = new VillainHUD();
  window._7sVillainHUD = hud;
  hud.render(true);
}
