/** @jest-environment jsdom */
const core = require('../../webui/static/modules/action-handlers.core.js');

describe('action-handlers.core', () => {
  beforeEach(() => {
    // reset window helpers
    global.window = global.window || {};
    window.rptUI = {};
    // mock router
    this.registered = {};
    this.router = { registerAction: (name, fn) => { this.registered[name] = fn; } };
  });

  test('register registers expected actions', () => {
    core.register(this.router);
    // expect some keys to be registered
    expect(typeof this.registered['download-file']).toBe('function');
    expect(typeof this.registered['select-file']).toBe('function');
    expect(typeof this.registered['start-stream']).toBe('function');
  });

  test('download-file handler calls window.rptUI.downloadFile or window.downloadFile', () => {
    let called = false;
    window.downloadFile = (f) => { called = f; };
    core.register(this.router);
    const handler = this.registered['download-file'];
    const el = document.createElement('a'); el.dataset.file = 'file1.h5';
    handler(null, el);
    expect(called).toBe('file1.h5');
  });

  test('delete-file handler respects confirm and calls delete function', () => {
    let called = false;
    // confirm returns false -> should not call
    window.confirm = () => false;
    window.deleteFile = () => { called = true; };
    core.register(this.router);
    const handler = this.registered['delete-file'];
    const el = document.createElement('button'); el.dataset.file = 'deleteme.h5';
    handler(null, el);
    expect(called).toBe(false);

    // confirm returns true -> should call
    window.confirm = () => true;
    handler(null, el);
    expect(called).toBe(true);
  });

  test('cancel-task and view-task-result call rptUI methods with task id', () => {
    window.rptUI = { cancelTask: jest.fn(), viewTaskResult: jest.fn() };
    core.register(this.router);
    const cancelHandler = this.registered['cancel-task'];
    const viewHandler = this.registered['view-task-result'];
    const el1 = document.createElement('div'); el1.dataset.taskid = 'task-123';
    cancelHandler(null, el1);
    viewHandler(null, el1);
    expect(window.rptUI.cancelTask).toHaveBeenCalledWith('task-123');
    expect(window.rptUI.viewTaskResult).toHaveBeenCalledWith('task-123');
  });

  test('handler propagates errors from rptUI', () => {
    // Make rptUI.deleteFile throw
    window.rptUI = { deleteFile: () => { throw new Error('boom'); } };
    core.register(this.router);
    const handler = this.registered['delete-file'];
    const el = document.createElement('button'); el.dataset.file = 'bad.h5';
    window.confirm = () => true;
    expect(() => handler(null, el)).toThrow('boom');
  });
});
