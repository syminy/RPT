// webui/static/app.js - Full UI with ToastManager
console.log('[config] 开始加载配置模块...');

const analyzerPresets = {
    FAST: {
        target_fps: 15,
        rbw: 100e3,
        sample_rate: 15.625e6,
        fft_size: 512,
        dwell_time: 0.005,
        overlap: 0.2,
        avg_count: 1,
        max_segments: 4,
    },
    BALANCED: {
        target_fps: 10,
        rbw: 50e3,
        sample_rate: 7.8125e6,
        fft_size: 1024,
        dwell_time: 0.007,
        overlap: 0.2,
        avg_count: 1,
        max_segments: 6,
    },
    PRECISE: {
        target_fps: 5,
        rbw: 25e3,
        sample_rate: 3.90625e6,
        fft_size: 2048,
        dwell_time: 0.01,
        overlap: 0.25,
        avg_count: 1,
        max_segments: 8,
    },
};

const n310SampleRatesHz = [
    125000,
    250000,
    500000,
    748503,
    1e6,
    1.25e6,
    1.50602e6,
    2.01613e6,
    2.5e6,
    3.125e6,
    4.03226e6,
    5e6,
    7.8125e6,
    1.04167e7,
    2.08333e7,
    2.5e7,
    3.125e7,
];

function formatSampleRateOptionText(rateHz) {
    const rateKHz = rateHz / 1e3;
    if (rateKHz >= 1000) {
        const decimals = Number.isInteger(rateKHz) ? 0 : 1;
        return `${rateKHz.toFixed(decimals).replace(/\.0$/, '')} kHz`;
    }
    return `${rateKHz.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} kHz`;
}

function resolveSampleRateSelect(selectOrId) {
    if (!selectOrId) {
        return document.getElementById('scanSampleRate');
    }
    if (typeof selectOrId === 'string') {
        return document.getElementById(selectOrId);
    }
    if (selectOrId && selectOrId.nodeName === 'SELECT') {
        return selectOrId;
    }
    return null;
}

function populateSampleRateOptions(selectOrId, defaultHz) {
    let targetHz = defaultHz;
    let select = resolveSampleRateSelect(selectOrId);

    if (typeof selectOrId === 'number' && defaultHz === undefined) {
        targetHz = selectOrId;
        select = resolveSampleRateSelect();
    }

    if (!select) {
        return;
    }

    if (!select.dataset.optionsLoaded) {
        const fragment = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '请选择采样率';
        placeholder.disabled = true;
        fragment.appendChild(placeholder);

        n310SampleRatesHz.forEach((rate) => {
            const option = document.createElement('option');
            option.value = String(rate);
            option.textContent = formatSampleRateOptionText(rate);
            fragment.appendChild(option);
        });

        select.appendChild(fragment);
        select.dataset.optionsLoaded = 'true';
    }

    if (typeof targetHz === 'number' && Number.isFinite(targetHz) && targetHz > 0) {
        setSampleRateSelection(select, targetHz);
    } else if (!select.value) {
        const fallback = n310SampleRatesHz.find((rate) => rate >= 2_000_000) || n310SampleRatesHz[0];
        setSampleRateSelection(select, fallback);
    }
}

function setSampleRateSelection(selectOrId, sampleRateHz) {
    let targetHz = sampleRateHz;
    let select = resolveSampleRateSelect(selectOrId);

    if (typeof selectOrId === 'number' && sampleRateHz === undefined) {
        targetHz = selectOrId;
        select = resolveSampleRateSelect();
    }

    if (!select || !select.options.length || typeof targetHz !== 'number' || !Number.isFinite(targetHz)) {
        return;
    }

    let closest = n310SampleRatesHz[0];
    let minDiff = Math.abs(targetHz - closest);
    for (let i = 1; i < n310SampleRatesHz.length; i += 1) {
        const diff = Math.abs(targetHz - n310SampleRatesHz[i]);
        if (diff < minDiff) {
            closest = n310SampleRatesHz[i];
            minDiff = diff;
        }
    }

    const matchingOption = Array.from(select.options).find((opt) => Number(opt.value) === closest);
    if (matchingOption) {
        select.value = matchingOption.value;
    } else {
        const option = document.createElement('option');
        option.value = String(closest);
        option.textContent = formatSampleRateOptionText(closest);
        select.appendChild(option);
        select.value = option.value;
    }
}

function initializeSampleRateSelects() {
    const selectConfigs = [
        { id: 'recordSampleRate', defaultHz: 2.01613e6 },
        { id: 'playSampleRate', defaultHz: 2.01613e6 },
        { id: 'generateSampleRate', defaultHz: 2.01613e6 },
    ];

    selectConfigs.forEach(({ id, defaultHz }) => populateSampleRateOptions(id, defaultHz));
}

function normalizePresetKey(value) {
    return (value || '').toString().trim().toUpperCase();
}

function safeNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function formatSampleRate(valueHz) {
    const num = safeNumber(valueHz);
    if (!num) return null;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2).replace(/\.00$/, '')} MSps`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1).replace(/\.0$/, '')} kSps`;
    return `${num.toFixed(0)} Sps`;
}

function formatResolution(valueHz) {
    const num = safeNumber(valueHz);
    if (!num) return null;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2).replace(/\.00$/, '')} MHz`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(0)} kHz`;
    return `${num.toFixed(0)} Hz`;
}

function formatFps(value) {
    const num = safeNumber(value);
    if (!num) return null;
    return `${num.toFixed(num >= 10 ? 0 : 1).replace(/\.0$/, '')} fps`;
}

function formatDwell(valueSeconds) {
    const num = safeNumber(valueSeconds);
    if (!num) return null;
    return `${(num * 1000).toFixed(1).replace(/\.0$/, '')} ms`;
}

function formatPresetDescriptor(settings = {}) {
    const parts = [];
    const fps = formatFps(settings.target_fps);
    if (fps) parts.push(fps);
    const sample = formatSampleRate(settings.sample_rate);
    if (sample) parts.push(`Sample ${sample}`);
    const rbw = formatResolution(settings.rbw);
    if (rbw) parts.push(`RBW ${rbw}`);
    const fft = safeNumber(settings.fft_size);
    if (fft) parts.push(`FFT ${Math.round(fft)}`);
    const dwell = formatDwell(settings.dwell_time);
    if (dwell) parts.push(`Dwell ${dwell}`);
    const segments = safeNumber(settings.max_segments);
    if (segments) parts.push(`≤${Math.round(segments)} segments`);
    return parts.join(' • ');
}

function getSelectedPresetKey() {
    const checked = document.querySelector('input[name="scanPresetMode"]:checked');
    return normalizePresetKey(checked ? checked.value : '');
}

function updatePresetOptionClasses(activeKey) {
    const options = document.querySelectorAll('.preset-option');
    options.forEach((option) => {
        const key = normalizePresetKey(option.dataset.preset || (option.querySelector('input') && option.querySelector('input').value));
        option.classList.toggle('active', key === activeKey);
    });
}

function applyPresetToForm(presetKey) {
    const preset = analyzerPresets[presetKey];
    if (!preset) return;

    const resolutionInput = document.getElementById('scanResolution');
    const dwellInput = document.getElementById('scanDwellTime');
    const sampleRateInput = document.getElementById('scanSampleRate');
    const avgInput = document.getElementById('scanAvgCount');
    const fftInput = document.getElementById('scanFftSize');
    const overlapInput = document.getElementById('scanOverlap');
    const maxSegmentsInput = document.getElementById('scanMaxSegments');

    if (resolutionInput) {
        resolutionInput.value = (preset.rbw / 1e3).toFixed(0);
    }
    if (dwellInput) {
        dwellInput.value = (preset.dwell_time * 1000).toFixed(1).replace(/\.0$/, '');
    }
    if (sampleRateInput) {
        populateSampleRateOptions(sampleRateInput, preset.sample_rate);
        setSampleRateSelection(sampleRateInput, preset.sample_rate);
    }
    if (avgInput) {
        avgInput.value = String(preset.avg_count);
    }
    if (fftInput) {
        fftInput.value = String(preset.fft_size);
    }
    if (overlapInput) {
        overlapInput.value = String(preset.overlap);
    }
    if (maxSegmentsInput && preset.max_segments) {
        maxSegmentsInput.value = String(preset.max_segments);
    }
}

function updatePresetHintContent(presetKey, overrides = {}) {
    const hintEl = document.getElementById('presetHint');
    if (!hintEl) return;
    const preset = analyzerPresets[presetKey] || {};
    const descriptor = formatPresetDescriptor(Object.assign({}, preset, overrides));
    if (!presetKey || presetKey === 'CUSTOM') {
        hintEl.textContent = descriptor ? `自定义参数 · ${descriptor}` : '手动设置参数以自定义扫描。';
        return;
    }
    const label = presetKey.charAt(0) + presetKey.slice(1).toLowerCase();
    hintEl.textContent = descriptor ? `${label} 模式 · ${descriptor}` : `${label} 模式`;
}

function updatePresetSummaryFromMeta(meta = {}, streamMeta = {}) {
    if (window.spectrumScanController && typeof window.spectrumScanController.applyStreamMetadata === 'function') {
        window.spectrumScanController.applyStreamMetadata(meta, streamMeta);
    }
}

function setActivePreset(presetKey) {
    const normalized = normalizePresetKey(presetKey);
    updatePresetOptionClasses(normalized);
    if (normalized && analyzerPresets[normalized]) {
        applyPresetToForm(normalized);
        updatePresetHintContent(normalized);
    } else {
        updatePresetHintContent('CUSTOM');
    }
}

function initPresetControls() {
    const selector = document.getElementById('presetSelector');
    if (!selector || selector.dataset.initBound) {
        return;
    }

    selector.addEventListener('change', (event) => {
        if (event.target && event.target.name === 'scanPresetMode') {
            const key = normalizePresetKey(event.target.value);
            setActivePreset(key);
        }
    });

    const defaultKey = getSelectedPresetKey() || 'BALANCED';
    setActivePreset(defaultKey);
    selector.dataset.initBound = 'true';
}

document.addEventListener('DOMContentLoaded', function() {

    console.log('[config] DOM内容加载完成');

    const configBtn = document.getElementById('config-btn');
    console.log('[config] 配置按钮元素:', configBtn);

    if (!configBtn) {
        console.error('[config] ❌ 错误: 未找到配置按钮元素');
        return;
    }

    console.log('[config] ✅ 成功找到配置按钮，正在绑定事件监听器...');

    configBtn.addEventListener('click', function(event) {
        console.log('[config] 🖱️ 配置按钮被点击', {
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
        });
        openConfigPage(event);
    });

    configBtn.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            console.log('[config] ⌨️ 配置按钮通过键盘触发:', event.key);
            event.preventDefault();
            openConfigPage(event);
        }
    });

    console.log('[config] ✅ 事件监听器绑定完成');
});

function openConfigPage(event) {
    console.log('[config] 🔧 开始打开配置页面...');

    const url = '/config';
    const useModal = Boolean(event && event.shiftKey);

    console.log('[config] 打开参数:', {
        url: url,
        useModal: useModal,
        shiftKeyPressed: Boolean(event && event.shiftKey),
    });

    if (useModal) {
        console.log('[config] 🪟 使用模态窗口模式');
        openConfigModal();
    } else {
        console.log('[config] 📄 尝试在新标签页打开');

        try {
            const newWindow = window.open(url, '_blank');

            if (newWindow) {
                console.log('[config] ✅ 成功打开新标签页');
                if (typeof newWindow.focus === 'function') newWindow.focus();
                return;
            }

            console.warn('[config] ⚠️ 新标签页被阻止，尝试在当前页面导航');
        } catch (error) {
            console.warn('[config] ⚠️ 打开新标签页时发生异常，将尝试当前页面导航', error);
        }

        try {
            window.location.href = url;
            console.log('[config] ✅ 已跳转到配置页面');
        } catch (error) {
            console.error('[config] ❌ 导航失败，使用模态窗口回退:', error);
            openConfigModal();
        }
    }
}

function openConfigModal() {
    console.log('[config] 🪟 创建配置模态窗口...');

    const existing = document.getElementById('config-modal');
    if (existing) {
        console.log('[config] ⚠️ 模态窗口已存在，移除旧窗口');
        existing.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'config-modal';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        width: 90%;
        height: 80%;
        max-width: 800px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;

    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        padding: 15px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    modalHeader.innerHTML = `
        <h3 style="margin: 0;">Configuration</h3>
        <button id="close-modal" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
    `;

    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = `
        flex: 1;
        padding: 0;
        overflow: hidden;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = '/config';
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
    `;

    iframeContainer.appendChild(iframe);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(iframeContainer);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    console.log('[config] ✅ 模态窗口创建完成');

    const closeButton = document.getElementById('close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            console.log('[config] ❌ 通过关闭按钮关闭模态窗口');
            closeConfigModal();
        });
    }

    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            console.log('[config] ❌ 通过外部点击关闭模态窗口');
            closeConfigModal();
        }
    });

    function modalKeyHandler(event) {
        if (event.key === 'Escape') {
            console.log('[config] ❌ 通过ESC键关闭模态窗口');
            closeConfigModal();
            document.removeEventListener('keydown', modalKeyHandler);
        }
    }

    document.addEventListener('keydown', modalKeyHandler);
    document.body.style.overflow = 'hidden';
}

function closeConfigModal() {
    console.log('[config] 🧹 清理模态窗口...');
    const modal = document.getElementById('config-modal');
    if (modal) {
        modal.remove();
        console.log('[config] ✅ 模态窗口已移除');
    }
    document.body.style.overflow = '';
}

console.log('[config] 🎉 配置模块加载完成，等待用户交互...');

if (typeof window !== 'undefined') {
    window.waveformConfig = Object.assign({
        scrollMode: true,
        windowDuration: 2.0,
        autoScale: true,
    }, window.waveformConfig || {});
}

