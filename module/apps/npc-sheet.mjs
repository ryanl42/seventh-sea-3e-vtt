/**
 * 7th Sea 3e — NPC Sheet
 * Brutes Squad / Henchman / Villain.
 *
 * Henchmen and Villains are built exactly like Heroes (Traits, Skills,
 * Advantages, Trait-linked Combat Aptitudes) — see npc-data.mjs. Brute
 * Squads keep their simpler rank-based, Trait-less stat block.
 */

import { computeWoundTrack } from "../combat/wound-track.mjs";
import { SeventhSeaDice } from "../dice/dice.mjs";
import { aptitudeValue, firstTargetActor } from "../actor/aptitude-utils.mjs";

const { ActorSheetV2 }               = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class NPCSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  _expandedAdvantages = new Set();

  static DEFAULT_OPTIONS = {
    classes:  ["seventh-sea", "actor-sheet", "npc"],
    position: { width: 560, height: 720 },
    window:   { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
    actions: {
      toggleWoundTrack: NPCSheet._onToggleWoundTrack,
      rollSkill:        NPCSheet._onRollSkill,
      rollAttack:       NPCSheet._onRollAttack,
      rollDefence:      NPCSheet._onRollDefence,
      createAdvantage:  NPCSheet._onCreateAdvantage,
      editAdvantage:    NPCSheet._onEditAdvantage,
      deleteAdvantage:  NPCSheet._onDeleteAdvantage,
      toggleAdvantage:  NPCSheet._onToggleAdvantage,
    },
  };

  static PARTS = {
    header:     { template: "systems/seventh-sea-3e/templates/actor/npc-header.hbs" },
    traits:     { template: "systems/seventh-sea-3e/templates/actor/npc-traits.hbs" },
    skills:     { template: "systems/seventh-sea-3e/templates/actor/npc-skills.hbs" },
    combat:     { template: "systems/seventh-sea-3e/templates/actor/npc-combat.hbs" },
    advantages: { template: "systems/seventh-sea-3e/templates/actor/npc-advantages.hbs" },
    body:       { template: "systems/seventh-sea-3e/templates/actor/npc-body.hbs" },
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
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._applyExpandedAdvantages();
  }

  _applyExpandedAdvantages() {
    const el = this.element;
    if (!el) return;
    el.querySelectorAll(".advantage-item").forEach(item => {
      const id   = item.dataset.advId;
      const body = item.querySelector(".adv-body");
      const icon = item.querySelector(".adv-expand-icon");
      if (!body || !icon) return;
      const expanded     = this._expandedAdvantages.has(id);
      body.style.display = expanded ? "" : "none";
      icon.textContent   = expanded ? "▼" : "▶";
      icon.classList.toggle("expanded", expanded);
    });
  }

  // ── Wound track (dots + Dramatic Wound pips) ────────────────────────────
  // Henchmen/Villains only — Brute Squads use the header's Brute Count field
  // directly and don't have a Toughness-based track.
  static async _onToggleWoundTrack(event, target) {
    const flatIndex     = Number(target.dataset.index);
    const actor         = this.document;
    const dramaticLimit = actor.system.dramaticWoundLimit ?? 4;
    const toughness     = actor._toughnessValue();
    const track = computeWoundTrack(toughness, actor.system.wounds.minorPerSegment, actor.system.wounds.dramatic, dramaticLimit);

    let currentTotal = 0;
    for (const seg of track) {
      for (const dot of seg.dots) if (dot.filled) currentTotal = dot.flatIndex + 1;
      if (seg.marked) currentTotal = seg.dramaticFlatIndex + 1;
    }

    const newTotal = flatIndex === currentTotal - 1 ? flatIndex : flatIndex + 1;
    await actor.setWoundLevel(newTotal, { dramaticLimit });
  }

  // ── Skill roll (Henchmen/Villains) ──────────────────────────────────────

  static async _onRollSkill(event, target) {
    const skillKey = target.dataset.skill;
    const system   = this.document.system;
    const skill    = system.skills?.[skillKey];
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

  // ── Attack / Defence (Henchmen/Villains) ────────────────────────────────
  // Simpler than the Hero version: no Hero Points to spend on bonus damage —
  // a successful hit just applies the acting NPC's flat Damage aptitude.

  static async _onRollAttack() {
    const apt    = this.document.system.combatAptitudes.attack;
    const target = firstTargetActor();
    const diff   = aptitudeValue(target, "defence") ?? 2;
    const diffLabel = target ? ` vs ${target.name} (Defence ${diff})` : "";

    const result = await SeventhSeaDice.rollCombat({
      actor:         this.document,
      label:         "Attack" + diffLabel,
      aptitudeTrait: apt.trait || null,
      difficulty:    diff,
      skillChoices:  ["melee", "aim", "athletics"],
    });

    if (!result?.success || !target) return;

    const dmg = aptitudeValue(this.document, "damage") ?? 0;
    if (dmg <= 0) {
      ui.notifications.warn(`${this.document.name} has no Damage aptitude set (reads as 0) — no Wounds applied.`);
      return;
    }

    const dramaticLimit = target.system?.dramaticWoundLimit ?? 4;
    const { dramaticGained } = await target.applyWounds(dmg, { dramaticLimit });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content: `<div class="seventh-sea chat-roll">
        <div class="chat-roll-label">Attack Hits</div>
        <div class="chat-roll-summary">
          <strong>${target.name}</strong> takes <strong>${dmg}</strong> Wound${dmg > 1 ? "s" : ""}
          from ${this.document.name}'s Damage aptitude.
        </div>
      </div>`,
    });

    if (dramaticGained > 0) {
      ui.notifications.info(`${target.name} suffers ${dramaticGained} Dramatic Wound${dramaticGained > 1 ? "s" : ""}!`);
    }
  }

  static async _onRollDefence() {
    const apt      = this.document.system.combatAptitudes.defence;
    const attacker = firstTargetActor(); // target the attacker before rolling Defence
    const diff     = aptitudeValue(attacker, "attack") ?? 2;
    const diffLabel = attacker ? ` vs ${attacker.name} (Attack ${diff})` : "";

    const result = await SeventhSeaDice.rollCombat({
      actor:         this.document,
      label:         "Defence" + diffLabel,
      aptitudeTrait: apt.trait || null,
      difficulty:    diff,
      skillChoices:  ["melee", "athletics", "aim"],
    });

    if (result && !result.success) {
      if (!attacker) {
        ui.notifications.warn("No attacker targeted — target the attacking character before rolling Defence.");
        return;
      }

      const baseDamage = aptitudeValue(attacker, "damage") ?? 0;
      if (baseDamage <= 0) {
        ui.notifications.warn(`${attacker.name} has no Damage aptitude set (reads as 0) — no Wounds applied.`);
        return;
      }

      const dramaticLimit = this.document.system.dramaticWoundLimit ?? 4;
      const { dramaticGained } = await this.document.applyWounds(baseDamage, { dramaticLimit });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<div class="seventh-sea chat-roll">
          <div class="chat-roll-label">Defence Failed — Wounds Applied</div>
          <div class="chat-roll-summary">
            <strong>${this.document.name}</strong> takes <strong>${baseDamage}</strong> Wound${baseDamage > 1 ? "s" : ""}
            from ${attacker.name}'s Damage aptitude.
          </div>
        </div>`,
      });

      if (dramaticGained > 0) {
        ui.notifications.info(`${this.document.name} suffers ${dramaticGained} Dramatic Wound${dramaticGained > 1 ? "s" : ""}!`);
      }
    }
  }

  // ── Advantages ───────────────────────────────────────────────────────────

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
}
