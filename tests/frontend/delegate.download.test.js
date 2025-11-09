const fs = require('fs');
const path = require('path');

beforeEach(() => {
  // reset environment
  delete window.__RPT_actionDelegates;
  window.rptUI = {
    downloadFile: jest.fn(),
  };
  window.open = jest.fn();

  const script = fs.readFileSync(path.resolve(__dirname, '../../webui/static/init-action-delegates.js'), 'utf8');
  const s = document.createElement('script');
  s.textContent = script;
  document.head.appendChild(s);
});

test('delegates download-file to rptUI.downloadFile when available', () => {
  const btn = document.createElement('button');
  btn.dataset.action = 'download-file';
  btn.dataset.argFile = 'my_test_file.h5';
  document.body.appendChild(btn);

  btn.click();

  expect(window.rptUI.downloadFile).toHaveBeenCalledWith('my_test_file.h5');
});
