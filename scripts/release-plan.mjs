// Decides whether the current commit should be released (ADR 0009).
//
// Rule: when the newest `## [X.Y.Z]` section of CHANGELOG.md equals the
// package.json version and vX.Y.Z has no GitHub Release yet, release it. The
// release workflow creates the tag itself, so nobody has to push one by hand.
//
// CLI (used by .github/workflows/release.yml): reads tags/releases with `git`
// and `gh`, writes `release`, `tag`, `create_tag` to $GITHUB_OUTPUT and the
// release notes to the file named by $NOTES_FILE.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SECTION_RE = /^## \[(\d+\.\d+\.\d+)\]/m;

export function latestChangelogVersion(changelog) {
  const m = SECTION_RE.exec(changelog);
  return m ? m[1] : null;
}

export function changelogSection(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## ["));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end).join("\n").trim();
}

export function plan({ pkgVersion, changelog, tags, releases, event, refType, refName, defaultBranch = "main" }) {
  const tag = `v${pkgVersion}`;
  const byHand = refType === "tag";
  if (event === "pull_request") {
    return { release: false, tag, createTag: false, reason: "pull request: rehearsal only, nothing is published" };
  }
  if (!byHand && refName !== defaultBranch) {
    // e.g. a manual run started on a feature branch
    return { release: false, tag, createTag: false, reason: `releases are cut only from ${defaultBranch}, not ${refName}` };
  }
  const newest = latestChangelogVersion(changelog);
  if (newest !== pkgVersion) {
    const reason = `CHANGELOG.md newest section is ${newest ?? "missing"}, package.json says ${pkgVersion}`;
    if (byHand) throw new Error(reason);
    return { release: false, tag, createTag: false, reason };
  }
  if (byHand && refName !== tag) {
    throw new Error(`Pushed tag ${refName} does not match package.json version ${pkgVersion}`);
  }
  if (releases.includes(tag)) {
    return { release: false, tag, createTag: false, reason: `${tag} is already released` };
  }
  if (tags.includes(tag)) {
    return { release: true, tag, createTag: false, reason: `${tag} is tagged but has no release yet` };
  }
  return { release: true, tag, createTag: true, reason: `${tag} is not tagged yet` };
}

function main() {
  const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" });
  const lines = (s) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  const tags = lines(sh("git", ["ls-remote", "--tags", "--refs", "origin"])).map((l) => l.split("refs/tags/")[1]);
  // REST, not `gh release list` (GraphQL): works wherever only the REST API is reachable.
  const releases = lines(sh("gh", ["api", "--paginate", "repos/{owner}/{repo}/releases", "--jq", ".[].tag_name"]));
  const p = plan({
    pkgVersion: version, changelog, tags, releases,
    event: process.env.GITHUB_EVENT_NAME, refType: process.env.GITHUB_REF_TYPE, refName: process.env.GITHUB_REF_NAME,
  });
  console.log(`${p.release ? "RELEASE" : "skip"}: ${p.reason}`);
  if (process.env.NOTES_FILE) writeFileSync(process.env.NOTES_FILE, (changelogSection(changelog, version) ?? "") + "\n");
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `release=${p.release}\ntag=${p.tag}\ncreate_tag=${p.createTag}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