// Main legacy UI controller class
class RPTWebUI {
    constructor() {
        // lightweight toast container (legacy placement)
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    this.toastCount = 0;
    this.maxToasts = 5;
        // initialize placeholders for properties used throughout the class
    this.fileStreamController = null;
    this.currentAnalysisResult = null;
    this.pollingIntervals = new Set();
    this.analysisPollingIds = [];
    this.selectedFile = null;
    this.toastManager = null; // kept for backward compatibility
    // track Chart instances and debug information for charts
    this.chartInstances = {}; // keyed by canvas id

    // track task timing and simulated progress maps used by task table
    this.taskStartTimes = new Map();
    this.taskProgress = new Map();
    this.latestStreamPayload = null;
    this.latestStreamMeta = {};
    this._resetHigherOrderAverages();

        const recordForm = document.getElementById('recordForm');
        if (recordForm) {
            recordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startRecording(new FormData(e.target));
            });
        }

        const playForm = document.getElementById('playForm');
        if (playForm) {
            playForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.playSignal(new FormData(e.target));
            });
        }

        const generateForm = document.getElementById('generateForm');
        if (generateForm) {
            generateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateSignal(new FormData(e.target));
            });
        }

        const convForm = document.getElementById('convertForm');
        if (convForm) {
            convForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.convertSignal(new FormData(e.target));
            });
        }

        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => { this.connectUSRP(); });
        }

        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                try {
                    const files = e.target.files || [];
                    const names = Array.from(files).map(f => f.name);
                    console.log('[rptUI] fileInput change:', files.length, 'file(s) selected', names);
                    try { fetch('/api/debug/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'file_select', files: names, ts: Date.now() }) }).catch(() => {}); } catch (logErr) { console.warn('[rptUI] fileInput debug log failed', logErr); }
                } catch (err) {
                    console.warn('[rptUI] fileInput change log failed', err);
                }
                this.uploadFiles(e.target.files);
                e.target.value = '';
            });
            fileInput.addEventListener('click', () => {
                try { console.log('[rptUI] fileInput clicked (opening file dialog)'); } catch (clickErr) { /* ignore */ }
            });
        }
    }

    show(message, type = 'info', duration = 5000) {
        if (this.toastCount >= this.maxToasts) this.removeOldestToast();
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.toastCount++;
        if (duration > 0) setTimeout(() => this.removeToast(toast), duration);
                    this.ws.onmessage = (ev) => {
                        try {
                            const msg = JSON.parse(ev.data);
                            if (msg.type === 'data') {
                                const streams = msg.streams || {};
                                // Delegate to helper that applies streams into the UI
                                if (typeof this._applyStreamsToUI === 'function') this._applyStreamsToUI(streams);
                            } else if (msg.type === 'info' && msg.message) {
                                this.rptUI.showAlert(msg.message, 'info');
                            }
                        } catch (e) {
                            console.error('Error handling ws message', e);
                        }
                    };

        // Window resize: adjust spectrum/constellation layout responsively
        window.addEventListener('resize', () => {
            try { this.adjustSpectrumLayout(); } catch (e) { /* noop */ }
        });
    }

    adjustSpectrumLayout() {
        // 根据窗口大小调整星座图容器的大小
        try {
            const squarePlaceholder = document.querySelector('#constellation-panel .chart-box.constellation-box .chart-placeholder');
            if (!squarePlaceholder) return;
            const parent = squarePlaceholder.parentElement;
            const containerWidth = parent ? parent.clientWidth : squarePlaceholder.clientWidth;
            if (!containerWidth) return;
            squarePlaceholder.style.width = '100%';
            squarePlaceholder.style.height = `${containerWidth}px`;
        } catch (e) {
            // ignored
        }
    }

    setupTabHandlers() {
        document.querySelectorAll('.spectrum-tabs .tab-header').forEach(header => header.addEventListener('click', () => { const tab = header.getAttribute('data-tab'); this.switchSpectrumTab(tab); }));
        document.querySelectorAll('.operations-tabs .tab-header').forEach(header => header.addEventListener('click', () => { const tab = header.getAttribute('data-tab'); this.switchOperationTab(tab); }));
    }

    // Initialize custom analysis tab buttons (non-Bootstrap)
    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        if (!tabBtns || tabBtns.length === 0) return;

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // remove active from all
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                // set active on current
                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab');
                const targetPane = document.getElementById(`${tabId}-pane`);
                if (targetPane) targetPane.classList.add('active');

                // debug: log tab changes so developer can see what's active
                try { console.log(`[rptUI] switched analysis tab -> ${tabId}`); } catch (e) { /* ignore */ }

                // if streaming, ask controller to re-render current view
                if (this.fileStreamController && typeof this.fileStreamController.renderCurrentTab === 'function') {
                    try { this.fileStreamController.renderCurrentTab(); } catch (e) { /* ignore */ }
                }
            });
        });
    }

    switchSpectrumTab(tabName) {
        document.querySelectorAll('.spectrum-tabs .tab-header').forEach(h => h.classList.toggle('active', h.getAttribute('data-tab') === tabName));
        document.querySelectorAll('.spectrum-tabs .tab-content').forEach(c => c.classList.toggle('active', c.id === `${tabName}-tab`));
        if (this.currentAnalysisResult && this.currentAnalysisResult.plots) this.updateSpectrumDisplay(tabName);
    }

    switchOperationTab(tabName) {
        document.querySelectorAll('.operations-tabs .tab-header').forEach(h => h.classList.toggle('active', h.getAttribute('data-tab') === tabName));
        document.querySelectorAll('.operations-tabs .tab-content').forEach(c => c.classList.toggle('active', c.id === `${tabName}-tab`));
    }

    updateSpectrumDisplay(tabName) {
        if (!this.currentAnalysisResult || !this.currentAnalysisResult.plots) {
            const plotContainer = document.getElementById(`${tabName}-tab`)?.querySelector('.plot-placeholder');
            if (plotContainer) {
                plotContainer.innerHTML = '<div class="placeholder-text">请先选择文件并进行分析</div>';
            }
            return;
        }

        const plots = this.currentAnalysisResult.plots;
        let plotUrl = '';

        // 根据Tab类型选择对应的图表
        switch (tabName) {
            case 'time-domain':
                plotUrl = plots.time_domain_single || plots.overview || '';
                break;
            case 'frequency-domain':
                plotUrl = plots.frequency_domain_single || plots.overview || '';
                break;
            case 'constellation':
                plotUrl = plots.constellation_single || plots.overview || '';
                break;
            case 'advanced-spectrum':
                plotUrl = plots.higher_order || plots.quadratic_spectrum || plots.overview || '';
                break;
        }

        const plotContainer = document.getElementById(`${tabName}-tab`)?.querySelector('.plot-placeholder');
        if (!plotContainer) return;

        if (plotUrl) {
            plotContainer.innerHTML = `
                <div class="plot-image-container">
                    <div class="plot-loading">Loading visualization...</div>
                    <img src="${plotUrl}" alt="${tabName}" class="plot-image" 
                         onload="this.style.opacity=1; this.previousElementSibling.style.display='none';" 
                         onerror="this.style.display='none'; this.previousElementSibling.textContent='Failed to load image';"
                         style="opacity:0; transition: opacity 0.3s;">
                </div>
            `;
        } else {
            plotContainer.innerHTML = '<div class="placeholder-text">该类型的图表暂不可用</div>';
        }
    }

    loadInitialData() { this.loadUSRPStatus(); this.loadFileList(); this.loadTaskList(); }

    /* ------------------ Streaming UI methods ------------------ */
    initializeStreaming() {
        // ensure controller exists
            if (!this.fileStreamController) {
                this.fileStreamController = new StreamingAnalysis(this);
        }

        // initialize tab handlers and ensure a default active pane so charts have a render target
        try {
            this.initTabs();
            // if no active tab set, activate the first
            const activeBtn = document.querySelector('.tab-btn.active') || document.querySelector('.tab-btn');
            if (activeBtn) {
                activeBtn.classList.add('active');
                const tabId = activeBtn.getAttribute('data-tab');
                const pane = document.getElementById(`${tabId}-pane`);
                if (pane) pane.classList.add('active');
            }
        } catch (e) { /* non-fatal */ }

        // bind buttons
        const startBtn = document.getElementById('start-stream-btn');
        const stopBtn = document.getElementById('stop-stream-btn');

        if (startBtn) startBtn.addEventListener('click', () => this.startStreaming());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopStreaming());

        // initial badge state
        this.updateStreamStatus('ready');

        // 初始化选中文件信息显示
        this.updateSelectedFileInfo();

        // Apply boxed-chart class to legacy chart containers so visuals match Vue box styling
        try {
            document.querySelectorAll('.chart-container, .higher-order-chart').forEach(el => el.classList.add('boxed-chart'));
            // if canvases are present, give them a reasonable render height
            document.querySelectorAll('.chart-container canvas, .higher-order-chart canvas').forEach(c => {
                try { c.style.height = c.style.height || '200px'; } catch (e) { /* noop */ }
            });
        } catch (e) { /* non-fatal */ }
    }

    async populateFileSelect() {
        const sel = document.getElementById('stream-file-select');
        if (!sel) return;
        try {
            const r = await fetch('/api/files');
            if (!r.ok) throw new Error('Files request failed');
            const data = await r.json();
            const files = data.files || [];
            sel.innerHTML = '<option value="">选择文件...</option>';
            files.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.name; opt.textContent = f.name; sel.appendChild(opt);
            });
        } catch (e) {
            console.error('populateFileSelect error', e);
        }
    }


    /* StreamingAnalysis implemented here - connects to backend WebSocket streaming */




    async startStreaming() {
        if (!this.selectedFile) { 
            this.showAlert('请先在File Management中选择一个文件', 'error'); 
            return; 
        }

        // 使用选中的文件名
        const filename = this.selectedFile.name;

        // 从文件元数据中获取采样率和中心频率
        const sampleRate = this.selectedFile.sample_rate || 1000000;
        const centerFreq = this.selectedFile.center_freq || 0;

        this._resetHigherOrderAverages();

        // default parameters (can be exposed as UI later)
        const opts = { 
            file_format: 'auto', 
            sample_rate: sampleRate, 
            center_freq: centerFreq, 
            chunk_size: 4096, 
            update_interval: 0.1 
        };

        // update UI
        const startBtn = document.getElementById('start-stream-btn');
        const stopBtn = document.getElementById('stop-stream-btn');
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        this.updateStreamStatus('starting', '正在启动分析...');

        // start via controller
        try {
            // The server expects form-encoded fields for /api/streaming/start (FastAPI Form parameters).
            const body = new URLSearchParams();
            body.append('filename', filename);
            body.append('file_format', opts.file_format || 'auto');
            body.append('sample_rate', String(opts.sample_rate || sampleRate));
            body.append('center_freq', String(opts.center_freq || centerFreq));
            body.append('chunk_size', String(opts.chunk_size || 4096));
            body.append('update_interval', String(opts.update_interval || 0.1));

            const resp = await fetch('/api/streaming/start', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
            console.log('[rptUI] startStreaming: /api/streaming/start status', resp.status, resp.statusText);
            const data = await resp.json().catch(err => { console.warn('[rptUI] startStreaming: failed to parse JSON', err); return null; });
            console.log('[rptUI] startStreaming: response JSON', data);
            if (!resp.ok) {
                const errTxt = data && data.detail ? data.detail : resp.statusText;
                throw new Error(`Server rejected streaming start: ${errTxt}`);
            }
            if (data && data.session_id) {
                // attach session to controller for stop/cancel
                if (this.fileStreamController && typeof this.fileStreamController.startFileStreaming === 'function') {
                    // If controller expects to call server itself, prefer controller API; otherwise set session id
                    try { this.fileStreamController.currentSessionId = data.session_id; } catch (e) { /* ignore */ }
                }
                // let controller open SSE if available
                try { if (this.fileStreamController && typeof this.fileStreamController.startSSE === 'function') this.fileStreamController.startSSE(data.session_id); } catch (e) { /* ignore */ }

                this.updateStreamStatus('streaming', '分析已启动');
            } else {
                throw new Error('No session id returned');
            }
        } catch (e) {
            console.error('startStreaming error', e);
            this.updateStreamStatus('error', '启动失败');
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }
    }

    stopStreaming() {
        if (this.fileStreamController) this.fileStreamController.stopStreaming();
        const startBtn = document.getElementById('start-stream-btn');
        const stopBtn = document.getElementById('stop-stream-btn');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        this.updateStreamStatus('stopped', '已停止');
        this._resetHigherOrderAverages();
    }

    updateStreamStatus(status, message) {
        const badge = document.getElementById('stream-status-badge');
        if (!badge) return;
        badge.className = 'badge ms-2';
        switch (status) {
            case 'ready': badge.classList.add('bg-secondary'); badge.textContent = '就绪'; break;
            case 'starting': badge.classList.add('bg-primary'); badge.textContent = message || '启动中...'; break;
            case 'streaming': badge.classList.add('bg-success'); badge.textContent = message || '流式传输中'; break;
            case 'error': badge.classList.add('bg-danger'); badge.textContent = message || '错误'; break;
            case 'stopped': badge.classList.add('bg-warning'); badge.textContent = message || '已停止'; break;
            default: badge.classList.add('bg-secondary'); badge.textContent = message || '就绪';
        }
    }

    // Map streaming payloads into existing render methods
    updateChartsWithStreamData(streamData) {
        if (!streamData) {
            console.log('[rptUI] updateChartsWithStreamData: no streamData');
            return;
        }

        const topLevelMeta = (streamData && streamData.meta && typeof streamData.meta === 'object') ? streamData.meta : {};
    const payload = streamData.streams || streamData;
    const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};

    this.latestStreamMeta = Object.assign({}, topLevelMeta, payload && payload.metadata ? payload.metadata : {});
        this.latestStreamPayload = payload;

        // Quick path: optimized scan-mode rendering — if payload indicates scan mode, render frequency-only and return.
        try {
            const scanModeFlag = (topLevelMeta && topLevelMeta.mode) || (payload && payload.metadata && payload.metadata.mode) || payload.mode || null;
            if (String(scanModeFlag).toLowerCase() === 'scan' && payload && payload.frequency_domain) {
                const toNumericArray = (source) => {
                    if (source == null) return [];
                    try {
                        return Array.from(source, (value) => {
                            const num = Number(value);
                            return Number.isFinite(num) ? num : 0;
                        });
                    } catch (err) {
                        return [];
                    }
                };

                const freqRaw = payload.frequency_domain.frequency || payload.frequency_domain.freq || [];
                const powerRaw = payload.frequency_domain.power || payload.frequency_domain.magnitude || [];
                const freq = toNumericArray(freqRaw);
                const powerData = toNumericArray(powerRaw);

                const canvas = document.getElementById('frequencyDomainChart');
                const vizCfg = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
                if (canvas && canvas.getContext && freq.length > 0 && powerData.length > 0) {
                    try {
                        this.renderSimpleChart(
                            canvas.getContext('2d'),
                            freq,
                            [ { data: powerData, label: 'Power (dB)', color: '#9b59b6' } ],
                            'Power Spectrum',
                            {
                                xLabel: 'Frequency (MHz)',
                                yLabel: 'Power (dB)',
                                showGrid: vizCfg.power_grid_enabled !== false,
                                showTicks: vizCfg.power_ticks_enabled !== false,
                            }
                        );
                    } catch (err) {
                        console.error('[rptUI] Failed to render frequency domain chart (scan fast-path)', err);
                    }
                }
                // Do not perform further processing for scan optimized path
                return;
            }
        } catch (e) {
            console.warn('[rptUI] scan fast-path render failed, falling back to full renderer', e);
        }

        const formatNumber = (value) => {
            if (!Number.isFinite(value)) return null;
            const rounded = Math.round(value);
            try {
                return rounded.toLocaleString();
            } catch (e) {
                return String(rounded);
            }
        };

        try {
            console.log('[rptUI] updateChartsWithStreamData: received stream data', {
                keys: Object.keys(payload || {}),
                timeDomainPresent: Boolean(payload.time_domain || payload.timeDomain || payload.time)
            });
        } catch (logErr) { /* ignore */ }

        const toNumericArray = (source) => {
            if (source == null) return [];
            try {
                return Array.from(source, (value) => {
                    const num = Number(value);
                    return Number.isFinite(num) ? num : 0;
                });
            } catch (err) {
                return [];
            }
        };

        const pickNumericSeries = (...candidates) => {
            for (const candidate of candidates) {
                const numeric = toNumericArray(candidate);
                if (numeric.length > 0) {
                    return numeric;
                }
            }
            return [];
        };

        const extractScanRangeMHz = (...sources) => {
            if (typeof this._extractScanRangeMHz === 'function') {
                try {
                    return this._extractScanRangeMHz(...sources);
                } catch (err) {
                    console.warn('[rptUI] extractScanRangeMHz helper failed via method', err);
                }
            }

            const resolveRange = (source) => {
                if (!source || typeof source !== 'object') return null;

                const pickValue = (obj, keys) => {
                    for (const key of keys) {
                        if (typeof obj[key] === 'number' && Number.isFinite(obj[key])) {
                            return obj[key];
                        }
                    }
                    return null;
                };

                const settingsCandidates = [];
                if (source.scan_settings && typeof source.scan_settings === 'object') settingsCandidates.push(source.scan_settings);
                if (source.scanSettings && typeof source.scanSettings === 'object') settingsCandidates.push(source.scanSettings);
                if (source.metadata && typeof source.metadata === 'object') {
                    const meta = source.metadata;
                    if (meta.scan_settings && typeof meta.scan_settings === 'object') settingsCandidates.push(meta.scan_settings);
                    if (meta.scanSettings && typeof meta.scanSettings === 'object') settingsCandidates.push(meta.scanSettings);
                }

                settingsCandidates.push(source);

                for (const candidate of settingsCandidates) {
                    if (!candidate || typeof candidate !== 'object') continue;
                    const start = pickValue(candidate, ['start_freq', 'startFreq', 'start']);
                    const stop = pickValue(candidate, ['stop_freq', 'stopFreq', 'stop']);
                    if (start === null || stop === null || !Number.isFinite(start) || !Number.isFinite(stop) || stop === start) {
                        continue;
                    }

                    const startMHz = Math.abs(start) > 1e5 ? start / 1e6 : start;
                    const stopMHz = Math.abs(stop) > 1e5 ? stop / 1e6 : stop;
                    if (!Number.isFinite(startMHz) || !Number.isFinite(stopMHz) || stopMHz === startMHz) {
                        continue;
                    }

                    const min = Math.min(startMHz, stopMHz);
                    const max = Math.max(startMHz, stopMHz);
                    if (max > min) {
                        return { min, max };
                    }
                }

                return null;
            };

            for (const source of sources) {
                const range = resolveRange(source);
                if (range) {
                    return range;
                }
            }
            return null;
        };

        // Always refresh the time-domain canvas so users instantly see waveforms when data arrives
        const timeDomainPayload = payload.time_domain || payload.timeDomain || payload.time;
        if (timeDomainPayload) {
            const tAxis = toNumericArray(timeDomainPayload.time || timeDomainPayload.timestamps || []);
            const iSeries = pickNumericSeries(
                timeDomainPayload.i_component,
                timeDomainPayload.i,
                timeDomainPayload.inphase,
                timeDomainPayload.real
            );
            const qSeries = pickNumericSeries(
                timeDomainPayload.q_component,
                timeDomainPayload.q,
                timeDomainPayload.quadrature,
                timeDomainPayload.imag
            );
            try {
                console.log('[rptUI] time-domain payload received', {
                    timePoints: tAxis.length,
                    iPoints: iSeries.length,
                    qPoints: qSeries.length,
                    sampleRateHint: this.selectedFile ? this.selectedFile.sample_rate : undefined
                });
            } catch (logErr) { /* ignore logging failures */ }
            this.renderTimeDomainChart(tAxis, iSeries, qSeries, payload.metadata || {});
        } else {
            this.renderTimeDomainChart([], [], []);
        }

        // Find the currently active analysis tab (supports both legacy and new markup)
        let activeBtn = document.querySelector('.tab-button.active') || document.querySelector('.tab-btn.active');
        let tabKey = null;
        if (activeBtn) {
            tabKey = activeBtn.getAttribute('data-target') || activeBtn.getAttribute('data-tab') || activeBtn.id;
        } else {
            const activePane = document.querySelector('.tab-panel.active') || document.querySelector('.tab-pane.active');
            if (activePane && activePane.id) {
                tabKey = activePane.id.replace(/-panel$|-pane$/i, '');
            }
        }
    if (!tabKey) tabKey = 'frequency-domain';

        const key = tabKey.replace(/-domain$|-panel$|-pane$/i, '').replace(/-/g, '').toLowerCase();

        try {
            console.log(
                '[rptUI] updateChartsWithStreamData: activeTab=',
                tabKey,
                'normalizedKey=',
                key,
                'streamKeys=',
                Object.keys(payload || {})
            );
        } catch (e) {
            console.warn('Chart debug log failed', e);
        }

        const safeRender = (canvasId, x, series, title, options) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`[rptUI] safeRender: canvas not found: ${canvasId}`);
                return;
            }
            if (typeof canvas.getContext !== 'function') {
                console.warn(`[rptUI] safeRender: canvas has no 2D context: ${canvasId}`);
                return;
            }
            const normalizedSeries = (series || []).map((s) => {
                const numeric = toNumericArray(s && s.data);
                return Object.assign({}, s, { data: numeric });
            });
            const hasData = normalizedSeries.some((s) => s.data && s.data.length > 0);
            if (!hasData) {
                this.toggleCanvasVisibility(canvas, false);
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
                console.debug(`[rptUI] safeRender: no data for ${canvasId}`);
                return;
            }
            try {
                console.log('[rptUI] safeRender: preparing draw', {
                    canvasId,
                    title,
                    xCount: Array.isArray(x) ? x.length : (x && x.length) || 0,
                    series: normalizedSeries.map((s) => ({ label: s.label, points: s.data.length }))
                });
            } catch (logErr) { /* ignore logging failures */ }
            try {
                this.renderSimpleChart(
                    canvas.getContext('2d'),
                    toNumericArray(x),
                    normalizedSeries,
                    title,
                    options || {}
                );
            } catch (err) {
                console.error(`[rptUI] safeRender: failed to render ${canvasId}`, err);
            }
        };

        switch (key) {
            case 'time':
                // already rendered above
                break;
            case 'frequency':
                if (payload.frequency_domain) {
                    const freqRaw = payload.frequency_domain.frequency || payload.frequency_domain.freq;
                    const power = payload.frequency_domain.power || payload.frequency_domain.magnitude;
                    const axisRange = extractScanRangeMHz(
                        topLevelMeta,
                        payload.metadata,
                        this.latestStreamMeta || null
                    );
                    const centerFreqMHz = this._resolveCenterFrequencyMHz(
                        payload.metadata,
                        topLevelMeta,
                        this.latestStreamMeta,
                        this.selectedFile,
                        this.selectedFile && this.selectedFile.metadata ? this.selectedFile.metadata : null
                    );
                    const freq = this._applyCenterFrequencyOffset(freqRaw, centerFreqMHz);
                    const chartOptions = axisRange ? { xMin: axisRange.min, xMax: axisRange.max } : {};
                    if (axisRange && Number.isFinite(centerFreqMHz)) {
                        const maxAbs = Math.max(Math.abs(axisRange.min || 0), Math.abs(axisRange.max || 0));
                        if (maxAbs < 20 && Math.abs(centerFreqMHz) > 20) {
                            chartOptions.xMin = axisRange.min + centerFreqMHz;
                            chartOptions.xMax = axisRange.max + centerFreqMHz;
                        }
                    }
                    const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
                    chartOptions.xLabel = Number.isFinite(centerFreqMHz) ? 'Frequency (MHz)' : 'Frequency Offset (MHz)';
                    chartOptions.yLabel = 'Power (dB)';
                    chartOptions.showGrid = vizConfig.power_grid_enabled !== false;
                    chartOptions.showTicks = vizConfig.power_ticks_enabled !== false;
                    safeRender(
                        'frequencyDomainChart',
                        freq,
                        [ { data: power, label: 'Power (dB)', color: '#9b59b6' } ],
                        'Power Spectrum',
                        chartOptions
                    );
                }
                break;
            case 'constellation':
                if (payload.constellation) {
                    const i = pickNumericSeries(payload.constellation.i_component, payload.constellation.real, payload.constellation.i);
                    const q = pickNumericSeries(payload.constellation.q_component, payload.constellation.imag, payload.constellation.q);
                    const canvas = document.getElementById('constellationChart');
                    if (canvas && canvas.getContext) {
                        try {
                            this.renderScatterChart(
                                canvas.getContext('2d'),
                                i,
                                q,
                                '',
                                {
                                    showGrid: vizConfig.power_grid_enabled !== false,
                                    showTicks: vizConfig.power_ticks_enabled !== false,
                                    xLabel: 'I (Real)',
                                    yLabel: 'Q (Imag)',
                                    margin: { top: 40 }
                                }
                            );
                        } catch (err) {
                            console.error('renderScatterChart failed', err);
                        }
                    }
                } else {
                    const canvas = document.getElementById('constellationChart');
                    if (canvas && canvas.getContext) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
                        this.toggleCanvasVisibility(canvas, false);
                    }
                }
                const eyePayload = payload.eye_diagram || payload.eyeDiagram || null;
                this.renderEyeDiagramChart(eyePayload, vizConfig);
                break;
            case 'higher':
            case 'higherorder':
                if (payload.higher_order) {
                    const freqRaw = payload.higher_order.frequency || payload.higher_order.freq;
                    const quad = payload.higher_order.quadratic_power || payload.higher_order.square;
                    const quart = payload.higher_order.quartic_power || payload.higher_order.fourth;
                    const centerFreqMHz = this._resolveCenterFrequencyMHz(
                        payload.metadata,
                        topLevelMeta,
                        this.latestStreamMeta,
                        this.selectedFile,
                        this.selectedFile && this.selectedFile.metadata ? this.selectedFile.metadata : null
                    );
                    const freq = this._applyCenterFrequencyOffset(freqRaw, centerFreqMHz);
                    const axisLabel = Number.isFinite(centerFreqMHz) ? 'Frequency (MHz)' : 'Frequency Offset (MHz)';
                    const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
                    let sampleRateHz = this._resolveSampleRate(payload.metadata);
                    if (!Number.isFinite(sampleRateHz)) sampleRateHz = this._resolveSampleRate(topLevelMeta);
                    if (!Number.isFinite(sampleRateHz)) sampleRateHz = this._resolveSampleRate(this.latestStreamMeta);
                    if (!Number.isFinite(sampleRateHz)) sampleRateHz = this._resolveSampleRate(this.selectedFile);
                    const averaged = this._accumulateHigherOrderAverage(freq, quad, quart, centerFreqMHz);
                    const freqAvg = averaged.frequency && averaged.frequency.length ? averaged.frequency : freq;
                    const quadAvg = averaged.quad && averaged.quad.length ? averaged.quad : quad;
                    const quartAvg = averaged.quart && averaged.quart.length ? averaged.quart : quart;
                    const freqRangeM2 = this._calculateHigherOrderFrequencyRange(centerFreqMHz, 2, sampleRateHz);
                    const freqRangeM4 = this._calculateHigherOrderFrequencyRange(centerFreqMHz, 4, sampleRateHz);
                    const fallbackRange = this._calculateFrequencyRange(freqAvg);
                    const freqRange = freqRangeM2 || fallbackRange;
                    const quadRange = this._calculateHigherOrderPowerRange(quadAvg);
                    const quartRange = this._calculateHigherOrderPowerRange(quartAvg);
                    const parsedMin = Number.isFinite(Number(vizConfig.higher_order_power_y_min))
                        ? Number(vizConfig.higher_order_power_y_min)
                        : null;
                    const parsedMax = Number.isFinite(Number(vizConfig.higher_order_power_y_max))
                        ? Number(vizConfig.higher_order_power_y_max)
                        : null;
                    const quadYMin = parsedMin !== null
                        ? parsedMin
                        : (Number.isFinite(quadRange?.yMin) ? quadRange.yMin : undefined);
                    const quadYMax = parsedMax !== null
                        ? parsedMax
                        : (Number.isFinite(quadRange?.yMax) ? quadRange.yMax : undefined);
                    const quartYMin = parsedMin !== null
                        ? parsedMin
                        : (Number.isFinite(quartRange?.yMin) ? quartRange.yMin : undefined);
                    const quartYMax = parsedMax !== null
                        ? parsedMax
                        : (Number.isFinite(quartRange?.yMax) ? quartRange.yMax : undefined);
                    safeRender(
                        'm2Chart',
                        freqAvg,
                        [ { data: quadAvg, label: 'Square Spectrum', color: '#27ae60' } ],
                        'Square Spectrum',
                        {
                            xLabel: axisLabel,
                            yLabel: 'Quadratic Power',
                            showGrid: vizConfig.power_grid_enabled !== false,
                            showTicks: vizConfig.power_ticks_enabled !== false,
                            yTickCount: 5,
                            xMin: freqRange ? freqRange.xMin : undefined,
                            xMax: freqRange ? freqRange.xMax : undefined,
                            yMin: quadYMin,
                            yMax: quadYMax,
                        }
                    );
                    safeRender(
                        'm4Chart',
                        freqAvg,
                        [ { data: quartAvg, label: 'Fourth Power Spectrum', color: '#e67e22' } ],
                        'Fourth Power Spectrum',
                        {
                            xLabel: axisLabel,
                            yLabel: 'Quartic Power',
                            showGrid: vizConfig.power_grid_enabled !== false,
                            showTicks: vizConfig.power_ticks_enabled !== false,
                            yTickCount: 5,
                            xMin: (freqRangeM4 || freqRange)?.xMin,
                            xMax: (freqRangeM4 || freqRange)?.xMax,
                            yMin: quartYMin,
                            yMax: quartYMax,
                        }
                    );
                }
                break;
            default:
                break;
        }

        const metaInfo = Object.assign({}, topLevelMeta, payload.metadata || {});
        const statusParts = [];
        const formattedFrame = formatNumber(metaInfo.frame_index);
        if (formattedFrame !== null) {
            statusParts.push(`帧 ${formattedFrame}`);
        }
        const formattedLoop = formatNumber(metaInfo.loop_count);
        if (formattedLoop !== null) {
            statusParts.push(`循环 ${formattedLoop}`);
        }
        const formattedSamples = formatNumber(metaInfo.samples_processed);
        if (formattedSamples !== null) {
            statusParts.push(`样本 ${formattedSamples}`);
        } else if (payload.total_samples) {
            const formattedTotal = formatNumber(payload.total_samples);
            statusParts.push(`样本 ${formattedTotal !== null ? formattedTotal : payload.total_samples}`);
        }

        if (Number.isFinite(metaInfo.loop_progress) && Number.isFinite(metaInfo.file_total_samples) && metaInfo.file_total_samples > 0) {
            const pct = Math.max(0, Math.min(1, metaInfo.loop_progress / metaInfo.file_total_samples));
            statusParts.push(`循环进度 ${(pct * 100).toFixed(1)}%`);
        }

        if (metaInfo.status === 'completed') {
            this.updateStreamStatus('stopped', statusParts.length > 0 ? statusParts.join(' · ') : '录制完成');
        } else if (metaInfo.status === 'failed') {
            this.updateStreamStatus('error', statusParts.length > 0 ? statusParts.join(' · ') : '录制失败');
        } else if (metaInfo.status === 'cancelled') {
            this.updateStreamStatus('stopped', statusParts.length > 0 ? statusParts.join(' · ') : '录制已取消');
        } else if (statusParts.length > 0) {
            this.updateStreamStatus('streaming', statusParts.join(' · '));
        } else {
            this.updateStreamStatus('streaming', '流式传输中');
        }

        const frameCounterEl = document.getElementById('stream-frame-counter');
        if (frameCounterEl) {
            const frameParts = [];
            if (formattedFrame !== null) frameParts.push(`帧 ${formattedFrame}`);
            if (formattedLoop !== null) frameParts.push(`循环 ${formattedLoop}`);
            if (Number.isFinite(metaInfo.loop_progress) && Number.isFinite(metaInfo.file_total_samples) && metaInfo.file_total_samples > 0) {
                const pct = Math.max(0, Math.min(1, metaInfo.loop_progress / metaInfo.file_total_samples));
                frameParts.push(`进度 ${(pct * 100).toFixed(1)}%`);
            }
            frameCounterEl.textContent = frameParts.join(' · ') || '帧 --';
        }
    }

    async loadUSRPStatus() { try { const r = await fetch('/api/status'); if (!r.ok) throw new Error('Status request failed'); const s = await r.json(); if (typeof s === 'object') this.updateUSRPStatus(s.connected, s.used_address || s.usedAddress || '', s.device_info || {}); else this.updateUSRPStatus(Boolean(s)); } catch (e) { console.warn('Failed to load USRP status', e); this.updateUSRPStatus(false); } }

    updateUSRPStatus(connected, usedAddress = '', deviceInfo = {}) {
        const el = document.getElementById('usrpStatus'); const btn = document.getElementById('connectBtn'); const ip = document.getElementById('usrpIpInput'); if (!el) return;
        if (connected) {
            let txt = 'USRP: Connected';
            if (usedAddress) txt += ` (${usedAddress.replace(/^addr=/,'')})`;
            if (deviceInfo && deviceInfo.mboard_id) txt += ` - ${deviceInfo.mboard_id}`;
            el.textContent = txt;
            el.classList.remove('disconnected'); el.classList.add('connected');
            el.title = this.formatDeviceInfo(deviceInfo);
            if (btn) btn.textContent = 'Reconnect';
            if (usedAddress && ip) ip.value = usedAddress.replace(/^addr=/,'');

            // enable USRP-dependent controls
            const recBtn = document.getElementById('record-start-btn'); if (recBtn) recBtn.disabled = false;
            const playBtn = document.getElementById('play-start-btn'); if (playBtn) playBtn.disabled = false;
        } else {
            el.textContent = 'USRP: Disconnected';
            el.classList.remove('connected'); el.classList.add('disconnected');
            el.title = '';
            if (btn) btn.textContent = 'Connect';

            // disable USRP-dependent controls
            const recBtn = document.getElementById('record-start-btn'); if (recBtn) recBtn.disabled = true;
            const playBtn = document.getElementById('play-start-btn'); if (playBtn) playBtn.disabled = true;
        }
    }

    formatDeviceInfo(d) { if (!d || Object.keys(d).length === 0) return 'No device information available'; const lines = []; if (d.mboard_id) lines.push(`Board: ${d.mboard_id}`); if (d.mboard_serial) lines.push(`Serial: ${d.mboard_serial}`); if (d.rx_channels) lines.push(`RX Channels: ${d.rx_channels}`); if (d.tx_channels) lines.push(`TX Channels: ${d.tx_channels}`); return lines.join('\n') || 'Device info unavailable'; }

    saveLastUsedIP(ip) { try { localStorage.setItem('lastUSRPIP', ip); } catch (e) { console.warn('Could not save IP to localStorage:', e); } }
    loadLastUsedIP() { try { const last = localStorage.getItem('lastUSRPIP'); if (last) { const ip = document.getElementById('usrpIpInput'); if (ip) ip.value = last; } } catch (e) { console.warn('Could not load IP from localStorage:', e); } }

    isValidIP(ip) { const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/; return re.test(ip); }

    async connectUSRP() {
        const ipEl = document.getElementById('usrpIpInput'); const ipVal = ipEl ? ipEl.value.trim() : '';
        if (ipVal && !this.isValidIP(ipVal)) { this.showAlert('请输入有效的IP地址 (例如 192.168.10.2)', 'error'); return; }
        try {
            this.showAlert(`Connecting to USRP at ${ipVal || 'default address'}...`, 'info');
            const resp = await fetch('/api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ipVal ? { ip: ipVal } : {}) });
            if (!resp.ok) throw new Error('Connect request failed');
            const result = await resp.json(); const used = result.used_address || result.usedAddress || ipVal; const deviceInfo = result.device_info || {};
            this.updateUSRPStatus(result.connected, used, deviceInfo);
            if (result.connected) {
                let msg = `USRP connected at ${used || ''}`; if (deviceInfo && deviceInfo.mboard_id) msg += `\nDevice: ${deviceInfo.mboard_id}`;
                this.showAlert(msg, 'success', 6000);
                if (used) this.saveLastUsedIP(used.replace(/^addr=/,''));
            } else {
                const errMsg = result.error || result.detail || '连接失败';
                this.showAlert(errMsg, 'error');
            }
        } catch (err) { console.error('USRP connection error:', err); this.showAlert('连接错误: ' + err.message, 'error'); }
    }

    async startRecording(formData) {
        try {
            const params = {};
            for (const [key, rawVal] of formData.entries()) {
                if (key === 'filename') {
                    params[key] = (rawVal || '').toString().trim();
                    continue;
                }
                const trimmed = (rawVal || '').toString().trim();
                if (trimmed === '') continue;
                const numVal = Number(trimmed);
                if (!Number.isNaN(numVal)) params[key] = numVal;
            }

            if (Object.prototype.hasOwnProperty.call(params, 'freq')) {
                const freqMHz = Number(params.freq);
                if (Number.isFinite(freqMHz)) {
                    params.freq = freqMHz * 1e6;
                }
            }

            this.showAlert('Starting recording...', 'info');

            const response = await fetch('/api/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            if (!response.ok) throw new Error('Record request failed');

            const res = await response.json();

            if (res.task_id) {
                this.showAlert(`Recording started! Task ID: ${res.task_id}`, 'success');
                this.loadTaskList();

                if (res.stream && res.stream.session_id) {
                    if (!this.fileStreamController) this.fileStreamController = new StreamingAnalysis(this);
                    if (this.fileStreamController && typeof this.fileStreamController.startRealtimeSession === 'function') {
                        this.fileStreamController.startRealtimeSession(res.stream.session_id, res.stream);
                    }
                }
            } else {
                this.showAlert('Failed to start recording', 'error');
            }
        } catch (e) {
            console.error('Recording error:', e);
            this.showAlert('Recording error: ' + e.message, 'error');
        }
    }

    async generateSignal(formData) {
        try {
            const params = {};
            for (const [k, v] of formData.entries()) {
                if (k === 'transmit') {
                    params[k] = true;
                } else if (k === 'save_file' || k === 'filename') {
                    params[k] = v;
                } else if (k === 'center_freq') {
                    const freqMHz = Number(v);
                    params[k] = Number.isFinite(freqMHz) ? freqMHz * 1e6 : 0;
                } else {
                    params[k] = v ? Number(v) : 0;
                }
            }
            this.showAlert('Generating QPSK signal...', 'info');
            const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
            if (!r.ok) throw new Error('Generate request failed');
            const res = await r.json();

            if (res && res.task_id) {
                const savedName = res.saved ? ` Target file: ${res.saved}.` : '';
                this.showAlert(`Signal generation started in background. Task ID: ${res.task_id}.${savedName}`, 'success');
                await this.loadTaskList();
                setTimeout(() => this.loadFileList(), 1500);
                return;
            }

            if (res.success) {
                const savedName = res.saved ? ` Saved as ${res.saved}.` : '';
                this.showAlert(`Signal generated successfully!${savedName}`, 'success');
                this.loadFileList();
                await this.loadTaskList();
            } else {
                this.showAlert('Generation failed: ' + (res.error || 'Unknown error'), 'error');
            }
        } catch (e) {
            console.error('Generation error:', e);
            this.showAlert('Generation error: ' + e.message, 'error');
        }
    }

    async playSignal(formData) {
        try {
            const filename = formData.get('filename');
            if (!filename) {
                this.showAlert('Please select a file to play', 'error');
                return;
            }

            this.showAlert(`Starting playback of ${filename}...`, 'info');

            const bodyParams = new URLSearchParams();
            formData.forEach((value, key) => {
                if (key === 'freq') {
                    const freqMHz = Number(value);
                    if (Number.isFinite(freqMHz)) {
                        bodyParams.append(key, String(freqMHz * 1e6));
                        return;
                    }
                }
                bodyParams.append(key, value != null ? value.toString() : '');
            });

            const r = await fetch('/api/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bodyParams,
            });
            if (!r.ok) throw new Error('Play request failed');

            const res = await r.json();
            if (res.task_id) {
                this.showAlert(`Playback started! Task ID: ${res.task_id}`, 'success');
                this.loadTaskList();
            } else {
                this.showAlert('Failed to start playback', 'error');
            }
        } catch (e) {
            console.error('Playback error:', e);
            this.showAlert('Playback error: ' + e.message, 'error');
        }
    }

    async convertSignal(formData) { try { const filename = formData.get('filename'); if (!filename) { this.showAlert('Please select a file to convert', 'error'); return; } this.showAlert(`Converting ${filename}...`, 'info'); const r = await fetch('/api/convert', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(formData) }); if (!r.ok) throw new Error('Convert request failed'); const res = await r.json(); if (res.task_id) { this.showAlert(`Conversion started! Task ID: ${res.task_id}`, 'success'); this.loadTaskList(); } else this.showAlert('Failed to start conversion', 'error'); } catch (e) { console.error('Conversion error:', e); this.showAlert('Conversion error: ' + e.message, 'error'); } }

    async uploadFiles(files) {
        if (!files || files.length === 0) return;
        for (const file of files) {
            const fd = new FormData(); fd.append('file', file);
            try {
                console.log('[rptUI] uploadFiles: uploading', file.name);
                this.showAlert(`Uploading ${file.name}...`, 'info');
                const r = await fetch('/api/upload', { method: 'POST', body: fd });
                console.log('[rptUI] uploadFiles: response', r.status, r.statusText);
                if (!r.ok) throw new Error('Upload request failed');
                const res = await r.json();
                console.log('[rptUI] uploadFiles: server returned', res);
                if (res.filename) this.showAlert(`Uploaded: ${res.filename}`, 'success');
                else this.showAlert(`Upload failed for ${file.name}`, 'error');
            } catch (e) {
                console.error(`[rptUI] Upload failed for ${file.name}:`, e);
                this.showAlert(`Upload failed for ${file.name}: ${e.message}`, 'error');
            }
        }

        await this.loadFileList();
        try { this.populateFileSelect(); } catch (e) { console.warn('[rptUI] populateFileSelect failed', e); }
    }
    

    async loadFileList() {
        // Enhanced debug tracing for file list flow
        try {
            console.log('🔍 [DEBUG] loadFileList() called');
            // add cache-buster to avoid stale cached responses in browsers/proxies
            const response = await fetch('/api/files?ts=' + Date.now(), { cache: 'no-store' });
            console.log('🔍 [DEBUG] Files API response status:', response.status, response.statusText);
            if (!response.ok) throw new Error('Files request failed: ' + response.status);

            const data = await response.json();
            console.log('🔍 [DEBUG] Files list data received:', data);
            const files = (data && data.files) ? data.files : [];
            console.log('🔍 [DEBUG] Number of files:', files.length);

            const fileTableBody = document.getElementById('fileTableBody');
            if (!fileTableBody) {
                console.error('❌ [DEBUG] fileTableBody element not found');
                // fallback: update via existing helper
                this.updateFileTable(files);
                return;
            }

            if (!files || files.length === 0) {
                console.log('🔍 [DEBUG] No files found, showing empty message');
                fileTableBody.innerHTML = '<tr><td colspan="8" class="loading">No files found</td></tr>';
                this.updateFileSelects([]);
                return;
            }

            console.log('🔍 [DEBUG] Rendering file table with', files.length, 'files');
            // render rows (simple rendering, fields may vary depending on backend)
            fileTableBody.innerHTML = files.map(file => {
                const name = file.name || file.filename || file;
                const size = file.size != null ? file.size : (file.size_bytes || 'N/A');
                const samples = file.samples_count || file.samples || file.sample_count || 'N/A';
                const sample_rate = file.sample_rate || 'N/A';
                const center_freq = file.center_freq || 'N/A';
                const type = (file.name && file.name.split('.').pop()) || file.type || 'Unknown';
                return `\n                    <tr data-filename="${name}">\n                        <td><input type="checkbox" class="file-checkbox" value="${name}"></td>\n                        <td class="filename-cell">${name}</td>\n                        <td>${type}</td>\n                        <td>${size}</td>\n                        <td>${samples}</td>\n                        <td>${sample_rate}</td>\n                        <td>${center_freq}</td>\n                        <td>\n                            ${this.renderFileActions(name)}\n                        </td>\n                    </tr>\n                `;
            }).join('');

            console.log('🔍 [DEBUG] File table rendered successfully');

            // update selects using the canonical helper
            try { this.updateFileSelects(files); } catch (e) { console.warn('updateFileSelects failed', e); }

        } catch (error) {
            console.error('❌ [DEBUG] Error loading file list:', error);
            try {
                const fileTableBody = document.getElementById('fileTableBody');
                if (fileTableBody) fileTableBody.innerHTML = '<tr><td colspan="8" class="error">Error loading files: ' + (error.message || error) + '</td></tr>';
            } catch (e) { /* ignore */ }
            // still call existing fallback
            this.updateFileTable([]);
        }
    }

    updateFileTable(files) {
        const tableBody = document.getElementById('fileTableBody');
        try { console.log('[rptUI] updateFileTable: updating table with', (files && files.length) || 0, 'file(s)'); } catch(e){}

        if (!files || files.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="icon">📁</div>
                        <div class="message">No files found</div>
                        <div>Upload files to get started</div>
                    </td>
                </tr>
            `;
            this.updateFileSelects([]);
            return;
        }

        let html = '';

        files.forEach(file => {
            const fileInfo = this.parseFileInfo(file);

            html += `
                <tr data-filename="${fileInfo.filename}">
                    <td>
                        <input type="radio" name="file-select" value="${fileInfo.filename}" 
                               onchange="rptUI.selectFile('${fileInfo.filename}')"
                               ${this.selectedFile && this.selectedFile.filename === fileInfo.filename ? 'checked' : ''}>
                    </td>
                    <td class="filename-cell">
                        <div class="filename-text" title="${fileInfo.fullName}">
                            ${fileInfo.name}
                            <span class="file-extension">${fileInfo.extension}</span>
                        </div>
                    </td>
                    <td>
                        <span class="data-type-badge data-type-${fileInfo.dataType}">
                            ${fileInfo.dataTypeDisplay}
                        </span>
                    </td>
                    <td>
                        <span class="file-size">${fileInfo.sizeValue}</span>
                        <span class="file-size-unit">${fileInfo.sizeUnit}</span>
                    </td>
                    <td>
                        <span class="sample-count">${fileInfo.sampleCount}</span>
                    </td>
                    <td>
                        <span class="sample-rate">${fileInfo.sampleRate}</span>
                        <span class="unit">${fileInfo.sampleRateUnit}</span>
                    </td>
                    <td>
                        <span class="center-freq">${fileInfo.centerFreq}</span>
                        <span class="unit">${fileInfo.centerFreqUnit}</span>
                    </td>
                    <td>
                        ${this.renderFileActions(fileInfo.filename)}
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;

        // quick post-render debug: print innerHTML length and snapshot so we can confirm the DOM was updated
            try {
                console.log('[rptUI] updateFileTable: post-render innerHTML length', tableBody.innerHTML.length);
                // If render produced an empty table, log a warning for later debugging but do not inject placeholder rows.
                if (!tableBody.innerHTML || tableBody.innerHTML.trim() === '') {
                    console.warn('[rptUI] updateFileTable: detected empty table after render — no rows were produced');
                }
            } catch(e) { console.warn('post-render debug failed', e); }

        // 更新下拉选择框
        this.updateFileSelects(files);
    }

    renderFileActions(filename) {
        return `
            <div class="file-actions-cell">
                <button class="file-action-button file-action-button--analyze"  data-action="select-and-analyze-file" data-arg-file="${filename}">
                    <span class="file-action-label">Analyze</span>
                </button>
                <button class="file-action-button file-action-button--download"  data-action="download-file" data-arg-file="${filename}">
                    <span class="file-action-label">Download</span>
                </button>
                <button class="file-action-button file-action-button--info"  data-action="show-file-info" data-arg-file="${filename}">
                    <span class="file-action-label">Info</span>
                </button>
                <button class="file-action-button file-action-button--delete"  data-action="delete-file" data-arg-file="${filename}">
                    <span class="file-action-label">Delete</span>
                </button>
            </div>
        `;
    }

    parseFileInfo(file) {
        const info = {
            filename: file.name || '',
            fullName: file.name || '',
            name: '',
            extension: '',
            dataType: 'unknown',
            dataTypeDisplay: 'Unknown',
            sizeValue: '0',
            sizeUnit: 'B',
            sampleCount: 'N/A',
            sampleRate: '0',
            sampleRateUnit: 'Hz',
            centerFreq: '0',
            centerFreqUnit: 'Hz'
        };

        if (!file.name) return info;

        const nameParts = file.name.split('.');
        if (nameParts.length > 1) {
            info.extension = nameParts.pop().toLowerCase();
            info.name = nameParts.join('.');
        } else {
            info.name = file.name;
            info.extension = '';
        }

        info.dataType = this.getDataTypeFromExtension(info.extension);
        info.dataTypeDisplay = this.getDataTypeDisplayName(info.dataType);

        if (file.size) {
            const sizeInfo = this.formatFileSize(file.size);
            info.sizeValue = sizeInfo.value;
            info.sizeUnit = sizeInfo.unit;
        }

        info.sampleCount = file.samples_count ? file.samples_count.toLocaleString() : (file.samples_count || 'N/A');

        if (file.sample_rate) {
            const rateInfo = this.formatFrequency(file.sample_rate);
            info.sampleRate = rateInfo.value;
            info.sampleRateUnit = rateInfo.unit;
        }

        if (file.center_freq) {
            const freqInfo = this.formatFrequency(file.center_freq);
            info.centerFreq = freqInfo.value;
            info.centerFreqUnit = freqInfo.unit;
        }

        return info;
    }

    getDataTypeDisplayName(type) {
        const displayMap = {
            'h5': 'HDF5', 'bin': 'Binary', 'dat': 'Data', 'complex': 'Complex', 'raw': 'Raw', 'wav': 'WAV', 'csv': 'CSV', 'npy': 'NumPy', 'unknown': 'Unknown'
        };
        return displayMap[type] || 'Unknown';
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return { value: '0', unit: 'B' };
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++; }
        return { value: size.toFixed(size < 10 ? 2 : 1), unit: units[unitIndex] };
    }

    formatFrequency(freq) {
        if (!freq || freq === 0) return { value: '0', unit: 'Hz' };
        if (freq >= 1e9) return { value: (freq / 1e9).toFixed(3), unit: 'GHz' };
        else if (freq >= 1e6) return { value: (freq / 1e6).toFixed(3), unit: 'MHz' };
        else if (freq >= 1e3) return { value: (freq / 1e3).toFixed(1), unit: 'kHz' };
        else return { value: freq.toFixed(0), unit: 'Hz' };
    }

    updateFileSelects(files) {
        const playSelect = document.getElementById('playFileSelect');
        const convertSelect = document.getElementById('convertFileSelect');
        this.updateFileSelect(playSelect, files);
        this.updateFileSelect(convertSelect, files);
    }

    updateFileSelect(selectElement, files) { if (!selectElement) return; selectElement.innerHTML = '<option value="">Select file...</option>'; if (files && files.length > 0) { files.forEach(file => { const option = document.createElement('option'); option.value = file.name; option.textContent = file.name; selectElement.appendChild(option); }); } }

    async deleteFile(filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;
        try {
            const response = await fetch(`/api/files/${filename}`, { method: 'DELETE' });
            if (response.ok) { this.showAlert(`File "${filename}" deleted successfully`, 'success'); this.loadFileList(); }
            else throw new Error('Delete request failed');
        } catch (error) { this.showAlert(`Failed to delete file: ${error.message}`, 'error'); }
    }

    async deleteAllFiles() {
        if (!confirm('Are you sure you want to delete ALL files? This action cannot be undone.')) return;
        try {
            const response = await fetch('/api/files', { method: 'DELETE' });
            if (response.ok) { this.showAlert('All files deleted successfully', 'success'); this.loadFileList(); }
            else throw new Error('Delete all request failed');
        } catch (error) { this.showAlert(`Failed to delete files: ${error.message}`, 'error'); }
    }

    showFileInfo(filename) { this.showPreview(filename); }

    /* ===== Preview modal and chart rendering ===== */
    async showPreview(filename) {
        try {
            this.openPreviewModal();
            this.showPreviewLoading();

            const response = await fetch(`/api/files/${encodeURIComponent(filename)}/preview`);
            if (!response.ok) throw new Error('Preview request failed');

            const previewData = await response.json();

            this.showPreviewContent(previewData);
            this.renderPreviewCharts(previewData);
        } catch (error) {
            console.error('Preview error:', error);
            this.showPreviewError(`Failed to load preview: ${error.message}`);
        }
    }

    openPreviewModal() {
        const panel = document.getElementById('previewPanel');
        if (!panel) return;
        panel.style.display = 'block';

        this.previewEscHandler = (e) => { if (e.key === 'Escape') this.closePreview(); };
        document.addEventListener('keydown', this.previewEscHandler);

        this.setupPreviewTabs();
        // ensure canvases have proper pixel size
        setTimeout(() => this.cleanupPreviewCharts(), 50);
    }

    closePreview() {
        const panel = document.getElementById('previewPanel');
        if (!panel) return;
        panel.style.display = 'none';
        if (this.previewEscHandler) { document.removeEventListener('keydown', this.previewEscHandler); this.previewEscHandler = null; }
        this.cleanupPreviewCharts();
    }

    showPreviewLoading() {
        const loading = document.getElementById('previewLoading');
        const content = document.getElementById('previewContent');
        const error = document.getElementById('previewError');
        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';
        if (error) error.style.display = 'none';
    }

    showPreviewContent(previewData) {
        const loading = document.getElementById('previewLoading');
        const content = document.getElementById('previewContent');
        const error = document.getElementById('previewError');
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (error) error.style.display = 'none';

        document.getElementById('previewFilename').textContent = previewData.filename || '';
        document.getElementById('previewSampleRate').textContent = (this.formatFrequency(previewData.sample_rate || 0).value + ' ' + (this.formatFrequency(previewData.sample_rate || 0).unit));
        document.getElementById('previewTotalSamples').textContent = (previewData.total_samples || 0).toLocaleString();
        document.getElementById('previewSamplesCount').textContent = (previewData.preview_samples || 0).toLocaleString();
    }

    showPreviewError(message) {
        const loading = document.getElementById('previewLoading');
        const content = document.getElementById('previewContent');
        const error = document.getElementById('previewError');
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        if (error) { error.style.display = 'block'; const msgEl = document.getElementById('previewErrorMessage'); if (msgEl) msgEl.textContent = message; }
    }

    setupPreviewTabs() {
        const tabs = document.querySelectorAll('.preview-tab');
        tabs.forEach(tab => {
            tab.removeEventListener('click', this._previewTabHandler);
            tab.addEventListener('click', () => { const tabName = tab.getAttribute('data-tab'); this.switchPreviewTab(tabName); });
        });
    }

    switchPreviewTab(tabName) {
        document.querySelectorAll('.preview-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabName));
        // handle id mapping: time -> timeChart, magnitude -> magnitudeChart, phase -> phaseChart, iq -> iqChart
        document.querySelectorAll('.preview-chart').forEach(c => c.classList.remove('active'));
        const map = { time: 'timeChart', magnitude: 'magnitudeChart', phase: 'phaseChart', iq: 'iqChart' };
        const target = document.getElementById(map[tabName] || 'timeChart');
        if (target) target.classList.add('active');
    }

    renderPreviewCharts(previewData) {
        if (!previewData || !previewData.preview_data) return;
        const data = previewData.preview_data;
        const sampleCount = previewData.preview_samples || (data.real ? data.real.length : 0);
        const timeAxis = Array.from({ length: sampleCount }, (_, i) => i);

        // render preview charts into preview_* canvases to avoid id collisions with main analysis canvases
        this.renderPreviewTimeDomainChart(timeAxis, data.real || [], data.imag || []);
        this.renderPreviewMagnitudeChart(timeAxis, data.magnitude || []);
        this.renderPreviewPhaseChart(timeAxis, data.phase || []);
        this.renderPreviewIQScatterChart(data.real || [], data.imag || []);
    }

    // Preview-specific rendering (use preview_* ids)
    renderPreviewTimeDomainChart(timeAxis, realData, imagData) {
        const canvas = document.getElementById('preview_timeDomainChart'); if (!canvas || typeof canvas.getContext !== 'function') return; const ctx = canvas.getContext('2d'); this.resizeCanvasToDisplaySize(canvas);
        const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
        this.renderSimpleChart(
            ctx,
            timeAxis,
            [
                { data: realData, label: 'I (Real)', color: '#3498db' },
                { data: imagData, label: 'Q (Imag)', color: '#e74c3c' }
            ],
            'Time Domain Preview',
            {
                xLabel: 'Sample Index',
                yLabel: 'Amplitude',
                showGrid: vizConfig.power_grid_enabled !== false,
                showTicks: vizConfig.power_ticks_enabled !== false,
                xTickCount: 6,
                yTickCount: 6
            }
        );
    }

    renderPreviewMagnitudeChart(timeAxis, magnitudeData) {
        const canvas = document.getElementById('preview_magnitudeChart'); if (!canvas || typeof canvas.getContext !== 'function') return; const ctx = canvas.getContext('2d'); this.resizeCanvasToDisplaySize(canvas);
        const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
        this.renderSimpleChart(
            ctx,
            timeAxis,
            [ { data: magnitudeData, label: 'Magnitude', color: '#27ae60' } ],
            'Signal Magnitude',
            {
                xLabel: 'Sample Index',
                yLabel: 'Amplitude',
                showGrid: vizConfig.power_grid_enabled !== false,
                showTicks: vizConfig.power_ticks_enabled !== false,
                xTickCount: 6,
                yTickCount: 6
            }
        );
    }

    renderPreviewPhaseChart(timeAxis, phaseData) {
        const canvas = document.getElementById('preview_phaseChart'); if (!canvas || typeof canvas.getContext !== 'function') return; const ctx = canvas.getContext('2d'); this.resizeCanvasToDisplaySize(canvas);
        const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
        this.renderSimpleChart(
            ctx,
            timeAxis,
            [ { data: phaseData, label: 'Phase (rad)', color: '#8e44ad' } ],
            'Signal Phase',
            {
                xLabel: 'Sample Index',
                yLabel: 'Phase (rad)',
                showGrid: vizConfig.power_grid_enabled !== false,
                showTicks: vizConfig.power_ticks_enabled !== false,
                xTickCount: 6,
                yTickCount: 6
            }
        );
    }

    renderPreviewIQScatterChart(realData, imagData) {
        const canvas = document.getElementById('preview_iqScatterChart'); if (!canvas || typeof canvas.getContext !== 'function') return; const ctx = canvas.getContext('2d'); this.resizeCanvasToDisplaySize(canvas);
        const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
        this.renderScatterChart(
            ctx,
            realData,
            imagData,
            '',
            {
                showGrid: vizConfig.power_grid_enabled !== false,
                showTicks: vizConfig.power_ticks_enabled !== false,
                xLabel: 'I (Real)',
                yLabel: 'Q (Imag)',
                margin: { top: 40 }
            }
        );
    }

    renderTimeDomainChart(timeAxis, iData, qData, meta = {}) {
        const canvas = document.getElementById('timeDomainChart');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        this.resizeCanvasToDisplaySize(canvas);

        const toNumeric = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map((value) => {
                const num = Number(value);
                return Number.isFinite(num) ? num : 0;
            });
        };

        const iSeries = toNumeric(iData);
        const qSeries = toNumeric(qData);
        const pointCount = Math.max(iSeries.length, qSeries.length);

        if (!pointCount) {
            this.toggleCanvasVisibility(canvas, false);
            ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
            try {
                console.log('[rptUI] renderTimeDomainChart: cleared canvas (no I/Q samples)', {
                    timeCount: Array.isArray(timeAxis) ? timeAxis.length : 0,
                    iCount: iSeries.length,
                    qCount: qSeries.length
                });
            } catch (logErr) { /* ignore */ }
            return;
        }

        const metaObj = meta && typeof meta === 'object' ? meta : {};
        const sampleRate = this._resolveSampleRate(metaObj);
        const windowStartIndex = this._resolveWindowStart(metaObj);

        let timeSeries = toNumeric(Array.isArray(timeAxis) ? timeAxis : []);
        if (!timeSeries.length) {
            timeSeries = Array.from({ length: pointCount }, (_, idx) => idx);
        }

        if (timeSeries.length !== pointCount) {
            const limit = Math.min(timeSeries.length, pointCount);
            timeSeries = timeSeries.slice(timeSeries.length - limit);
            if (iSeries.length > limit) iSeries.splice(0, iSeries.length - limit);
            if (qSeries.length > limit) qSeries.splice(0, qSeries.length - limit);
        }

        const timeInfo = this._buildTimeSeconds(timeSeries, sampleRate, windowStartIndex, Math.max(iSeries.length, qSeries.length));
        const timesSeconds = timeInfo.series;
        const timeUnit = timeInfo.unit;

        const config = (typeof window !== 'undefined' && window.waveformConfig) ? window.waveformConfig : {};
        const scrollMode = config.scrollMode !== false;
        const targetDuration = Number.isFinite(Number(config.windowDuration)) && Number(config.windowDuration) > 0 ? Number(config.windowDuration) : 2.0;
        const autoScale = config.autoScale !== false;

        const windowMetrics = this._computeTimeWindow(timesSeconds, scrollMode, targetDuration);
        const windowedSeries = this._filterSeriesForWindow(timesSeconds, iSeries, qSeries, windowMetrics.timeStart, windowMetrics.timeEnd);

        if (!windowedSeries.times.length) {
            this.toggleCanvasVisibility(canvas, false);
            ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
            console.warn('[rptUI] renderTimeDomainChart: no samples inside the display window');
            return;
        }

        const amplitudeMax = this._resolveAmplitudeScale(windowedSeries.iData, windowedSeries.qData, autoScale, config.amplitudeMax);

        this.toggleCanvasVisibility(canvas, true);

        try {
            console.log('[rptUI] renderTimeDomainChart: rendering waveform', {
                canvasSize: { width: canvas.width, height: canvas.height },
                pointsInWindow: windowedSeries.times.length,
                timeRange: (windowMetrics.timeEnd - windowMetrics.timeStart).toFixed(6),
                windowStart: windowMetrics.timeStart.toFixed(6),
                windowEnd: windowMetrics.timeEnd.toFixed(6),
                unit: timeUnit,
                amplitudeMax,
                sampleRate
            });
        } catch (logErr) { /* ignore */ }

        try {
            this.drawWaveformWithWindow(ctx, windowedSeries.times, windowedSeries.iData, windowedSeries.qData, {
                width: canvas.width,
                height: canvas.height,
                timeStart: windowMetrics.timeStart,
                timeEnd: windowMetrics.timeEnd,
                amplitudeMax,
                timeUnit,
                autoScale,
                title: 'Time Domain'
            });
        } catch (err) {
            console.error('[rptUI] renderTimeDomainChart failed', err);
        }
    }

    _resolveSampleRate(meta) {
        const source = meta && typeof meta === 'object' ? meta : {};
        const candidates = [
            source.sample_rate,
            source.sampleRate,
            source.samplerate,
            source.sampleRateHz,
            this.selectedFile ? this.selectedFile.sample_rate : null,
        ];
        for (const candidate of candidates) {
            const num = Number(candidate);
            if (Number.isFinite(num) && num > 0) return num;
        }
        return null;
    }

    _resolveWindowStart(meta) {
        const candidates = [meta.window_start, meta.start_index, meta.startIndex];
        for (const candidate of candidates) {
            const num = Number(candidate);
            if (Number.isFinite(num) && num >= 0) return num;
        }
        return null;
    }

    _buildTimeSeconds(rawSeries, sampleRate, windowStartIndex, pointCount) {
        const length = Math.max(0, pointCount);
        const clean = Array.isArray(rawSeries) ? rawSeries.slice(-length) : [];

        if (sampleRate) {
            const baseIndex = Number.isFinite(windowStartIndex) ? windowStartIndex : (clean.length ? clean[0] : 0);
            const series = Array.from({ length }, (_, idx) => (baseIndex + idx) / sampleRate);
            return { series, unit: 's' };
        }

        if (!clean.length) {
            if (this.selectedFile && Number.isFinite(this.selectedFile.sample_rate) && this.selectedFile.sample_rate > 0) {
                const sr = Number(this.selectedFile.sample_rate);
                const series = Array.from({ length }, (_, idx) => idx / sr);
                return { series, unit: 's' };
            }
            const series = Array.from({ length }, (_, idx) => idx);
            return { series, unit: 'samples' };
        }

        const span = clean[clean.length - 1] - clean[0];
        if (span > 10) {
            const series = clean.map((value) => Number.isFinite(value) ? value / 1000 : 0);
            return { series, unit: 's' };
        }

        const series = clean.map((value) => Number.isFinite(value) ? value : 0);
        return { series, unit: 's' };
    }

    _computeTimeWindow(timesSeconds, scrollMode, durationSeconds) {
        if (!Array.isArray(timesSeconds) || timesSeconds.length === 0) {
            return { timeStart: 0, timeEnd: 0 };
        }
        const end = timesSeconds[timesSeconds.length - 1];
        const start = timesSeconds[0];
        if (!scrollMode || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
            return { timeStart: start, timeEnd: end };
        }
        const span = Math.max(durationSeconds, 1e-6);
        const windowStart = Math.max(start, end - span);
        return { timeStart: windowStart, timeEnd: end };
    }

    _filterSeriesForWindow(timesSeconds, iSeries, qSeries, windowStart, windowEnd) {
        const times = [];
        const iData = [];
        const qData = [];
        const epsilon = (windowEnd - windowStart) * 1e-6;
        const limit = timesSeconds.length;
        for (let idx = 0; idx < limit; idx++) {
            const t = timesSeconds[idx];
            if (!Number.isFinite(t)) continue;
            if (t < windowStart - epsilon) continue;
            if (t > windowEnd + epsilon) break;
            times.push(t);
            if (iSeries && idx < iSeries.length) iData.push(Number.isFinite(iSeries[idx]) ? iSeries[idx] : 0);
            else iData.push(0);
            if (qSeries && idx < qSeries.length) qData.push(Number.isFinite(qSeries[idx]) ? qSeries[idx] : 0);
            else if (Array.isArray(qSeries) && qSeries.length > 0) qData.push(0);
        }
        return { times, iData, qData };
    }

    _resolveAmplitudeScale(iSeries, qSeries, autoScale, amplitudeHint) {
        if (!autoScale) {
            const hint = Number(amplitudeHint);
            return Number.isFinite(hint) && hint > 0 ? hint : 1;
        }
        const values = [];
        if (Array.isArray(iSeries)) values.push(...iSeries.map((v) => Math.abs(Number(v) || 0)));
        if (Array.isArray(qSeries)) values.push(...qSeries.map((v) => Math.abs(Number(v) || 0)));
        const max = values.reduce((acc, val) => Math.max(acc, val), 0);
        return max > 0 ? max : 1;
    }

    _resetHigherOrderAverages() {
        this.higherOrderAverage = {
            count: 0,
            frequency: [],
            quad: [],
            quart: [],
            lastCenterFreqMHz: null,
        };
    }

    _accumulateHigherOrderAverage(freqArray, quadArray, quartArray, centerFreqMHz) {
        const toNumeric = (source) => {
            if (!source) return [];
            try {
                return Array.from(source, (value) => {
                    const num = Number(value);
                    return Number.isFinite(num) ? num : 0;
                });
            } catch (err) {
                return [];
            }
        };

        const freqNumeric = toNumeric(freqArray);
        const quadNumeric = toNumeric(quadArray);
        const quartNumeric = toNumeric(quartArray);
        const length = Math.min(freqNumeric.length, quadNumeric.length, quartNumeric.length);

        if (!Number.isFinite(length) || length <= 0) {
            this._resetHigherOrderAverages();
            return { frequency: [], quad: [], quart: [], count: 0 };
        }

        const freq = freqNumeric.slice(0, length);
        const quad = quadNumeric.slice(0, length);
        const quart = quartNumeric.slice(0, length);
        const center = Number.isFinite(centerFreqMHz) ? Number(centerFreqMHz) : null;

        if (!this.higherOrderAverage || typeof this.higherOrderAverage !== 'object') {
            this._resetHigherOrderAverages();
        }

        const state = this.higherOrderAverage;
        const toleranceMHz = 1e-3; // ≈1 kHz tolerance in MHz units
        const centerChanged = center !== null && state.lastCenterFreqMHz !== null && Math.abs(center - state.lastCenterFreqMHz) > toleranceMHz;

        let needsReset = centerChanged;
        needsReset = needsReset || state.count === 0 || state.frequency.length !== length;
        if (!needsReset && state.frequency.length === length) {
            for (let i = 0; i < length; i++) {
                if (Math.abs(state.frequency[i] - freq[i]) > toleranceMHz * 2) {
                    needsReset = true;
                    break;
                }
            }
        }

        if (needsReset) {
            state.count = 1;
            state.frequency = freq.slice();
            state.quad = quad.slice();
            state.quart = quart.slice();
            state.lastCenterFreqMHz = center;
            return {
                frequency: state.frequency.slice(),
                quad: state.quad.slice(),
                quart: state.quart.slice(),
                count: state.count,
            };
        }

        const nextCount = state.count + 1;
        for (let i = 0; i < length; i++) {
            state.quad[i] += (quad[i] - state.quad[i]) / nextCount;
            state.quart[i] += (quart[i] - state.quart[i]) / nextCount;
            const freqDelta = Math.abs(state.frequency[i] - freq[i]);
            if (freqDelta > toleranceMHz) {
                state.frequency[i] += (freq[i] - state.frequency[i]) / nextCount;
            }
        }
        state.count = nextCount;
        if (center !== null) {
            if (state.lastCenterFreqMHz === null) {
                state.lastCenterFreqMHz = center;
            } else {
                state.lastCenterFreqMHz += (center - state.lastCenterFreqMHz) / nextCount;
            }
        }

        return {
            frequency: state.frequency.slice(),
            quad: state.quad.slice(),
            quart: state.quart.slice(),
            count: state.count,
        };
    }

    _calculateHigherOrderPowerRange(powerArray) {
        if (!powerArray) return null;
        const numeric = Array.from(powerArray, (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        }).filter((value) => value !== null);
        if (!numeric.length) return null;
        const maxPower = numeric.reduce((acc, value) => Math.max(acc, value), Number.NEGATIVE_INFINITY);
        const actualMin = numeric.reduce((acc, value) => Math.min(acc, value), Number.POSITIVE_INFINITY);
        let yMin = maxPower - 60;
        let yMax = maxPower + 10;
        if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) return null;
        if (yMin < actualMin) yMin = actualMin;
        if (yMin >= yMax) yMin = yMax - 1;
        return { yMin, yMax };
    }

    _calculateFrequencyRange(freqArray) {
        if (!freqArray) return null;
        const numeric = Array.from(freqArray, (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        }).filter((value) => value !== null);
        if (!numeric.length) return null;
        let minFreq = numeric.reduce((acc, value) => Math.min(acc, value), Number.POSITIVE_INFINITY);
        let maxFreq = numeric.reduce((acc, value) => Math.max(acc, value), Number.NEGATIVE_INFINITY);
        if (!Number.isFinite(minFreq) || !Number.isFinite(maxFreq)) return null;
        if (Math.abs(maxFreq - minFreq) < 1.0) {
            minFreq -= 2.0;
            maxFreq += 2.0;
        }
        if (minFreq >= maxFreq) {
            const delta = 1.0;
            minFreq -= delta;
            maxFreq += delta;
        }
        return { xMin: minFreq, xMax: maxFreq };
    }

    _calculateHigherOrderFrequencyRange(centerFreqMHz, order, sampleRateHz) {
        const center = Number(centerFreqMHz);
        const sampleRate = Number(sampleRateHz);
        if (!Number.isFinite(center)) {
            return null;
        }

        if (Number.isFinite(sampleRate) && sampleRate > 0) {
            const spanMHz = (sampleRate * 0.505) / 1e6;
            const xMin = center;
            const xMax = center + spanMHz;
            if (Number.isFinite(xMax) && xMax > xMin) {
                return { xMin, xMax };
            }
        }

        const harmonicOrder = Number(order);
        if (!Number.isFinite(harmonicOrder) || harmonicOrder <= 0) {
            return null;
        }

        const baseFreq = center;
        const harmonicFreq = center * harmonicOrder;
        if (!Number.isFinite(harmonicFreq) || !Number.isFinite(baseFreq)) return null;
        let minFreq;
        let maxFreq;
        if (harmonicOrder === 2) {
            minFreq = baseFreq;
            maxFreq = harmonicFreq + 5;
        } else if (harmonicOrder === 4) {
            minFreq = baseFreq;
            maxFreq = harmonicFreq + 3;
        } else {
            const span = harmonicOrder >= 2 ? 3 : 1;
            minFreq = harmonicFreq - span;
            maxFreq = harmonicFreq + span;
        }
        if (!Number.isFinite(minFreq) || !Number.isFinite(maxFreq) || minFreq >= maxFreq) {
            return null;
        }
        return { xMin: minFreq, xMax: maxFreq };
    }

    _resolveCenterFrequencyMHz(...sources) {
        const extractNumeric = (value) => {
            const num = Number(value);
            if (!Number.isFinite(num)) return null;
            if (Math.abs(num) >= 1e4) {
                return num / 1e6;
            }
            return num;
        };

        const visited = new Set();
        const visit = (source, depth = 0) => {
            if (source == null || depth > 3) return null;
            if (typeof source === 'number' || typeof source === 'string') {
                return extractNumeric(source);
            }
            if (typeof source !== 'object') return null;
            if (visited.has(source)) return null;
            visited.add(source);

            const keys = [
                'center_freq',
                'centerFreq',
                'center_frequency',
                'centerFrequency',
                'frequency_center',
                'freq_center',
                'carrier_freq',
                'carrierFreq',
            ];

            for (const key of keys) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    const converted = extractNumeric(source[key]);
                    if (converted !== null) {
                        return converted;
                    }
                }
            }

            const nestedKeys = [
                'metadata',
                'meta',
                'info',
                'file_metadata',
                'fileMeta',
                'settings',
                'params',
                'options',
                'configuration',
                'config',
            ];

            for (const nestedKey of nestedKeys) {
                if (source[nestedKey]) {
                    const nestedResult = visit(source[nestedKey], depth + 1);
                    if (nestedResult !== null) {
                        return nestedResult;
                    }
                }
            }

            return null;
        };

        for (const candidate of sources) {
            const resolved = visit(candidate, 0);
            if (resolved !== null) {
                return resolved;
            }
        }
        return null;
    }

    _applyCenterFrequencyOffset(values, centerFreqMHz) {
        const arr = Array.isArray(values) ? values : Array.from(values || []);
        const numeric = arr.map((value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        });
        if (!Number.isFinite(centerFreqMHz)) {
            return numeric;
        }
        return numeric.map((value) => value + centerFreqMHz);
    }

    drawWaveformWithWindow(ctx, times, iSeries, qSeries, options) {
        const canvas = ctx && ctx.canvas ? ctx.canvas : null;
        if (!canvas) return;

        const amplitudeCandidate = Number(options.amplitudeMax);
        const amplitudeMax = Number.isFinite(amplitudeCandidate) && amplitudeCandidate > 0 ? amplitudeCandidate : 1;
        const timeStart = Number.isFinite(options.timeStart) ? Number(options.timeStart) : 0;
        const timeEndRaw = Number.isFinite(options.timeEnd) ? Number(options.timeEnd) : null;
        const timeUnit = typeof options.timeUnit === 'string' && options.timeUnit.length ? options.timeUnit : 's';
        const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
        const showGrid = options.showGrid !== undefined ? options.showGrid : vizConfig.power_grid_enabled !== false;
        const showTicks = options.showTicks !== undefined ? options.showTicks : vizConfig.power_ticks_enabled !== false;

        let computedEnd = timeEndRaw;
        if (!Number.isFinite(computedEnd) || computedEnd <= timeStart) {
            if (Array.isArray(times) && times.length > 1) {
                computedEnd = times[times.length - 1];
            } else {
                computedEnd = timeStart + 1;
            }
        }

        const defaultMargin = { left: 70, right: 30, top: 70, bottom: 70 };
        const chartOptions = {
            xLabel: `Time (${timeUnit})`,
            yLabel: 'Amplitude',
            yMin: -amplitudeMax,
            yMax: amplitudeMax,
            xMin: timeStart,
            xMax: computedEnd,
            showGrid,
            showTicks,
            xTickCount: 6,
            yTickCount: 6,
            margin: options.margin || defaultMargin
        };

        this.renderSimpleChart(
            ctx,
            times,
            [
                { data: iSeries, label: 'I (Real)', color: '#ff5c5c' },
                { data: qSeries, label: 'Q (Imag)', color: '#4d6cff' }
            ],
            options.title || 'Time Domain Waveform',
            chartOptions
        );

        const margin = Object.assign({}, chartOptions.margin);
        const plotLeft = margin.left;
        const plotTop = margin.top;
        const plotWidth = Math.max(canvas.width - margin.left - margin.right, 0);

        ctx.save();
        ctx.font = '12px Arial';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff5c5c';
        ctx.fillText('I (Real)', plotLeft + 10, plotTop + 10);
        ctx.fillStyle = '#4d6cff';
        ctx.fillText('Q (Imag)', plotLeft + 10, plotTop + 26);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#212529';
        ctx.fillText(`Max |I/Q| ≈ ${amplitudeMax.toFixed(3)}`, plotLeft + plotWidth - 10, plotTop + 10);
        ctx.restore();
    }

    renderSimpleChart(ctx, labels, datasets, title, options = {}) {
        try {
            const canvas = ctx.canvas;
            this.resizeCanvasToDisplaySize(canvas);

            const normalizedDatasets = (datasets || []).map((dataset) => {
                const data = Array.isArray(dataset.data) ? dataset.data : Array.from(dataset.data || [], (v) => v);
                const numeric = data.map((value) => {
                    const num = Number(value);
                    return Number.isFinite(num) ? num : 0;
                });
                return Object.assign({}, dataset, { data: numeric });
            });

            const labelArray = Array.isArray(labels)
                ? labels.map((value) => {
                      const num = Number(value);
                      return Number.isFinite(num) ? num : null;
                  })
                : [];
            const validLabels = labelArray.filter((value) => Number.isFinite(value));
            const override = options && typeof options === 'object' ? options : {};
            const overrideMin = Number.isFinite(override.xMin) ? override.xMin : null;
            const overrideMax = Number.isFinite(override.xMax) ? override.xMax : null;
            let hasLabelAxis = validLabels.length > 1 || (overrideMin !== null && overrideMax !== null);
            let minLabel = hasLabelAxis && validLabels.length > 0 ? Math.min(...validLabels) : 0;
            let maxLabel = hasLabelAxis && validLabels.length > 0 ? Math.max(...validLabels) : 1;

            if (overrideMin !== null && overrideMax !== null && overrideMax > overrideMin) {
                minLabel = overrideMin;
                maxLabel = overrideMax;
                hasLabelAxis = true;
            } else if (!Number.isFinite(minLabel) || !Number.isFinite(maxLabel) || maxLabel <= minLabel) {
                if (validLabels.length > 1) {
                    minLabel = Math.min(...validLabels);
                    maxLabel = Math.max(...validLabels);
                } else {
                    minLabel = 0;
                    maxLabel = 1;
                    hasLabelAxis = false;
                }
            }

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const hasData = normalizedDatasets.some((d) => d.data && d.data.length > 0);
            if (!hasData) {
                this.toggleCanvasVisibility(canvas, false);
                try { console.log('[rptUI] renderSimpleChart: no data to draw', { title, canvasId: canvas.id }); } catch (logErr) { /* ignore */ }
                return;
            }

            this.toggleCanvasVisibility(canvas, true);

            const defaultMargin = { left: 60, right: 20, top: 40, bottom: 50 };
            const margin = Object.assign({}, defaultMargin, options.margin || {});
            const plotWidth = Math.max(width - margin.left - margin.right, 20);
            const plotHeight = Math.max(height - margin.top - margin.bottom, 20);

            const axisColor = options.axisColor || '#424a57';
            const gridColor = options.gridColor || 'rgba(96, 125, 139, 0.45)';
            const minorGridColor = options.minorGridColor || 'rgba(120, 144, 156, 0.25)';
            const labelColor = options.labelColor || '#212529';
            const showGrid = options.showGrid !== false;
            const showTicks = options.showTicks !== false;
            const xTickCount = Number.isFinite(options.xTickCount) ? Math.max(2, Math.floor(options.xTickCount)) : 6;
            const yTickCount = Number.isFinite(options.yTickCount) ? Math.max(2, Math.floor(options.yTickCount)) : 6;

            const dataExtents = normalizedDatasets.reduce((acc, dataset) => {
                dataset.data.forEach((value) => {
                    if (Number.isFinite(value)) {
                        acc.min = Math.min(acc.min, value);
                        acc.max = Math.max(acc.max, value);
                    }
                });
                return acc;
            }, { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY });

            const customYMin = Number.isFinite(options.yMin) ? options.yMin : null;
            const customYMax = Number.isFinite(options.yMax) ? options.yMax : null;
            let yMin = customYMin !== null ? customYMin : dataExtents.min;
            let yMax = customYMax !== null ? customYMax : dataExtents.max;

            if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) {
                yMin = -1;
                yMax = 1;
            } else if (yMax === yMin) {
                const adjustment = Math.abs(yMax) || 1;
                yMax += adjustment * 0.5;
                yMin -= adjustment * 0.5;
            } else if (customYMin === null || customYMax === null) {
                const padding = Math.max((yMax - yMin) * 0.08, 1e-3);
                yMin -= padding;
                yMax += padding;
            }

            const yRange = Math.max(yMax - yMin, 1e-9);

            const longestDatasetLength = normalizedDatasets.reduce((maxLen, dataset) => Math.max(maxLen, dataset.data.length), 0);
            if (!hasLabelAxis && longestDatasetLength > 1) {
                minLabel = 0;
                maxLabel = longestDatasetLength - 1;
            }

            const xRange = Math.max(maxLabel - minLabel, 1e-9);

            const chooseTickStep = (span, desiredTicks) => {
                if (!Number.isFinite(span) || span <= 0) return 1;
                const preferred = [1, 2, 5];
                const rawStep = span / Math.max(desiredTicks || 5, 2);
                const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
                let bestStep = magnitude;
                let bestDiff = Number.POSITIVE_INFINITY;
                preferred.forEach((base) => {
                    const candidate = base * magnitude;
                    const tickCount = span / candidate;
                    const diff = Math.abs(tickCount - desiredTicks);
                    if (diff < bestDiff) {
                        bestDiff = diff;
                        bestStep = candidate;
                    }
                });
                return bestStep;
            };

            const generateTicks = (minValue, maxValue, step) => {
                if (!Number.isFinite(step) || step <= 0) return [];
                const ticks = [];
                const start = Math.ceil(minValue / step) * step;
                for (let value = start; value <= maxValue + step * 0.5; value += step) {
                    const rounded = Math.round((value + Number.EPSILON) / step) * step;
                    ticks.push(Number.parseFloat(rounded.toPrecision(12)));
                }
                return ticks;
            };

            const formatTick = (value, step) => {
                if (!Number.isFinite(value)) return '';
                const absVal = Math.abs(value);
                const absStep = Math.abs(step) || 1;
                if ((absVal >= 1e6) || (absVal !== 0 && absVal <= 1e-4)) {
                    return value.toExponential(1);
                }
                const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(absStep)) + 1));
                return value.toFixed(decimals);
            };

            const xStep = Number.isFinite(options.xTickStep) ? options.xTickStep : chooseTickStep(xRange, xTickCount);
            const yStep = Number.isFinite(options.yTickStep) ? options.yTickStep : chooseTickStep(yRange, yTickCount);

            const xTicks = generateTicks(minLabel, maxLabel, xStep);
            const yTicks = generateTicks(yMin, yMax, yStep);

            const valueToX = (value) => {
                const normalized = (value - minLabel) / xRange;
                const clamped = Math.max(0, Math.min(1, normalized));
                return margin.left + clamped * plotWidth;
            };

            const valueToY = (value) => {
                const normalized = (value - yMin) / yRange;
                const clamped = Math.max(0, Math.min(1, normalized));
                return margin.top + (1 - clamped) * plotHeight;
            };

            if (showGrid) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = minorGridColor;
                yTicks.forEach((tick) => {
                    const y = valueToY(tick);
                    ctx.beginPath();
                    ctx.moveTo(margin.left, y);
                    ctx.lineTo(margin.left + plotWidth, y);
                    ctx.stroke();
                });

                ctx.strokeStyle = gridColor;
                xTicks.forEach((tick) => {
                    const x = valueToX(tick);
                    ctx.beginPath();
                    ctx.moveTo(x, margin.top);
                    ctx.lineTo(x, margin.top + plotHeight);
                    ctx.stroke();
                });
            }

            ctx.strokeStyle = axisColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(margin.left, margin.top);
            ctx.lineTo(margin.left, margin.top + plotHeight);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(margin.left, margin.top + plotHeight);
            ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
            ctx.stroke();

            ctx.fillStyle = labelColor;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(title, margin.left + plotWidth / 2, margin.top - 10);

            if (showTicks) {
                ctx.font = '11px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                yTicks.forEach((tick) => {
                    const y = valueToY(tick);
                    ctx.beginPath();
                    ctx.moveTo(margin.left - 5, y);
                    ctx.lineTo(margin.left, y);
                    ctx.strokeStyle = axisColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillText(formatTick(tick, yStep), margin.left - 8, y);
                });

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                xTicks.forEach((tick) => {
                    const x = valueToX(tick);
                    ctx.beginPath();
                    ctx.moveTo(x, margin.top + plotHeight);
                    ctx.lineTo(x, margin.top + plotHeight + 6);
                    ctx.strokeStyle = axisColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillText(formatTick(tick, xStep), x, margin.top + plotHeight + 6);
                });
            }

            if (options.xLabel && showTicks) {
                ctx.font = '12px Arial';
                ctx.textBaseline = 'top';
                ctx.fillText(options.xLabel, margin.left + plotWidth / 2, height - margin.bottom + 18);
            }

            if (options.yLabel && showTicks) {
                ctx.save();
                ctx.translate(margin.left - 45, margin.top + plotHeight / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.font = '12px Arial';
                ctx.fillText(options.yLabel, 0, 0);
                ctx.restore();
            }

            normalizedDatasets.forEach((dataset) => {
                const dataArr = dataset.data;
                if (!dataArr || dataArr.length === 0) return;
                ctx.strokeStyle = dataset.color || '#2c3e50';
                ctx.lineWidth = 2;
                ctx.beginPath();
                dataArr.forEach((value, idx) => {
                    let xValue;
                    if (hasLabelAxis && idx < labelArray.length && Number.isFinite(labelArray[idx])) {
                        xValue = labelArray[idx];
                    } else {
                        const ratio = dataArr.length > 1 ? idx / (dataArr.length - 1) : 0;
                        xValue = minLabel + ratio * xRange;
                    }
                    const x = valueToX(xValue);
                    const y = valueToY(value);
                    if (idx === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            });

            try {
                console.log('[rptUI] renderSimpleChart: draw complete', {
                    title,
                    canvasId: canvas.id,
                    datasets: normalizedDatasets.map((d) => ({ label: d.label, points: d.data.length }))
                });
            } catch (logErr) { /* ignore */ }
        } catch (e) {
            console.error('[rptUI] renderSimpleChart failed', e);
        }
    }

    renderScatterChart(ctx, xData, yData, title, options = {}) {
        try {
            const canvas = ctx.canvas;
            this.resizeCanvasToDisplaySize(canvas);

            const xArr = Array.from(xData || [], (v) => {
                const num = Number(v);
                return Number.isFinite(num) ? num : 0;
            });
            const yArr = Array.from(yData || [], (v) => {
                const num = Number(v);
                return Number.isFinite(num) ? num : 0;
            });

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const pointCount = Math.min(xArr.length, yArr.length);

            if (!pointCount) {
                this.toggleCanvasVisibility(canvas, false);
                console.debug('[rptUI] renderScatterChart: empty data');
                return;
            }

            this.toggleCanvasVisibility(canvas, true);

            const margin = Object.assign({ left: 70, right: 30, top: 70, bottom: 80 }, options.margin || {});
            const plotWidth = Math.max(width - margin.left - margin.right, 20);
            const plotHeight = Math.max(height - margin.top - margin.bottom, 20);

            const axisColor = options.axisColor || '#424a57';
            const gridColor = options.gridColor || 'rgba(96, 125, 139, 0.45)';
            const minorGridColor = options.minorGridColor || 'rgba(120, 144, 156, 0.25)';
            const labelColor = options.labelColor || '#212529';
            const pointColor = options.pointColor || 'rgba(52, 152, 219, 0.65)';
            const pointRadius = Number.isFinite(options.pointRadius) && options.pointRadius > 0 ? options.pointRadius : 2;
            const showGrid = options.showGrid !== false;
            const showTicks = options.showTicks !== false;
            const xTickCount = Number.isFinite(options.xTickCount) ? Math.max(2, Math.floor(options.xTickCount)) : 6;
            const yTickCount = Number.isFinite(options.yTickCount) ? Math.max(2, Math.floor(options.yTickCount)) : 6;
            const lockAspect = options.lockAspect !== false;

            const maxAbsX = xArr.reduce((max, val) => Math.max(max, Math.abs(val)), 0);
            const maxAbsY = yArr.reduce((max, val) => Math.max(max, Math.abs(val)), 0);
            let extent = Math.max(maxAbsX, maxAbsY, 1e-4);
            extent = extent > 0 ? extent * 1.15 : 1;

            let xMin = Number.isFinite(options.xMin) ? options.xMin : -extent;
            let xMax = Number.isFinite(options.xMax) ? options.xMax : extent;
            let yMin = Number.isFinite(options.yMin) ? options.yMin : -extent;
            let yMax = Number.isFinite(options.yMax) ? options.yMax : extent;

            if (lockAspect) {
                const largest = Math.max(Math.abs(xMin), Math.abs(xMax), Math.abs(yMin), Math.abs(yMax));
                if (!Number.isFinite(options.xMin)) xMin = -largest;
                if (!Number.isFinite(options.xMax)) xMax = largest;
                if (!Number.isFinite(options.yMin)) yMin = -largest;
                if (!Number.isFinite(options.yMax)) yMax = largest;
            }

            if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) {
                const delta = Math.max(Math.abs(xMax) || 1, 1);
                xMin = -delta;
                xMax = delta;
            }
            if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMax <= yMin) {
                const delta = Math.max(Math.abs(yMax) || 1, 1);
                yMin = -delta;
                yMax = delta;
            }

            const xRange = xMax - xMin;
            const yRange = yMax - yMin;

            const chooseTickStep = (span, desiredTicks) => {
                if (!Number.isFinite(span) || span <= 0) return 1;
                const preferred = [1, 2, 5];
                const rawStep = span / Math.max(desiredTicks || 5, 2);
                const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
                let bestStep = magnitude;
                let bestDiff = Number.POSITIVE_INFINITY;
                preferred.forEach((base) => {
                    const candidate = base * magnitude;
                    const tickCount = span / candidate;
                    const diff = Math.abs(tickCount - desiredTicks);
                    if (diff < bestDiff) {
                        bestDiff = diff;
                        bestStep = candidate;
                    }
                });
                return bestStep;
            };

            const generateTicks = (minValue, maxValue, step) => {
                if (!Number.isFinite(step) || step <= 0) return [];
                const ticks = [];
                const start = Math.ceil(minValue / step) * step;
                for (let value = start; value <= maxValue + step * 0.5; value += step) {
                    const rounded = Math.round((value + Number.EPSILON) / step) * step;
                    ticks.push(Number.parseFloat(rounded.toPrecision(12)));
                }
                return ticks;
            };

            const formatTick = (value, step) => {
                if (!Number.isFinite(value)) return '';
                const absVal = Math.abs(value);
                const absStep = Math.abs(step) || 1;
                if ((absVal >= 1e6) || (absVal !== 0 && absVal <= 1e-4)) {
                    return value.toExponential(1);
                }
                const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(absStep)) + 1));
                return value.toFixed(decimals);
            };

            const xStep = Number.isFinite(options.xTickStep) ? options.xTickStep : chooseTickStep(xRange, xTickCount);
            const yStep = Number.isFinite(options.yTickStep) ? options.yTickStep : chooseTickStep(yRange, yTickCount);

            const xTicks = generateTicks(xMin, xMax, xStep);
            const yTicks = generateTicks(yMin, yMax, yStep);

            const valueToX = (value) => {
                const normalized = (value - xMin) / xRange;
                return margin.left + Math.max(0, Math.min(1, normalized)) * plotWidth;
            };

            const valueToY = (value) => {
                const normalized = (value - yMin) / yRange;
                return margin.top + (1 - Math.max(0, Math.min(1, normalized))) * plotHeight;
            };

            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

            if (showGrid) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = minorGridColor;
                yTicks.forEach((tick) => {
                    const y = valueToY(tick);
                    ctx.beginPath();
                    ctx.moveTo(margin.left, y);
                    ctx.lineTo(margin.left + plotWidth, y);
                    ctx.stroke();
                });

                ctx.strokeStyle = gridColor;
                xTicks.forEach((tick) => {
                    const x = valueToX(tick);
                    ctx.beginPath();
                    ctx.moveTo(x, margin.top);
                    ctx.lineTo(x, margin.top + plotHeight);
                    ctx.stroke();
                });
            }

            ctx.strokeStyle = axisColor;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

            if (yMin < 0 && yMax > 0) {
                const yZero = valueToY(0);
                ctx.beginPath();
                ctx.moveTo(margin.left, yZero);
                ctx.lineTo(margin.left + plotWidth, yZero);
                ctx.stroke();
            }

            if (xMin < 0 && xMax > 0) {
                const xZero = valueToX(0);
                ctx.beginPath();
                ctx.moveTo(xZero, margin.top);
                ctx.lineTo(xZero, margin.top + plotHeight);
                ctx.stroke();
            }

            ctx.fillStyle = labelColor;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(title, margin.left + plotWidth / 2, margin.top - 12);

            if (showTicks) {
                ctx.font = '11px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                yTicks.forEach((tick) => {
                    const y = valueToY(tick);
                    ctx.beginPath();
                    ctx.moveTo(margin.left - 5, y);
                    ctx.lineTo(margin.left, y);
                    ctx.strokeStyle = axisColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillText(formatTick(tick, yStep), margin.left - 8, y);
                });

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                xTicks.forEach((tick) => {
                    const x = valueToX(tick);
                    ctx.beginPath();
                    ctx.moveTo(x, margin.top + plotHeight);
                    ctx.lineTo(x, margin.top + plotHeight + 6);
                    ctx.strokeStyle = axisColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillText(formatTick(tick, xStep), x, margin.top + plotHeight + 6);
                });
            }

            const xLabel = options.xLabel || 'I (Real)';
            const yLabel = options.yLabel || 'Q (Imag)';
            if (xLabel && showTicks) {
                ctx.font = '12px Arial';
                ctx.textBaseline = 'top';
                ctx.fillText(xLabel, margin.left + plotWidth / 2, height - margin.bottom + 20);
            }

            if (yLabel && showTicks) {
                ctx.save();
                ctx.translate(margin.left - 50, margin.top + plotHeight / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.font = '12px Arial';
                ctx.fillText(yLabel, 0, 0);
                ctx.restore();
            }

            ctx.fillStyle = pointColor;
            for (let idx = 0; idx < pointCount; idx++) {
                const x = valueToX(xArr[idx]);
                const y = valueToY(yArr[idx]);
                ctx.beginPath();
                ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
                ctx.fill();
            }

            try {
                console.log('[rptUI] renderScatterChart: draw complete', {
                    title,
                    canvasId: canvas.id,
                    points: pointCount,
                    extent: { xMin, xMax, yMin, yMax }
                });
            } catch (logErr) { /* ignore */ }
        } catch (e) {
            console.error('[rptUI] renderScatterChart failed', e);
        }
    }

    renderEyeDiagramChart(eyeData, vizConfig = {}) {
        const canvas = document.getElementById('eyeDiagramChart');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');

        const normalizeTraces = (source) => {
            if (!Array.isArray(source)) return [];
            return source
                .map((trace) => {
                    if (!Array.isArray(trace)) return [];
                    return trace.map((value) => {
                        const num = Number(value);
                        return Number.isFinite(num) ? num : 0;
                    });
                })
                .filter((trace) => trace.length > 0);
        };

        const iTraces = normalizeTraces(eyeData && eyeData.i_traces);
        const qTraces = normalizeTraces(eyeData && eyeData.q_traces);

        if (!eyeData || (iTraces.length === 0 && qTraces.length === 0)) {
            if (ctx) {
                this.resizeCanvasToDisplaySize(canvas);
                ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
            }
            this.toggleCanvasVisibility(canvas, false);
            return;
        }

        const cap = (traces) => {
            const maxCount = 120;
            if (traces.length <= maxCount) return traces;
            const step = Math.ceil(traces.length / maxCount);
            const selected = [];
            for (let idx = 0; idx < traces.length; idx += step) {
                selected.push(traces[idx]);
                if (selected.length >= maxCount) break;
            }
            return selected;
        };

        const datasets = [];
        cap(iTraces).forEach((trace) => {
            datasets.push({ data: trace, label: 'I Trace', color: 'rgba(13, 110, 253, 0.35)' });
        });
        cap(qTraces).forEach((trace) => {
            datasets.push({ data: trace, label: 'Q Trace', color: 'rgba(220, 53, 69, 0.3)' });
        });

        if (!datasets.length) {
            this.resizeCanvasToDisplaySize(canvas);
            ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
            this.toggleCanvasVisibility(canvas, false);
            return;
        }

        const rawTime = Array.isArray(eyeData.time) ? eyeData.time : [];
        const timeAxis = rawTime.map((value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        });

        this.renderSimpleChart(
            ctx,
            timeAxis,
            datasets,
            '',
            {
                xLabel: 'Time (symbols)',
                yLabel: 'Amplitude',
                showGrid: vizConfig && vizConfig.power_grid_enabled !== false,
                showTicks: vizConfig && vizConfig.power_ticks_enabled !== false,
                xTickCount: 6,
                yTickCount: 6,
                margin: { top: 32 }
            }
        );
    }

    cleanupPreviewCharts() {
        const canvases = document.querySelectorAll('.preview-chart canvas');
        canvases.forEach(canvas => {
            try {
                this.resizeCanvasToDisplaySize(canvas);
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                this.toggleCanvasVisibility(canvas, false);
            } catch (e) { /* ignore per-canvas errors */ }
        });
    }

    toggleCanvasVisibility(canvas, isVisible) {
        if (!canvas) return;
        try {
            canvas.style.display = isVisible ? 'block' : 'none';
        } catch (e) { /* ignore style errors */ }
        try {
            const placeholder = canvas.closest && canvas.closest('.chart-placeholder');
            if (placeholder) placeholder.classList.toggle('canvas-visible', Boolean(isVisible));
        } catch (e) { /* ignore placeholder errors */ }
        try {
            console.log('[rptUI] toggleCanvasVisibility', { id: canvas.id, visible: Boolean(isVisible) });
        } catch (logErr) { /* ignore logging failures */ }
    }

    debugStreamData(payloadOverride) {
        console.group('[rptUI] debugStreamData');
        try {
            const activeBtn = document.querySelector('.tab-button.active');
            const activeTab = activeBtn ? activeBtn.getAttribute('data-tab') : 'unknown';
            console.log('Active tab:', activeTab);

            const samplePayload = payloadOverride || {
                time_domain: {
                    time: Array.from({ length: 256 }, (_, i) => i * 0.5),
                    i_component: Array.from({ length: 256 }, (_, i) => Math.sin(i / 8)),
                    q_component: Array.from({ length: 256 }, (_, i) => Math.cos(i / 8))
                },
                frequency_domain: {
                    frequency: Array.from({ length: 128 }, (_, i) => i - 64),
                    power: Array.from({ length: 128 }, (_, i) => -60 + Math.random() * 10)
                }
            };

            console.log('Sample payload keys:', Object.keys(samplePayload));
            if (samplePayload.time_domain) {
                console.log('Sample time-domain lengths:', {
                    time: samplePayload.time_domain.time.length,
                    i: samplePayload.time_domain.i_component.length,
                    q: samplePayload.time_domain.q_component.length
                });
            }

            this.updateChartsWithStreamData(samplePayload);
        } catch (err) {
            console.error('[rptUI] debugStreamData error', err);
        } finally {
            console.groupEnd();
        }
    }

    debugDataFlow() {
        console.log('=== Data Flow Debug ===');
        console.log('1. Checking window.rptUI instance:', Boolean(window.rptUI));
        console.log('2. Checking updateChartsWithStreamData method:', typeof this.updateChartsWithStreamData);
        console.log('3. Checking StreamingAnalysis instance:', Boolean(this.fileStreamController));
        console.log('4. Current selected file:', this.selectedFile);

    const chartIds = ['timeDomainChart', 'frequencyDomainChart', 'constellationChart', 'eyeDiagramChart', 'm2Chart', 'm4Chart', 'squareSpectrumChart', 'fourthPowerSpectrumChart'];
        chartIds.forEach((id) => {
            const canvas = document.getElementById(id);
            console.log(`5. Canvas ${id}:`, canvas ? 'found' : 'NOT FOUND');
            if (canvas) {
                console.log(`   - dimensions: ${canvas.width}x${canvas.height}`);
                console.log(`   - display: ${canvas.style.display}`);
            }
        });

        const placeholders = document.querySelectorAll('.chart-placeholder');
        console.log('6. Chart placeholders found:', placeholders.length);

        this.testChartRendering();
    }

    testChartRendering() {
        console.log('=== Testing Chart Rendering ===');

        this._resetHigherOrderAverages();

        const testData = {
            time_domain: {
                time: Array.from({ length: 100 }, (_, i) => i * 0.1),
                i_component: Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.2) * 0.8),
                q_component: Array.from({ length: 100 }, (_, i) => Math.cos(i * 0.2) * 0.8)
            },
            frequency_domain: {
                frequency: Array.from({ length: 50 }, (_, i) => i - 25),
                power: Array.from({ length: 50 }, (_, i) => Math.exp(-Math.pow((i - 25) / 10, 2)) * 50)
            },
            constellation: {
                i_component: Array.from({ length: 200 }, () => (Math.random() - 0.5) * 2),
                q_component: Array.from({ length: 200 }, () => (Math.random() - 0.5) * 2)
            },
            eye_diagram: {
                time: Array.from({ length: 64 }, (_, i) => i / 32),
                i_traces: Array.from({ length: 6 }, (__, line) => Array.from({ length: 64 }, (_, idx) => Math.sin((idx / 8) + line * 0.3))),
                q_traces: Array.from({ length: 6 }, (__, line) => Array.from({ length: 64 }, (_, idx) => Math.cos((idx / 8) + line * 0.3)))
            },
            higher_order: {
                frequency: Array.from({ length: 50 }, (_, i) => i - 25),
                quadratic_power: Array.from({ length: 50 }, (_, i) => Math.exp(-Math.pow((i - 25) / 8, 2)) * 30),
                quartic_power: Array.from({ length: 50 }, (_, i) => Math.exp(-Math.pow((i - 25) / 6, 2)) * 20)
            }
        };

        console.log('Test data generated:', testData);
        this.updateChartsWithStreamData({ streams: testData });
    }

    initializeCharts() {
        console.log('[rptUI] Initializing charts...');
        const chartConfigs = [
            { id: 'timeDomainChart', width: 600, height: 300, container: '#time-domain-panel .chart-placeholder' },
            { id: 'frequencyDomainChart', width: 600, height: 300, container: '#frequency-domain-panel .chart-placeholder' },
            { id: 'constellationChart', width: 420, height: 420, container: '#constellation-panel .chart-box.constellation-box .chart-placeholder' },
            { id: 'eyeDiagramChart', width: 480, height: 320, container: '#constellation-panel .chart-box.eye-diagram-box .chart-placeholder' },
            { id: 'm2Chart', width: 500, height: 250, container: '#higher-order-panel .higher-order-chart:nth-of-type(1) .chart-placeholder' },
            { id: 'm4Chart', width: 500, height: 250, container: '#higher-order-panel .higher-order-chart:nth-of-type(2) .chart-placeholder' }
        ];

        chartConfigs.forEach((config) => {
            let canvas = document.getElementById(config.id);
            if (!canvas) {
                console.warn(`[rptUI] Canvas ${config.id} not found, creating...`);
                const container = config.container ? document.querySelector(config.container) : null;
                if (container) {
                    canvas = document.createElement('canvas');
                    canvas.id = config.id;
                    canvas.width = config.width;
                    canvas.height = config.height;
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    canvas.style.display = 'none';
                    container.appendChild(canvas);
                    console.log(`[rptUI] Created canvas: ${config.id}`);
                }
            } else {
                canvas.width = config.width;
                canvas.height = config.height;
                canvas.style.display = 'none';
                console.log(`[rptUI] Initialized canvas: ${config.id}`);
            }
        });

    }

    resizeCanvasToDisplaySize(canvas) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(300, Math.floor(rect.width || canvas.clientWidth || 0));
        const height = Math.max(150, Math.floor(rect.height || canvas.clientHeight || 0));
        const targetWidth = Math.floor(width * dpr);
        const targetHeight = Math.floor(height * dpr);
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    }

    analyzeFromPreview() {
        const filename = document.getElementById('previewFilename').textContent;
        this.closePreview();
        this.analyzeFile(filename);
    }

    async loadTaskList() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('Tasks request failed');

            const tasks = await response.json();
            this.updateTaskTable(tasks.tasks || []);
        } catch (error) {
            console.error('Failed to load task list:', error);
            this.updateTaskTable([]);
        }
    }

    updateTaskTable(tasks) {
        const tableBody = document.getElementById('taskTableBody');

        if (!tasks || tasks.length === 0) {
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="loading">No active tasks</td>
                    </tr>
                `;
            }
            return;
        }

        let html = '';

        tasks.forEach(task => {
            const taskInfo = this.parseTaskDescription(task.description);
            const taskId = task.task_id || task.taskId || task.id || task.task_id || task.id;
            const executionTime = this.getExecutionTime(taskId);

            // Prefer server-reported progress when available (task.progress.percent)
            let progress = null;
            if (task && task.progress && typeof task.progress.percent !== 'undefined') {
                progress = Number(task.progress.percent);
                // keep local map in sync so other UI pieces can reuse it
                this.taskProgress.set(taskId, progress);
            } else {
                progress = this.getTaskProgress(taskId, task.status);
            }

            const statusText = this.getStatusText(task.status);

            html += `
                <tr data-task-id="${taskId}">
                    <td>
                        <span class="task-type type-${taskInfo.type}">
                            ${this.getTypeDisplayName(taskInfo.type)}
                        </span>
                    </td>
                    <td>
                        <div class="filename" title="${taskInfo.filename || 'N/A'}">
                            ${taskInfo.filename || 'N/A'}
                        </div>
                    </td>
                    <td>
                        <span class="data-type">${taskInfo.dataType || 'Unknown'}</span>
                    </td>
                    <td>
                        ${this.renderProgressBar(progress, task.status)}
                    </td>
                    <td>
                        <div class="execution-time">${executionTime}</div>
                    </td>
                    <td>
                        <span class="status-badge status-${task.status}">
                            ${statusText}
                        </span>
                    </td>
                    <td>
                        <div class="task-actions">
                            ${this.renderActionButtons(taskId, task.status)}
                        </div>
                    </td>
                </tr>
            `;
        });

        if (tableBody) tableBody.innerHTML = html;

        // update execution times periodically
        this.updateExecutionTimes();
    }

    parseTaskDescription(description) {
        const info = { type: 'unknown', filename: '', dataType: 'Unknown' };
        if (!description) return info;

        if (description.includes('Analyzing') || description.includes('Analysis')) info.type = 'analysis';
        else if (description.includes('Recording') || description.includes('record')) info.type = 'recording';
        else if (description.includes('Playing') || description.includes('Playback')) info.type = 'playback';
        else if (description.includes('Generating') || description.includes('Generation')) info.type = 'generation';
        else if (description.includes('Converting') || description.includes('Conversion')) info.type = 'conversion';

        const filenameMatch = description.match(/([\w\-]+\.(h5|bin|dat|complex|raw|wav|csv|npy))/);
        if (filenameMatch) {
            info.filename = filenameMatch[1];
            const ext = info.filename.split('.').pop().toLowerCase();
            info.dataType = this.getDataTypeFromExtension(ext);
        }

        return info;
    }

    getDataTypeFromExtension(ext) {
        const typeMap = { h5: 'HDF5', bin: 'Binary', dat: 'Data', complex: 'Complex', raw: 'Raw', wav: 'WAV', csv: 'CSV', npy: 'NumPy' };
        return typeMap[ext] || 'Unknown';
    }

    getTypeDisplayName(type) {
        const typeMap = { analysis: 'Analysis', recording: 'Recording', playback: 'Playback', generation: 'Generation', conversion: 'Conversion', unknown: 'Unknown' };
        return typeMap[type] || 'Unknown';
    }

    getExecutionTime(taskId) {
        if (!this.taskStartTimes.has(taskId)) this.taskStartTimes.set(taskId, Date.now());
        const startTime = this.taskStartTimes.get(taskId);
        const elapsed = Date.now() - startTime;
        return this.formatExecutionTime(elapsed);
    }

    formatExecutionTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    getTaskProgress(taskId, status) {
        // Completed/finished tasks should show 100%
        if (status === 'finished' || status === 'completed') return 100;
        if (status === 'failed') return 0;

        // initialize simulated progress if we don't have a server-side value
        if (!this.taskProgress.has(taskId)) this.taskProgress.set(taskId, 10);
        if (status === 'running') {
            const current = this.taskProgress.get(taskId);
            if (current < 90) {
                const next = current + Math.random() * 10;
                this.taskProgress.set(taskId, Math.min(next, 90));
            }
        }
        return this.taskProgress.get(taskId);
    }

    getStatusText(status) {
        const statusMap = { running: 'Running', finished: 'Completed', completed: 'Completed', failed: 'Failed', pending: 'Pending', cancelled: 'Cancelled' };
        return statusMap[status] || status;
    }

    renderProgressBar(progress, status) {
        if (status === 'finished' || status === 'completed') {
            return `
                <div class="progress-container">
                    <div class="progress-bar" style="width: 100%; background: #27ae60;"></div>
                </div>
                <div class="progress-text">Completed</div>
            `;
        } else if (status === 'failed') {
            return `
                <div class="progress-container">
                    <div class="progress-bar" style="width: 100%; background: #e74c3c;"></div>
                </div>
                <div class="progress-text">Failed</div>
            `;
        } else {
            return `
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${Math.round(progress)}%;"></div>
                </div>
                <div class="progress-text">${Math.round(progress)}%</div>
            `;
        }
    }

    renderActionButtons(taskId, status) {
        if (status === 'running') return `<button class="btn-small btn-cancel"  data-action="cancel-task" data-arg-file="${taskId}">Cancel</button>`;
        if (status === 'finished' || status === 'completed') return `<button class="btn-small btn-view"  data-action="view-task-result" data-arg-file="${taskId}">View</button>`;
        return '';
    }

    updateExecutionTimes() {
        const timeElements = document.querySelectorAll('.execution-time');
        timeElements.forEach(element => {
            const row = element.closest('tr');
            const taskId = row && row.getAttribute('data-task-id');
            if (taskId) element.textContent = this.getExecutionTime(taskId);
        });
    }

    async cancelTask(taskId) {
        try {
            this.showAlert(`Cancelling task ${taskId}...`, 'info');
            // call backend cancel API if implemented
            try {
                const resp = await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
                if (resp.ok) this.showAlert(`Task ${taskId} cancelled`, 'warning');
                else this.showAlert(`Cancel request failed`, 'error');
            } catch (e) {
                // fallback: simulate cancel
                this.taskProgress.set(taskId, 0);
                this.showAlert(`Task ${taskId} cancelled (local)`, 'warning');
            }
            this.loadTaskList();
        } catch (error) {
            this.showAlert(`Failed to cancel task: ${error.message}`, 'error');
        }
    }

    viewTaskResult(taskId) {
        this.showAlert(`Viewing results for task ${taskId}`, 'info');
        // fetch and display result
        fetch(`/api/analysis/${taskId}`).then(r => r.json()).then(data => { this.displayAnalysisResults(data); }).catch(e => { console.error(e); this.showAlert('Failed to load task result', 'error'); });
    }

    createTaskItem(task) { const item = document.createElement('div'); item.className = 'task-item'; const statusCls = `status-${task.status || 'pending'}`; item.innerHTML = `
            <div class="task-info">
                <strong>${task.description || 'task'}</strong>
                <small>ID: ${task.id}</small>
            </div>
            <div class="task-status ${statusCls}">${(task.status || 'pending').toUpperCase()}</div>`; return item; }

    async analyzeFile(filename) {
        try {
            this.showAlert(`Starting analysis of ${filename}...`, 'info');

            const r = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `filename=${encodeURIComponent(filename)}`
            });

            if (!r.ok) throw new Error('Analyze request failed');

            const startResult = await r.json();

            if (startResult.task_id) {
                this.showAlert(`Analysis started! Tracking progress...`, 'info');
                // start polling the analysis result
                this.pollAnalysisResult(startResult.task_id, filename);
            } else {
                this.showAlert('Failed to start analysis', 'error');
            }
        } catch (e) {
            console.error('Analysis error:', e);
            this.showAlert('Analysis error: ' + e.message, 'error');
        }
    }

    pollAnalysisResult(taskId, filename) {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/analysis/${taskId}`);
                if (!response.ok) throw new Error('Status request failed');

                const result = await response.json();

                // if backend includes progress, update local progress map
                if (result.progress && typeof result.progress.percent !== 'undefined') {
                    this.taskProgress.set(taskId, result.progress.percent);
                }

                if (result.status === 'completed') {
                    clearInterval(pollInterval);
                    this.showAlert(`Analysis of ${filename} completed!`, 'success');
                    // result already contains analysis + plots when task finished
                    this.displayAnalysisResults(result);
                } else if (result.status === 'failed') {
                    clearInterval(pollInterval);
                    this.showAlert(`Analysis failed: ${result.error}`, 'error');
                }
                // if running, continue polling
            } catch (error) {
                console.error('Polling error:', error);
                clearInterval(pollInterval);
                this.showAlert('Analysis polling error: ' + error.message, 'error');
            }
        }, 2000);

        // store interval id so it can be cleared later
        if (!this.analysisPollingIds) this.analysisPollingIds = [];
        this.analysisPollingIds.push(pollInterval);
    }

    displayAnalysisResults(result) {
        this.currentAnalysisResult = result;

        // 更新所有频谱Tab的显示
        const activeSpectrumTab = document.querySelector('.spectrum-tabs .tab-header.active');
        if (activeSpectrumTab) {
            const tabName = activeSpectrumTab.getAttribute('data-tab');
            this.updateSpectrumDisplay(tabName);
        }

        // 显示原始数据面板
        const analysisPanel = document.getElementById('analysisPanel');
        const analysisResults = document.getElementById('analysisResults');

        if (analysisPanel) {
            analysisPanel.style.display = 'block';
        }

        // 格式化分析结果显示
        let analysisHtml = `
            <div class="analysis-results">
                <h4>📊 Signal Analysis Results</h4>
                <div class="analysis-metrics">
        `;

        // 显示关键指标
        if (result.analysis) {
            const analysis = result.analysis;
            if (analysis.modulation) {
                analysisHtml += `<div class="metric"><strong>Modulation:</strong> ${analysis.modulation}</div>`;
            }
            if (analysis.time_domain) {
                const td = analysis.time_domain;
                analysisHtml += `<div class="metric"><strong>Avg Power:</strong> ${td.average_power?.toFixed(6) || 'N/A'}</div>`;
                analysisHtml += `<div class="metric"><strong>Peak Power:</strong> ${td.peak_power?.toFixed(6) || 'N/A'}</div>`;
            }
            if (analysis.frequency_domain) {
                const fd = analysis.frequency_domain;
                analysisHtml += `<div class="metric"><strong>Peak Freq:</strong> ${(fd.peak_frequency / 1e6)?.toFixed(3) || 'N/A'} MHz</div>`;
                analysisHtml += `<div class="metric"><strong>Bandwidth:</strong> ${(fd.bandwidth / 1e3)?.toFixed(1) || 'N/A'} kHz</div>`;
            }
        }

        analysisHtml += `</div>`;

        // 显示元数据
        if (result.metadata) {
            const meta = result.metadata;
            analysisHtml += `
                <h4>📋 File Metadata</h4>
                <div class="metadata-grid">
                    <div class="meta-item"><strong>Sample Rate:</strong> ${(meta.sample_rate / 1e3).toFixed(1)} kHz</div>
                    <div class="meta-item"><strong>Center Freq:</strong> ${(meta.center_freq / 1e6).toFixed(2)} MHz</div>
                    <div class="meta-item"><strong>Duration:</strong> ${meta.duration?.toFixed(3) || 'N/A'} s</div>
                    <div class="meta-item"><strong>Samples:</strong> ${meta.samples_count?.toLocaleString() || 'N/A'}</div>
                    <div class="meta-item"><strong>Signal Type:</strong> ${meta.signal_type || 'Unknown'}</div>
                </div>
            `;
        }

        analysisHtml += `</div>`;
        if (analysisResults) {
            analysisResults.innerHTML = analysisHtml;
        } else if (analysisPanel) {
            analysisPanel.innerHTML = analysisHtml;
        }

        // 显示成功消息
        const plotCount = Object.keys(result.plots || {}).length;
        this.showAlert(`Analysis completed! Generated ${plotCount} visualization plots`, 'success', 5000);

        // 滚动到分析结果
        const scrollTarget = analysisPanel || analysisResults;
        if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
            scrollTarget.scrollIntoView({ behavior: 'smooth' });
        }
    }

    clearAllPlots() {
        document.querySelectorAll('.plot-placeholder').forEach((c) => {
            c.innerHTML = '<div class="placeholder-text">选择文件并点击分析显示图表</div>';
        });
        this.currentAnalysisResult = null;
        this._resetHigherOrderAverages();
        this.showAlert('所有图表已清除', 'info');
    }

    downloadFile(fn) { window.open(`/files/${fn}`, '_blank'); }

    selectFile(filename) {
        // 在文件列表中查找选中的文件
        return fetch('/api/files')
            .then(response => response.json())
            .then(data => {
                const files = data.files || [];
                const selectedFile = files.find(f => f.name === filename);

                if (selectedFile) {
                    this.selectedFile = selectedFile;
                    this._resetHigherOrderAverages();
                    this.updateSelectedFileInfo();
                    return selectedFile;
                }
                throw new Error('File not found');
            })
            .catch(error => {
                console.error('Failed to load file details:', error);
                this.showAlert('获取文件信息失败', 'error');
                throw error;
            });
    }

    async selectAndAnalyzeFile(filename) {
        try {
            console.log('[rptUI] selectAndAnalyzeFile: selecting', filename);
            await this.selectFile(filename);
            console.log('[rptUI] selectAndAnalyzeFile: selected', this.selectedFile);
            // ensure analysis panel visible for debugging
            try {
                const ap = document.getElementById('analysisPanel'); if (ap) ap.style.display = 'block';
            } catch (e) { /* ignore */ }
            // give a tiny tick for UI to update
            setTimeout(() => { console.log('[rptUI] selectAndAnalyzeFile: starting streaming for', filename); this.startStreaming(); }, 50);
        } catch (e) {
            console.error('[rptUI] selectAndAnalyzeFile error', e);
            this.showAlert('选择文件失败，无法开始分析', 'error');
        }
    }

    updateSelectedFileInfo() {
        const infoElement = document.getElementById('selected-file-info');
        if (this.selectedFile) {
            infoElement.textContent = `已选择: ${this.selectedFile.name}`;
            infoElement.className = 'me-2 text-success';
        } else {
            infoElement.textContent = '未选择文件';
            infoElement.className = 'me-2 text-muted';
        }
    }

    showAlert(message, type = 'info', duration = 4000) { console.log(`${type.toUpperCase()}: ${message}`); if (this.toastManager) this.toastManager.show(message, type, duration); else alert(message); }

    startPolling() {
        // Poll tasks and USRP status every 3 seconds
        const taskInterval = setInterval(() => {
            this.loadTaskList();
            this.loadUSRPStatus();
        }, 3000);

        // Update execution time display every second
        const timeInterval = setInterval(() => {
            this.updateExecutionTimes();
        }, 1000);

        this.pollingIntervals.add(taskInterval);
        this.pollingIntervals.add(timeInterval);
    }

    stopPolling() {
        this.pollingIntervals.forEach(clearInterval);
        this.pollingIntervals.clear();
        // clear analysis polling intervals
        (this.analysisPollingIds || []).forEach(clearInterval);
        this.analysisPollingIds = [];
        if (this.toastManager) this.toastManager.clearAll();
    }
}

