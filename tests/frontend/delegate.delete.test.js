const fs = require('fs');
const path = require('path');

beforeEach(() => {
  delete window.__RPT_actionDelegates;
  window.rptUI = {
    deleteFile: jest.fn(),
  };
  // auto-confirm deletion in tests
  window.confirm = () => true;

  const script = fs.readFileSync(path.resolve(__dirname, '../../webui/static/init-action-delegates.js'), 'utf8');
  const s = document.createElement('script');
  s.textContent = script;
  document.head.appendChild(s);
});

test('delegates delete-file to rptUI.deleteFile when confirmed', () => {
  const btn = document.createElement('button');
  btn.dataset.action = 'delete-file';
  btn.dataset.argFile = 'delete_me.h5';
  document.body.appendChild(btn);

  btn.click();

  expect(window.rptUI.deleteFile).toHaveBeenCalledWith('delete_me.h5');
});
