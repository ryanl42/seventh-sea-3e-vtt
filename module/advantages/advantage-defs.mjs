/**
 * 7th Sea 3e — Advantage Automation Registry
 *
 * Most Advantages ("+1 die to Skill X in circumstance Y") are handled by a
 * fully generic mechanism: the Advantage item itself carries `scope`,
 * `scopeSkills`/`scopeTrait`, and `bonusDice`, and the dice engine offers it
 * as an opt-in checkbox on any matching roll (see advantage-engine.mjs).
 *
 * A smaller set of Advantages do something the dice pool can't express on
 * its own (grant a Hero Point, reroll dice, redirect a Wound, auto-succeed a
 * task with no roll at all, persist across a whole Scene, etc). Those are
 * listed here by `key` so the sheet can offer a dedicated "Activate" button
 * and the engine knows which bit of bespoke code to run.
 *
 * See ADVANTAGES.md at the repository root for the full coverage list.
 */

// 7 Skill Domains, p.6-7 of the Playtest Kit.
export const SKILL_GROUPS = {
  cunning:      ["investigation", "stealth", "theft"],
  extraordinary:["legends", "sorcery", "theology"],
  martial:      ["aim", "athletics", "melee"],
  military:     ["sailing", "strategy", "survival"],
  politics:     ["intrigue", "protocol", "selfControl"],
  scholarship:  ["engineering", "humanities", "science"],
  social:       ["empathy", "persuasion", "perform"],
};

/**
 * mechanic values:
 *  - "specialtyGrant"   passive — forces a Specialty onto a given Skill
 *  - "assistOverride"   passive — changes the Help Ally bonus die count
 *  - "grantHeroPoint"   Activate → +1 Hero Point to self, once/session
 *  - "autoSuccess"      Activate → declare automatic success in the fiction
 *  - "reroll"           arms a one-time "reroll non-hits" option on the next roll
 *  - "forceFateFree"    arms a one-time "Force Fate without giving the GM VP" option
 *  - "redirectWounds"   Activate → move Wounds from a target onto this character
 *  - "cancelWounds"     Activate → heal a target's Wounds; this character takes 1 Dramatic Wound instead
 *  - "campfire"         Activate → free-text reveal/info, once/session (Illuminating, Intuitive)
 *  - "camaraderie"      Activate → spend Hero Points to grant a target bonus dice or +damage
 *  - "oath"             Activate → invest Hero Points for a Scene-long bonus on a declared promise
 *  - "bladeTrap"        Activate → after a successful parry, penalize a target's next Combat roll
 *  - "statusAnnounce"   Activate → free/HP narrative flag with no further automation (Soldier, Officer)
 *  - "none"             no automation; informational only (Cast Iron Stomach, Sorcery)
 */
export const ADVANTAGE_DEFS = {
  "firearms-specialist": { label: "Firearms Specialist", mechanic: "specialtyGrant", skill: "aim" },
  "team-player":         { label: "Team Player",          mechanic: "assistOverride", dice: 4 },
  "camaraderie":         { label: "Camaraderie",          mechanic: "camaraderie" },
  "altruistic":          { label: "Altruistic",           mechanic: "redirectWounds" },
  "officer":             { label: "Officer",              mechanic: "statusAnnounce",
                            text: "ends a state of fear, panic, or disorganization for nearby allies." },
  "unfortunate":         { label: "Unfortunate",          mechanic: "grantHeroPoint" },

  "friend-at-court":     { label: "Friend at Court",      mechanic: "autoSuccess",
                            text: "reveals a close friend present at this event." },
  "indomitable-will":    { label: "Indomitable Will",     mechanic: "autoSuccess",
                            text: "automatically resists an attempt to intimidate, seduce, or manipulate them." },
  "politician":          { label: "Politician",           mechanic: "autoSuccess",
                            text: "obtains an audience with a decision-maker, automatically." },
  "relentless":          { label: "Relentless",           mechanic: "grantHeroPoint" },
  "intuitive":           { label: "Intuitive",            mechanic: "campfire",
                            text: "asks the GM a yes/no question, who must answer honestly." },

  "brush-pass":          { label: "Brush Pass",           mechanic: "autoSuccess",
                            text: "cuts a purse, lifts a ring, or plants an object unnoticed." },
  "got-it":              { label: "Got it!",              mechanic: "autoSuccess",
                            text: "instantly picks a lock, opens a safe, or disarms a trap." },
  "second-story-work":   { label: "Second Story Work",    mechanic: "autoSuccess",
                            text: "finds a way into a building, room, or guarded site unnoticed.",
                            allowExtra: true, extraLabel: "Bring someone along (+1 HP)" },
  "criminal":            { label: "Criminal",              mechanic: "autoSuccess",
                            text: "automatically spots the best exit or hiding place." },
  "envious":             { label: "Envious",               mechanic: "grantHeroPoint" },
  "fortunate":           { label: "Fortunate",             mechanic: "reroll" },

  "idealist-parry":      { label: "Duelist Academy (Mauer aus Eisen)", mechanic: "bladeTrap" },
  "wont-die-here":       { label: "I Won't Die Here",      mechanic: "autoSuccess",
                            text: "ignores all negative effects (Dramatic Wounds, Threats, etc.) for 1 round." },
  "foolhardy":           { label: "Foolhardy",             mechanic: "grantHeroPoint" },
  "passionate":          { label: "Passionate",            mechanic: "cancelWounds" },
  "soldier":             { label: "Soldier",               mechanic: "statusAnnounce",
                            text: "holds the line — no enemy may pass through this area without first facing them, until the Scene ends." },

  "barterer":            { label: "Barterer",              mechanic: "autoSuccess",
                            text: "persuades someone to accept a deal. (The GM may spend 1 Villainy Point to make a Villain immune.)" },
  "extended-family":     { label: "Extended Family",       mechanic: "autoSuccess",
                            text: "discovers that a distant cousin is nearby, and can provide shelter, gear, or information." },
  "oath":                { label: "Oath",                  mechanic: "oath" },
  "curious":             { label: "Curious",               mechanic: "grantHeroPoint" },
  "illuminating":        { label: "Illuminating",          mechanic: "campfire",
                            text: "can tell whether someone is lying to them." },
  "sorte-strega-force-fate": { label: "Sorte Strega (free Force Fate)", mechanic: "forceFateFree" },

  "cast-iron-stomach":   { label: "Cast Iron Stomach",     mechanic: "none" },
  "sorcery":             { label: "Sorcery",               mechanic: "none",
                            text: "Handled by the Sorcery tab (Sorte Strega Reading/Weaving)." },
};

export function getAdvantageDef(key) {
  return ADVANTAGE_DEFS[key] ?? null;
}
