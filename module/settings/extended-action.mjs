/**
 * 7th Sea 3e — Extended Action Tracker
 *
 * A shared, world-level progress tracker for Extended Actions / montages.
 * - GM sets a Goal (a target number of Hits) and an optional label.
 * - Any Hero's skill roll (not Attack/Defence) can opt to contribute its
 *   extra Hits (Hits beyond the roll's Difficulty) toward the Goal.
 * - Visible to everyone at the table so players can track progress.
 */

const SETTING_KEY = "extendedAction";

const DEFAULT_STATE = { active: false, label: "", target: 0, current: 0 };

export function registerExtendedActionSetting() {
  game.settings.register("seventh-sea-3e", SETTING_KEY, {
    name:    "Extended Action Tracker",
    hint:    "Shared progress toward the current Extended Action's Goal.",
    scope:   "world",
    config:  false,
    type:    Object,
    default: DEFAULT_STATE,
  });
}

export function getExtendedAction() {
  return game.settings.get("seventh-sea-3e", SETTING_KEY) ?? DEFAULT_STATE;
}

export async function setExtendedAction(data) {
  const current = getExtendedAction();
  const next    = foundry.utils.mergeObject(foundry.utils.deepClone(current), data);
  next.target   = Math.max(0, Math.floor(next.target ?? 0));
  next.current  = next.target > 0
    ? Math.clamp(Math.floor(next.current ?? 0), 0, next.target)
    : Math.max(0, Math.floor(next.current ?? 0));
  await game.settings.set("seventh-sea-3e", SETTING_KEY, next);
  ExtendedActionHUD.rerender();
  return next;
}

/** GM starts a new Extended Action with a fresh Goal. */
export async function startExtendedAction(label, target) {
  return setExtendedAction({ active: true, label: label ?? "", target: target ?? 0, current: 0 });
}

/** GM ends/clears the current Extended Action (keeps last values visible until a new one starts). */
export async function stopExtendedAction() {
  return setExtendedAction({ active: false });
}

/** Adds (or removes, with a negative amount) progress toward the Goal. Clamped to [0, target]. */
export async function addExtendedActionProgress(amount) {
  const state = getExtendedAction();
  const target = state.target ?? 0;
  const next   = Math.clamp((state.current ?? 0) + amount, 0, target > 0 ? target : Number.MAX_SAFE_INTEGER);
  return setExtendedAction({ current: next });
}

// ── Extended Action HUD ─────────────────────────────────────────────────────

export class ExtendedActionHUD extends Application {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "seventh-sea-extended-action-hud",
      template:  "systems/seventh-sea-3e/templates/hud/extended-action-hud.hbs",
      popOut:    false,
      resizable: false,
    });
  }

  getData() {
    const state    = getExtendedAction();
    const target   = state.target ?? 0;
    const current  = state.current ?? 0;
    const pct      = target > 0 ? Math.clamp(Math.round((current / target) * 100), 0, 100) : 0;
    return {
      ...state,
      pct,
      complete: target > 0 && current >= target,
      isGM:     game.user.isGM,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='ea-new']").click(async () => {
      const result = await _promptGoalDialog();
      if (result) await startExtendedAction(result.label, result.target);
    });

    html.find("[data-action='ea-edit']").click(async () => {
      const state  = getExtendedAction();
      const result = await _promptGoalDialog(state.label, state.target);
      if (result) await setExtendedAction({ label: result.label, target: result.target });
    });

    html.find("[data-action='ea-increase']").click(() => addExtendedActionProgress(1));
    html.find("[data-action='ea-decrease']").click(() => addExtendedActionProgress(-1));
    html.find("[data-action='ea-clear']").click(async () => {
      const confirmed = await Dialog.confirm({
        title:   "Clear Extended Action",
        content: "<p>Clear the current Extended Action tracker?</p>",
      });
      if (confirmed) await stopExtendedAction();
    });
  }

  static rerender() {
    Object.values(ui.windows)
      .filter(w => w.id === "seventh-sea-extended-action-hud")
      .forEach(w => w.render());
    if (window._7sExtendedActionHUD) window._7sExtendedActionHUD.render(true);
  }
}

function _promptGoalDialog(defaultLabel = "", defaultTarget = 10) {
  return new Promise(resolve => {
    new Dialog({
      title:   "Set Extended Action Goal",
      content: `
        <div class="ss-roll-dialog">
          <div class="dialog-field">
            <label>Label</label>
            <input id="ea-label" type="text" value="${defaultLabel ?? ""}" placeholder="e.g. Escape the Sinking Ship" />
          </div>
          <div class="dialog-field">
            <label>Goal (Hits needed)</label>
            <input id="ea-target" type="number" value="${defaultTarget ?? 10}" min="1" />
          </div>
        </div>`,
      buttons: {
        confirm: {
          label:    "Set Goal",
          callback: html => resolve({
            label:  html.find("#ea-label").val()?.trim() ?? "",
            target: parseInt(html.find("#ea-target").val()) || 1,
          }),
        },
        cancel: { label: "Cancel", callback: () => resolve(null) },
      },
      default: "confirm",
    }).render(true);
  });
}

// ── Mount the HUD for every client ──────────────────────────────────────────

export function initExtendedActionHUD() {
  const container = document.createElement("div");
  container.id = "ss-extended-action-hud-mount";
  document.getElementById("ui-bottom")?.appendChild(container);

  const hud = new ExtendedActionHUD();
  window._7sExtendedActionHUD = hud;
  hud.render(true);
}