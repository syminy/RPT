# Phase 1: Module Extraction Roadmap

This document captures the short-term roadmap and acceptance criteria for Phase 1 of the module-extraction work (safe, testable, incremental extraction of frontend modules).

## Goals

- Extract small, pure/isolated modules from `webui/static` into `*.core.js` files.
- Provide compatibility wrappers that keep the browser fallback behavior intact until the entire UI is migrated.
- Add headless unit tests (Jest + jsdom) for every extracted core module.
- Gate PRs with preflight checks (lint, preflight Python checks, frontend tests).

## Completed

- `utils.core.js` — pure helper functions with tests ✅
- `dom-helpers.core.js` — DOM helpers extracted with wrapper ✅
- `action-handlers.core.js` — extracted handlers and expanded tests ✅

## Next milestones

1. register-action-handlers.js
   - Extract into `action-handlers.core.js` if not already completed (ensure stable interface).
   - Add focused tests for side effects and confirm flows.

2. init-action-delegates.js
   - Pull out delegate wiring and central initialization.
   - Ensure data-action routing is consistently used with `data-old-*` fallbacks where needed.

3. charts.js / plotting
   - Separate chart rendering logic from UI wiring.
   - Ensure heavy rendering code is testable / can be mocked in Jest.

## Acceptance criteria for every extracted module

- A `*.core.js` file contains pure logic and exports functions (no DOM side-effects at module top-level).
- A thin wrapper file `module.js` is kept for browser compatibility (loads core in CommonJS/node). This wrapper must be marked as transitional and documented.
- Unit tests added/updated under `tests/frontend` and run headlessly (Jest + jsdom).
- Lint passes with zero blocking errors.
- PR passes the `refactor/**` CI preflight (preflight Python checks + lint + Jest).

## Review guidance

- Keep PRs small — one module extraction per PR when possible.
- Describe the compatibility strategy and the removal plan for `data-old-*` in the PR body.
- Include a short migration checklist in the PR description (what callers need to change, how to test manually).

## Rollback policy

- If a refactor PR regresses behavior in an integration test, revert the PR and open a follow-up that splits the change into smaller, safer steps.

## Notes

- Use this roadmap to plan sprint work and coordinate reviews. Update it as the team agrees on priorities.
