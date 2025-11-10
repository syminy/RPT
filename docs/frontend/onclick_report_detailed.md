# Inline onclick detailed report

Source CSV: \reports/onclick_report_2025-11-09T05-27-43-164Z.csv  

Total occurrences: 51  

| File | Count | Example lines |
|---|---:|---|
| /home/twik/文档/RPT/webui/templates/index-new-bak.html | 8 | line 398: <button type=""button"" class=""btn btn-primary"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">Start Scan</button> <br> line 399: <button type=""button"" class=""btn"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">Stop Scan</button> <br> line 666: <button onclick=""document.getElementById('fileInput').click()"" class=""btn btn-primary"">Upload Files</button> |
| /home/twik/文档/RPT/webui/templates/index-new-bak2.html | 8 | line 526: <button type=""button"" class=""btn btn-primary"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">Start Scan</button> <br> line 527: <button type=""button"" class=""btn"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">Stop Scan</button> <br> line 794: <button onclick=""document.getElementById('fileInput').click()"" class=""btn btn-primary"">Upload Files</button> |
| /home/twik/文档/RPT/webui/templates/index-old.html | 8 | line 116: <button type=""button"" class=""btn btn-primary btn-sm"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">开始扫描</button> <br> line 117: <button type=""button"" class=""btn btn-danger btn-sm"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">停止扫描</button> <br> line 234: <button onclick=""document.getElementById('fileInput').click()"">Upload Files</button> |
| /home/twik/文档/RPT/webui/templates/index.html | 8 | line 595: <button type=""button"" class=""btn btn-primary"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">Start Scan</button> <br> line 596: <button type=""button"" class=""btn"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">Stop Scan</button> <br> line 863: <button onclick=""document.getElementById('fileInput').click()"" class=""btn btn-primary"">Upload Files</button> |
| /home/twik/文档/RPT/webui/static/app (副本).js | 7 | line 1735: <button class=""file-action-button file-action-button--analyze"" onclick=""rptUI.selectAndAnalyzeFile('${filename}')""> <br> line 1739: <button class=""file-action-button file-action-button--download"" onclick=""rptUI.downloadFile('${filename}')""> <br> line 1743: <button class=""file-action-button file-action-button--info"" onclick=""rptUI.showFileInfo('${filename}')""> |
| /home/twik/文档/RPT/webui/static/app.js | 7 | line 1735: <button class=""file-action-button file-action-button--analyze"" onclick=""rptUI.selectAndAnalyzeFile('${filename}')""> <br> line 1738: <button class=""file-action-button file-action-button--download"" onclick=""rptUI.downloadFile('${filename}')""> <br> line 1741: <button class=""file-action-button file-action-button--info"" onclick=""rptUI.showFileInfo('${filename}')""> |
| /home/twik/文档/RPT/webui/templates/config.html | 5 | line 105: <button class=""btn btn-primary"" onclick=""saveCurrentSection()"">保存当前章节</button> <br> line 106: <button class=""btn btn-success"" onclick=""saveAllConfig()"">保存所有配置</button> <br> line 107: <button class=""btn btn-warning"" onclick=""resetCurrentSection()"">重置当前章节</button> |


## Full per-file lists

### /home/twik/文档/RPT/webui/templates/index-new-bak.html — 8 occurrences

- line 398: `<button type=""button"" class=""btn btn-primary"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">Start Scan</button>`
- line 399: `<button type=""button"" class=""btn"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">Stop Scan</button>`
- line 666: `<button onclick=""document.getElementById('fileInput').click()"" class=""btn btn-primary"">Upload Files</button>`
- line 667: `<button onclick=""refreshFileListDebug()"" class=""btn"">Refresh List</button>`
- line 668: `<button onclick=""rptUI.clearAllPlots()"" class=""btn"">Clear Plots</button>`
- line 669: `<button onclick=""rptUI.deleteAllFiles()"" class=""btn"">Delete All</button>`
- line 785: `<button class=""btn btn-sm"" onclick=""rptUI.closePreview()"">Close</button>`
- line 786: `<button class=""btn btn-sm btn-primary"" onclick=""rptUI.analyzeFromPreview()"">Full Analysis</button>`

### /home/twik/文档/RPT/webui/templates/index-new-bak2.html — 8 occurrences

- line 526: `<button type=""button"" class=""btn btn-primary"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">Start Scan</button>`
- line 527: `<button type=""button"" class=""btn"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">Stop Scan</button>`
- line 794: `<button onclick=""document.getElementById('fileInput').click()"" class=""btn btn-primary"">Upload Files</button>`
- line 795: `<button onclick=""refreshFileListDebug()"" class=""btn"">Refresh List</button>`
- line 796: `<button onclick=""rptUI.clearAllPlots()"" class=""btn"">Clear Plots</button>`
- line 797: `<button onclick=""rptUI.deleteAllFiles()"" class=""btn"">Delete All</button>`
- line 913: `<button class=""btn btn-sm"" onclick=""rptUI.closePreview()"">Close</button>`
- line 914: `<button class=""btn btn-sm btn-primary"" onclick=""rptUI.analyzeFromPreview()"">Full Analysis</button>`

