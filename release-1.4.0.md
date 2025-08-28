# Release 1.4.0 Plan

## Overview
Release 1.4.0 adds new compile-time type testing utilities and enhances Result type handling, while reorganizing CI configuration for better maintainability.

## Release Strategy
- [ ] Create release branch `release/1.4.0` from `main`
- [ ] Create feature branches from release branch
- [ ] Open PRs against release branch
- [ ] Merge all PRs into release branch
- [ ] Create final PR: `release/1.4.0` → `main`
- [ ] Tag release after merge

## PR 1: CI Infrastructure Reorganization
**Branch**: `chore/reorganize-ci-config` (from `release/1.4.0`)
**Purpose**: Consolidate all CI configuration files under `.config/` directory

**Commits**:
- [x] `chore: migrate husky hooks to .config directory`
  - Move `.husky/commit-msg` → `.config/husky/commit-msg`
  - Move `.husky/pre-commit` → `.config/husky/pre-commit`
  - Update `package.json` prepare script: `"prepare": "husky .config/husky"`

- [x] `chore: update ESLint config to support .config directory`
  - Add `.config/**/*.ts` and `.config/**/*.js` to config files pattern
  - Ensures .config directory files use appropriate linting rules

- [x] `chore: migrate commitlint config to .config directory`
  - Delete `commitlint.config.ts`
  - Add `.config/commitlint.config.ts` (moved from root)
  - Update `.config/husky/commit-msg` to reference new path

- [x] `chore: migrate typedoc config to .config directory`
  - Delete `typedoc.json`
  - Add `.config/typedoc.config.js`

- [ ] Create PR for CI infrastructure reorganization
- [ ] Merge PR 1

## PR 2: Assert and Check Type Testing Utilities
**Branch**: `feat/assert-check-utilities` (from `release/1.4.0`)
**Purpose**: Add compile-time type assertion and checking utilities

**Commits**:
- [ ] `feat: add Assert utility for compile-time type assertions`
  - Add `src/assert/assert.ts`
  - Add `src/assert/assert.test.ts`

- [ ] `feat: add Check utilities for type relationship testing`
  - Add `src/assert/check.ts` 
  - Add `src/assert/check.test.ts`
  - Add `src/assert/index.ts`

- [ ] `docs: add Assert and Check utilities documentation`
  - Add `src/assert/readme.md`

- [ ] Create PR for Assert and Check utilities
- [ ] Merge PR 2

## PR 3: Enhanced Result Type Unions  
**Branch**: `feat/result-enhanced-unions` (from current `fix/result-and-then-error-type`)
**Purpose**: Improve type inference for Result and_then/or_else operations

**Commits**:
- [ ] `feat: enhance Result and_then/or_else type union handling`
  - Update type signatures in `src/result/result.ts`
  - Add comprehensive type transformation tests in `src/result/result.test.ts`

- [ ] Create PR for Result type enhancements
- [ ] Merge PR 3

## Files Excluded from Release
- `src/brand/` (not ready for release)
- `CLAUDE.md`, `AGENTS.md`, `assert-test-evaluation.md` (project-specific docs)

## Post-Release Actions
- [ ] Update changelog
- [ ] Verify npm package publish
- [ ] Update documentation site if applicable