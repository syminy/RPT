// Register common action handlers with the central action router (if present)
(function(){
  function register(router){
    try {
      router.registerAction('start-stream', (ev, el) => {
        if (window.rptUI && typeof window.rptUI.startStreaming === 'function') return window.rptUI.startStreaming(ev);
        if (typeof window.startStreaming === 'function') return window.startStreaming(ev);
      });

      router.registerAction('stop-stream', (ev, el) => {
        if (window.rptUI && typeof window.rptUI.stopStreaming === 'function') return window.rptUI.stopStreaming(ev);
        if (typeof window.stopStreaming === 'function') return window.stopStreaming(ev);
      });

      // File / UI actions
      router.registerAction('upload-files', (ev, el) => {
        const fi = document.getElementById('fileInput');
        if (fi) fi.click();
      });

      router.registerAction('refresh-list', (ev, el) => {
        if (typeof window.refreshFileListDebug === 'function') return window.refreshFileListDebug(ev);
        if (window.rptUI && typeof window.rptUI.loadFileList === 'function') return window.rptUI.loadFileList(ev);
      });

      router.registerAction('clear-plots', (ev, el) => {
        // Clear analysis/preview plots - prefer rptUI API if available, fall back to global function
        if (window.rptUI && typeof window.rptUI.clearAllPlots === 'function') return window.rptUI.clearAllPlots(ev);
        if (typeof window.clearAllPlots === 'function') return window.clearAllPlots(ev);
      });

      router.registerAction('delete-all', (ev, el) => {
        if (confirm && !confirm('确定要删除所有文件吗？')) return;
        if (window.rptUI && typeof window.rptUI.deleteAllFiles === 'function') return window.rptUI.deleteAllFiles(ev);
      });
      
      router.registerAction('close-preview', (ev, el) => {
        if (window.rptUI && typeof window.rptUI.closePreview === 'function') return window.rptUI.closePreview(ev);
      });

      router.registerAction('analyze-preview', (ev, el) => {
        if (window.rptUI && typeof window.rptUI.analyzeFromPreview === 'function') return window.rptUI.analyzeFromPreview(ev);
      });

      router.registerAction('select-and-analyze-file', (ev, el) => {
        const fname = (el && (el.dataset && (el.dataset.argFile || el.dataset.file || el.dataset.filename))) || null;
        if (fname) {
          if (window.rptUI && typeof window.rptUI.selectAndAnalyzeFile === 'function') return window.rptUI.selectAndAnalyzeFile(fname);
          if (typeof window.selectAndAnalyzeFile === 'function') return window.selectAndAnalyzeFile(fname);
        }
      });

      // Select a file (used by generated file list radios)
      router.registerAction('select-file', (ev, el) => {
        const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null;
        if (!fname) return;
        if (window.rptUI && typeof window.rptUI.selectFile === 'function') return window.rptUI.selectFile(fname);
        if (typeof window.selectFile === 'function') return window.selectFile(fname);
      });

      // File-specific actions used by generated templates
      router.registerAction('download-file', (ev, el) => {
        const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null;
        if (!fname) return;
        if (window.rptUI && typeof window.rptUI.downloadFile === 'function') return window.rptUI.downloadFile(fname);
        if (typeof window.downloadFile === 'function') return window.downloadFile(fname);
      });

      router.registerAction('show-file-info', (ev, el) => {
        const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null;
        if (!fname) return;
        if (window.rptUI && typeof window.rptUI.showFileInfo === 'function') return window.rptUI.showFileInfo(fname);
        if (typeof window.showFileInfo === 'function') return window.showFileInfo(fname);
      });

      router.registerAction('delete-file', (ev, el) => {
        const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null;
        if (!fname) return;
        if (confirm && !confirm('确定要删除 ' + fname + ' 吗？')) return;
        if (window.rptUI && typeof window.rptUI.deleteFile === 'function') return window.rptUI.deleteFile(fname);
        if (typeof window.deleteFile === 'function') return window.deleteFile(fname);
      });

      router.registerAction('cancel-task', (ev, el) => {
        const taskId = el && el.dataset && el.dataset.taskid;
        if (!taskId) return;
        if (window.rptUI && typeof window.rptUI.cancelTask === 'function') return window.rptUI.cancelTask(taskId);
        if (typeof window.cancelTask === 'function') return window.cancelTask(taskId);
      });

      router.registerAction('view-task-result', (ev, el) => {
        const taskId = el && el.dataset && el.dataset.taskid;
        if (!taskId) return;
        if (window.rptUI && typeof window.rptUI.viewTaskResult === 'function') return window.rptUI.viewTaskResult(taskId);
        if (typeof window.viewTaskResult === 'function') return window.viewTaskResult(taskId);
      });

      // Configuration page actions
      router.registerAction('save-config', (ev, el) => {
        if (window.configPage && typeof window.configPage.saveCurrentSection === 'function') return window.configPage.saveCurrentSection(ev);
        if (typeof window.saveCurrentSection === 'function') return window.saveCurrentSection(ev);
      });

      router.registerAction('save-all-config', (ev, el) => {
        if (window.configPage && typeof window.configPage.saveAllConfig === 'function') return window.configPage.saveAllConfig(ev);
        if (typeof window.saveAllConfig === 'function') return window.saveAllConfig(ev);
      });

      router.registerAction('reset-config', (ev, el) => {
        if (window.configPage && typeof window.configPage.resetCurrentSection === 'function') return window.configPage.resetCurrentSection(ev);
        if (typeof window.resetCurrentSection === 'function') return window.resetCurrentSection(ev);
      });

      router.registerAction('reset-all-config', (ev, el) => {
        if (window.configPage && typeof window.configPage.resetAllConfig === 'function') return window.configPage.resetAllConfig(ev);
        if (typeof window.resetAllConfig === 'function') return window.resetAllConfig(ev);
      });

      router.registerAction('create-backup', (ev, el) => {
        if (window.configPage && typeof window.configPage.createBackup === 'function') return window.configPage.createBackup(ev);
        if (typeof window.createBackup === 'function') return window.createBackup(ev);
      });
    } catch(e) {
      console.error('register-action-handlers error', e);
    }
  }

  // Wrapper: prefer extracted core module in CommonJS environments
  if (typeof module !== 'undefined' && module.exports) {
    try {
      const core = require('./action-handlers.core.js');
      if (core && typeof core.register === 'function') core.register(require('./action-router'));
    } catch(e) {
      // If action-router isn't available at build time, still attempt to register at runtime
      try {
        const ar = require('./action-router');
        if (ar && typeof ar.registerAction === 'function') register(ar);
      } catch(_) { /* ignore */ }
    }
  } else {
    // Browser globals usage: if a global router exists, register handlers into it.
    if (typeof window !== 'undefined') {
      window.rptActions = window.rptActions || {};
      try {
        if (typeof window.rptActions.registerAction === 'function') {
          register(window.rptActions);
        } else {
          // ensure registerAction exists as a noop to allow later registration
          window.rptActions.registerAction = window.rptActions.registerAction || function(){};
        }
      } catch(e) { console.error('register-action-handlers browser registration error', e); }
    }
  }
})();

// CommonJS export when available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
