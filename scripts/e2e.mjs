// Cross-platform E2E runner (no POSIX-only `VAR=value cmd` syntax, so it also
// works from cmd.exe / PowerShell). Usage:
//   node scripts/e2e.mjs                      -> $BROWSER or chromium
//   node scripts/e2e.mjs firefox              -> one browser
//   node scripts/e2e.mjs chromium firefox webkit
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const KNOWN = ["chromium", "firefox", "webkit"];
const browsers = process.argv.slice(2);
if (browsers.length === 0) browsers.push(process.env.BROWSER || "chromium");
const unknown = browsers.filter((b) => !KNOWN.includes(b));
if (unknown.length) {
  console.error(`Unknown browser(s): ${unknown.join(", ")}. Use: ${KNOWN.join(", ")}`);
  process.exit(2);
}

const run = (args, env = {}) =>
  spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } }).status ?? 1;

let status = run(["scripts/build.mjs"]);
for (const browser of browsers) {
  if (status !== 0) break;
  console.log(`\n=== E2E: ${browser} ===`);
  status = run(["--test", "--test-concurrency=1", "tests/e2e/*.test.js"], { BROWSER: browser });
}
process.exit(status);
