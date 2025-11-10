const fs = require('fs');
const path = require('path');

// Global test setup to ensure action delegates and common window.rptUI mocks
// are present consistently across CI and local environments.
beforeEach(() => {
  // avoid double-initialization
  delete window.__RPT_actionDelegates;

  // Provide common mocks used by several delegate tests
  window.rptUI = Object.assign({
    cancelTask: jest.fn(),
    viewTaskResult: jest.fn(),
    downloadFile: jest.fn(),
    showFileInfo: jest.fn(),
  }, window.rptUI || {});

  // Ensure window.open exists so delegation can fall back to it
  if (typeof window.open === 'undefined') window.open = jest.fn();

  // Inject the runtime delegation script into the DOM if not already present
  if (!window.__RPT_actionDelegates) {
    const filePath = path.resolve(__dirname, '../../webui/static/init-action-delegates.js');
    const scriptContent = fs.readFileSync(filePath, 'utf8');
    const s = document.createElement('script');
    s.textContent = scriptContent;
    document.head.appendChild(s);
  }
});