let rptUI;

// Simple tab initializer for the legacy Signal Analysis rewrite
function initAnalysisTabs() {
    try {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');
        if (!tabButtons || tabButtons.length === 0) return;
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                const target = document.getElementById(`${tabId}-panel`);
                if (target) target.classList.add('active');
                try {
                    if (window.rptUI && typeof window.rptUI.updateChartsWithStreamData === 'function' && window.rptUI.latestStreamPayload) {
                        window.rptUI.updateChartsWithStreamData({
                            streams: window.rptUI.latestStreamPayload,
                            meta: window.rptUI.latestStreamMeta || {},
                        });
                    }
                } catch (err) {
                    console.warn('[rptUI] initAnalysisTabs re-render failed', err);
                }
            });
        });
    } catch (e) { console.warn('[rptUI] initAnalysisTabs error', e); }
}

document.addEventListener('DOMContentLoaded', function() {
    rptUI = new RPTWebUI();
    try { window.rptUI = rptUI; } catch (e) { /* ignore assignment errors */ }
    try {
        if (typeof rptUI.initializeCharts === 'function') rptUI.initializeCharts();
        // initialize streaming controls, load initial data and populate selects
        if (typeof rptUI.initializeStreaming === 'function') rptUI.initializeStreaming();
        if (typeof rptUI.loadInitialData === 'function') rptUI.loadInitialData();
    if (typeof rptUI.startPolling === 'function') rptUI.startPolling();
        try { rptUI.populateFileSelect(); } catch (e) { /* ignore */ }

        // initialize legacy tab behavior for Signal Analysis rewrite
        try { initAnalysisTabs(); } catch (e) { /* ignore */ }
        if (!rptUI.fileStreamController) rptUI.fileStreamController = new StreamingAnalysis(rptUI);
        if (window.rptUI) {
            try { window.rptUI.debugDataFlow = window.rptUI.debugDataFlow.bind(window.rptUI); } catch (bindErr) { console.warn('[rptUI] failed to bind debugDataFlow', bindErr); }
            try { window.rptUI.testChartRendering = window.rptUI.testChartRendering.bind(window.rptUI); } catch (bindErr) { console.warn('[rptUI] failed to bind testChartRendering', bindErr); }
        }
    } catch (e) { console.warn('[rptUI] DOMContentLoaded init error', e); }
});

