/**
 * 7th Sea 3e — Extended Action Tracker
 *
 * A shared, world-level list of progress trackers for Extended Actions /
 * montages. More than one can be tracked at the same time (e.g. "Escape the
 * Sinking Ship" and "Keep the Crowd from Panicking" running concurrently).
 * - GM adds a tracker with a Goal (a target number of Hits) and a label.
 * - Any Hero's skill roll (not Attack/Defence) can opt to contribute its
 *   extra Hits (Hits beyond the roll's Difficulty) toward one of the
 *   active Goals.
 * - Visible to everyone at the table so players can track progress.
 */

const SETTING_KEY = "extendedActions";

export function registerExtendedActionSetting() {
  game.settings.register("seventh-sea-3e", SETTING_KEY, {
    name:    "Extended Action Trackers",
    hint:    "Shared progress toward each active Extended Action's Goal.",
    scope:   "world",
    config:  false,
    type:    Array,
    default: [],
  });
}

/** All current Extended Action trackers. */
export function getExtendedActions() {
  return game.settings.get("seventh-sea-3e", SETTING_KEY) ?? [];
}

/** A single tracker by id, or null if it doesn't exist (e.g. already cleared). */
export function getExtendedAction(id) {
  return getExtendedActions().find(a => a.id === id) ?? null;
}

async function _saveExtendedActions(list) {
  await game.settings.set("seventh-sea-3e", SETTING_KEY, list);
  ExtendedActionHUD.rerender();
  return list;
}

function _clampEntry(entry) {
  const target  = Math.max(0, Math.floor(entry.target ?? 0));
  const current = target > 0
    ? Math.clamp(Math.floor(entry.current ?? 0), 0, target)
    : Math.max(0, Math.floor(entry.current ?? 0));
  return { ...entry, target, current };
}

/** GM starts a new, independent Extended Action tracker. Returns the created entry. */
export async function addExtendedAction(label, target) {
  const list  = getExtendedActions();
  const entry = _clampEntry({
    id:     foundry.utils.randomID(),
    label:  label ?? "",
    target: target ?? 0,
    current: 0,
  });
  await _saveExtendedActions([...list, entry]);
  return entry;
}

/** Updates a tracker's label/target/current (merged, then re-clamped). */
export async function updateExtendedAction(id, data) {
  const list = getExtendedActions();
  const idx  = list.findIndex(a => a.id === id);
  if (idx === -1) return null;
  const merged = _clampEntry(foundry.utils.mergeObject(foundry.utils.deepClone(list[idx]), data));
  const next   = [...list];
  next[idx]    = merged;
  await _saveExtendedActions(next);
  return merged;
}

/** Removes a tracker entirely. */
export async function removeExtendedAction(id) {
  const list = getExtendedActions();
  await _saveExtendedActions(list.filter(a => a.id !== id));
}

/** Adds (or removes, with a negative amount) progress toward a tracker's Goal. */
export async function addExtendedActionProgress(id, amount) {
  const entry = getExtendedAction(id);
  if (!entry) return null;
  return updateExtendedAction(id, { current: (entry.current ?? 0) + amount });
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
    const actions = getExtendedActions().map(a => {
      const target  = a.target ?? 0;
      const current = a.current ?? 0;
      const pct     = target > 0 ? Math.clamp(Math.round((current / target) * 100), 0, 100) : 0;
      return { ...a, pct, complete: target > 0 && current >= target };
    });
    return { actions, isGM: game.user.isGM };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='ea-new']").click(async () => {
      const result = await _promptGoalDialog();
      if (result) await addExtendedAction(result.label, result.target);
    });

    html.find("[data-action='ea-edit']").click(async ev => {
      const id    = ev.currentTarget.closest("[data-id]")?.dataset.id;
      const entry = getExtendedAction(id);
      if (!entry) return;
      const result = await _promptGoalDialog(entry.label, entry.target);
      if (result) await updateExtendedAction(id, { label: result.label, target: result.target });
    });

    html.find("[data-action='ea-increase']").click(ev => {
      const id = ev.currentTarget.closest("[data-id]")?.dataset.id;
      if (id) addExtendedActionProgress(id, 1);
    });
    html.find("[data-action='ea-decrease']").click(ev => {
      const id = ev.currentTarget.closest("[data-id]")?.dataset.id;
      if (id) addExtendedActionProgress(id, -1);
    });
    html.find("[data-action='ea-clear']").click(async ev => {
      const id = ev.currentTarget.closest("[data-id]")?.dataset.id;
      if (!id) return;
      const confirmed = await Dialog.confirm({
        title:   "Clear Extended Action",
        content: "<p>Clear this Extended Action tracker?</p>",
      });
      if (confirmed) await removeExtendedAction(id);
    });
  }
  
  // Re-render all active instances
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