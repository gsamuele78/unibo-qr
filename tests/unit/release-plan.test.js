"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const CHANGELOG = `# Changelog

## [1.1.0] — 2026-11-25

### Added
- Banner.

## [1.0.0] — 2026-11-20

### Added
- First.
`;

let mod;
test.before(async () => { mod = await import("../../scripts/release-plan.mjs"); });

test("latestChangelogVersion returns the newest released section", () => {
  assert.equal(mod.latestChangelogVersion(CHANGELOG), "1.1.0");
  assert.equal(mod.latestChangelogVersion("# Changelog\n\n## [Unreleased]\n"), null);
});

test("changelogSection extracts exactly one version's notes", () => {
  const notes = mod.changelogSection(CHANGELOG, "1.1.0");
  assert.match(notes, /^### Added\n- Banner\.$/);
  assert.doesNotMatch(notes, /First/);
  assert.equal(mod.changelogSection(CHANGELOG, "1.0.0"), "### Added\n- First.");
  assert.equal(mod.changelogSection(CHANGELOG, "9.9.9"), null);
});

const base = { pkgVersion: "1.1.0", changelog: CHANGELOG, tags: ["v1.0.0"], releases: ["v1.0.0"], event: "push", refType: "branch", refName: "main" };

test("plan: releases a version that has a changelog section but no tag", () => {
  assert.deepEqual(mod.plan(base), { release: true, tag: "v1.1.0", createTag: true, reason: "v1.1.0 is not tagged yet" });
});

test("plan: nothing to do when the version is already tagged and released", () => {
  const p = mod.plan({ ...base, tags: ["v1.0.0", "v1.1.0"], releases: ["v1.0.0", "v1.1.0"] });
  assert.equal(p.release, false);
  assert.match(p.reason, /already released/);
});

test("plan: a tag pushed by hand is released without re-creating the tag", () => {
  const p = mod.plan({ ...base, tags: ["v1.0.0", "v1.1.0"], refType: "tag", refName: "v1.1.0" });
  assert.deepEqual([p.release, p.tag, p.createTag], [true, "v1.1.0", false]);
});

test("plan: a tag left without a release (interrupted run) is completed", () => {
  const p = mod.plan({ ...base, tags: ["v1.0.0", "v1.1.0"] });
  assert.deepEqual([p.release, p.createTag], [true, false]);
});

test("plan: refuses when package.json and CHANGELOG disagree", () => {
  const p = mod.plan({ ...base, pkgVersion: "1.2.0" });
  assert.equal(p.release, false);
  assert.match(p.reason, /CHANGELOG/);
  assert.throws(() => mod.plan({ ...base, pkgVersion: "1.2.0", refType: "tag", refName: "v1.2.0" }), /CHANGELOG/);
});

test("plan: refuses a hand-pushed tag that does not match package.json", () => {
  assert.throws(() => mod.plan({ ...base, refType: "tag", refName: "v3.0.0" }), /does not match/);
});

test("plan: pull requests only rehearse, never publish", () => {
  const p = mod.plan({ ...base, event: "pull_request" });
  assert.equal(p.release, false);
  assert.match(p.reason, /rehearsal/);
});