function refreshFileList() { if (rptUI) rptUI.loadFileList(); }
// developer-friendly wrapper used by template button; log action for debugging
function refreshFileListDebug() { try { console.log('[rptUI] Refresh List button clicked'); } catch(e){} try { fetch('/api/debug/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'refresh_click', ts: Date.now() }) }).catch(()=>{}); } catch(e){} if (rptUI) rptUI.loadFileList(); }

window.addEventListener('beforeunload', () => { if (rptUI) { rptUI.stopPolling(); if (rptUI.toastManager) rptUI.toastManager.clearAll(); } });

// File streaming controller (SSE) - simplified, robust implementation
class StreamingAnalysis {
    constructor(rptUI) {
        this.rptUI = rptUI;
        this.eventSource = null;
        this.currentSessionId = null;
        this.isStreaming = false;
        this.scanModeActive = false;
    }

    _resetSegmentState() {
        this.scanModeActive = false;
    }

    async startFileStreaming(filename, opts = {}) {
        if (!filename) {
            this.rptUI.showAlert('请选择要分析的文件', 'error');
            return;
        }

        // Ask server to start a streaming session (SSE-based fallback)
        try {
            const resp = await fetch('/api/streaming/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, options: opts })
            });
            if (!resp.ok) throw new Error('Server rejected streaming start');
            const data = await resp.json();
            if (data && data.session_id) {
                this.currentSessionId = data.session_id;
                this.startSSE(this.currentSessionId);
                this.rptUI.updateStreamStatus('streaming', '分析已启动');
            } else {
                throw new Error('No session id returned');
            }
        } catch (e) {
            console.error('startFileStreaming failed', e);
            this.rptUI.updateStreamStatus('error', '启动失败');
        }
    }

    startRealtimeSession(sessionId, meta = {}) {
        if (!sessionId) return;

        this.currentSessionId = sessionId;

        if (this.rptUI) {
            const freq = typeof meta.center_freq === 'number' ? ` ${(meta.center_freq / 1e6).toFixed(2)} MHz` : '';
            this.rptUI.updateStreamStatus('starting', `实时录制${freq}`.trim());
            if (typeof this.rptUI.showAlert === 'function') {
                this.rptUI.showAlert('Live analysis for recording initialized…', 'info', 4500);
            }
        }

        this.startSSE(sessionId).catch(err => {
            console.error('startRealtimeSession failed', err);
            if (this.rptUI) this.rptUI.updateStreamStatus('error', '实时分析启动失败');
        });
    }

    async startSSE(sessionId) {
        try {
            if (this.eventSource) {
                try { this.eventSource.close(); } catch (e) { /* ignore */ }
            }
            this._resetSegmentState();
            const url = `/api/streaming/data/${sessionId}`;
            console.log('[rptUI] startSSE: opening EventSource to', url);

            // preflight to detect HTTP errors early (EventSource won't expose status)
            try {
                const pre = await fetch(url, { method: 'GET', headers: { 'Accept': 'text/event-stream' } });
                console.log('[rptUI] startSSE: preflight status', pre.status, pre.statusText);
                if (!pre.ok) {
                    const txt = await pre.text().catch(() => pre.statusText);
                    console.error('[rptUI] startSSE: preflight non-ok', txt);
                    this.rptUI.showAlert('流式连接出错 (服务器返回非200)', 'error');
                    return;
                }
            } catch (pfErr) {
                console.warn('[rptUI] startSSE: preflight fetch failed', pfErr);
                // continue: EventSource may still connect even if preflight failed
            }

            this.eventSource = new EventSource(url);
            this.isStreaming = true;

            this.eventSource.onopen = (ev) => {
                console.log('[rptUI] SSE open', ev);
                if (this.rptUI) this.rptUI.updateStreamStatus('streaming', '流式传输中');
            };

            this.eventSource.onmessage = (ev) => {
                try {
                    console.log('[StreamingAnalysis] SSE raw message:', ev.data);

                    let payload = null;
                    try {
                        payload = JSON.parse(ev.data);
                    } catch (parseErr) {
                        console.error('[StreamingAnalysis] SSE message parse error', parseErr);
                        try {
                            const first = ev.data.indexOf('{');
                            const last = ev.data.lastIndexOf('}');
                            if (first !== -1 && last !== -1 && last > first) {
                                const sub = ev.data.substring(first, last + 1);
                                console.log('[StreamingAnalysis] SSE parse fallback substring length:', sub.length);
                                payload = JSON.parse(sub);
                            } else {
                                const cleaned = ev.data.replace(/\bNaN\b/g, 'null').replace(/\bInfinity\b/g, 'null').replace(/\b-Infinity\b/g, 'null');
                                payload = JSON.parse(cleaned);
                            }
                        } catch (recoveryErr) {
                            console.error('[StreamingAnalysis] SSE parse recovery failed', recoveryErr);
                            try { this.rptUI.showAlert('流式数据解析错误 (检查服务器输出)', 'error'); } catch (_) {}
                            return;
                        }
                    }

                    console.log('[StreamingAnalysis] SSE payload:', payload);
                    const streams = (payload && (payload.streams || payload)) || null;
                    console.log('[StreamingAnalysis] Extracted streams:', streams);

                    const meta = (payload && payload.meta) ? payload.meta : {};
                    this.processStreamData(streams, meta);

                    try {
                        const meta = (payload && payload.meta) || {};
                        console.log('[StreamingAnalysis] SSE meta:', meta);
                        const completionSignaled = Boolean(
                            meta.completed ||
                            meta.status === 'stopped' ||
                            meta.status === 'completed' ||
                            (payload && payload.type === 'analysis_complete')
                        );
                        if (completionSignaled) {
                            console.log('[StreamingAnalysis] Server signaled completion', meta);
                            if (this.rptUI) this.rptUI.updateStreamStatus('stopped', '完成');
                            try { updateScanButtons(false); } catch (_) {}
                            try { if (this.eventSource) this.eventSource.close(); } catch (e) { }
                            this.eventSource = null;
                            this.isStreaming = false;
                            this._resetSegmentState();
                        }
                    } catch (metaErr) {
                        console.warn('[StreamingAnalysis] SSE meta handling error', metaErr);
                    }
                } catch (e) {
                    console.error('[StreamingAnalysis] SSE handler error', e, ev.data);
                }
            };

            this.eventSource.onerror = (err) => {
                try {
                    console.error('SSE connection error', err);
                    // if EventSource reports closed state, treat as completion
                    const ready = this.eventSource && this.eventSource.readyState;
                    // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
                    if (ready === 2) {
                        console.log('[rptUI] SSE connection closed (readyState=CLOSED) - treating as completed');
                        if (this.rptUI) this.rptUI.updateStreamStatus('stopped', '已完成');
                    } else {
                        this.rptUI.showAlert('流式连接出错', 'error');
                    }
                } catch (e) {
                    console.error('[rptUI] SSE onerror handler failed', e);
                }
                try { if (this.eventSource) this.eventSource.close(); } catch (e) { }
                this.eventSource = null;
                this.isStreaming = false;
                this._resetSegmentState();
                try { updateScanButtons(false); } catch (_) {}
            };
        } catch (e) {
            console.error('[rptUI] startSSE top-level error', e);
            this.rptUI.showAlert('流式连接出错 (内部)', 'error');
            try { updateScanButtons(false); } catch (_) {}
        }
    }

    stopStreaming() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.currentSessionId) {
            fetch(`/api/streaming/stop/${this.currentSessionId}`, { method: 'POST' }).catch(() => {});
            this.currentSessionId = null;
        }
        this.isStreaming = false;
        this._resetSegmentState();
        if (this.rptUI) this.rptUI.updateStreamStatus('stopped', '已停止');
    }

    processStreamData(streams, meta = {}) {
        if (this.rptUI) {
            this.rptUI.latestStreamMeta = meta;
        }

        switch (meta.mode) {
            case 'scan':
                this._processScanData(streams, meta);
                break;
            case 'realtime':
                this._processRealtimeData(streams, meta);
                break;
            case 'file':
            default:
                this._processFileData(streams, meta);
                break;
        }
    }

    _processScanData(streams, meta = {}) {
        this.scanModeActive = true;
        this._updateScanStatus(meta, streams);
        this._adjustChartVisibility('scan');
        if (!this._hasStreamContent(streams)) {
            return;
        }

        this._applyStreamsToUI({ streams, meta });
    }

    _processRealtimeData(streams, meta = {}) {
        this.scanModeActive = false;
        this._adjustChartVisibility('realtime');
        if (this._hasStreamContent(streams)) {
            this._applyStreamsToUI({ streams, meta });
        }
    }

    _processFileData(streams, meta = {}) {
        this.scanModeActive = false;
        this._adjustChartVisibility('file');
        if (this._hasStreamContent(streams)) {
            this._applyStreamsToUI({ streams, meta });
        }
    }

    _updateScanStatus(meta = {}, streams = {}) {
        const progress = meta.scan_progress || {};
        const settings = meta.scan_settings || {};

        if (typeof settings.start_freq !== 'number' || typeof settings.stop_freq !== 'number') {
            updatePresetSummaryFromMeta(meta, (streams && streams.metadata) || {});
            return;
        }

        let statusText = `扫描: ${(settings.start_freq / 1e6).toFixed(1)}-${(settings.stop_freq / 1e6).toFixed(1)}MHz`;

        if (progress.current_segment !== undefined && progress.segments_total) {
            statusText += ` | 进度: ${progress.current_segment}/${progress.segments_total}`;
        }

        if (progress.round !== undefined) {
            statusText += ` | 轮次: ${progress.round}`;
        }

        if (typeof progress.current_center_freq === 'number') {
            statusText += ` | 当前: ${(progress.current_center_freq / 1e6).toFixed(2)}MHz`;
        }

        console.info('[SpectrumScan]', statusText);

        const streamMeta = (streams && streams.metadata) || {};
        updatePresetSummaryFromMeta(meta, streamMeta);
    }

    _adjustChartVisibility(mode) {
        const charts = {
            timeDomainChart: mode !== 'scan',
            constellationChart: mode !== 'scan',
            eyeDiagramChart: mode !== 'scan',
            frequencyDomainChart: true,
            m2Chart: mode !== 'scan',
            m4Chart: mode !== 'scan',
        };

        Object.keys(charts).forEach((chartId) => {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                canvas.style.opacity = charts[chartId] ? '1' : '0.3';
            }
        });
    }

    _extractScanRangeMHz(...sources) {
        const resolveRange = (source) => {
            if (!source || typeof source !== 'object') return null;

            const pickValue = (obj, keys) => {
                for (const key of keys) {
                    if (typeof obj[key] === 'number' && Number.isFinite(obj[key])) {
                        return obj[key];
                    }
                }
                return null;
            };

            const settingsCandidates = [];
            if (source.scan_settings && typeof source.scan_settings === 'object') settingsCandidates.push(source.scan_settings);
            if (source.scanSettings && typeof source.scanSettings === 'object') settingsCandidates.push(source.scanSettings);
            if (source.metadata && typeof source.metadata === 'object') {
                const meta = source.metadata;
                if (meta.scan_settings && typeof meta.scan_settings === 'object') settingsCandidates.push(meta.scan_settings);
                if (meta.scanSettings && typeof meta.scanSettings === 'object') settingsCandidates.push(meta.scanSettings);
            }

            settingsCandidates.push(source);

            for (const candidate of settingsCandidates) {
                if (!candidate || typeof candidate !== 'object') continue;
                const start = pickValue(candidate, ['start_freq', 'startFreq', 'start']);
                const stop = pickValue(candidate, ['stop_freq', 'stopFreq', 'stop']);
                if (start === null || stop === null || !Number.isFinite(start) || !Number.isFinite(stop) || stop === start) {
                    continue;
                }

                const startMHz = Math.abs(start) > 1e5 ? start / 1e6 : start;
                const stopMHz = Math.abs(stop) > 1e5 ? stop / 1e6 : stop;
                if (!Number.isFinite(startMHz) || !Number.isFinite(stopMHz) || stopMHz === startMHz) {
                    continue;
                }

                const min = Math.min(startMHz, stopMHz);
                const max = Math.max(startMHz, stopMHz);
                if (max > min) {
                    return { min, max };
                }
            }

            return null;
        };

        for (const source of sources) {
            const range = resolveRange(source);
            if (range) {
                return range;
            }
        }
        return null;
    }

    _hasStreamContent(streams) {
        if (!streams) return false;
        if (Array.isArray(streams)) return streams.length > 0;
        if (typeof streams === 'object') return Object.keys(streams).length > 0;
        return false;
    }

    _applyStreamsToUI(streamPayload) {
        console.log('[StreamingAnalysis] _applyStreamsToUI called with:', streamPayload);

        if (!streamPayload) {
            console.warn('[StreamingAnalysis] No streams data received');
            return;
        }

        const streams = streamPayload.streams || streamPayload;
        const meta = streamPayload.meta || {};

        if (window.rptUI && typeof window.rptUI.updateChartsWithStreamData === 'function') {
            console.log('[StreamingAnalysis] Calling window.rptUI.updateChartsWithStreamData');
            try {
                window.rptUI.updateChartsWithStreamData({ streams, meta });
            } catch (e) {
                console.error('[StreamingAnalysis] Error calling updateChartsWithStreamData:', e);
            }
        } else {
            console.error('[StreamingAnalysis] window.rptUI or updateChartsWithStreamData not available');
            console.log('[StreamingAnalysis] Available methods:', window.rptUI ? Object.keys(window.rptUI) : 'no rptUI');
        }
    }
}


        const SPECTRUM_SCAN_CONSTANTS = Object.freeze({
            SAMPLE_RATE_HZ: 10416700,
            DWELL_TIME_S: 0.005,
            AVG_COUNT: 1,
            LARGE_SPAN_THRESHOLD: 30000000,
            DEFAULT_FFT_SIZE: 8192,
            LARGE_SPAN_FFT_SIZE: 1024,
            MAX_SEGMENTS: 20,
            MIN_SEGMENTS: 2,
            MIN_OVERLAP: 0.02,
            MAX_OVERLAP: 0.5,
        });

        class SpectrumScanController {
            constructor() {
                this.constants = SPECTRUM_SCAN_CONSTANTS;
                this.form = document.getElementById('spectrumScanForm');
                this.startInput = document.getElementById('scanStartFreq');
                this.stopInput = document.getElementById('scanStopFreq');
                this.windowSelect = document.getElementById('scanWindow');
                this.statusBadge = document.getElementById('scanStatus');
                this.summaryBadge = document.getElementById('scanPresetSummary');
                this.startButton = document.getElementById('start-scan-btn');
                this.stopButton = document.getElementById('stop-scan-btn');
                this.summaryState = {};
                this.lastPayload = null;
                this.pendingRequest = null;
                this._bindEvents();
                this._updateSummary();
                this._setStatus('ready');
                this.updateButtons(false);
            }

            _bindEvents() {
                if (this.form && !this.form.dataset.scanInitBound) {
                    this.form.addEventListener('submit', (event) => {
                        event.preventDefault();
                        this.start();
                    });
                    this.form.dataset.scanInitBound = 'true';
                }

                if (this.startButton && !this.startButton.dataset.scanInitBound) {
                    this.startButton.addEventListener('click', () => this.start());
                    this.startButton.dataset.scanInitBound = 'true';
                }

                if (this.stopButton && !this.stopButton.dataset.scanInitBound) {
                    this.stopButton.addEventListener('click', () => this.stop());
                    this.stopButton.dataset.scanInitBound = 'true';
                }

                const update = () => this._updateSummary();
                [this.startInput, this.stopInput].forEach((input) => {
                    if (input) {
                        input.addEventListener('input', update);
                        input.addEventListener('change', update);
                    }
                });
                if (this.windowSelect) {
                    this.windowSelect.addEventListener('change', update);
                }
            }

            _alert(message, level = 'info') {
                if (window.rptUI && typeof window.rptUI.showAlert === 'function') {
                    window.rptUI.showAlert(message, level);
                } else if (window.ToastManager && typeof window.ToastManager.show === 'function') {
                    window.ToastManager.show({ message, level });
                } else {
                    console[level === 'error' ? 'error' : 'log']('[SpectrumScan]', message);
                }
            }

            _parseMHzInput(element) {
                if (!element) return NaN;
                const value = Number.parseFloat(element.value);
                return Number.isFinite(value) ? value : NaN;
            }

            _computeSpanHz(startMhz, stopMhz) {
                if (!Number.isFinite(startMhz) || !Number.isFinite(stopMhz)) return NaN;
                return (stopMhz - startMhz) * 1e6;
            }

            _computeFftSize(spanHz) {
                if (!Number.isFinite(spanHz) || spanHz <= 0) {
                    return this.constants.DEFAULT_FFT_SIZE;
                }
                if (spanHz < this.constants.LARGE_SPAN_THRESHOLD) {
                    return this.constants.DEFAULT_FFT_SIZE;
                }
                return this.constants.LARGE_SPAN_FFT_SIZE;
            }

            _computeResolution(fftSize) {
                const size = Number.isFinite(fftSize) && fftSize > 0 ? fftSize : this.constants.DEFAULT_FFT_SIZE;
                return this.constants.SAMPLE_RATE_HZ / size;
            }

            _computeSegments(spanHz) {
                if (!Number.isFinite(spanHz) || spanHz <= 0) {
                    return {
                        baseSegments: this.constants.MIN_SEGMENTS,
                        constrainedSegments: this.constants.MIN_SEGMENTS,
                        theoreticalOverlap: this.constants.MIN_OVERLAP,
                        finalOverlap: this.constants.MIN_OVERLAP,
                    };
                }

                const baseSegments = Math.floor(spanHz / this.constants.SAMPLE_RATE_HZ) + 1;
                const constrainedSegments = Math.max(
                    this.constants.MIN_SEGMENTS,
                    Math.min(this.constants.MAX_SEGMENTS, baseSegments),
                );
                const theoreticalOverlap = ((constrainedSegments * this.constants.SAMPLE_RATE_HZ) - spanHz) / spanHz;
                const finalOverlap = Math.max(
                    this.constants.MIN_OVERLAP,
                    Math.min(this.constants.MAX_OVERLAP, theoreticalOverlap),
                );

                return { baseSegments, constrainedSegments, theoreticalOverlap, finalOverlap };
            }

            _formatWindowLabel(value) {
                if (!value) return 'None';
                const normalized = value.toString().trim().toLowerCase();
                if (normalized === 'none') return 'None';
                if (normalized === 'hann') return 'Hann';
                return normalized.charAt(0).toUpperCase() + normalized.slice(1);
            }

            _setStatus(state, message) {
                if (!this.statusBadge) return;
                const labels = {
                    ready: '就绪',
                    starting: '启动中',
                    running: '运行中',
                    stopping: '停止中',
                    error: '错误',
                };
                const classes = {
                    ready: 'badge bg-secondary',
                    starting: 'badge bg-warning text-dark',
                    running: 'badge bg-success',
                    stopping: 'badge bg-warning text-dark',
                    error: 'badge bg-danger',
                };
                const nextLabel = message || labels[state] || labels.ready;
                const nextClass = classes[state] || classes.ready;
                this.statusBadge.className = nextClass;
                this.statusBadge.textContent = nextLabel;
                this.statusBadge.dataset.status = state;
            }

            _setButtonState(state = {}) {
                if (this.startButton && Object.prototype.hasOwnProperty.call(state, 'start')) {
                    this.startButton.disabled = !!state.start;
                }
                if (this.stopButton && Object.prototype.hasOwnProperty.call(state, 'stop')) {
                    this.stopButton.disabled = !!state.stop;
                }
            }

            updateButtons(isRunning) {
                this._setButtonState({ start: !!isRunning, stop: !isRunning });
            }

            _updateSummary(overrides = {}) {
                const startMhz = this._parseMHzInput(this.startInput);
                const stopMhz = this._parseMHzInput(this.stopInput);
                const spanHz = this._computeSpanHz(startMhz, stopMhz);

                const summary = Object.assign({
                    sampleRateHz: this.constants.SAMPLE_RATE_HZ,
                    spanHz,
                    window: this.windowSelect ? this.windowSelect.value : 'none',
                }, this.summaryState, overrides);

                if (Number.isFinite(spanHz) && spanHz > 0) {
                    const fftSize = this._computeFftSize(spanHz);
                    const resolutionHz = this._computeResolution(summary.fftSize || fftSize);
                    const segmentInfo = this._computeSegments(spanHz);
                    summary.fftSize = fftSize;
                    summary.resolutionHz = resolutionHz;
                    summary.maxSegments = segmentInfo.constrainedSegments;
                    summary.overlap = segmentInfo.finalOverlap;
                } else {
                    summary.spanHz = NaN;
                    summary.fftSize = summary.fftSize || this.constants.DEFAULT_FFT_SIZE;
                    summary.resolutionHz = this._computeResolution(summary.fftSize);
                    summary.maxSegments = summary.maxSegments || this.constants.MIN_SEGMENTS;
                    summary.overlap = summary.overlap || this.constants.MIN_OVERLAP;
                }

                this.summaryState = summary;
                this._renderSummary();
            }

            _renderSummary() {
                if (!this.summaryBadge) return;
                const state = this.summaryState || {};
                const srText = `SR ${(state.sampleRateHz / 1e6).toFixed(4)} MHz`;
                const rbwText = Number.isFinite(state.resolutionHz)
                    ? `RBW ${(state.resolutionHz / 1e3).toFixed(2)} kHz`
                    : 'RBW --';
                const spanText = Number.isFinite(state.spanHz) && state.spanHz > 0
                    ? `Span ${(state.spanHz / 1e6).toFixed(2)} MHz`
                    : 'Span --';
                const fftText = state.fftSize ? `FFT ${state.fftSize}` : 'FFT --';
                const segText = state.maxSegments ? `Seg ≤ ${state.maxSegments}` : 'Seg --';
                const windowText = `Window ${this._formatWindowLabel(state.window)}`;
                this.summaryBadge.textContent = `${srText} • ${rbwText} • ${spanText} • ${fftText} • ${segText} • ${windowText}`;
            }

            _buildPayload(startMhz, stopMhz) {
                const spanHz = this._computeSpanHz(startMhz, stopMhz);
                const fftSize = this._computeFftSize(spanHz);
                const resolution = this._computeResolution(fftSize);
                const segmentInfo = this._computeSegments(spanHz);
                const windowValue = this.windowSelect ? this.windowSelect.value : 'none';

                const payload = {
                    start_freq: startMhz * 1e6,
                    stop_freq: stopMhz * 1e6,
                    resolution,
                    dwell_time: this.constants.DWELL_TIME_S,
                    sample_rate: this.constants.SAMPLE_RATE_HZ,
                    avg_count: this.constants.AVG_COUNT,
                    overlap: Number(segmentInfo.finalOverlap.toFixed(3)),
                    scan_interval: 0,
                    continuous: true,
                    fft_size: fftSize,
                    max_segments: segmentInfo.constrainedSegments,
                    window: windowValue,
                };

                const summary = {
                    sampleRateHz: this.constants.SAMPLE_RATE_HZ,
                    spanHz,
                    resolutionHz: resolution,
                    fftSize,
                    maxSegments: segmentInfo.constrainedSegments,
                    overlap: segmentInfo.finalOverlap,
                    window: windowValue,
                };

                return { payload, summary };
            }

            async start() {
                if (this.pendingRequest) {
                    return this.pendingRequest;
                }

                const startMhz = this._parseMHzInput(this.startInput);
                const stopMhz = this._parseMHzInput(this.stopInput);

                if (!Number.isFinite(startMhz) || !Number.isFinite(stopMhz)) {
                    this._alert('请输入有效的起止频率', 'error');
                    return Promise.reject(new Error('Invalid frequency input'));
                }

                if (startMhz >= stopMhz) {
                    this._alert('起始频率必须小于终止频率', 'error');
                    return Promise.reject(new Error('Start frequency must be less than stop frequency'));
                }

                const { payload, summary } = this._buildPayload(startMhz, stopMhz);
                if (!Number.isFinite(summary.spanHz) || summary.spanHz <= 0) {
                    this._alert('频率范围无效', 'error');
                    return Promise.reject(new Error('Invalid frequency span'));
                }

                this.summaryState = summary;
                this._renderSummary();
                this._setStatus('starting');
                this._setButtonState({ start: true, stop: true });

                const request = fetch('/api/spectrum-scan/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                    .then(async (response) => {
                        if (!response.ok) {
                            let message;
                            try {
                                const errorPayload = await response.json();
                                message = errorPayload?.detail || errorPayload?.message;
                            } catch (jsonErr) {
                                message = await response.text();
                            }
                            throw new Error(message || response.statusText || '启动失败');
                        }
                        return response.json();
                    })
                    .then((result) => {
                        this.lastPayload = payload;
                        if (window.streamingAnalysis && result.session_id) {
                            window.streamingAnalysis.startSSE(result.session_id);
                        }
                        this._setStatus('running');
                        this.updateButtons(true);
                        if (typeof result === 'object') {
                            this.applyStreamMetadata(result, result);
                        }
                        this._alert('频谱扫描已启动', 'success');
                        return result;
                    })
                    .catch((error) => {
                        this._setStatus('error', '启动失败');
                        this.updateButtons(false);
                        this._alert(error.message || '频谱扫描启动失败', 'error');
                        throw error;
                    })
                    .finally(() => {
                        this.pendingRequest = null;
                    });

                this.pendingRequest = request;
                return request;
            }

            async stop() {
                this._setStatus('stopping');
                this._setButtonState({ start: true, stop: true });

                try {
                    const response = await fetch('/api/spectrum-scan/stop', { method: 'POST' });
                    if (!response.ok) {
                        let message;
                        try {
                            const errorPayload = await response.json();
                            message = errorPayload?.detail || errorPayload?.message;
                        } catch (jsonErr) {
                            message = await response.text();
                        }
                        throw new Error(message || response.statusText || '停止失败');
                    }
                    const result = await response.json();
                    if (window.streamingAnalysis) {
                        window.streamingAnalysis.stopStreaming();
                    }
                    this.handleCompletion(result.message || '扫描已停止');
                    return result;
                } catch (error) {
                    this._setStatus('error', '停止失败');
                    this.updateButtons(false);
                    this._alert(error.message || '扫描停止失败', 'error');
                    throw error;
                }
            }

            handleCompletion(message) {
                this._setStatus('ready');
                this.updateButtons(false);
                if (message) {
                    this._alert(message, 'info');
                }
            }

            applyStreamMetadata(meta = {}, streamMeta = {}) {
                const scanSettings = meta.scan_settings || {};
                const streamedSettings = streamMeta.scan_settings || {};
                const presetSettings = streamMeta.preset_settings || {};

                const startFreq = scanSettings.start_freq || presetSettings.start_freq || (this.lastPayload && this.lastPayload.start_freq);
                const stopFreq = scanSettings.stop_freq || presetSettings.stop_freq || (this.lastPayload && this.lastPayload.stop_freq);
                const spanHz = Number.isFinite(stopFreq) && Number.isFinite(startFreq) ? (stopFreq - startFreq) : (this.summaryState && this.summaryState.spanHz);

                const sampleRate = presetSettings.sample_rate
                    || streamedSettings.sample_rate
                    || scanSettings.sample_rate
                    || this.constants.SAMPLE_RATE_HZ;
                const resolution = presetSettings.rbw
                    || scanSettings.resolution
                    || (this.summaryState && this.summaryState.resolutionHz)
                    || this._computeResolution(this.constants.DEFAULT_FFT_SIZE);
                const fftSize = presetSettings.fft_size
                    || streamedSettings.fft_size
                    || scanSettings.fft_size
                    || Math.round(sampleRate / resolution)
                    || this.summaryState.fftSize;
                const maxSegments = scanSettings.max_segments
                    || streamMeta.max_segments
                    || this.summaryState.maxSegments;
                const windowValue = presetSettings.window
                    || scanSettings.window
                    || streamMeta.window
                    || (this.windowSelect && this.windowSelect.value)
                    || (this.summaryState && this.summaryState.window)
                    || 'none';

                this._updateSummary({
                    sampleRateHz: sampleRate,
                    resolutionHz: resolution,
                    fftSize,
                    maxSegments,
                    window: windowValue,
                    spanHz,
                });
            }
        }

        function handleAnalysisModeChange(selectedMode) {
            const scanControl = document.getElementById('spectrumScanForm');
            const fileControl = document.getElementById('fileControl');
            const realtimeControl = document.getElementById('realtimeControl');

            [fileControl, realtimeControl].forEach((control) => {
                if (control) control.style.display = 'none';
            });

            if (selectedMode === 'scan') {
                if (scanControl) scanControl.style.display = 'block';
            } else if (selectedMode === 'file') {
                if (fileControl) fileControl.style.display = 'block';
            } else if (selectedMode === 'realtime') {
                if (realtimeControl) realtimeControl.style.display = 'block';
            }

            if (window.streamingAnalysis && window.streamingAnalysis.isStreaming) {
                window.streamingAnalysis.stopStreaming();
            }
        }

        async function startSpectrumScan() {
            if (window.spectrumScanController) {
                return window.spectrumScanController.start();
            }
            return Promise.reject(new Error('SpectrumScanController not initialized'));
        }

        async function stopSpectrumScan() {
            if (window.spectrumScanController) {
                return window.spectrumScanController.stop();
            }
            return Promise.reject(new Error('SpectrumScanController not initialized'));
        }

        function updateScanButtons(isRunning) {
            if (window.spectrumScanController) {
                window.spectrumScanController.updateButtons(Boolean(isRunning));
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            initializeSampleRateSelects();
            window.spectrumScanController = new SpectrumScanController();

            const modeSelector = document.getElementById('analysisMode');
            if (modeSelector && !modeSelector.dataset.scanListenerAttached) {
                modeSelector.addEventListener('change', function () {
                    handleAnalysisModeChange(this.value);
                });
                modeSelector.dataset.scanListenerAttached = 'true';
                handleAnalysisModeChange(modeSelector.value);
            } else if (!modeSelector) {
                handleAnalysisModeChange('scan');
            }

            if (!window.streamingAnalysis && typeof StreamingAnalysis === 'function') {
                window.streamingAnalysis = new StreamingAnalysis(window.rptUI || null);
            }

            if (window.rptUI && !window.rptUI.fileStreamController && window.streamingAnalysis) {
                window.rptUI.fileStreamController = window.streamingAnalysis;
            }
        });

