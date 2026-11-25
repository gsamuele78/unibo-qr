import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/", "vendor/", "coverage/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.browser, module: "readonly" } },
    rules: { "no-var": "error", "prefer-const": "error", eqeqeq: ["error", "always"], strict: ["error", "function"] },
  },
  {
    // Must stay ES5: it has to run in the very browsers the app cannot support.
    files: ["src/boot-guard.js"],
    languageOptions: { ecmaVersion: 5, sourceType: "script", globals: globals.browser },
    rules: { "no-var": "off", "prefer-const": "off" },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["scripts/**/*.mjs", "*.mjs"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
  },
];
