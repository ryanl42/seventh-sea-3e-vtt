/**
 * 7th Sea 3e — Handlebars Helpers
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq",  (a, b, _opts) => a === b);
  Handlebars.registerHelper("gt",  (a, b, _opts) => a > b);
  Handlebars.registerHelper("lt",  (a, b, _opts) => a < b);
  Handlebars.registerHelper("not", (a, _opts)    => !a);
  Handlebars.registerHelper("or",  (a, b, _opts) => a || b);
}
