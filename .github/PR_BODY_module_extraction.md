## PR: Phase 1 — Module extraction (utils + dom-helpers)

Summary
-------
- This PR extracts pure/core functionality into standalone modules and provides compatibility wrappers for browser usage.
- Files included in this branch:
  - webui/static/modules/utils.core.js — extracted core utility functions and tests
  - webui/static/modules/dom-helpers.core.js — extracted DOM helpers and tests
  - webui/static/modules/utils.js — wrapper that prefers core module in CommonJS and keeps browser fallback
  - webui/static/modules/dom-helpers.js — wrapper that prefers core module in CommonJS and keeps browser fallback

Why
---
- Reduce technical debt by separating pure helpers from page-specific wiring.
- Make functions easier to test under Jest/node and simplify downstream refactors.

Verification
------------
- Frontend tests: 8 suites, 18 tests — all PASS (local run on branch)
- ESLint: no blocking errors introduced
- How to reproduce locally:

```bash
# from repo root, on branch `refactor/module-extraction`
npm ci
npm run test:frontend
npm run lint
```

Files changed (high level)
-------------------------
- `webui/static/modules/utils.core.js` — extracted formatting/normalization helpers
- `webui/static/modules/utils.js` — wrapper (CommonJS prefer core, browser fallback preserved)
- `webui/static/modules/dom-helpers.core.js` — extracted DOM utilities (qs,qsa,createEl,on,delegate,...)
- `webui/static/modules/dom-helpers.js` — wrapper (CommonJS prefer core, browser fallback preserved)

Reviewer checklist
------------------
- [ ] Confirm tests run locally and CI results are green.
- [ ] Verify browser pages still operate when using legacy bundle ordering (wrapper fallbacks remain unchanged for now).
- [ ] Spot-check a few `data-action` pages to confirm delegation continues to work.

Next steps (Phase 1)
--------------------
1. Prepare extraction plan for `register-action-handlers.js` and `init-action-delegates.js` (priority: event routing and action handler registration).
2. Ensure CI preflight checks run on `refactor/*` PRs.
3. Continue incremental extractions (charts, api-client) in small PRs or single branch per policy.

Notes
-----
- This PR intentionally leaves browser fallbacks in place (wrapper pattern) to avoid breaking pages mid-migration. After the UI pages are migrated to prefer `data-action` + central router, we can remove the fallback code in a controlled Phase 2.

Contact
-------
If you want me to split these into separate PRs (one per module), say so and I will prepare separate branches/PRs.
