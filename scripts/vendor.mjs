// Regenerates vendor/qrcodegen.js from the pinned upstream TypeScript source
// (Project Nayuki, MIT). Run: npm run vendor
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";

const src = readFileSync(new URL("../vendor/qrcodegen.ts", import.meta.url), "utf8");
const sha = createHash("sha256").update(src).digest("hex");
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.None, removeComments: false },
});
const out = `/* Vendored from vendor/qrcodegen.ts (sha256 ${sha}). Do not edit: run \`npm run vendor\`. */
${outputText}
if (typeof module !== "undefined" && module.exports) { module.exports = qrcodegen; }
`;
writeFileSync(new URL("../vendor/qrcodegen.js", import.meta.url), out);
console.log(`vendor/qrcodegen.js written (source sha256 ${sha})`);
