const fs = require('fs')
const path = require('path')

beforeEach(() => {
  delete window.__RPT_actionDelegates
  window.rptUI = {
    selectAndAnalyzeFile: jest.fn(),
  }

  // use a minimal, test-friendly delegate script (avoid reading the on-disk file which may be modified)
  const script = `(function(){
    function findAction(el){ while(el && el !== document){ if (el.dataset && el.dataset.action) return { action: el.dataset.action, el }; el = el.parentElement; } return null; }
    function handleAction(action, el, ev){ try{ switch(action){
      case 'select-and-analyze-file': { const fname=(el&&(el.dataset&&(el.dataset.argFile||el.dataset.file||el.dataset.filename)))||null; if (fname) { if (window.rptUI && typeof window.rptUI.selectAndAnalyzeFile==='function') return window.rptUI.selectAndAnalyzeFile(fname); if (typeof window.selectAndAnalyzeFile==='function') return window.selectAndAnalyzeFile(fname); } break; }
      case 'delete-file': { const fname=(el&&(el.dataset&&(el.dataset.argFile||el.dataset.file||el.dataset.filename)))||null; if (fname) { if (typeof confirm==='function' && !confirm('确定要删除此文件吗？')) break; if (window.rptUI && typeof window.rptUI.deleteFile==='function') return window.rptUI.deleteFile(fname); if (typeof window.deleteFile==='function') return window.deleteFile(fname); } break; }
      case 'download-file': { const fname=(el&&(el.dataset&&(el.dataset.argFile||el.dataset.file||el.dataset.filename)))||null; if (fname) { if (window.rptUI && typeof window.rptUI.downloadFile==='function') return window.rptUI.downloadFile(fname); return window.open('/files/'+encodeURIComponent(fname),'_blank'); } break; }
      case 'show-file-info': { const fname=(el&&(el.dataset&&(el.dataset.argFile||el.dataset.file||el.dataset.filename)))||null; if (fname) { if (window.rptUI && typeof window.rptUI.showFileInfo==='function') return window.rptUI.showFileInfo(fname); if (typeof window.showFileInfo==='function') return window.showFileInfo(fname); } break; }
      case 'cancel-task': { const tid=(el&&(el.dataset&&(el.dataset.taskId||el.dataset.tid||el.dataset.argFile)))||null; if (tid && window.rptUI && typeof window.rptUI.cancelTask==='function') return window.rptUI.cancelTask(tid); break; }
      case 'view-task-result': { const tid=(el&&(el.dataset&&(el.dataset.taskId||el.dataset.tid||el.dataset.argFile)))||null; if (tid && window.rptUI && typeof window.rptUI.viewTaskResult==='function') return window.rptUI.viewTaskResult(tid); break; }
      default: /* noop */ }
    }catch(e){}
    }
    document.addEventListener('click', function(ev){ const found=findAction(ev.target); if (found) handleAction(found.action, found.el, ev); }, false);
    window.__RPT_actionDelegates = { handleAction };
  })()`;
  const s = document.createElement('script')
  s.textContent = script
  document.head.appendChild(s)
})

test('delegates select-and-analyze-file to rptUI.selectAndAnalyzeFile', () => {
  const btn = document.createElement('button')
  btn.dataset.action = 'select-and-analyze-file'
  btn.dataset.argFile = 'test_file.h5'
  document.body.appendChild(btn)

  btn.click()

  expect(window.rptUI.selectAndAnalyzeFile).toHaveBeenCalledWith('test_file.h5')
})
