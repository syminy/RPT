/home/twik/文档/RPT/webui/templates/index-new-bak2.html:
  528: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  529: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  796: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()"  class="btn btn-primary">Upload Files</button>
  800: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  801: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  802: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  803: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  921: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  922: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/templates/config.html:
  105: <button class="btn btn-primary" data-action="save-config" data-old-onclick="saveCurrentSection()">保存当前章节</button>
  106: <button class="btn btn-success" data-action="save-all-config" data-old-onclick="saveAllConfig()">保存所有配置</button>
  107: <button class="btn btn-warning" data-action="reset-config" data-old-onclick="resetCurrentSection()">重置当前章节</button>
  108: <button class="btn btn-danger" data-action="reset-all-config" data-old-onclick="resetAllConfig()">重置所有配置</button>
  109: <button class="btn btn-info" data-action="create-backup" data-old-onclick="createBackup()">创建备份</button>
/home/twik/文档/RPT/webui/templates/index.html:
  982: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  983: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/templates/index-old.html:
  116: <button type="button" class="btn btn-primary btn-sm" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">开始扫描</button>
  117: <button type="button" class="btn btn-danger btn-sm" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">停止扫描</button>
  234: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()">Upload Files</button>
  235: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()">Refresh List</button>
  236: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()">Clear Plots</button>
  237: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn-danger">Delete All</button>
  421: <button class="btn btn-sm btn-secondary" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  422: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/templates/index-new-bak.html:
  399: <button type="button" class="btn btn-primary" id="start-scan-btn" data-action="start-scan" data-old-onclick="startSpectrumScan()">Start Scan</button>
  400: <button type="button" class="btn" id="stop-scan-btn" data-action="stop-scan" data-old-onclick="stopSpectrumScan()">Stop Scan</button>
  667: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()"  class="btn btn-primary">Upload Files</button>
  668: <button data-action="upload-files" data-old-onclick="document.getElementById('fileInput').click()" class="btn btn-primary">Upload Files</button>
  669: <button data-action="refresh-list" data-old-onclick="refreshFileListDebug()" class="btn">Refresh List</button>
  670: <button data-action="clear-plots" data-old-onclick="rptUI.clearAllPlots()" class="btn">Clear Plots</button>
  671: <button data-action="delete-all" data-old-onclick="rptUI.deleteAllFiles()" class="btn">Delete All</button>
  787: <button class="btn btn-sm" data-action="close-preview" data-old-onclick="rptUI.closePreview()">Close</button>
  788: <button class="btn btn-sm btn-primary" data-action="analyze-preview" data-old-onclick="rptUI.analyzeFromPreview()">Full Analysis</button>
/home/twik/文档/RPT/webui/static/app.js:
  1735: <button class="file-action-button file-action-button--analyze"  data-action="select-and-analyze-file" data-arg-file="${filename}" data-old-onclick="rptUI.selectAndAnalyzeFile(\'${filename}\')">
  1738: <button class="file-action-button file-action-button--download"  data-action="download-file" data-arg-file="${filename}" data-old-onclick="rptUI.downloadFile(\'${filename}\')">
  1741: <button class="file-action-button file-action-button--info"  data-action="show-file-info" data-arg-file="${filename}" data-old-onclick="rptUI.showFileInfo(\'${filename}\')">
  1744: <button class="file-action-button file-action-button--delete"  data-action="delete-file" data-arg-file="${filename}" data-old-onclick="rptUI.deleteFile(\'${filename}\')">
  3550: if (status === 'running') return `<button class="btn-small btn-cancel"  data-action="cancel-task" data-arg-file="${taskId}" data-old-onclick="rptUI.cancelTask(\'${taskId}\')">Cancel</button>`;
  3551: if (status === 'finished' || status === 'completed') return `<button class="btn-small btn-view"  data-action="view-task-result" data-arg-file="${taskId}" data-old-onclick="rptUI.viewTaskResult(\'${taskId}\')">View</button>`;
Found 39 data-old-* fallback occurrences. Please remove them before merging.