// === Analysis display fix: ensure analysis results render into the main Signal Analysis tabs ===
(function() {
    'use strict';

    function resolveCenterFreqMHz(...sources) {
        if (window.rptUI && typeof window.rptUI._resolveCenterFrequencyMHz === 'function') {
            const resolved = window.rptUI._resolveCenterFrequencyMHz(...sources);
            return Number.isFinite(resolved) ? resolved : null;
        }
        const extractNumeric = (value) => {
            const num = Number(value);
            if (!Number.isFinite(num)) return null;
            if (Math.abs(num) >= 1e4) {
                return num / 1e6;
            }
            return num;
        };
        for (const source of sources) {
            if (source == null) continue;
            if (typeof source === 'number' || typeof source === 'string') {
                const converted = extractNumeric(source);
                if (converted !== null) return converted;
            } else if (typeof source === 'object') {
                const keys = ['center_freq', 'centerFreq', 'center_frequency', 'centerFrequency'];
                for (const key of keys) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        const converted = extractNumeric(source[key]);
                        if (converted !== null) return converted;
                    }
                }
            }
        }
        return null;
    }

    function resolveSampleRate(...sources) {
        if (window.rptUI && typeof window.rptUI._resolveSampleRate === 'function') {
            for (const source of sources) {
                const rate = window.rptUI._resolveSampleRate(source);
                if (Number.isFinite(rate) && rate > 0) {
                    return rate;
                }
            }
            const fallbackRate = window.rptUI._resolveSampleRate({});
            if (Number.isFinite(fallbackRate) && fallbackRate > 0) {
                return fallbackRate;
            }
        }

        const visited = new Set();
        const extract = (value, depth = 0) => {
            if (value == null || depth > 3) return null;
            if (typeof value === 'number') {
                return Number.isFinite(value) && value > 0 ? value : null;
            }
            if (typeof value !== 'object') return null;
            if (visited.has(value)) return null;
            visited.add(value);

            const keys = ['sample_rate', 'sampleRate', 'samplerate', 'sample_rate_hz', 'sampleRateHz', 'sr'];
            for (const key of keys) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    const num = Number(value[key]);
                    if (Number.isFinite(num) && num > 0) {
                        return num;
                    }
                }
            }

            const nestedKeys = ['metadata', 'meta', 'info', 'settings', 'params', 'options', 'configuration', 'config', 'scan_settings', 'scanSettings'];
            for (const key of nestedKeys) {
                if (value[key]) {
                    const nested = extract(value[key], depth + 1);
                    if (nested !== null) return nested;
                }
            }
            return null;
        };

        for (const source of sources) {
            const result = extract(source);
            if (result !== null) {
                return result;
            }
        }

        return null;
    }

    function applyCenterFreqOffset(values, centerFreqMHz) {
        if (window.rptUI && typeof window.rptUI._applyCenterFrequencyOffset === 'function') {
            return window.rptUI._applyCenterFrequencyOffset(values, centerFreqMHz);
        }
        const arr = Array.isArray(values) ? values : Array.from(values || []);
        const numeric = arr.map((value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        });
        if (!Number.isFinite(centerFreqMHz)) {
            return numeric;
        }
        return numeric.map((value) => value + centerFreqMHz);
    }

    function calculateFrequencyRange(values) {
        if (window.rptUI && typeof window.rptUI._calculateFrequencyRange === 'function') {
            return window.rptUI._calculateFrequencyRange(values);
        }
        if (!values) return null;
        const numeric = Array.from(values, (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        }).filter((value) => value !== null);
        if (!numeric.length) return null;
        let minFreq = Math.min(...numeric);
        let maxFreq = Math.max(...numeric);
        if (Math.abs(maxFreq - minFreq) < 1.0) {
            minFreq -= 2.0;
            maxFreq += 2.0;
        }
        if (minFreq >= maxFreq) {
            minFreq -= 1.0;
            maxFreq += 1.0;
        }
        return { xMin: minFreq, xMax: maxFreq };
    }

    function calculatePowerRange(values) {
        if (window.rptUI && typeof window.rptUI._calculateHigherOrderPowerRange === 'function') {
            return window.rptUI._calculateHigherOrderPowerRange(values);
        }
        if (!values) return null;
        const numeric = Array.from(values, (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        }).filter((value) => value !== null);
        if (!numeric.length) return null;
        const maxPower = Math.max(...numeric);
        const actualMin = Math.min(...numeric);
        let yMin = maxPower - 60;
        let yMax = maxPower + 10;
        if (yMin < actualMin) yMin = actualMin;
        if (yMin >= yMax) yMin = yMax - 1;
        return { yMin, yMax };
    }

    function calculateHigherOrderRange(centerFreqMHz, order, sampleRateHz) {
        if (window.rptUI && typeof window.rptUI._calculateHigherOrderFrequencyRange === 'function') {
            return window.rptUI._calculateHigherOrderFrequencyRange(centerFreqMHz, order, sampleRateHz);
        }
        const center = Number(centerFreqMHz);
        if (!Number.isFinite(center)) return null;
        const sampleRate = Number(sampleRateHz);
        if (Number.isFinite(sampleRate) && sampleRate > 0) {
            const halfSpanMHz = (sampleRate * 0.5) / 1e6;
            const xMin = center;
            const xMax = center + halfSpanMHz + 1;
            if (Number.isFinite(xMax) && xMax > xMin) {
                return { xMin, xMax };
            }
        }
        const harmonic = center * order;
        if (!Number.isFinite(harmonic)) return null;
        if (order === 2) {
            return { xMin: center, xMax: harmonic + 5 };
        }
        if (order === 4) {
            return { xMin: center, xMax: harmonic + 3 };
        }
        const span = order >= 2 ? 3 : 1;
        return { xMin: harmonic - span, xMax: harmonic + span };
    }

    function safeRenderSimpleCanvas(canvasId, freq, power, title, color, options) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        try {
            // reuse existing helper on rptUI if available
            if (window.rptUI && typeof window.rptUI.renderSimpleChart === 'function') {
                window.rptUI.renderSimpleChart(
                    ctx,
                    freq,
                    [{ data: power, label: title, color: color || '#9b59b6' }],
                    title,
                    options || {}
                );
            } else {
                // fallback: draw minimal line
                ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.fillStyle = '#666'; ctx.fillText(title, canvas.width/2, 20);
            }
        } catch (e) { console.warn('safeRenderSimpleCanvas failed', e); }
    }

    function applyAnalysisDisplayFix() {
        // override global display/update functions if they exist (or create them)
        window.displayAnalysisResults = function(data) {
            try {
                // hide preview panel if visible
                const preview = document.getElementById('previewPanel');
                if (preview) preview.style.display = 'none';

                // ensure Signal Analysis card is visible
                const analysisCard = document.querySelector('.card.mt-4');
                if (analysisCard) analysisCard.scrollIntoView({ behavior: 'auto', block: 'start' });

                // normalize stream container shape: some producers send {streams: {...}}
                const payload = data.streams || data;
                const vizConfig = (typeof window !== 'undefined' && window.rptConfig && window.rptConfig.visualization) ? window.rptConfig.visualization : {};
                const centerFreqMHz = resolveCenterFreqMHz(
                    payload && payload.metadata,
                    data && data.metadata,
                    window.rptUI && window.rptUI.latestStreamMeta,
                    window.rptUI && window.rptUI.selectedFile,
                    window.rptUI && window.rptUI.selectedFile && window.rptUI.selectedFile.metadata
                );

                // time domain
                if (payload.time_domain) {
                    const t = payload.time_domain.time || Array.from({length: (payload.time_domain.i_component||[]).length}, (_,i)=>i);
                    const i = payload.time_domain.i_component || payload.time_domain.real || [];
                    const q = payload.time_domain.q_component || payload.time_domain.imag || [];
                    if (window.rptUI && typeof window.rptUI.renderTimeDomainChart === 'function') {
                        try { window.rptUI.renderTimeDomainChart(t, i, q, payload.metadata || data.metadata || {}); } catch(e){ console.warn(e); }
                    } else {
                        // fallback: draw to timeDomainChart
                        safeRenderSimpleCanvas(
                            'timeDomainChart',
                            t,
                            i,
                            'Time Domain',
                            '#3498db',
                            {
                                xLabel: 'Time',
                                yLabel: 'Amplitude',
                                showGrid: true
                            }
                        );
                    }
                }

                // frequency domain
                if (payload.frequency_domain) {
                    const freq = applyCenterFreqOffset(
                        payload.frequency_domain.frequency || payload.frequency_domain.frequencies || [],
                        centerFreqMHz
                    );
                    const power = payload.frequency_domain.power || payload.frequency_domain.magnitude || [];
                    const freqLabel = Number.isFinite(centerFreqMHz) ? 'Frequency (MHz)' : 'Frequency Offset (MHz)';
                    safeRenderSimpleCanvas(
                        'frequencyDomainChart',
                        freq,
                        power,
                        'Power Spectrum',
                        '#9b59b6',
                        {
                            xLabel: freqLabel,
                            yLabel: 'Power (dB)',
                            showGrid: vizConfig.power_grid_enabled !== false,
                            showTicks: vizConfig.power_ticks_enabled !== false,
                            yMin: vizConfig.power_spectrum_y_min ?? -120,
                            yMax: vizConfig.power_spectrum_y_max ?? 20,
                            xTickCount: 6,
                            yTickCount: 6
                        }
                    );
                }

                // constellation
                if (payload.constellation) {
                    const i = payload.constellation.i_component || payload.constellation.real || [];
                    const q = payload.constellation.q_component || payload.constellation.imag || [];
                    const canvas = document.getElementById('constellationChart');
                    if (canvas && canvas.getContext && window.rptUI && typeof window.rptUI.renderScatterChart === 'function') {
                        try {
                            window.rptUI.renderScatterChart(
                                canvas.getContext('2d'),
                                i,
                                q,
                                '',
                                {
                                    showGrid: vizConfig.power_grid_enabled !== false,
                                    showTicks: vizConfig.power_ticks_enabled !== false,
                                    xLabel: 'I (Real)',
                                    yLabel: 'Q (Imag)',
                                    margin: { top: 40 }
                                }
                            );
                        } catch(e){ console.warn(e); }
                    }
                }

                // higher order
                if (payload.higher_order) {
                    const freqAxis = applyCenterFreqOffset(
                        payload.higher_order.frequency || payload.higher_order.freq || [],
                        centerFreqMHz
                    );
                    const freqLabel = Number.isFinite(centerFreqMHz) ? 'Frequency (MHz)' : 'Frequency Offset (MHz)';
                    const quad = payload.higher_order.quadratic_power || payload.higher_order.square || [];
                    const quart = payload.higher_order.quartic_power || payload.higher_order.fourth || [];
                    const averaged = (window.rptUI && typeof window.rptUI._accumulateHigherOrderAverage === 'function')
                        ? window.rptUI._accumulateHigherOrderAverage(freqAxis, quad, quart, centerFreqMHz)
                        : null;
                    const freqForPlots = averaged && averaged.frequency && averaged.frequency.length ? averaged.frequency : freqAxis;
                    const quadAvg = averaged && averaged.quad && averaged.quad.length ? averaged.quad : quad;
                    const quartAvg = averaged && averaged.quart && averaged.quart.length ? averaged.quart : quart;
                    const sampleRateHz = resolveSampleRate(payload.metadata, data && data.metadata, window.rptUI && window.rptUI.latestStreamMeta, window.rptUI && window.rptUI.selectedFile);
                    const freqRangeM2 = calculateHigherOrderRange(centerFreqMHz, 2, sampleRateHz);
                    const freqRangeM4 = calculateHigherOrderRange(centerFreqMHz, 4, sampleRateHz);
                    const fallbackRange = calculateFrequencyRange(freqForPlots);
                    const freqRange = freqRangeM2 || fallbackRange;
                    const quadRange = calculatePowerRange(quadAvg);
                    const quartRange = calculatePowerRange(quartAvg);
                    const parsedMin = Number.isFinite(Number(vizConfig.higher_order_power_y_min))
                        ? Number(vizConfig.higher_order_power_y_min)
                        : null;
                    const parsedMax = Number.isFinite(Number(vizConfig.higher_order_power_y_max))
                        ? Number(vizConfig.higher_order_power_y_max)
                        : null;
                    const quadYMin = parsedMin !== null
                        ? parsedMin
                        : (Number.isFinite(quadRange?.yMin) ? quadRange.yMin : undefined);
                    const quadYMax = parsedMax !== null
                        ? parsedMax
                        : (Number.isFinite(quadRange?.yMax) ? quadRange.yMax : undefined);
                    const quartYMin = parsedMin !== null
                        ? parsedMin
                        : (Number.isFinite(quartRange?.yMin) ? quartRange.yMin : undefined);
                    const quartYMax = parsedMax !== null
                        ? parsedMax
                        : (Number.isFinite(quartRange?.yMax) ? quartRange.yMax : undefined);
                    safeRenderSimpleCanvas(
                        'm2Chart',
                        freqForPlots,
                        quadAvg,
                        'Square Spectrum',
                        '#27ae60',
                        {
                            xLabel: freqLabel,
                            yLabel: 'Quadratic Power',
                            showGrid: vizConfig.power_grid_enabled !== false,
                            showTicks: vizConfig.power_ticks_enabled !== false,
                            yTickCount: 5,
                            xMin: freqRange ? freqRange.xMin : undefined,
                            xMax: freqRange ? freqRange.xMax : undefined,
                            yMin: quadYMin,
                            yMax: quadYMax,
                        }
                    );
                    safeRenderSimpleCanvas(
                        'm4Chart',
                        freqForPlots,
                        quartAvg,
                        'Fourth Power Spectrum',
                        '#e67e22',
                        {
                            xLabel: freqLabel,
                            yLabel: 'Quartic Power',
                            showGrid: vizConfig.power_grid_enabled !== false,
                            showTicks: vizConfig.power_ticks_enabled !== false,
                            yTickCount: 5,
                            xMin: (freqRangeM4 || freqRange)?.xMin,
                            xMax: (freqRangeM4 || freqRange)?.xMax,
                            yMin: quartYMin,
                            yMax: quartYMax,
                        }
                    );
                }

                // update stream badge if provided
                if (payload.total_samples) {
                    if (window.rptUI && typeof window.rptUI.updateStreamStatus === 'function') window.rptUI.updateStreamStatus('streaming', `样本: ${payload.total_samples}`);
                }
            } catch (err) {
                console.error('displayAnalysisResults fix error', err);
            }
        };

        window.updateChartsWithStreamData = function(data) {
            if (window.rptUI && typeof window.rptUI.updateChartsWithStreamData === 'function') {
                try {
                    window.rptUI.updateChartsWithStreamData(data);
                    return;
                } catch (err) {
                    console.warn('global updateChartsWithStreamData → rptUI failed, falling back', err);
                }
            }
            // accept either {streams: {...}} or streams directly
            const payload = data && data.streams ? data.streams : data;
            window.displayAnalysisResults(payload || {});
        };

        // ensure selectAndAnalyzeFile ensures analysis area visibility before starting
        if (window.rptUI && typeof window.rptUI.selectAndAnalyzeFile === 'function') {
            const orig = window.rptUI.selectAndAnalyzeFile.bind(window.rptUI);
            window.rptUI.selectAndAnalyzeFile = async function(filename) {
                try {
                    await this.selectFile(filename);
                    // switch to time tab by default to show streaming
                    const timeTab = document.getElementById('time-tab'); if (timeTab) timeTab.click();
                    // small delay to allow UI to update
                    setTimeout(() => { try { this.startStreaming(); } catch(e){ console.warn(e); } }, 80);
                } catch (e) {
                    console.error('selectAndAnalyzeFile fixed wrapper error', e);
                    // fallback to original
                    try { orig(filename); } catch(_) {}
                }
            };
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyAnalysisDisplayFix);
    else applyAnalysisDisplayFix();
    // expose a small developer helper to simulate streaming payloads
    try {
        // ensure global rptUI reference
        if (!window.rptUI && typeof rptUI !== 'undefined') window.rptUI = rptUI;
        if (window.rptUI && typeof window.rptUI.simulateStream !== 'function') {
            window.rptUI.simulateStream = function(payload) {
                try {
                    // call the library-level update if present
                    if (typeof window.updateChartsWithStreamData === 'function') window.updateChartsWithStreamData(payload);
                    // and call instance-level updater if available
                    if (typeof this.updateChartsWithStreamData === 'function') this.updateChartsWithStreamData(payload);
                } catch (e) {
                    console.warn('simulateStream handler error', e);
                }
            };
        }
    } catch (e) { /* non-fatal */ }

    console.log('[rptUI] analysis display fix loaded');
})();

