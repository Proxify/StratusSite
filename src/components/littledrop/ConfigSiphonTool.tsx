'use client';

import { useState, useRef } from 'react';
import type { SiphonOptions, SiphonResult } from '@/lib/littledrop/config-siphon/types';

type Format = SiphonOptions['format'];

const FORMAT_LABELS: Record<Format, string> = {
  config: 'Config + Class Info (xlsx)',
  esp: 'Alarm ESP (xlsx)',
  json: 'Config + Class Info (JSON)',
};

export default function ConfigSiphonTool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<Format>('config');
  const [paramMapRaw, setParamMapRaw] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonResult, setJsonResult] = useState<SiphonResult | null>(null);
  const [stats, setStats] = useState<{ modules: number; classes: number; ms: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files).find((f) =>
      f.name.toLowerCase().endsWith('.fhx')
    );
    if (f) setFile(f);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  }

  function clearAll() {
    setFile(null);
    setError(null);
    setJsonResult(null);
    setStats(null);
  }

  async function run() {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setJsonResult(null);
    setStats(null);

    const paramMap = paramMapRaw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const options: SiphonOptions = { format, ...(paramMap.length > 0 ? { paramMap } : {}) };

    const fd = new FormData();
    fd.append('files', file);
    fd.append('options', JSON.stringify(options));

    try {
      const res = await fetch('/api/process/config-siphon', { method: 'POST', body: fd });

      if (format === 'json') {
        const json = (await res.json()) as SiphonResult & { error?: string };
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setJsonResult(json);
        setStats({ modules: json.moduleCount, classes: json.classCount, ms: json.elapsedMs });
      } else {
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition') ?? '';
        const nameMatch = cd.match(/filename="([^"]+)"/);
        const dlName = nameMatch ? nameMatch[1] : 'config-siphon.xlsx';
        downloadBlob(blob, dlName);
        // Stats are in the response but we can't read them after consuming blob;
        // show a success message instead.
        setStats(null);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    if (!jsonResult) return;
    const blob = new Blob([JSON.stringify(jsonResult, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'config-siphon.json');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Config Siphon</h1>
        <p className="text-sm text-muted mt-1">
          Extract configuration metadata from DeltaV FHX export files into structured exports.
        </p>
      </div>

      {/* File drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-white/20 p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".fhx"
          onChange={handleFileSelect}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-white/80">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="text-muted hover:text-red-400 text-xs"
            >
              &times; Remove
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            <span className="text-accent font-medium">Browse</span> or drag & drop an .fhx file here
          </p>
        )}
      </div>

      {/* Options */}
      <div className="rounded-lg border border-white/10 bg-navy-light p-4 space-y-4">
        <h2 className="text-sm font-semibold text-white">Options</h2>

        {/* Format */}
        <div>
          <label className="text-xs text-muted mb-1 block">Export format</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  format === f
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Parameter map filter */}
        <div>
          <label className="text-xs text-muted mb-1 block">
            Attribute filter{' '}
            <span className="text-white/40">(optional — one name per line or comma-separated)</span>
          </label>
          <textarea
            value={paramMapRaw}
            onChange={(e) => setParamMapRaw(e.target.value)}
            rows={3}
            placeholder={'PID1$SP\nAI1$OUT_SCALE\n...'}
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/50 resize-none font-mono"
          />
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={run}
        disabled={!file || isProcessing}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? 'Processing...' : 'Run Config Siphon'}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats (after json run) */}
      {jsonResult && stats && (
        <div className="rounded-lg border border-white/10 bg-navy-light p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/70">
              {stats.modules} module{stats.modules !== 1 ? 's' : ''}, {stats.classes} class
              {stats.classes !== 1 ? 'es' : ''} — {(stats.ms / 1000).toFixed(2)}s
            </p>
            <button
              onClick={downloadJson}
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            >
              Download JSON
            </button>
          </div>

          {/* Preview first table */}
          {jsonResult.tables.slice(0, 2).map((table) =>
            table.rows.length > 0 ? (
              <div key={table.name}>
                <p className="text-xs font-medium text-white mb-1">{table.name}</p>
                <div className="overflow-x-auto rounded border border-white/10">
                  <table className="text-xs text-white/70 w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        {Object.keys(table.rows[0]).slice(0, 8).map((col) => (
                          <th key={col} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                        {Object.keys(table.rows[0]).length > 8 && (
                          <th className="px-2 py-1 text-left text-white/40">
                            +{Object.keys(table.rows[0]).length - 8} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                          {Object.values(row).slice(0, 8).map((val, j) => (
                            <td key={j} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate">
                              {val}
                            </td>
                          ))}
                          {Object.values(row).length > 8 && <td />}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {table.rows.length > 10 && (
                    <p className="text-xs text-white/40 px-2 py-1">
                      ... and {table.rows.length - 10} more rows in download
                    </p>
                  )}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
