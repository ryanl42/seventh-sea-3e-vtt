/**
 * 7th Sea 3e — Hero Sheet (Step 19c)
 * - Textarea biography/notes (reliable, ProseMirror deferred)
 * - Direct event listeners for sorcery action buttons
 * - Expandable advantages
 */

import { SeventhSeaDice } from "../dice/dice.mjs";
import { getTradition }   from "../sorcery/traditions.mjs";
import { postVillainPointDamagePrompt } from "../combat/vp-chat.mjs";

const { ActorSheetV2 }               = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class HeroSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  _activeTab          = "skills";
  _expandedAdvantages = new Set();

  static DEFAULT_OPTIONS = {
    classes:  ["seventh-sea", "actor-sheet", "hero"],
    position: { width: 640, height: 640 },
    window:   { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
    actions: {
      switchTab:        HeroSheet._onSwitchTab,
      rollSkill:        HeroSheet._onRollSkill,
      rollAttack:       HeroSheet._onRollAttack,
      rollDefence:      HeroSheet._onRollDefence,
      toggleMinorWound: HeroSheet._onToggleMinorWound,
      // Advantages
      createAdvantage:  HeroSheet._onCreateAdvantage,
      editAdvantage:    HeroSheet._onEditAdvantage,
      deleteAdvantage:  HeroSheet._onDeleteAdvantage,
      toggleAdvantage:  HeroSheet._onToggleAdvantage,
      adjustHeroPoints: HeroSheet._onAdjustHeroPoints,
      createSorcery:    HeroSheet._onCreateSorcery,
      editSorcery:      HeroSheet._onEditSorcery,
      deleteSorcery:    HeroSheet._onDeleteSorcery,
      adjustResource:   HeroSheet._onAdjustResource,
    },
  };

  static PARTS = {
    header:     { template: "systems/seventh-sea-3e/templates/actor/hero-header.hbs" },
    traits:     { template: "systems/seventh-sea-3e/templates/actor/hero-traits.hbs" },
    tabs:       { template: "systems/seventh-sea-3e/templates/actor/hero-tabs.hbs" },
    skills:     { template: "systems/seventh-sea-3e/templates/actor/hero-skills.hbs" },
    combat:     { template: "systems/seventh-sea-3e/templates/actor/hero-combat.hbs" },
    sorcery:    { template: "systems/seventh-sea-3e/templates/actor/hero-sorcery.hbs" },
    advantages: { template: "systems/seventh-sea-3e/templates/actor/hero-advantages.hbs" },
    biography:  { template: "systems/seventh-sea-3e/templates/actor/hero-biography.hbs" },
  };

  get title() { return this.document.name; }

  async _prepareContext(options) {
    const sorceryItems = this.document.items
      .filter(i => i.type === "sorcery")
      .map(item => {
        const tradition = getTradition(item.system.tradition);
        return {
          id:             item.id,
          traditionLabel: tradition?.label ?? item.system.tradition,
          resourceLabel:  tradition?.resourceLabel ?? "Resource",
          resourceValue:  item.system.resource.value,
          actions: tradition
            ? Object.entries(tradition.actions).map(([key, a]) => ({
                key,
                label:  a.label,
                hint:   a.hint,
                itemId: item.id,   // carried into each action so template can access it
              }))
            : [],
        };
      });

    return {
      actor:        this.document,
      system:       this.document.system,
      isEditable:   this.isEditable,
      advantages:   this.document.items.filter(i => i.type === "advantage"),
      sorceryItems,
      activeTab:    this._activeTab,
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._applyTab();
    this._applyExpandedAdvantages();
    this._bindSorceryButtons();
  }

  _applyTab() {
    const el = this.element;
    if (!el) return;
    el.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");
    const active = el.querySelector(`.tab-panel[data-tab="${this._activeTab}"]`);
    if (active) active.style.display = "";
    el.querySelectorAll(".sheet-tab-btn").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.tab === this._activeTab)
    );
  }

  _applyExpandedAdvantages() {
    const el = this.element;
    if (!el) return;
    el.querySelectorAll(".advantage-item").forEach(item => {
      const id      = item.dataset.advId;
      const body    = item.querySelector(".adv-body");
      const icon    = item.querySelector(".adv-expand-icon");
      if (!body || !icon) return;
      const expanded        = this._expandedAdvantages.has(id);
      body.style.display    = expanded ? "" : "none";
      icon.textContent      = expanded ? "▼" : "▶";
      icon.classList.toggle("expanded", expanded);
    });
  }

  // Bind sorcery action buttons directly — bypasses ApplicationV2 action delegation
  _bindSorceryButtons() {
    const el = this.element;
    if (!el) return;

    el.querySelectorAll(".js-sorte-action").forEach(btn => {
      // Clone to remove any stale listeners from previous renders
      const fresh = btn.cloneNode(true);
      btn.replaceWith(fresh);

      fresh.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const itemId     = fresh.dataset.itemId;
        const sorteAction = fresh.dataset.sorteAction;
        const item       = this.document.items.get(itemId);
        if (!item) { console.warn("7thSea3e | Sorcery item not found:", itemId); return; }

        const tradition = getTradition(item.system.tradition);
        const action    = tradition?.actions?.[sorteAction];
        if (!action?.fn) { console.warn("7thSea3e | No fn for action:", sorteAction); return; }

        await action.fn(this.document, item);
      });
    });
  }

  // ── Tab ────────────────────────────────────────────────────────────────────

  static _onSwitchTab(event, target) {
    this._activeTab = target.dataset.tab;
    this._applyTab();
  }

  // ── Advantage toggle ───────────────────────────────────────────────────────

  static _onToggleAdvantage(event, target) {
    if (event.target.closest(".adv-controls")) return;
    const id = target.dataset.advId;
    if (this._expandedAdvantages.has(id)) {
      this._expandedAdvantages.delete(id);
    } else {
      this._expandedAdvantages.add(id);
    }
    this._applyExpandedAdvantages();
  }

  // ── Skill roll ─────────────────────────────────────────────────────────────

  static async _onRollSkill(event, target) {
    const skillKey = target.dataset.skill;
    const system   = this.document.system;
    const skill    = system.skills[skillKey];
    if (!skill) return;

    await SeventhSeaDice.roll({
      actor:        this.document,
      label:        target.dataset.label,
      skillKey,
      skillRank:    skill.value,
      specialty:    skill.specialty,
      difficulty:   2,
      defaultTrait: target.dataset.trait,
    });
  }

  // ── Attack / Defence ───────────────────────────────────────────────────────

  static async _onRollAttack() {
    const apt    = this.document.system.combatAptitudes.attack;
    const target = _getFirstTarget();
    const diff   = _aptitudeValue(target, "defence") ?? 2;
    const diffLabel = target
      ? ` vs ${target.name} (Defence ${diff})`
      : "";

    const result = await SeventhSeaDice.rollCombat({
      actor:         this.document,
      label:         "Attack" + diffLabel,
      aptitudeTrait: apt.trait || null,
      difficulty:    diff,
      skillChoices:  ["melee", "aim", "athletics"],
    });

    if (result?.success && target?.type === "npc") {
      await this._applyAttackDamage(target);
    }
  }

  static async _onRollDefence() {
    const apt    = this.document.system.combatAptitudes.defence;
    const target = _getFirstTarget();
    const diff   = _aptitudeValue(target, "attack") ?? 2;
    const diffLabel = target
      ? ` vs ${target.name} (Attack ${diff})`
      : "";

    const result = await SeventhSeaDice.rollCombat({
      actor:         this.document,
      label:         "Defence" + diffLabel,
      aptitudeTrait: apt.trait || null,
      difficulty:    diff,
      skillChoices:  ["melee", "athletics", "aim"],
    });

    if (result && !result.success) {
      const missedHits = Math.max(0, result.finalDifficulty - result.hits);
      if (missedHits > 0) await this._applyMissedHitsAsWounds(missedHits);
      await postVillainPointDamagePrompt(this.document);
    }
  }

  // ── Apply damage from a successful Attack ──────────────────────────────────
  // Wounds dealt = the Hero's Damage aptitude value, plus any Hero Points the
  // player chooses to spend (1 HP = +1 wound).
  async _applyAttackDamage(npcActor) {
    const system  = this.document.system;
    const baseDmg = system.combatAptitudes.damage.value ?? 0;

    if (!system.combatAptitudes.damage.trait) {
      ui.notifications.warn("Damage has no Trait assigned — treating base damage as 0.");
    }

    const heroPoints = system.heroPoints;
    let hpSpent = 0;

    if (heroPoints > 0) {
      hpSpent = await new Promise(resolve => {
        new Dialog({
          title:   "Spend Hero Points for Damage",
          content: `
            <div class="ss-roll-dialog">
              <p>Hit landed on <strong>${npcActor.name}</strong>. Base damage: <strong>${baseDmg}</strong>.</p>
              <div class="dialog-field">
                <label>Spend Hero Points <em>(${heroPoints} available)</em></label>
                <input id="ss-hp-damage" type="number" value="0" min="0" max="${heroPoints}" />
                <p class="dialog-hint">Each Hero Point spent adds +1 wound.</p>
              </div>
            </div>`,
          buttons: {
            confirm: {
              label: "Apply Damage",
              callback: html => resolve(Math.min(parseInt(html.find("#ss-hp-damage").val()) || 0, heroPoints)),
            },
          },
          default: "confirm",
          close: () => resolve(0),
        }).render(true);
      });
    }

    if (hpSpent > 0) {
      await this.document.update({ "system.heroPoints": heroPoints - hpSpent });
    }

    const totalDamage = baseDmg + hpSpent;
    if (totalDamage <= 0) return;

    const dramaticLimit = npcActor.system.dramaticWoundLimit ?? 4;
    const { dramaticGained } = await npcActor.applyWounds(totalDamage, { dramaticLimit });

    if (dramaticGained > 0) {
      ui.notifications.info(`${npcActor.name} suffers ${dramaticGained} Dramatic Wound${dramaticGained > 1 ? "s" : ""}!`);
    }
  }

  // ── Sorcery ────────────────────────────────────────────────────────────────

  static async _onCreateSorcery() {
    await Item.create(
      { name: "Sorte Strega", type: "sorcery",
        system: { tradition: "sorte", resource: { label: "Backlash", value: 0 } } },
      { parent: this.document }
    );
  }

  static async _onEditSorcery(event, target) {
    this.document.items.get(target.dataset.itemId)?.sheet?.render(true);
  }

  static async _onDeleteSorcery(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Tradition",
      content: `<p>Remove <strong>${item.name}</strong>?</p>`,
    });
    if (confirmed) await item.delete();
  }

  // ── Apply wounds from a failed Defence roll ────────────────────────────────
  async _applyMissedHitsAsWounds(missedHits) {
    const { dramaticGained } = await this.document.applyWounds(missedHits, { dramaticLimit: 4 });

    if (dramaticGained > 0) {
      ui.notifications.info(`${this.document.name} suffers ${dramaticGained} Dramatic Wound${dramaticGained > 1 ? "s" : ""}!`);
    }
  }

  // ── Minor Wound dot track ───────────────────────────────────────────────────

  static async _onToggleMinorWound(event, target) {
    const index   = Number(target.dataset.index);
    const current = this.document.system.wounds.minor;
    const next    = current === index + 1 ? index : index + 1;
    await this.document.update({ "system.wounds.minor": next });
  }

  static async _onAdjustResource(event, target) {
    const item      = this.document.items.get(target.dataset.itemId);
    const delta     = Number(target.dataset.delta) || 0;
    if (!item) return;
    const current   = item.system.resource.value;
    const next      = Math.max(0, current + delta);
    const tradition = getTradition(item.system.tradition);

    if (delta < 0 && current > 0 && tradition?.resourceLabel === "Backlash") {
      const confirmed = await Dialog.confirm({
        title:   "Clear Backlash",
        content: "<p>Clear 1 Backlash by taking <strong>1 Wound</strong>?</p>",
      });
      if (!confirmed) return;
      const minor = this.document.system.wounds.minor;
      await Promise.all([
        item.update({ "system.resource.value": next }),
        this.document.update({ "system.wounds.minor": minor + 1 }),
      ]);
      return;
    }
    await item.update({ "system.resource.value": next });
  }

  // ── Advantages ─────────────────────────────────────────────────────────────

  static async _onCreateAdvantage() {
    await Item.create({ name: "New Advantage", type: "advantage" }, { parent: this.document });
  }

  static async _onEditAdvantage(event, target) {
    this.document.items.get(target.dataset.itemId)?.sheet?.render(true);
  }

  static async _onDeleteAdvantage(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (item) await item.delete();
  }

  // ── Hero Points ────────────────────────────────────────────────────────────

  static async _onAdjustHeroPoints(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.heroPoints;
    await this.document.update({ "system.heroPoints": Math.max(0, current + delta) });
  }
}

// ── Module-level helper ────────────────────────────────────────────────────────
/**
 * Returns the Actor of the first targeted token, or null if nothing is targeted.
 * Used to auto-populate Difficulty from the target's opposing aptitude.
 */
function _getFirstTarget() {
  const target = game.user.targets.first();
  return target?.actor ?? null;
}

/**
 * Reads a combat aptitude value from either a Hero actor (object with .value)
 * or an NPC actor (flat number), returning a clean integer.
 */
function _aptitudeValue(actor, aptitudeKey) {
  if (!actor) return null;
  const apt = actor.system?.combatAptitudes?.[aptitudeKey];
  if (apt === undefined || apt === null) return null;
  // Hero: { trait: "finesse", value: 3 } — NPC: flat number
  if (typeof apt === "object") return apt.value ?? null;
  if (typeof apt === "number") return apt;
  return null;
}
