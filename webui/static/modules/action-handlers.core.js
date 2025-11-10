// Extracted action handlers (registers handlers on a router or exposes handlers for tests)
(function(exports){
  // Handlers accept an optional context as third parameter for dependency injection
  function _getCtx(ctx){
    // ctx can override rptUI, globals, confirm, document
    const g = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
    return Object.assign({
      rptUI: g.rptUI,
      globals: g,
      confirm: (typeof g.confirm === 'function') ? g.confirm : undefined,
      document: (typeof g.document === 'object') ? g.document : undefined
    }, ctx || {});
  }

  function _callRptUI(ctx, methodName, ...args){
    const c = _getCtx(ctx);
    if (c.rptUI && typeof c.rptUI[methodName] === 'function') return c.rptUI[methodName](...args);
    if (c.globals && typeof c.globals[methodName] === 'function') return c.globals[methodName](...args);
  }

  function startStreamHandler(ev, el, ctx){ return _callRptUI(ctx, 'startStreaming', ev); }
  function stopStreamHandler(ev, el, ctx){ return _callRptUI(ctx, 'stopStreaming', ev); }
  function uploadFilesHandler(ev, el, ctx){ const doc = _getCtx(ctx).document; const fi = doc && doc.getElementById && doc.getElementById('fileInput'); if (fi && typeof fi.click === 'function') fi.click(); }
  function refreshListHandler(ev, el, ctx){ const c = _getCtx(ctx); return (c.globals && typeof c.globals.refreshFileListDebug === 'function') ? c.globals.refreshFileListDebug(ev) : _callRptUI(ctx, 'loadFileList', ev); }
  function clearPlotsHandler(ev, el, ctx){ return _callRptUI(ctx, 'clearAllPlots', ev); }
  function deleteAllHandler(ev, el, ctx){ const c = _getCtx(ctx); if (typeof c.confirm === 'function' && !c.confirm('确定要删除所有文件吗？')) return; return _callRptUI(ctx, 'deleteAllFiles', ev); }
  function closePreviewHandler(ev, el, ctx){ return _callRptUI(ctx, 'closePreview', ev); }
  function analyzePreviewHandler(ev, el, ctx){ return _callRptUI(ctx, 'analyzeFromPreview', ev); }

  function _getFileNameFromEl(el){ return (el && el.dataset && (el.dataset.argFile || el.dataset.file || el.dataset.filename)) || null; }
  function selectAndAnalyzeHandler(ev, el, ctx){ const fname = _getFileNameFromEl(el); if (!fname) return; return _callRptUI(ctx, 'selectAndAnalyzeFile', fname); }
  function selectFileHandler(ev, el, ctx){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; return _callRptUI(ctx, 'selectFile', fname); }
  function downloadFileHandler(ev, el, ctx){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; return _callRptUI(ctx, 'downloadFile', fname); }
  function showFileInfoHandler(ev, el, ctx){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; return _callRptUI(ctx, 'showFileInfo', fname); }
  function deleteFileHandler(ev, el, ctx){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; const c = _getCtx(ctx); if (typeof c.confirm === 'function' && !c.confirm('确定要删除 ' + fname + ' 吗？')) return; return _callRptUI(ctx, 'deleteFile', fname); }

  function cancelTaskHandler(ev, el, ctx){ const taskId = el && el.dataset && el.dataset.taskid; if (!taskId) return; return _callRptUI(ctx, 'cancelTask', taskId); }
  function viewTaskResultHandler(ev, el, ctx){ const taskId = el && el.dataset && el.dataset.taskid; if (!taskId) return; return _callRptUI(ctx, 'viewTaskResult', taskId); }

  function saveConfigHandler(ev, el, ctx){ const c = _getCtx(ctx); return (c.globals && c.globals.configPage && typeof c.globals.configPage.saveCurrentSection === 'function') ? c.globals.configPage.saveCurrentSection(ev) : (typeof c.globals.saveCurrentSection === 'function' ? c.globals.saveCurrentSection(ev) : undefined); }
  function saveAllConfigHandler(ev, el, ctx){ const c = _getCtx(ctx); return (c.globals && c.globals.configPage && typeof c.globals.configPage.saveAllConfig === 'function') ? c.globals.configPage.saveAllConfig(ev) : (typeof c.globals.saveAllConfig === 'function' ? c.globals.saveAllConfig(ev) : undefined); }
  function resetConfigHandler(ev, el, ctx){ const c = _getCtx(ctx); return (c.globals && c.globals.configPage && typeof c.globals.configPage.resetCurrentSection === 'function') ? c.globals.configPage.resetCurrentSection(ev) : (typeof c.globals.resetCurrentSection === 'function' ? c.globals.resetCurrentSection(ev) : undefined); }
  function resetAllConfigHandler(ev, el, ctx){ const c = _getCtx(ctx); return (c.globals && c.globals.configPage && typeof c.globals.configPage.resetAllConfig === 'function') ? c.globals.configPage.resetAllConfig(ev) : (typeof c.globals.resetAllConfig === 'function' ? c.globals.resetAllConfig(ev) : undefined); }
  function createBackupHandler(ev, el, ctx){ const c = _getCtx(ctx); return (c.globals && c.globals.configPage && typeof c.globals.configPage.createBackup === 'function') ? c.globals.configPage.createBackup(ev) : (typeof c.globals.createBackup === 'function' ? c.globals.createBackup(ev) : undefined); }

  function register(router){
    try {
      router.registerAction('start-stream', startStreamHandler);
      router.registerAction('stop-stream', stopStreamHandler);
      router.registerAction('upload-files', uploadFilesHandler);
      router.registerAction('refresh-list', refreshListHandler);
      router.registerAction('clear-plots', clearPlotsHandler);
      router.registerAction('delete-all', deleteAllHandler);
      router.registerAction('close-preview', closePreviewHandler);
      router.registerAction('analyze-preview', analyzePreviewHandler);
      router.registerAction('select-and-analyze-file', selectAndAnalyzeHandler);
      router.registerAction('select-file', selectFileHandler);
      router.registerAction('download-file', downloadFileHandler);
      router.registerAction('show-file-info', showFileInfoHandler);
      router.registerAction('delete-file', deleteFileHandler);
      router.registerAction('cancel-task', cancelTaskHandler);
      router.registerAction('view-task-result', viewTaskResultHandler);
      router.registerAction('save-config', saveConfigHandler);
      router.registerAction('save-all-config', saveAllConfigHandler);
      router.registerAction('reset-config', resetConfigHandler);
      router.registerAction('reset-all-config', resetAllConfigHandler);
      router.registerAction('create-backup', createBackupHandler);
    } catch(e){ console.error('action-handlers core register error', e); }
  }

  exports.register = register;
  exports.handlers = {
    startStreamHandler,
    stopStreamHandler,
    uploadFilesHandler,
    refreshListHandler,
    clearPlotsHandler,
    deleteAllHandler,
    closePreviewHandler,
    analyzePreviewHandler,
    selectAndAnalyzeHandler,
    selectFileHandler,
    downloadFileHandler,
    showFileInfoHandler,
    deleteFileHandler,
    cancelTaskHandler,
    viewTaskResultHandler,
    saveConfigHandler,
    saveAllConfigHandler,
    resetConfigHandler,
    resetAllConfigHandler,
    createBackupHandler
  };

  if (typeof window !== 'undefined'){
    window.rptActionHandlers = window.rptActionHandlers || {};
    Object.assign(window.rptActionHandlers, exports.handlers);
  }
})(typeof exports === 'undefined' ? (this['actionHandlersCore']={}) : exports);
