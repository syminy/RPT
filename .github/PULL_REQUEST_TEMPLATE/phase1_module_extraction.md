## Module Extraction PR Template

Use this template for PRs that extract modules or refactor utilities from the frontend.

Summary
-------
- Short description of what this PR extracts and why.

Scope
-----
- Which files are being touched and what will be extracted.
- Backwards compatibility considerations.

Files / Modules Added
---------------------
- List new files/modules and their responsibilities.

Tests
-----
- Which unit/tests were added or updated. Include instructions to run.

Migration Plan
--------------
- Steps to roll out (feature flags, phased rollout, dependencies).

Rollback Plan
-------------
- How to revert if regressions are found.

Checklist
---------
- [ ] PR title follows convention: refactor(module): short summary
- [ ] All new/updated tests pass locally and in CI
- [ ] No `data-old-*` attributes added back
- [ ] Preflight scripts pass: `run_preflight_checks.sh`
- [ ] Changes documented in `docs/` or `README.md` where applicable

Notes
-----
- Keep PRs small and reviewable: prefer 5–10 functions per PR.
