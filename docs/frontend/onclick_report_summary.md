# Inline onclick usage report — 摘要

报告位置: `reports/onclick_report_2025-11-09T05-27-43-164Z.csv`

概览:

- 扫描路径：`webui/templates` 与 `webui/static`
- 总计发现 51 处非注释的 `onclick=` 使用（详见 CSV 报告）

优先级建议：

1. 先对用户界面的关键交互（Start/Stop Scan、Upload Files、Refresh List、Clear Plots、Delete All、Preview/Analyze）添加 `data-action` 属性并通过事件委托处理（已在仓库添加 `webui/static/init-action-delegates.js`）。
2. 逐步替换内联 `onclick`：在小 PR 中先只添加 `data-action`（保留原 onclick 作为回退），验证行为一致后再移除 onclick。
3. 使用 `reports/onclick_report_*.csv` 作为回归检查依据，并在 PR 中附上对应的 CSV 报告条目或引用。

下一步：参见仓库根下的 `scripts/`，已添加生成报告与检查脚本：

- `scripts/generate-onclick-report.js` — 生成 CSV 报告
- `scripts/check-no-onclick.js` — CI 用的检查脚本（发现则返回非零）

如需按文件的分布详情/更细粒度拆分，我可以把 CSV 聚合为按文件计数并生成一个更详细的 HTML/Markdown 报表。
