const fs = require('fs');
const path = require('path');

beforeEach(() => {
  delete window.__RPT_actionDelegates;
  window.rptUI = {
    cancelTask: jest.fn(),
    viewTaskResult: jest.fn(),
  };

  const script = fs.readFileSync(path.resolve(__dirname, '../../webui/static/init-action-delegates.js'), 'utf8');
  const s = document.createElement('script');
  s.textContent = script;
  document.head.appendChild(s);
});

test('delegates cancel-task to rptUI.cancelTask', () => {
  const btn = document.createElement('button');
  btn.dataset.action = 'cancel-task';
  // shim reads taskId | tid | argFile for task id
  btn.dataset.taskId = 'task-123';
  document.body.appendChild(btn);

  btn.click();

  expect(window.rptUI.cancelTask).toHaveBeenCalledWith('task-123');
});

test('delegates view-task-result to rptUI.viewTaskResult', () => {
  const btn = document.createElement('button');
  btn.dataset.action = 'view-task-result';
  btn.dataset.taskId = 'task-xyz';
  document.body.appendChild(btn);

  btn.click();

  expect(window.rptUI.viewTaskResult).toHaveBeenCalledWith('task-xyz');
});
