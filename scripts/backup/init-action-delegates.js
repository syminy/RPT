// Event delegation to support data-action attributes as a safe overlay
// This file adds handlers that call existing global functions as a fallback.
(function(){
  if (typeof window === 'undefined') return
  function findAction(el){
    while(el && el !== document) {
      if (el.dataset && el.dataset.action) return {action: el.dataset.action, el}
      el = el.parentNode
    }
    return null
  }

  function handleAction(action, el, ev){
    try {
      switch(action){
        case 'start-scan': if (typeof window.startSpectrumScan === 'function') window.startSpectrumScan(ev); break
        case 'stop-scan': if (typeof window.stopSpectrumScan === 'function') window.stopSpectrumScan(ev); break
        case 'upload-files': { const fi = document.getElementById('fileInput'); if (fi) fi.click(); break }
        case 'refresh-list': if (typeof window.refreshFileListDebug === 'function') window.refreshFileListDebug(ev); break
        case 'clear-plots': if (window.rptUI && typeof window.rptUI.clearAllPlots==='function') window.rptUI.clearAllPlots(ev); break
        case 'delete-all': if (window.rptUI && typeof window.rptUI.deleteAllFiles==='function') window.rptUI.deleteAllFiles(ev); break
        case 'close-preview': if (window.rptUI && typeof window.rptUI.closePreview==='function') window.rptUI.closePreview(ev); break
        case 'analyze-preview': if (window.rptUI && typeof window.rptUI.analyzeFromPreview==='function') window.rptUI.analyzeFromPreview(ev); break
        // Config page delegated actions
        case 'save-config':
          if (typeof window.saveCurrentSection === 'function') {
            try { window.saveCurrentSection(ev); } catch(e){ console.error('save-config handler error', e) }
          }
          break
        case 'save-all-config':
          if (typeof window.saveAllConfig === 'function') {
            try { window.saveAllConfig(ev); } catch(e){ console.error('save-all-config handler error', e) }
          }
          break
        case 'reset-config':
          // destructive - ask for confirmation first
          if (confirm && !confirm('这是一个破坏性操作，确定要重置当前章节吗？')) break
          if (typeof window.resetCurrentSection === 'function') {
            try { window.resetCurrentSection(ev); } catch(e){ console.error('reset-config handler error', e) }
          }
          break
        case 'reset-all-config':
          if (confirm && !confirm('这是一个破坏性操作，确定要重置所有配置吗？')) break
          if (typeof window.resetAllConfig === 'function') {
            try { window.resetAllConfig(ev); } catch(e){ console.error('reset-all-config handler error', e) }
          }
          break
        case 'create-backup':
          if (typeof window.createBackup === 'function') {
            try { window.createBackup(ev); } catch(e){ console.error('create-backup handler error', e) }
          }
          break
        default:
          // unknown action: noop
      }
    } catch(e){
      console.error('action handler error', action, e)
    }
  }

  document.addEventListener('click', function(ev){
    const found = findAction(ev.target)
    if (found) {
      handleAction(found.action, found.el, ev)
    }
  }, false)

  // expose a small API for tests
  window.__RPT_actionDelegates = { handleAction }
})()
