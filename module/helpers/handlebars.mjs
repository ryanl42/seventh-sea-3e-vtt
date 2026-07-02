/**
 * 7th Sea 3e — Handlebars Helpers (Step 9)
 * Note: `lookup` is already provided by Foundry core, so we don't redefine it.
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq", (a, b, _opts) => a === b);
}
