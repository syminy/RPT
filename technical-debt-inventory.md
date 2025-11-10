# Technical Debt Inventory — data-old-* fallbacks

Generated: 2025-11-10

Summary
-------
- Detector: `scripts/check-no-data-old.py`
- Total findings: 45 occurrences of `data-old-*` fallbacks across templates and static bundles.

Purpose
-------
This document lists each `data-old-*` fallback occurrence found by the preflight script, groups them by priority (high/medium/low), and provides actionable remediation steps, verification instructions, and a Phase 1 plan to progressively remove the fallbacks.

High-level findings
-------------------
- Core pages and runtime bundle contain the highest-impact occurrences (affecting main UI flows):
  - `webui/templates/index.html` — several entries (Start/Stop scan, Upload Files, file list actions, preview controls)
  - `webui/static/app.js` — many runtime template buttons (file actions, task controls)
  - `webui/templates/config.html` — save/reset/create-backup buttons

Priority categories
-------------------

High priority (fix first)
- These affect primary user flows and should be fixed in the first Phase 1 sprint (5–10 items initially):
  - `webui/templates/index.html`
    - 595: Start Scan (data-old-onclick)
    - 596: Stop Scan (data-old-onclick)
    - 863: Upload Files (data-old-onclick)
    - 864: Refresh List (data-old-onclick)
    - 865: Clear Plots (data-old-onclick)
    - 866: Delete All (data-old-onclick)
    - 982: Close preview (data-old-onclick)
    - 983: Full Analysis (data-old-onclick)

  - `webui/static/app.js`
    - 1735: selectAndAnalyzeFile (data-old-onclick)
    - 1738: downloadFile (data-old-onclick)
    - 1741: showFileInfo (data-old-onclick)
    - 1744: deleteFile (data-old-onclick)
    - 3550: cancelTask (data-old-onclick)
    - 3551: viewTaskResult (data-old-onclick)

  - `webui/templates/config.html`
    - 105: save-config (data-old-onclick)
    - 106: save-all-config (data-old-onclick)
    - 107: reset-config (data-old-onclick)
    - 108: reset-all-config (data-old-onclick)
    - 109: create-backup (data-old-onclick)

Medium priority
- Important but not core navigation; fix after high-priority items:
  - `webui/templates/index-new-bak.html` (multiple entries: Start/Stop scan, Upload/Refresh/Clear/Delete, preview controls)
  - `webui/templates/index-new-bak2.html` (same set of controls)
  - `webui/templates/index-old.html` (legacy page copies)

Low priority
- Likely backups or duplicate templates; safe to defer:
  - any copy/backups not referenced by the active template engine (e.g., `index-new-bak.html`, `index-new-bak2.html` may be duplicates — confirm with the team before editing)

Complete findings (raw)
----------------------
The preflight script output (exact file:line snippet) follows. Use this as a canonical list when producing fixes.

```
/home/twik/文档/RPT/webui/templates/index-new-bak2.html:
  528: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  529: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  796: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()"  class="btn btn-primary">Upload Files</button>
  800: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  801: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  802: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  803: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  921: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  922: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>

/home/twik/文档/RPT/webui/templates/config.html:
  105: <button class="btn btn-primary" data-action="save-config" data-old-onclick="saveCurrentSection()">保存当前章节</button>
  106: <button class="btn btn-success" data-action="save-all-config" data-old-onclick="saveAllConfig()">保存所有配置</button>
  107: <button class="btn btn-warning" data-action="reset-config" data-old-onclick="resetCurrentSection()">重置当前章节</button>
  108: <button class="btn btn-danger" data-action="reset-all-config" data-old-onclick="resetAllConfig()">重置所有配置</button>
  109: <button class="btn btn-info" data-action="create-backup" data-old-onclick="createBackup()">创建备份</button>

/home/twik/文档/RPT/webui/templates/index.html:
  595: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  596: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  863: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  864: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  865: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  866: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  982: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  983: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>

/home/twik/文档/RPT/webui/templates/index-old.html:
  116: <button type="button" class="btn btn-primary btn-sm" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">开始扫描</button>
  117: <button type="button" class="btn btn-danger btn-sm" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">停止扫描</button>
  234: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()">Upload Files</button>
  235: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()">Refresh List</button>
  236: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()">Clear Plots</button>
  237: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn-danger">Delete All</button>
  421: <button class="btn btn-sm btn-secondary" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  422: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>

/home/twik/文档/RPT/webui/templates/index-new-bak.html:
  399: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  400: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  667: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()"  class="btn btn-primary">Upload Files</button>
  668: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  669: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  670: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  671: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  787: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  788: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>

/home/twik/文档/RPT/webui/static/app.js:
  1735: <button class="file-action-button file-action-button--analyze"  data-action="select-and-analyze-file" data-arg-file="${filename}" data-old-onclick="rptUI.selectAndAnalyzeFile(\\'${filename}\\')">
  1738: <button class="file-action-button file-action-button--download"  data-action="download-file" data-arg-file="${filename}" data-old-onclick="rptUI.downloadFile(\\'${filename}\\')">
  1741: <button class="file-action-button file-action-button--info"  data-action="show-file-info" data-arg-file="${filename}" data-old-onclick="rptUI.showFileInfo(\\'${filename}\\')">
  1744: <button class="file-action-button file-action-button--delete"  data-action="delete-file" data-arg-file="${filename}" data-old-onclick="rptUI.deleteFile(\\'${filename}\\')">
  3550: if (status === 'running') return `<button class="btn-small btn-cancel"  data-action="cancel-task" data-arg-file="${taskId}" data-old-onclick="rptUI.cancelTask(\\'${taskId}\\')">Cancel</button>`;
  3551: if (status === 'finished' || status === 'completed') return `<button class="btn-small btn-view"  data-action="view-task-result" data-arg-file="${taskId}" data-old-onclick="rptUI.viewTaskResult(\\'${taskId}\\')">View</button>`;

``` 

