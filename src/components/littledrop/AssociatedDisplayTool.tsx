'use client';

import { useState, useRef } from 'react';
import type { AssocReport } from '@/lib/littledrop/associated-display';

export default function AssociatedDisplayTool() {
  const [file, setFile] = useState<File | null>(null);
  const [nativeLocation, setNativeLocation] = useState('NATIVE:\\WINDOW\\');
  const [generateCleanup, setGenerateCleanup] = useState(false);
  const [report, setReport] = useState<AssocReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setReport(null);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setReport(null); setError(null); }
  }

  async function handleSubmit() {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setReport(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('nativeLocation', nativeLocation);
    formData.append('generateCleanup', String(generateCleanup));

    try {
      const res = await fetch('/api/process/associated-display', { method: 'POST', body: formData });
      const data = await res.json() as AssocReport & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  }

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Associated Display</h1>
        <p className="text-sm text-muted mt-1">
          Map HMI displays to their associated control modules and produce CMD.EC / CLEANUP.EC scripts.
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
          accept=".txt,.XX"
          onChange={handleFileSelect}
          className="hidden"
        />
        <p className="text-sm text-muted">
          <span className="text-accent font-medium">Browse</span> or drag & drop a .txt / .XX file here
        </p>
        {file && (
          <p className="mt-3 text-xs text-white/70">{file.name}</p>
        )}
      </div>

      {/* Options */}
      <div className="rounded-lg border border-white/10 bg-navy-light p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Options</h2>
        <div>
          <label className="block text-xs text-muted mb-1">Native Window Location</label>
          <input
            type="text"
            value={nativeLocation}
            onChange={(e) => setNativeLocation(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-navy px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={generateCleanup}
            onChange={(e) => setGenerateCleanup(e.target.checked)}
            className="accent-accent"
          />
          Generate CLEANUP.EC
        </label>
      </div>

      {/* Run button */}
      <button
        onClick={handleSubmit}
        disabled={!file || processing}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? 'Processing...' : 'Run'}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              {report.graphicCount} graphic{report.graphicCount !== 1 ? 's' : ''},{' '}
              {report.tagCount} tag{report.tagCount !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => downloadText(report.cmdFileContent, 'CMD.EC')}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                Download CMD.EC
              </button>
              {report.cleanupFileContent && (
                <button
                  onClick={() => downloadText(report.cleanupFileContent, 'CLEANUP.EC')}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                >
                  Download CLEANUP.EC
                </button>
              )}
            </div>
          </div>

          {/* Parse errors */}
          {report.parseErrors.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-900/10 p-3 text-xs text-yellow-300 space-y-1">
              <p className="font-medium">Parse warnings ({report.parseErrors.length})</p>
              {report.parseErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {/* CMD.EC preview */}
          <div>
            <h2 className="text-sm font-medium text-white mb-2">CMD.EC</h2>
            <pre className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/70 overflow-x-auto max-h-64 overflow-y-auto">
              {report.cmdFileContent}
            </pre>
          </div>

          {/* Entries table */}
          <div>
            <h2 className="text-sm font-medium text-white mb-2">
              Entries ({report.graphicCount})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/10 text-muted">
                    <th className="pb-2 pr-4 font-medium">Graphic</th>
                    <th className="pb-2 pr-4 font-medium">Short Name</th>
                    <th className="pb-2 pr-4 font-medium">Tags</th>
                    <th className="pb-2 font-medium">.XX Content</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.map((entry) => (
                    <tr key={entry.graphic} className="border-b border-white/5 text-white/70">
                      <td className="py-2 pr-4 font-mono">{entry.graphic}</td>
                      <td className="py-2 pr-4 font-mono">{entry.shortGraphic}</td>
                      <td className="py-2 pr-4">{entry.tags.length}</td>
                      <td className="py-2 font-mono">{entry.xxContent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
