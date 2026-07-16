/**
 * 7th Sea 3e — Hero Sheet (Step 19c)
 * - Textarea biography/notes (reliable, ProseMirror deferred)
 * - Direct event listeners for sorcery action buttons
 * - Expandable advantages
 */

import { SeventhSeaDice } from "../dice/dice.mjs";
import { getTradition, getArcanaDef, createArcanaItemsForTradition } from "../sorcery/traditions.mjs";
import { postVillainPointDamagePrompt } from "../combat/vp-chat.mjs";
import { computeWoundTrack } from "../combat/wound-track.mjs";
import { aptitudeValue, firstTargetActor } from "../actor/aptitude-utils.mjs";
import { activateAdvantage, grantHelpingHand, clearOath } from "../advantages/advantage-engine.mjs";
import { getAdvantageDef } from "../advantages/advantage-defs.mjs";

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
      rollManoeuvre:    HeroSheet._onRollManoeuvre,
      rollFirstAid:     HeroSheet._onRollFirstAid,
      // toggleMinorWound: HeroSheet._onToggleMinorWound,
      toggleWoundTrack: HeroSheet._onToggleWoundTrack,
      // Advantages
      createAdvantage:  HeroSheet._onCreateAdvantage,
      editAdvantage:    HeroSheet._onEditAdvantage,
      deleteAdvantage:  HeroSheet._onDeleteAdvantage,
      toggleAdvantage:  HeroSheet._onToggleAdvantage,
      activateAdvantage:HeroSheet._onActivateAdvantage,
      clearOathAdvantage: HeroSheet._onClearOathAdvantage,
      helpAlly:         HeroSheet._onHelpAlly,
      resetAdvantageUses: HeroSheet._onResetAdvantageUses,
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

        const arcanaEntries = this.document.items
          .filter(i => i.type === "arcana" && i.system.parentSorceryId === item.id)
          .map(a => {
            const def = getArcanaDef(a.system.tradition, a.system.key);
            return {
              id:        a.id,
              name:      def?.name ?? a.name,
              minorDesc: def?.minor ?? "",
              majorDesc: def?.major ?? "",
            };
          });

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
          arcanaEntries,
        };
      });

    return {
      actor:        this.document,
      system:       this.document.system,
      isEditable:   this.isEditable,
      advantages:   this.document.items.filter(i => i.type === "advantage").map(item => {
        const def = getAdvantageDef(item.system.key);
        const rollBonus = item.system.scope && item.system.scope !== "none";
        return {
          item, id: item.id, name: item.name, system: item.system,
          automationLabel: def?.label ?? null,
          hasActivate: !!def && !["specialtyGrant", "assistOverride", "none", "forceFateFree"].includes(def.mechanic),
          isOath: item.system.key === "oath",
          rollBonusOnly: rollBonus && !def,
        };
      }),
      sorceryItems,
      activeTab:    this._activeTab,
      isGM:         game.user.isGM,
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._applyTab();
    this._applyExpandedAdvantages();
    this._bindSorceryButtons();
    this._bindArcanaButtons();
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

  // Bind each Arcana entry's own Minor/Major Weave buttons.
  _bindArcanaButtons() {
    const el = this.element;
    if (!el) return;

    el.querySelectorAll(".js-arcana-action").forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.replaceWith(fresh);

      fresh.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const itemId = fresh.dataset.itemId;
        const tier   = fresh.dataset.arcanaTier; // "minor" | "major"
        const item   = this.document.items.get(itemId);
        if (!item) { console.warn("7thSea3e | Arcana item not found:", itemId); return; }

        const tradition = getTradition(item.system.tradition);
        const fn = tier === "minor"
          ? tradition?.arcanaActions?.weaveMinor
          : tradition?.arcanaActions?.weaveMajor;
        if (!fn) { console.warn("7thSea3e | No arcana weave fn for tier:", tier); return; }

        await fn(this.document, item);
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
    const target = firstTargetActor();
    const diff   = aptitudeValue(target, "defence") ?? 2;
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
      await this._applyAttackDamage(target, result);
    }
  }

  static async _onRollDefence() {
    const apt    = this.document.system.combatAptitudes.defence;
    const target = firstTargetActor();
    const diff   = aptitudeValue(target, "attack") ?? 2;
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
      // Prefer the targeted token; if none is targeted, fall back to
      // whichever NPC is currently acting in Combat (the likely attacker),
      // so a forgotten target doesn't silently skip the Wounds.
      const attacker = target?.type === "npc" ? target : _fallbackAttacker();

      if (attacker) {
        const baseDamage = aptitudeValue(attacker, "damage") ?? 0;
        if (baseDamage > 0) {
          await this._applyDefenceDamage(baseDamage, attacker);
        } else {
          ui.notifications.warn(`${attacker.name} has no Damage aptitude set (reads as 0) — no Wounds applied from the aptitude.`);
        }
      } else {
        const msg = "No NPC targeted, and no NPC is the current Combatant — can't determine Damage aptitude. Target the attacking NPC before rolling Defence.";
        ui.notifications.warn(msg);
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.document }),
          whisper: ChatMessage.getWhisperRecipients("GM"),
          content: `<div class="seventh-sea chat-roll"><div class="chat-roll-label">Defence — Damage Not Applied</div><p class="vp-prompt-text">${msg}</p></div>`,
        });
      }

      await postVillainPointDamagePrompt(this.document);
    }
  }

  // ── Manoeuvre (catch-all — any Skill) ───────────────────────────────────────
  static async _onRollManoeuvre() {
    await SeventhSeaDice.rollManoeuvre({ actor: this.document });
  }

  // ── First Aid ────────────────────────────────────────────────────────────
  // Manoeuvre + Science, healing the targeted token's regular Wounds.
  static async _onRollFirstAid() {
    const target = firstTargetActor();
    if (!target) {
      ui.notifications.warn("Target a token to give First Aid to.");
      return;
    }
    await SeventhSeaDice.rollFirstAid({ healer: this.document, target });
  }

  // ── Apply damage from a successful Attack ──────────────────────────────────
  // Wounds dealt = the Hero's Damage aptitude value, plus any Hero Points the
  // player chooses to spend (1 HP = +1 wound).
  async _applyAttackDamage(npcActor, result) {
      if (npcActor.system.npcType === "brute") {
        const hits = result?.hits ?? 0;
        if (hits <= 0) return;
        await npcActor.applyWounds(hits, { dramaticLimit: npcActor.system.dramaticWoundLimit ?? 4 });
        return;
      }

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
    const [sorceryItem] = await this.document.createEmbeddedDocuments("Item", [{
      name: "Sorte Strega", type: "sorcery",
      system: { tradition: "sorte", resource: { label: "Backlash", value: 0 } },
    }]);
    await createArcanaItemsForTradition(this.document, sorceryItem);
  }

  static async _onEditSorcery(event, target) {
    this.document.items.get(target.dataset.itemId)?.sheet?.render(true);
  }

  static async _onDeleteSorcery(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Tradition",
      content: `<p>Remove <strong>${item.name}</strong> and all of its Arcana?</p>`,
    });
    if (!confirmed) return;

    const arcanaIds = this.document.items
      .filter(i => i.type === "arcana" && i.system.parentSorceryId === item.id)
      .map(i => i.id);

    await item.delete();
    if (arcanaIds.length) await this.document.deleteEmbeddedDocuments("Item", arcanaIds);
  }

  // ── Apply wounds from a failed Defence roll ────────────────────────────────
  //async _applyMissedHitsAsWounds(missedHits) {
  //  const { dramaticGained } = await this.document.applyWounds(missedHits, { dramaticLimit: 4 });
  async _applyDefenceDamage(amount, attacker) {
    const { dramaticGained } = await this.document.applyWounds(amount, { dramaticLimit: 4 });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content: `<div class="seventh-sea chat-roll">
        <div class="chat-roll-label">Defence Failed — Wounds Applied</div>
        <div class="chat-roll-summary">
          <strong>${this.document.name}</strong> takes <strong>${amount}</strong> Wound${amount > 1 ? "s" : ""}
          from ${attacker?.name ?? "the attacker"}'s Damage aptitude.
        </div>
      </div>`,
    });

    if (dramaticGained > 0) {
      ui.notifications.info(`${this.document.name} suffers ${dramaticGained} Dramatic Wound${dramaticGained > 1 ? "s" : ""}!`);
    }
  }

  // ── Minor Wound dot track ───────────────────────────────────────────────────

  static async _onToggleWoundTrack(event, target) {
    const flatIndex = Number(target.dataset.index);
    const actor      = this.document;
    const toughness  = actor._toughnessValue();
    const track = computeWoundTrack(toughness, actor.system.wounds.minorPerSegment, actor.system.wounds.dramatic, 4);

    // Highest currently-filled flat index across the whole track, so
    // clicking it again toggles it off instead of extending further.
    let currentTotal = 0;
    for (const seg of track) {
      for (const dot of seg.dots) if (dot.filled) currentTotal = dot.flatIndex + 1;
      if (seg.marked) currentTotal = seg.dramaticFlatIndex + 1;
    }

    const newTotal = flatIndex === currentTotal - 1 ? flatIndex : flatIndex + 1;
    await actor.setWoundLevel(newTotal, { dramaticLimit: 4 });
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
      await item.update({ "system.resource.value": next });
      await this.document.applyWounds(1);
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

  static async _onActivateAdvantage(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    await activateAdvantage(this.document, item);
  }

  static async _onClearOathAdvantage(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    await clearOath(item);
  }

  static async _onHelpAlly() {
    const target = firstTargetActor();
    if (!target) {
      ui.notifications.warn("Target the ally you want to help before using Help Ally.");
      return;
    }
    if (target.id === this.document.id) {
      ui.notifications.warn("You can't help yourself with Helping Hand.");
      return;
    }
    await grantHelpingHand({ helper: this.document, target });
  }

  static async _onResetAdvantageUses() {
    if (!game.user.isGM) return;
    const updates = this.document.items
      .filter(i => i.type === "advantage" && i.system.usesMax > 0)
      .map(i => ({ _id: i.id, "system.usesSpent": 0, "system.used": false }));
    if (updates.length) await this.document.updateEmbeddedDocuments("Item", updates);
    ui.notifications.info(`${this.document.name}: limited-use Advantages refreshed for a new session.`);
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
 * Falls back to whichever NPC is the current Combatant in the active Combat
 * (the likely attacker on a Defence roll) when no token is targeted, so a
 * forgotten target doesn't silently skip applying Wounds.
 */
function _fallbackAttacker() {
  const combatantActor = game.combat?.combatant?.actor;
  return combatantActor?.type === "npc" ? combatantActor : null;
}
