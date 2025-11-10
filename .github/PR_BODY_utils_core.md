# refactor(utils): extract core pure functions to utils.core.js

## Summary

Extracted 9 pure utility functions from the legacy `webui/static/modules/utils.js` into a new module `webui/static/modules/utils.core.js` to improve modularity and testability. The legacy wrapper `webui/static/modules/utils.js` now prefers the core module in CommonJS environments and preserves a browser fallback for compatibility.

## Why

- Improves testability and maintainability by isolating pure functions.
- Lays groundwork for further module extractions (dom-helpers, api-client, charts).
- Keeps backward compatibility with existing bundles.

## Changes

- Added: `webui/static/modules/utils.core.js` (exports core helpers)
- Updated: `webui/static/modules/utils.js` (wrapper that re-uses core in Node)
- Added tests: `tests/frontend/utils.core.test.js`
- Added PR template: `.github/PULL_REQUEST_TEMPLATE/phase1_module_extraction.md`

## Verification

Run these locally to reproduce the checks used in CI:

```bash
git fetch origin
git checkout refactor/module-extraction
npm ci
./scripts/run_preflight_checks.sh
npm run lint
npm run test:frontend -- tests/frontend/utils.core.test.js
PYTHONPATH=. python -m pytest -q --maxfail=1 --disable-warnings tests -k "not integration and not webui and not spectrum and not realtime"
```

## Checklist for reviewers

- [x] Unit tests added and passing
- [x] No blocking linter errors
- [x] Backwards compatible wrapper preserved
- [ ] Sanity check in the browser (optional)

## Notes

This is the first focused extraction. Please review for any hidden assumptions about global state; the goal is to keep functions pure and side-effect free.
