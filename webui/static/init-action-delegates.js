/* init-action-delegates.clean.js
 * Clean canonical delegate shim used by tests until authoritative file is ready.
 */
(function(){
  'use strict';

  function findAction(el){
    while(el && el !== document){
      if(el.dataset && el.dataset.action) return { action: el.dataset.action, el: el };
      el = el.parentElement;
    }
    return null;
  }

  function downloadFallback(fname){
    try{ return window.open('/files/'+encodeURIComponent(fname),'_blank'); }catch(e){}
  }

  function handleAction(action, el, ev){
    try{
      if(window.rptActions && typeof window.rptActions.handleAction === 'function'){
        try{ return window.rptActions.handleAction(action, ev, el); }catch(e){}
      }

      switch(action){
        case 'select-and-analyze-file': {
          var f = (el && el.dataset && (el.dataset.argFile||el.dataset.file||el.dataset.filename)) || null;
          if(f){ if(window.rptUI && typeof window.rptUI.selectAndAnalyzeFile === 'function') return window.rptUI.selectAndAnalyzeFile(f); if(typeof window.selectAndAnalyzeFile === 'function') return window.selectAndAnalyzeFile(f); }
          break;
        }
        case 'download-file': {
          var f2 = (el && el.dataset && (el.dataset.argFile||el.dataset.file||el.dataset.filename)) || null;
          if(f2){ if(window.rptUI && typeof window.rptUI.downloadFile === 'function') return window.rptUI.downloadFile(f2); return downloadFallback(f2); }
          break;
        }
        case 'show-file-info': {
          var finfo = (el && el.dataset && (el.dataset.argFile||el.dataset.file||el.dataset.filename)) || null;
          if(finfo){ if(window.rptUI && typeof window.rptUI.showFileInfo === 'function') return window.rptUI.showFileInfo(finfo); if(typeof window.showFileInfo === 'function') return window.showFileInfo(finfo); }
          break;
        }
        case 'delete-file': {
          var f3 = (el && el.dataset && (el.dataset.argFile||el.dataset.file||el.dataset.filename)) || null;
          if(f3){ if(typeof confirm === 'function' && !confirm('确定要删除此文件吗？')) break; if(window.rptUI && typeof window.rptUI.deleteFile === 'function') return window.rptUI.deleteFile(f3); if(typeof window.deleteFile === 'function') return window.deleteFile(f3); }
          break;
        }
        case 'cancel-task': {
          var tid = (el && el.dataset && (el.dataset.taskId||el.dataset.tid||el.dataset.argFile)) || null;
          if(tid && window.rptUI && typeof window.rptUI.cancelTask === 'function') return window.rptUI.cancelTask(tid);
          break;
        }
        case 'view-task-result': {
          var tid2 = (el && el.dataset && (el.dataset.taskId||el.dataset.tid||el.dataset.argFile)) || null;
          if(tid2 && window.rptUI && typeof window.rptUI.viewTaskResult === 'function') return window.rptUI.viewTaskResult(tid2);
          break;
        }
        default: break;
      }
    }catch(e){ if(window.console && typeof window.console.error === 'function') window.console.error('init-action-delegates.clean error', e); }
  }

  document.addEventListener('click', function(ev){ var f = findAction(ev.target); if(f) handleAction(f.action, f.el, ev); }, false);

  window.__RPT_actionDelegates = { handleAction: handleAction };

})();