### /home/twik/文档/RPT/webui/templates/index-old.html — 8 occurrences

- line 116: `<button type=""button"" class=""btn btn-primary btn-sm"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">开始扫描</button>`
- line 117: `<button type=""button"" class=""btn btn-danger btn-sm"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">停止扫描</button>`
- line 234: `<button onclick=""document.getElementById('fileInput').click()"">Upload Files</button>`
- line 235: `<button onclick=""refreshFileListDebug()"">Refresh List</button>`
- line 236: `<button onclick=""rptUI.clearAllPlots()"">Clear Plots</button>`
- line 237: `<button onclick=""rptUI.deleteAllFiles()"" class=""btn-danger"">Delete All</button>`
- line 421: `<button class=""btn btn-sm btn-secondary"" onclick=""rptUI.closePreview()"">Close</button>`
- line 422: `<button class=""btn btn-sm btn-primary"" onclick=""rptUI.analyzeFromPreview()"">Full Analysis</button>`

### /home/twik/文档/RPT/webui/templates/index.html — 8 occurrences

- line 595: `<button type=""button"" class=""btn btn-primary"" id=""start-scan-btn"" onclick=""startSpectrumScan()"">Start Scan</button>`
- line 596: `<button type=""button"" class=""btn"" id=""stop-scan-btn"" onclick=""stopSpectrumScan()"">Stop Scan</button>`
- line 863: `<button onclick=""document.getElementById('fileInput').click()"" class=""btn btn-primary"">Upload Files</button>`
- line 864: `<button onclick=""refreshFileListDebug()"" class=""btn"">Refresh List</button>`
- line 865: `<button onclick=""rptUI.clearAllPlots()"" class=""btn"">Clear Plots</button>`
- line 866: `<button onclick=""rptUI.deleteAllFiles()"" class=""btn"">Delete All</button>`
- line 982: `<button class=""btn btn-sm"" onclick=""rptUI.closePreview()"">Close</button>`
- line 983: `<button class=""btn btn-sm btn-primary"" onclick=""rptUI.analyzeFromPreview()"">Full Analysis</button>`

### /home/twik/文档/RPT/webui/static/app (副本).js — 7 occurrences

- line 1735: `<button class=""file-action-button file-action-button--analyze"" onclick=""rptUI.selectAndAnalyzeFile('${filename}')"">`
- line 1739: `<button class=""file-action-button file-action-button--download"" onclick=""rptUI.downloadFile('${filename}')"">`
- line 1743: `<button class=""file-action-button file-action-button--info"" onclick=""rptUI.showFileInfo('${filename}')"">`
- line 1747: `<button class=""file-action-button file-action-button--delete"" onclick=""rptUI.deleteFile('${filename}')"">`
- line 3554: `if (status === 'running') return `<button class=""btn-small btn-cancel"" onclick=""rptUI.cancelTask('${taskId}')"">Cancel</button>`;`
- line 3555: `if (status === 'finished' || status === 'completed') return `<button class=""btn-small btn-view"" onclick=""rptUI.viewTaskResult('${taskId}')"">View</button>`;`
- line 5207: `let refreshBtn = document.querySelector('button[onclick=""refreshFileListDebug()""]');`

### /home/twik/文档/RPT/webui/static/app.js — 7 occurrences

- line 1735: `<button class=""file-action-button file-action-button--analyze"" onclick=""rptUI.selectAndAnalyzeFile('${filename}')"">`
- line 1738: `<button class=""file-action-button file-action-button--download"" onclick=""rptUI.downloadFile('${filename}')"">`
- line 1741: `<button class=""file-action-button file-action-button--info"" onclick=""rptUI.showFileInfo('${filename}')"">`
- line 1744: `<button class=""file-action-button file-action-button--delete"" onclick=""rptUI.deleteFile('${filename}')"">`
- line 3550: `if (status === 'running') return `<button class=""btn-small btn-cancel"" onclick=""rptUI.cancelTask('${taskId}')"">Cancel</button>`;`
- line 3551: `if (status === 'finished' || status === 'completed') return `<button class=""btn-small btn-view"" onclick=""rptUI.viewTaskResult('${taskId}')"">View</button>`;`
- line 5203: `let refreshBtn = document.querySelector('button[onclick=""refreshFileListDebug()""]');`

### /home/twik/文档/RPT/webui/templates/config.html — 5 occurrences

- line 105: `<button class=""btn btn-primary"" onclick=""saveCurrentSection()"">保存当前章节</button>`
- line 106: `<button class=""btn btn-success"" onclick=""saveAllConfig()"">保存所有配置</button>`
- line 107: `<button class=""btn btn-warning"" onclick=""resetCurrentSection()"">重置当前章节</button>`
- line 108: `<button class=""btn btn-danger"" onclick=""resetAllConfig()"">重置所有配置</button>`
- line 109: `<button class=""btn btn-info"" onclick=""createBackup()"">创建备份</button>`

