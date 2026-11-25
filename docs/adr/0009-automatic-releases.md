# ADR 0009 — Automatic releases from CHANGELOG.md

**Status:** Accepted · **Date:** 2026-11-25

## Context
Releases were cut by pushing a `vX.Y.Z` tag by hand. That step is easy to forget (the repository had merged features and no release), and automation that may open and merge pull requests is often not allowed to push tags. The maintainer's other project already releases automatically from its changelog.

## Decision
- The release is declared in the pull request: bump `version` in `package.json` and add a `## [X.Y.Z]` section to `CHANGELOG.md`.
- On every push to `main` touching either file, `release.yml` runs `scripts/release-plan.mjs`. If the newest changelog version equals the package version and has no GitHub Release, the workflow runs the full CI, builds, attests, then **creates the tag and the release itself** with the run's `GITHUB_TOKEN`. Release notes are that changelog section.
- A tag pushed by hand still releases. A tag left without a release by an interrupted run is completed on the next run.
- Pull requests that change the release pipeline rehearse it (plan + build) without publishing.
- The decision logic is a pure function with unit tests.

## Consequences
- ✅ Merging the version bump is the release; no local command, no long-lived token.
- ✅ Idempotent: re-runs never duplicate a release.
- ⚠️ A tag created with `GITHUB_TOKEN` does not trigger other workflows; anything that must react to a release has to live in `release.yml`.
- ⚠️ A changelog/version mismatch silently skips the release on `main` (the run log says why) and fails loudly for hand-pushed tags.
