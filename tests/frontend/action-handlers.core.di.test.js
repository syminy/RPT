/** @jest-environment jsdom */
const core = require('../../webui/static/modules/action-handlers.core.js');

describe('action-handlers.core (DI)', () => {
  test('download-file handler uses injected rptUI', () => {
    const handlers = core.handlers;
    const mockRptUI = { downloadFile: jest.fn() };
    const el = document.createElement('a'); el.dataset.file = 'injected.h5';
    handlers.downloadFileHandler(null, el, { rptUI: mockRptUI });
    expect(mockRptUI.downloadFile).toHaveBeenCalledWith('injected.h5');
  });

  test('delete-file respects injected confirm and calls injected delete', () => {
    const handlers = core.handlers;
    const calls = [];
    const mockRptUI = { deleteFile: (f) => calls.push(['rpt', f]) };
    const el = document.createElement('button'); el.dataset.file = 'x.h5';

    // confirm false -> no call
    handlers.deleteFileHandler(null, el, { rptUI: mockRptUI, confirm: () => false });
    expect(calls.length).toBe(0);

    // confirm true -> call
    handlers.deleteFileHandler(null, el, { rptUI: mockRptUI, confirm: () => true });
    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual(['rpt', 'x.h5']);
  });

  test('cancel-task handler uses injected rptUI with task id', () => {
    const handlers = core.handlers;
    const mock = { cancelTask: jest.fn() };
    const el = document.createElement('div'); el.dataset.taskid = 'T-1';
    handlers.cancelTaskHandler(null, el, { rptUI: mock });
    expect(mock.cancelTask).toHaveBeenCalledWith('T-1');
  });
});