Suggested remediation approach
-----------------------------
1. Small, verifiable commits — do not attempt a single giant change. Create `fix/remove-data-old-fallbacks` and push work-in-progress PRs fixing small batches (5–10) of high-priority items.
2. Pattern for fixes (preferred):
   - Ensure the element already has a `data-action` that the centralized router handles. If not, add `data-action="<name>"` and implement the handler in `webui/static/modules/register-action-handlers.js`.
   - Remove the `data-old-*` attribute only after the new handler has been verified in headless tests or a local browser run.
   - Example change (index.html):
     - Before: `<button data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>`
     - After: `<button data-action="start-scan">Start Scan</button>` (and ensure the router handles `start-scan`).

Verification steps
------------------
1. Run `python3 scripts/check-no-data-old.py` locally — it must report fewer findings as you fix items and eventually report "No data-old-* fallbacks found.".
2. Run the frontend test harness (Jest) where applicable. If frontend test infrastructure lives elsewhere (e.g., `webui/frontend`), run tests in that location.
3. Run `PYTHONPATH=. python -m pytest tests/ -k "not integration and not webui and not spectrum and not realtime"` to ensure backend tests are green.

Phase 1 plan (first sprint)
---------------------------
- Goal: Remove ~10 highest-impact `data-old-*` fallbacks (core pages and runtime bundle hooks).
- Steps:
  1. Create branch: `git checkout -b fix/remove-data-old-fallbacks`.
  2. Pick 5 highest-priority items from this inventory.
  3. Implement handler changes in `webui/static/modules/register-action-handlers.js` (if missing) and/or ensure router supports the `data-action` names used.
  4. Remove `data-old-*` attributes for those elements, commit, and open PR.
  5. Run preflight & tests on PR; iterate until green.

Next actions I can take for you
------------------------------
- I can create the `technical-debt-inventory.md` file (done) and push it (done).
- I can prepare a starter branch `fix/remove-data-old-fallbacks` with the first 5 suggested fixes as a draft PR for you to review. (requires confirmation)
- I can add an automated fixer script that proposes changes as a patch (for review) — lower risk if run locally first.

Contact / ownership
-------------------
If you approve, I will prepare the Phase 1 PR with the first small batch of fixes (5 items). Please confirm preferred mode: manual fixes (I apply small changes) or generate candidate patches for review.
/home/twik/文档/RPT/webui/templates/index-new-bak2.html:
  528: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  529: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  796: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()"  class="btn btn-primary">Upload Files</button>
  800: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  801: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  802: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  803: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  921: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  922: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/templates/config.html:
  105: <button class="btn btn-primary" data-action="save-config" data-old-onclick="saveCurrentSection()">保存当前章节</button>
  106: <button class="btn btn-success" data-action="save-all-config" data-old-onclick="saveAllConfig()">保存所有配置</button>
  107: <button class="btn btn-warning" data-action="reset-config" data-old-onclick="resetCurrentSection()">重置当前章节</button>
  108: <button class="btn btn-danger" data-action="reset-all-config" data-old-onclick="resetAllConfig()">重置所有配置</button>
  109: <button class="btn btn-info" data-action="create-backup" data-old-onclick="createBackup()">创建备份</button>
/home/twik/文档/RPT/webui/templates/index.html:
  595: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  596: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  863: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  864: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  865: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  866: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  982: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  983: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/templates/index-old.html:
  116: <button type="button" class="btn btn-primary btn-sm" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">开始扫描</button>
  117: <button type="button" class="btn btn-danger btn-sm" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">停止扫描</button>
  234: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()">Upload Files</button>
  235: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()">Refresh List</button>
  236: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()">Clear Plots</button>
  237: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn-danger">Delete All</button>
  421: <button class="btn btn-sm btn-secondary" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  422: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/templates/index-new-bak.html:
  399: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  400: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  667: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()"  class="btn btn-primary">Upload Files</button>
  668: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  669: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  670: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  671: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  787: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  788: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/static/app.js:
  1735: <button class="file-action-button file-action-button--analyze"  data-action="select-and-analyze-file" data-arg-file="${filename}" data-old-onclick="rptUI.selectAndAnalyzeFile(\'${filename}\')">
  1738: <button class="file-action-button file-action-button--download"  data-action="download-file" data-arg-file="${filename}" data-old-onclick="rptUI.downloadFile(\'${filename}\')">
  1741: <button class="file-action-button file-action-button--info"  data-action="show-file-info" data-arg-file="${filename}" data-old-onclick="rptUI.showFileInfo(\'${filename}\')">
  1744: <button class="file-action-button file-action-button--delete"  data-action="delete-file" data-arg-file="${filename}" data-old-onclick="rptUI.deleteFile(\'${filename}\')">
  3550: if (status === 'running') return `<button class="btn-small btn-cancel"  data-action="cancel-task" data-arg-file="${taskId}" data-old-onclick="rptUI.cancelTask(\'${taskId}\')">Cancel</button>`;
  3551: if (status === 'finished' || status === 'completed') return `<button class="btn-small btn-view"  data-action="view-task-result" data-arg-file="${taskId}" data-old-onclick="rptUI.viewTaskResult(\'${taskId}\')">View</button>`;
Found 45 data-old-* fallback occurrences. Please remove them before merging.
