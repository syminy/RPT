const fs = require('fs');
const { JSDOM } = require('jsdom');

// Load the shim and app.js contents
const shimPath = './webui/static/init-action-delegates.js';
const shimCode = fs.readFileSync(shimPath, 'utf8');

(async () => {
  // Create a minimal DOM
  const dom = new JSDOM(`<!doctype html><html><body>
    <button id="btnAnalyze" data-action="select-and-analyze-file" data-arg-file="testfile.h5">Analyze</button>
    <button id="btnDownload" data-action="download-file" data-arg-file="testfile.h5">Download</button>
    <button id="btnInfo" data-action="show-file-info" data-arg-file="testfile.h5">Info</button>
    <button id="btnDelete" data-action="delete-file" data-arg-file="testfile.h5">Delete</button>
  </body></html>`, { runScripts: "dangerously", resources: "usable" });

  const { window } = dom;

  // Provide a fake rptUI with methods that flip flags when invoked
  window.rptUI = {
    _called: {},
    selectAndAnalyzeFile: function(f){ this._called.select = f },
    downloadFile: function(f){ this._called.download = f },
    showFileInfo: function(f){ this._called.info = f },
    deleteFile: function(f){ this._called.delete = f },
  };

  // Evaluate the shim inside the window
  try {
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = shimCode;
    window.document.body.appendChild(scriptEl);
  } catch (e) {
    console.error('Failed to load shim into DOM', e);
    process.exit(2);
  }

  // Simulate clicks
  const click = (id) => {
    const el = window.document.getElementById(id);
    if (!el) { console.error('Element not found', id); process.exit(3); }
    const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
  };

  click('btnAnalyze');
  click('btnDownload');
  click('btnInfo');
  // For delete, the shim asks for confirm; override confirm to always true
  window.confirm = () => true;
  click('btnDelete');

  // Check results
  const called = window.rptUI._called;
  const pass = called.select === 'testfile.h5' && called.download === 'testfile.h5' && called.info === 'testfile.h5' && called.delete === 'testfile.h5';

  console.log('Delegation test result:', pass ? 'PASS' : 'FAIL');
  if (!pass) {
    console.log('rptUI._called =', JSON.stringify(called, null, 2));
    process.exit(4);
  }
  process.exit(0);
})();
