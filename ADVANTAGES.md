# Advantage Automation — Coverage Notes

This system automates as much of the Playtest Kit's Advantage list as a dice
pool + chat log reasonably can. It's built as two layers:

1. **Roll-time bonus dice.** Any Advantage Item with `system.scope` set to
   `always`, `skill`, or `trait` is automatically offered as an opt-in
   checkbox on any matching roll (Skill rolls, Attack/Defence, Manoeuvre).
   Free for Situational/Extraordinary, costs `system.hpCost` Hero Points for
   Heroic. This covers most "+1 die to X" Advantages with **no custom code
   needed** — just configure the fields on the Advantage's sheet
   (Category / Automation key / Scope / Skills / Bonus dice / Uses).

2. **Activate button.** Advantages that do something a dice pool can't
   express (grant a Hero Point, reroll dice, redirect Wounds, auto-succeed a
   task with no roll, persist across a whole Scene, etc.) get a dedicated
   "Activate" button in the Advantages tab once `system.key` is set to a
   recognized slug (see `module/advantages/advantage-defs.mjs`).

A new **Help Ally** button also implements the base "Add 3d10 to an ally's
pool if you are actively helping them" rule (p.15) as a real feature (spend
1 Hero Point, target an ally, their next roll gets the bonus automatically) —
previously this was text-only. Team Player bumps it to 4d10.

## Coverage by Advantage (all 5 Playtest Kit pregens)