// --------------------------
// File management debug helpers
// --------------------------

function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        console.error('❌ [DEBUG] setupFileUpload: fileInput element not found');
        return;
    }
    // avoid binding twice
    if (fileInput.dataset.debugBound === '1') return;
    fileInput.dataset.debugBound = '1';

    fileInput.addEventListener('change', function(event) {
        try {
            const files = event.target.files || [];
            console.log('🔍 [DEBUG] setupFileUpload: files selected:', files.length, Array.from(files).map(f=>f.name));
            // report to server-side debug log
            try { fetch('/api/debug/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'file_input_change', files: Array.from(files).map(f=>f.name), ts: Date.now() }) }).catch(()=>{}); } catch(e){}
        } catch (e) { console.warn('setupFileUpload change handler error', e); }

        // forward to existing upload logic
        try { if (rptUI && typeof rptUI.uploadFiles === 'function') rptUI.uploadFiles(event.target.files); } catch(e) { console.error('setupFileUpload: uploadFiles failed', e); }
        // clear input value for repeat selection
        try { event.target.value = ''; } catch(e){}
    });

    // click log
    fileInput.addEventListener('click', function() { try { console.log('🔍 [DEBUG] setupFileUpload: fileInput clicked'); } catch(e){} });
}

function setupRefreshButton() {
    // try to find a button wired to our refresh debug wrapper
    // prefer the new data-action hook, then fall back to a textual match
    let refreshBtn = document.querySelector('button[data-action="refresh-list"], button[data-action*="refresh-list"]');
    if (!refreshBtn) refreshBtn = Array.from(document.querySelectorAll('button')).find(b => /refresh/i.test(b.textContent || '') );
    if (!refreshBtn) { console.error('❌ [DEBUG] setupRefreshButton: Refresh button not found'); return; }
    if (refreshBtn.dataset.debugBound === '1') return;
    refreshBtn.dataset.debugBound = '1';
    refreshBtn.addEventListener('click', function() {
        try { console.log('🔍 [DEBUG] setupRefreshButton: Refresh clicked'); } catch(e){}
        try { fetch('/api/debug/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'refresh_click_ui', ts: Date.now() }) }).catch(()=>{}); } catch(e){}
        try { if (rptUI && typeof rptUI.loadFileList === 'function') rptUI.loadFileList(); } catch(e){ console.error('setupRefreshButton: loadFileList failed', e); }
    });
}

function setupFileTableEvents() {
    try {
        // delegate clicks for analyze buttons rendered in file table
        if (setupFileTableEvents._bound) return;
        setupFileTableEvents._bound = true;
        document.addEventListener('click', function (event) {
            try {
                const el = event.target;
                if (!el) return;
                // support both class-based and data-filename attributes
                if (el.classList && el.classList.contains('analyze-btn')) {
                    const filename = el.getAttribute('data-filename') || el.dataset.filename;
                    console.log('[rptUI] File table analyze clicked for', filename);
                    try { if (rptUI && typeof rptUI.selectAndAnalyzeFile === 'function') rptUI.selectAndAnalyzeFile(filename); else if (rptUI && typeof rptUI.selectFile === 'function') rptUI.selectFile(filename); } catch(e){ console.warn('rptUI analyze invocation failed', e); }
                }
            } catch (e) { console.warn('setupFileTableEvents handler error', e); }
        });
        console.log('[rptUI] setupFileTableEvents: delegated analyze button clicks');
    } catch (e) { console.warn('setupFileTableEvents failed', e); }
}

function setupTabNavigation() {
    try {
        if (setupTabNavigation._bound) return;
        setupTabNavigation._bound = true;
        const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
        const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
        if (!tabButtons.length || !tabPanels.length) {
            // nothing to wire yet; try again shortly
            setTimeout(setupTabNavigation, 200);
            return;
        }
        tabButtons.forEach(button => {
            button.addEventListener('click', function () {
                const tabName = this.getAttribute('data-tab');
                console.log('[rptUI] Tab clicked:', tabName);
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                const target = document.getElementById(`${tabName}-panel`);
                if (target) target.classList.add('active');
            });
        });
        console.log('[rptUI] setupTabNavigation: wired tab buttons');
    } catch (e) { console.warn('setupTabNavigation failed', e); }
}

function watchFileTableMutations() {
    try {
        const tb = document.getElementById('fileTableBody');
        if (!tb) {
            // try again shortly if the element is not yet present
            setTimeout(watchFileTableMutations, 200);
            return;
        }
        if (tb.dataset.mutationObserved === '1') return;
        tb.dataset.mutationObserved = '1';
        const observer = new MutationObserver((mutationsList) => {
            try {
                console.log('[rptUI] MutationObserver: detected change to #fileTableBody', mutationsList);
                for (const m of mutationsList) {
                    if (m.type === 'childList') {
                        console.log('[rptUI] MutationObserver childList — added:', m.addedNodes.length, 'removed:', m.removedNodes.length);
                    } else if (m.type === 'attributes') {
                        console.log('[rptUI] MutationObserver attributes —', m.attributeName);
                    } else if (m.type === 'characterData') {
                        console.log('[rptUI] MutationObserver characterData');
                    }
                }
            } catch (e) { console.warn('MutationObserver handler error', e); }
        });
        observer.observe(tb, { childList: true, subtree: true, attributes: true, characterData: true });
        console.log('[rptUI] MutationObserver: watching #fileTableBody for changes');
    } catch (e) { console.warn('watchFileTableMutations failed', e); }
}

// Ensure these helpers are wired after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        try { setupFileUpload(); } catch(e){}
        try { setupRefreshButton(); } catch(e){}
        try { if (rptUI && typeof rptUI.loadFileList === 'function') rptUI.loadFileList(); } catch(e){}
    });
} else {
    try { setupFileUpload(); } catch(e){}
    try { setupRefreshButton(); } catch(e){}
    try { if (rptUI && typeof rptUI.loadFileList === 'function') rptUI.loadFileList(); } catch(e){}
}

