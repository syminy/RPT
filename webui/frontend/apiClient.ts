// Lightweight TypeScript client for RPT backend API
// Generated to match common endpoints used by the frontend.
// Uses fetch; caller can provide baseUrl and optional credentials.

export type FileEntry = {
  name: string;
  size?: number;
  samples_count?: number;
  sample_rate?: number;
  center_freq?: number;
};

export type PreviewData = {
  filename: string;
  total_samples: number;
  preview_samples: number;
  sample_rate?: number;
  preview_data: {
    real: number[];
    imag: number[];
    magnitude: number[];
    phase: number[];
  };
};

export type TaskInfo = {
  task_id: string;
  status?: string;
  description?: string;
  progress?: { percent?: number; message?: string };
};

export type AnalysisResult = {
  status: string;
  progress?: { percent: number; message?: string };
  analysis?: any;
  metadata?: any;
  plots?: Record<string, string>;
};

export class RptApiClient {
  baseUrl: string;
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private url(path: string) {
    return this.baseUrl + path;
  }

  async status(): Promise<{ connected: boolean }> {
    const r = await fetch(this.url('/api/status'));
    return r.json();
  }

  async connect(ip?: string): Promise<any> {
    const body = ip ? JSON.stringify({ ip }) : JSON.stringify({});
    const r = await fetch(this.url('/api/connect'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    return r.json();
  }

  async uploadFile(file: File): Promise<any> {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(this.url('/api/upload'), { method: 'POST', body: fd });
    return r.json();
  }

  async listFiles(): Promise<{ files: FileEntry[] }> {
    const r = await fetch(this.url('/api/files'));
    return r.json();
  }

  async getFileInfo(filename: string): Promise<any> {
    const r = await fetch(this.url(`/api/files/${encodeURIComponent(filename)}`));
    return r.json();
  }

  async getFilePreview(filename: string, max_samples = 1000): Promise<PreviewData> {
    const r = await fetch(this.url(`/api/files/${encodeURIComponent(filename)}/preview?max_samples=${max_samples}`));
    return r.json();
  }

  async deleteFile(filename: string): Promise<any> {
    const r = await fetch(this.url(`/api/files/${encodeURIComponent(filename)}`), { method: 'DELETE' });
    return r.json();
  }

  async deleteAllFiles(): Promise<any> {
    const r = await fetch(this.url('/api/files'), { method: 'DELETE' });
    return r.json();
  }

  async startAnalyze(filename: string): Promise<{ success?: boolean; task_id?: string }> {
    const body = new URLSearchParams();
    body.append('filename', filename);
    const r = await fetch(this.url('/api/analyze'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return r.json();
  }

  async getAnalysisResult(taskId: string): Promise<AnalysisResult> {
    const r = await fetch(this.url(`/api/analysis/${encodeURIComponent(taskId)}`));
    return r.json();
  }

  async listTasks(): Promise<{ tasks: TaskInfo[] }> {
    const r = await fetch(this.url('/api/tasks'));
    return r.json();
  }

  async cancelTask(taskId: string): Promise<any> {
    const r = await fetch(this.url(`/api/tasks/${encodeURIComponent(taskId)}/cancel`), { method: 'POST' });
    return r.json();
  }

  async generateQPSK(params: {
    center_freq?: number; // Hz
    symbol_rate?: number;
    sample_rate?: number;
    tx_gain?: number;
    duration?: number;
    channel?: number;
    save_file?: string;
    transmit?: boolean;
  }): Promise<any> {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      body.append(k, String(v));
    });
    const r = await fetch(this.url('/api/generate'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return r.json();
  }

  async playFile(params: { filename: string; freq?: number; rate?: number; gain?: number; channel?: number; repeat?: number; scale?: number; }) {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) body.append(k, String(v)); });
    const r = await fetch(this.url('/api/play'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return r.json();
  }

  async convertFile(filename: string, format: string, output?: string) {
    const body = new URLSearchParams();
    body.append('filename', filename);
    body.append('format', format);
    if (output) body.append('output', output);
    const r = await fetch(this.url('/api/convert'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return r.json();
  }

  async startRecording(params: { freq?: number; rate?: number; gain?: number; duration?: number; channel?: number; filename?: string; }) {
    const r = await fetch(this.url('/api/record'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    return r.json();
  }

  async startFileStreaming(filename: string, opts?: { file_format?: string; sample_rate?: number; center_freq?: number; target_fps?: number; target_freq_resolution?: number; }) {
    const body = new URLSearchParams();
    body.append('filename', filename);
    if (opts) {
      Object.entries(opts).forEach(([k, v]) => { if (v !== undefined && v !== null) body.append(k, String(v)); });
    }
    const r = await fetch(this.url('/api/streaming/start'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return r.json();
  }

  // SSE helper: returns an EventSource instance for a session
  sseForSession(sessionId: string): EventSource {
    return new EventSource(this.url(`/api/streaming/data/${sessionId}`));
  }

  // WebSocket helper: create websocket and returns it
  wsForSession(sessionId: string): WebSocket {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    return new WebSocket(`${proto}://${host}/ws/stream/${encodeURIComponent(sessionId)}`);
  }

  async fetchStreamingPresets(): Promise<any> {
    const r = await fetch(this.url('/api/streaming/presets'));
    return r.json();
  }

  // debug log helper
  async debugLog(payload: Record<string, any>) {
    try { await fetch(this.url('/api/debug/log'), { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); } catch(e) { /* ignore */ }
  }
}

export default RptApiClient;
