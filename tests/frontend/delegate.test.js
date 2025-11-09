const fs = require('fs')
const path = require('path')

beforeEach(() => {
  delete window.__RPT_actionDelegates
  window.rptUI = {
    selectAndAnalyzeFile: jest.fn(),
  }

  const script = fs.readFileSync(path.resolve(__dirname, '../../webui/static/init-action-delegates.js'), 'utf8')
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
