const fs = require('fs');
const path = require('path');

beforeEach(() => {
  delete window.__RPT_actionDelegates;
  window.rptUI = {
    showFileInfo: jest.fn(),
  };

  const filePath = path.resolve(__dirname, '../../webui/static/init-action-delegates.js');
  const scriptContent = fs.readFileSync(filePath, 'utf8');
  const s = document.createElement('script'); s.textContent = scriptContent; document.head.appendChild(s);
});

test('delegates show-file-info to rptUI.showFileInfo', () => {
  const btn = document.createElement('button');
  btn.dataset.action = 'show-file-info';
  btn.dataset.argFile = 'info_file.h5';
  document.body.appendChild(btn);

  btn.click();

  expect(window.rptUI.showFileInfo).toHaveBeenCalledWith('info_file.h5');
});
