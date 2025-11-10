# register-action-handlers Extraction Plan

Purpose
-------
Small, actionable plan to extract and harden the logic in `webui/static/modules/register-action-handlers.js` into a testable `action-handlers.core.js` (if not already) and to drive follow-up tests and compatibility wrappers.

Summary of handlers (found in file)
----------------------------------
- start-stream
- stop-stream
- upload-files
- refresh-list
- clear-plots
- delete-all
- close-preview
- analyze-preview
- select-and-analyze-file
- select-file
- download-file
- show-file-info
- delete-file
- cancel-task
- view-task-result
- save-config
- save-all-config
- reset-config
- reset-all-config
- create-backup

External dependencies and side-effects
-------------------------------------
- `window.rptUI` — preferred API surface for actions (start/stop, file ops, tasks, preview)
- Fallback global functions: `startStreaming`, `stopStreaming`, `downloadFile`, etc.
- DOM usage: reading `el.dataset` for arguments (file, filename, taskid)
- `confirm()` calls for destructive actions (`delete-file`, `delete-all`)

Goals for extraction
--------------------
1. Move pure decision logic and handler functions into `action-handlers.core.js` with signatures:
   - register(router)
   - handlers: exported mapping of handlerName -> function(ev, el)

2. Minimize top-level DOM access in the core module. Accept `ev` and `el` and perform dataset reads inside handler bodies only.

3. Keep wrappers (browser) that try to load the core module in CommonJS contexts and otherwise perform legacy registration.

4. Add unit tests for each handler (happy path + 1-2 edge cases):
   - download-file: calls window.rptUI.downloadFile or fallback
   - delete-file: confirms and calls delete API; test both confirm true/false
   - cancel-task/view-task-result: extract taskid and call the expected API
   - select-and-analyze-file: ensure filename extraction works when dataset keys vary (`argFile`, `file`, `filename`)

Test matrix (minimal)
---------------------
- Each handler: one happy-path test (calls into rptUI), one edge-case test (missing dataset -> no-op)
- For delete-file and delete-all: confirm true/false tests
- For functions that call global fallback: mock absence of `window.rptUI` and ensure fallback invoked

Extraction steps (practical)
---------------------------
1. Create `webui/static/modules/action-handlers.core.js` if not present. Export `register(router)` and `handlers` map.
2. Replace inline handlers in `register-action-handlers.js` with a thin wrapper that loads core in CommonJS and registers handlers on the router.
3. Add tests under `tests/frontend/action-handlers.core.test.js` (or expand existing tests):
   - Use Jest to set `global.window = { rptUI: { ... mocked functions ... } }` and verify calls.
4. Run `npm run test:frontend` and fix any lint warnings.
5. Push small PR with the extraction and tests; rely on CI to validate.

Edge cases & notes
------------------
- Confirm dialogues in headless tests should be stubbed: `global.confirm = jest.fn(() => true/false)`
- Some handlers try multiple dataset keys for filename — ensure tests exercise all variants.
- Keep compatibility wrapper intact until all callers are migrated to data-action routing and router is the canonical registry.

Rollback guidance
-----------------
- If tests or CI reveal behavior regressions, revert the wrapper-only commit and re-open a smaller PR splitting the handler extraction per handler group (file ops vs streaming vs config).

Acceptance criteria
-------------------
- `action-handlers.core.js` present with exported `register` and `handlers` map
- Tests added for at least: download-file, delete-file (confirm), cancel-task, view-task-result, select-and-analyze-file
- Lint and Jest pass on CI for refactor/** branch
