# Config page migration plan

Located at: `webui/templates/config.html`

Detected onclick expressions and recommended mapping:

- `saveCurrentSection()` — 1 occurrence(s)
  - suggested data-action: `save-config`
  - note: Save actions likely submit forms or call config API; preserve behavior and add data-action after review.

- `saveAllConfig()` — 1 occurrence(s)
  - suggested data-action: `save-config`
  - note: Save actions likely submit forms or call config API; preserve behavior and add data-action after review.

- `resetCurrentSection()` — 1 occurrence(s)
  - suggested data-action: `reset-config`
  - note: Reset actions may be destructive; add confirmation in delegated handler.

- `resetAllConfig()` — 1 occurrence(s)
  - suggested data-action: `reset-config`
  - note: Reset actions may be destructive; add confirmation in delegated handler.

- `createBackup()` — 1 occurrence(s)
  - suggested data-action: `create-backup`
  - note: Backup action can be delegated; ensure server API exists.

Migration steps

1. For each button, add `data-action="<suggested>"` and `data-old-onclick="<original>"` as fallback.
2. Implement delegated handlers for each `data-action` in `webui/static/config.js` or `init-action-delegates.js` and test behavior.
3. For destructive actions (reset), add confirmation dialog in delegated handler before proceeding.
4. Run `node scripts/check-onclick-strict.js` to ensure no raw onclicks remain.