| Advantage | Character | Automation |
|---|---|---|
| Firearms Specialist | Manuela | **Full.** Passive: Aim always rolls with Specialty (explode 9–10). |
| Team Player | Manuela | **Full.** Help Ally grants +4d10 instead of +3d10 to its target. |
| Cursed Heir | Manuela | **Full.** +1 die checkbox on Intrigue/Protocol/Self Control rolls. |
| Leadership | Manuela | **Full.** +1 die checkbox on any roll (player judges the fit). |
| Camaraderie | Manuela | **Full.** Activate → target an ally, spend N Hero Points for +N dice or +N Damage on their next roll. |
| Altruistic | Manuela | **Full.** Activate → target an ally, choose an amount, Wounds move to you instead. Once/session. |
| Officer | Manuela | **Partial.** Activate posts the effect and flags allies' "no longer panicked" state; fear/panic/disorganization aren't tracked as a formal status elsewhere in the system, so there's nothing further to clear automatically. Once/session. |
| Unfortunate | Manuela | **Full.** Activate → +1 Hero Point, once/session. |
| Reputation: Upright | Hugues | **Full.** +1 die checkbox on any roll. |
| Schemer | Hugues | **Full.** +1 die checkbox on Intrigue/Protocol/Self Control rolls. |
| Staredown | Hugues | **Full.** +1 die checkbox on Persuasion rolls (Persuasion covers intimidation per p.7). |
| Friend at Court | Hugues | **Full** (as a declaration). Activate → 1 HP, posts a chat card. The actual "who's the friend" is still up to the table. |
| Indomitable Will | Hugues | **Full** (as a declaration). Activate → 1 HP, auto-resist chat card. |
| Intuitive | Hugues | **Partial.** Activate → free, once/session, prompts a question and whispers the GM to answer honestly. Can't force a specific true/false answer out of the GM's fiction. |
| Politician | Hugues | **Full.** Activate → free, once/session, auto-success chat card. |
| Relentless | Hugues | **Full.** Activate → +1 Hero Point, once/session. |
| Cast Iron Stomach | Mallory | **N/A.** No mechanical effect by design (flavor only). |
| Outlaw | Mallory | **Full.** +1 die checkbox on Investigation/Stealth/Theft rolls. |
| Small | Mallory | **Full.** +1 die checkbox on any roll (player judges the fit). |
| Brush Pass | Mallory | **Full** (as a declaration). Activate → 1 HP, auto-success chat card. |
| Got it! | Mallory | **Full.** Activate → 1 HP, auto-success chat card (lock/safe/trap). |
| Second Story Work | Mallory | **Full.** Activate → 1 HP (+1 more if bringing someone), auto-success chat card. |
| Criminal | Mallory | **Full.** Activate → free, once/session, auto-success chat card. |
| Envious | Mallory | **Full.** Activate → +1 Hero Point, once/session. |
| Fortunate | Mallory | **Full.** Activate arms a one-time "reroll all non-hit dice" checkbox that appears automatically on your next roll. |
| Dracheneisen Panzerfaust | Hans | **Full.** +1 die checkbox on Melee rolls. |
| Idealist | Hans | **Full.** +1 die checkbox on any roll (player judges "protecting someone"). |
| Duelist Academy (Mauer aus Eisen) | Hans | **Full.** Activate after a successful parry → 1 HP, target the opponent, their next Attack/Defence roll is at −1 die (auto-applied and cleared on use). |
| Perfect Balance | Hans | **Full.** +1 die checkbox on Athletics rolls, costs 1 HP (Heroic). |
| I Won't Die Here | Hans | **Partial.** Activate → 1 HP, posts a declaration. The "ignore Dramatic Wound/Threat effects for 1 round" itself isn't intercepted everywhere those effects are applied — treat the chat card as the record and adjudicate wound-dice/Helpless effects manually that round. |
| Foolhardy | Hans | **Full.** Activate → +1 Hero Point, once/session. |
| Passionate | Hans | **Full.** Activate → target an ally, choose how many Wounds to cancel on them; you take exactly 1 Dramatic Wound. Once/session. |
| Soldier | Hans | **Partial.** Activate → free, once/session, sets a "holding the line" flag (auto-clears at Scene/Combat end) and posts a chat card. Nothing stops movement automatically — it's a marker for the table. |
| Sorcery (Sorte Strega) | Veronica | **N/A here** — fully handled by the existing Sorcery tab (Reading/Weaving/Backlash). This Advantage item is just a label pointing there. |
| Conspirator | Veronica | **Full.** +1 die checkbox on Investigation/Stealth/Theft rolls. |
| Barterer | Veronica | **Full** (as a declaration). Activate → 1 HP, auto-success chat card (notes the GM's 1 VP counter-option). |
| Extended Family | Veronica | **Full** (as a declaration). Activate → 1 HP, auto-success chat card. |
| Oath | Veronica | **Full.** Activate → choose N Hero Points + a promise; +N dice checkbox appears on every roll for the rest of the Scene (auto-clears at Combat end, or via the "Clear Oath" button). |
| Curious | Veronica | **Full.** Activate → +1 Hero Point, once/session. |
| Illuminating | Veronica | **Partial.** Same shape as Intuitive — free once/session, prompts the GM in chat. |
| Sorte Strega (free Force Fate) | Veronica | **Full.** A "no VP for this Force Fate" checkbox appears automatically next to Force Fate on any roll, once/session. |

## What "Partial" means here
A few Advantages (Officer, Intuitive, Illuminating, I Won't Die Here, Soldier)
describe an effect on parts of the fiction (status conditions like fear/panic,
or an honest answer from the GM) that this system doesn't otherwise track as
data. Those get a chat-card declaration + Hero Point/use bookkeeping, but the
table still narrates the actual outcome.

## Adding automation to a custom Advantage
Open the Advantage's own sheet:
- **Category** — passive / situational / heroic / extraordinary, as usual.
- **Automation key** — only needed for the special mechanics listed in
  `module/advantages/advantage-defs.mjs` (grant Hero Point, reroll, redirect
  Wounds, etc). Leave blank for a plain roll bonus.
- **Roll-time bonus applies to** — "Any roll", a set of Skills, or a Trait.
- **Bonus dice** / **Uses per session** — as described on the sheet.

## Files
- `module/item/advantage-data.mjs` — schema for the automation fields.
- `module/advantages/advantage-defs.mjs` — registry of special mechanics.
- `module/advantages/advantage-engine.mjs` — roll-time bonus dice + Activate
  button dispatch + Help Ally.
- `module/dice/dice.mjs` — wires the engine into Skill/Combat/Manoeuvre rolls
  (also fixes a pre-existing dead/duplicate `rollManoeuvre` definition).
- `module/apps/hero-sheet.mjs`, `templates/actor/hero-advantages.hbs` — UI.
- `templates/item/advantage-sheet.hbs` — automation fields on the item sheet.
- `packs/heroes.db` — the 5 Playtest Kit pregens now carry real, configured
  Advantage items instead of a text-only list in their biography.
