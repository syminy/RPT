// Extracted action handlers (registers handlers on a router or exposes handlers for tests)
(function(exports){
  function _callRptUI(methodName, ...args){
    if (typeof window !== 'undefined' && window.rptUI && typeof window.rptUI[methodName] === 'function') return window.rptUI[methodName](...args);
    if (typeof window !== 'undefined' && typeof window[methodName] === 'function') return window[methodName](...args);
  }

  function startStreamHandler(ev, el){ return _callRptUI('startStreaming', ev); }
  function stopStreamHandler(ev, el){ return _callRptUI('stopStreaming', ev); }
  function uploadFilesHandler(ev, el){ const fi = document.getElementById('fileInput'); if (fi) fi.click(); }
  function refreshListHandler(ev, el){ return (typeof window !== 'undefined' && typeof window.refreshFileListDebug === 'function') ? window.refreshFileListDebug(ev) : _callRptUI('loadFileList', ev); }
  function clearPlotsHandler(ev, el){ return _callRptUI('clearAllPlots', ev); }
  function deleteAllHandler(ev, el){ if (typeof confirm === 'function' && !confirm('确定要删除所有文件吗？')) return; return _callRptUI('deleteAllFiles', ev); }
  function closePreviewHandler(ev, el){ return _callRptUI('closePreview', ev); }
  function analyzePreviewHandler(ev, el){ return _callRptUI('analyzeFromPreview', ev); }

  function _getFileNameFromEl(el){ return (el && el.dataset && (el.dataset.argFile || el.dataset.file || el.dataset.filename)) || null; }
  function selectAndAnalyzeHandler(ev, el){ const fname = _getFileNameFromEl(el); if (!fname) return; return _callRptUI('selectAndAnalyzeFile', fname); }
  function selectFileHandler(ev, el){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; return _callRptUI('selectFile', fname); }
  function downloadFileHandler(ev, el){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; return _callRptUI('downloadFile', fname); }
  function showFileInfoHandler(ev, el){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; return _callRptUI('showFileInfo', fname); }
  function deleteFileHandler(ev, el){ const fname = (el && el.dataset && (el.dataset.file || el.dataset.filename)) || null; if (!fname) return; if (typeof confirm === 'function' && !confirm('确定要删除 ' + fname + ' 吗？')) return; return _callRptUI('deleteFile', fname); }

  function cancelTaskHandler(ev, el){ const taskId = el && el.dataset && el.dataset.taskid; if (!taskId) return; return _callRptUI('cancelTask', taskId); }
  function viewTaskResultHandler(ev, el){ const taskId = el && el.dataset && el.dataset.taskid; if (!taskId) return; return _callRptUI('viewTaskResult', taskId); }

  function saveConfigHandler(ev, el){ return (typeof window !== 'undefined' && window.configPage && typeof window.configPage.saveCurrentSection === 'function') ? window.configPage.saveCurrentSection(ev) : (typeof window.saveCurrentSection === 'function' ? window.saveCurrentSection(ev) : undefined); }
  function saveAllConfigHandler(ev, el){ return (typeof window !== 'undefined' && window.configPage && typeof window.configPage.saveAllConfig === 'function') ? window.configPage.saveAllConfig(ev) : (typeof window.saveAllConfig === 'function' ? window.saveAllConfig(ev) : undefined); }
  function resetConfigHandler(ev, el){ return (typeof window !== 'undefined' && window.configPage && typeof window.configPage.resetCurrentSection === 'function') ? window.configPage.resetCurrentSection(ev) : (typeof window.resetCurrentSection === 'function' ? window.resetCurrentSection(ev) : undefined); }
  function resetAllConfigHandler(ev, el){ return (typeof window !== 'undefined' && window.configPage && typeof window.configPage.resetAllConfig === 'function') ? window.configPage.resetAllConfig(ev) : (typeof window.resetAllConfig === 'function' ? window.resetAllConfig(ev) : undefined); }
  function createBackupHandler(ev, el){ return (typeof window !== 'undefined' && window.configPage && typeof window.configPage.createBackup === 'function') ? window.configPage.createBackup(ev) : (typeof window.createBackup === 'function' ? window.createBackup(ev) : undefined); }

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
