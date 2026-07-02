/**
 * 7th Sea 3e — Hero Sheet (Step 17 - Tabs)
 */

import { SeventhSeaDice } from "../dice/dice.mjs";
import { sorteRead, sorteWeaveMinor, sorteWeaveMajor, sorteReference } from "../sorcery/sorte.mjs";

const { ActorSheetV2 }               = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class HeroSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  // Track active tab — default to skills
  _activeTab = "skills";

  static DEFAULT_OPTIONS = {
    classes:  ["seventh-sea", "actor-sheet", "hero"],
    position: { width: 640, height: 640 },
    window:   { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
    actions: {
      // Tab switching
      switchTab:        HeroSheet._onSwitchTab,
      // Rolls
      rollSkill:        HeroSheet._onRollSkill,
      rollAttack:       HeroSheet._onRollAttack,
      rollDefence:      HeroSheet._onRollDefence,
      // Advantages
      createAdvantage:  HeroSheet._onCreateAdvantage,
      editAdvantage:    HeroSheet._onEditAdvantage,
      deleteAdvantage:  HeroSheet._onDeleteAdvantage,
      // Hero Points
      adjustHeroPoints: HeroSheet._onAdjustHeroPoints,
      // Sorcery
      adjustBacklash:   HeroSheet._onAdjustBacklash,
      sorteRead:        HeroSheet._onSorteRead,
      sorteWeaveMinor:  HeroSheet._onSorteWeaveMinor,
      sorteWeaveMajor:  HeroSheet._onSorteWeaveMajor,
      sorteReference:   HeroSheet._onSorteReference,
    },
  };

  static PARTS = {
    header:  { template: "systems/seventh-sea-3e/templates/actor/hero-header.hbs" },
    traits:  { template: "systems/seventh-sea-3e/templates/actor/hero-traits.hbs" },
    tabs:    { template: "systems/seventh-sea-3e/templates/actor/hero-tabs.hbs" },
    skills:  { template: "systems/seventh-sea-3e/templates/actor/hero-skills.hbs" },
    combat:  { template: "systems/seventh-sea-3e/templates/actor/hero-combat.hbs" },
    sorcery: { template: "systems/seventh-sea-3e/templates/actor/hero-sorcery.hbs" },
    advantages: { template: "systems/seventh-sea-3e/templates/actor/hero-advantages.hbs" },
    biography:  { template: "systems/seventh-sea-3e/templates/actor/hero-biography.hbs" },
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    return {
      actor:      this.document,
      system:     this.document.system,
      isEditable: this.isEditable,
      advantages: this.document.items.filter(i => i.type === "advantage"),
      activeTab:  this._activeTab,
    };
  }

  // Hide all tab panels then show the active one
  _onRender(context, options) {
    super._onRender?.(context, options);
    this._applyTab();
  }

  _applyTab() {
    const element = this.element;
    if (!element) return;

    // Hide all tab panels
    element.querySelectorAll(".tab-panel").forEach(el => {
      el.style.display = "none";
    });

    // Show active
    const active = element.querySelector(`.tab-panel[data-tab="${this._activeTab}"]`);
    if (active) active.style.display = "";

    // Mark active tab button
    element.querySelectorAll(".sheet-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === this._activeTab);
    });
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

  static _onSwitchTab(event, target) {
    this._activeTab = target.dataset.tab;
    this._applyTab();
  }

  // ── Skill roll ─────────────────────────────────────────────────────────────

  static async _onRollSkill(event, target) {
    const skillKey = target.dataset.skill;
    const traitKey = target.dataset.trait;
    const system   = this.document.system;
    const skill    = system.skills[skillKey];
    const traitVal = system.traits[traitKey]?.value ?? 0;
    if (!skill) return;

    const backlash = system.sorcery?.backlash ?? 0;
    const pool     = Math.max(1, traitVal + skill.value - backlash);

    await SeventhSeaDice.roll({
      actor:     this.document,
      label:     `${target.dataset.label} (${traitKey} + ${skillKey})${backlash > 0 ? ` [−${backlash} Backlash]` : ""}`,
      poolSize:  pool,
      skillRank: skill.value,
      specialty: skill.specialty,
      difficulty: 2,
    });
  }

  // ── Attack roll ────────────────────────────────────────────────────────────

  static async _onRollAttack(event, target) {
    const system   = this.document.system;
    const apt      = system.combatAptitudes.attack;
    const traitVal = apt.trait ? (system.traits[apt.trait]?.value ?? 0) : 0;
    const skillVal = Math.max(system.skills.melee?.value ?? 0, system.skills.aim?.value ?? 0);
    const backlash = system.sorcery?.backlash ?? 0;

    if (!apt.trait) {
      ui.notifications.warn("Assign a Trait to Attack before rolling.");
      return;
    }

    await SeventhSeaDice.roll({
      actor:     this.document,
      label:     `Attack (${apt.trait} + combat skill)${backlash > 0 ? ` [−${backlash} Backlash]` : ""}`,
      poolSize:  Math.max(1, traitVal + skillVal - backlash),
      skillRank: skillVal,
      specialty: false,
      difficulty: 2,
    });
  }

  // ── Defence roll ───────────────────────────────────────────────────────────

  static async _onRollDefence(event, target) {
    const system   = this.document.system;
    const apt      = system.combatAptitudes.defence;
    const traitVal = apt.trait ? (system.traits[apt.trait]?.value ?? 0) : 0;
    const skillVal = Math.max(system.skills.melee?.value ?? 0, system.skills.athletics?.value ?? 0);
    const backlash = system.sorcery?.backlash ?? 0;

    if (!apt.trait) {
      ui.notifications.warn("Assign a Trait to Defence before rolling.");
      return;
    }

    await SeventhSeaDice.roll({
      actor:     this.document,
      label:     `Defence (${apt.trait} + combat skill)${backlash > 0 ? ` [−${backlash} Backlash]` : ""}`,
      poolSize:  Math.max(1, traitVal + skillVal - backlash),
      skillRank: skillVal,
      specialty: false,
      difficulty: 2,
    });
  }

  // ── Sorcery ────────────────────────────────────────────────────────────────

  static async _onAdjustBacklash(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.sorcery.backlash;
    const next    = Math.max(0, current + delta);

    if (delta < 0 && current > 0) {
      const confirmed = await Dialog.confirm({
        title:   "Clear Backlash",
        content: "<p>Clear 1 Backlash by taking <strong>1 Wound</strong>?</p>",
      });
      if (!confirmed) return;
      const minor = this.document.system.wounds.minor;
      await this.document.update({
        "system.sorcery.backlash": next,
        "system.wounds.minor":     minor + 1,
      });
      return;
    }

    await this.document.update({ "system.sorcery.backlash": next });
  }

  static async _onSorteRead()       { await sorteRead(this.document); }
  static async _onSorteWeaveMinor() { await sorteWeaveMinor(this.document); }
  static async _onSorteWeaveMajor() { await sorteWeaveMajor(this.document); }
  static async _onSorteReference()  { await sorteReference(this.document); }

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
