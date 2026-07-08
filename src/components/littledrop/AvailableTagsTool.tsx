'use client';

import { useState, useRef } from 'react';
import type { AvailableTagInfo, AvailableTagResult } from '@/lib/littledrop/available-tags/tag-list-builder';

interface ApiResponse extends AvailableTagResult {
  tagFormat: string;
  fileCount: number;
  tagCount: number;
  error?: string;
}

type TabKey = 'allTags' | 'byInstrument' | 'unique';

const TAB_LABELS: Record<TabKey, string> = {
  allTags: 'All Tags Available',
  byInstrument: 'By Instrument',
  unique: 'Unique Tags',
};

function TagTable({ rows }: { rows: AvailableTagInfo[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No available ranges found.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/5">
            <th className="px-3 py-2 text-left font-medium text-muted">Available Range</th>
            <th className="px-3 py-2 text-left font-medium text-muted">Unit</th>
            <th className="px-3 py-2 text-left font-medium text-muted">Instrument</th>
            <th className="px-3 py-2 text-left font-medium text-muted">Loop Range</th>
            <th className="px-3 py-2 text-right font-medium text-muted">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/5 hover:bg-white/5">
              <td className="px-3 py-1.5 font-mono text-white/90">{r.availableTagRange}</td>
              <td className="px-3 py-1.5 font-mono text-white/70">{r.unit}</td>
              <td className="px-3 py-1.5 font-mono text-white/70">{r.firstInstrument}</td>
              <td className="px-3 py-1.5 font-mono text-white/70">{r.range}</td>
              <td className="px-3 py-1.5 font-mono text-right text-white/70">{r.loopCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AvailableTagsTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [tagFormat, setTagFormat] = useState('');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('allTags');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) setFiles(prev => [...prev, ...dropped]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setFiles(prev => [...prev, ...selected]);
    e.target.value = '';
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setFiles([]);
    setResult(null);
    setError(null);
    setTagFormat('');
  }

  async function runProcess() {
    if (files.length === 0 || !tagFormat.trim()) return;
    setIsProcessing(true);
    setResult(null);
    setError(null);

    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    fd.append('tagFormat', tagFormat.trim());

    try {
      const res = await fetch('/api/process/available-tags', { method: 'POST', body: fd });
      const json = await res.json() as ApiResponse;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }

  function downloadCsv(tab: TabKey) {
    if (!result) return;
    const rows = result[tab];
    const header = ['Available Range', 'Unit', 'Instrument', 'Loop Range', 'Count'];
    const lines = [header, ...rows.map(r => [r.availableTagRange, r.unit, r.firstInstrument, r.range, r.loopCount])];
    const csv = lines.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `available-tags-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canRun = files.length > 0 && tagFormat.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Available Tags</h1>
          <p className="text-sm text-muted mt-1">
            Inventory available tag ranges across uploaded files and produce a consolidated gap list.
          </p>
        </div>
        {(files.length > 0 || result) && (
          <button onClick={clearAll} className="text-xs text-muted hover:text-white transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* File Upload Zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-white/20 p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
      >
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
        <div className="text-muted text-sm">
          <span className="text-accent font-medium">Browse</span> or drag & drop tag files here
        </div>
        {files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {files.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
              >
                {f.name}
                <button
                  onClick={e => { e.stopPropagation(); removeFile(i); }}
                  className="ml-1 text-muted hover:text-red-400"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="rounded-lg bg-navy-light border border-white/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Tag Format</h2>
        <div>
          <label className="block text-xs text-muted mb-1">
            Format string — <span className="font-mono">U</span>=unit digit,{' '}
            <span className="font-mono">C</span>=instrument letter,{' '}
            <span className="font-mono">#</span>=loop digit
          </label>
          <input
            type="text"
            value={tagFormat}
            onChange={e => setTagFormat(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter' && canRun) runProcess(); }}
            placeholder="e.g. UUCC###"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <p className="mt-1 text-xs text-muted">Example: tag 82TI174 with format UUCC###</p>
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={runProcess}
        disabled={!canRun || isProcessing}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? 'Processing…' : `Analyze ${files.length} file${files.length !== 1 ? 's' : ''}`}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Results{' '}
              <span className="text-sm font-normal text-muted">
                — {result.tagCount} tag{result.tagCount !== 1 ? 's' : ''} found across{' '}
                {result.fileCount} file{result.fileCount !== 1 ? 's' : ''} (format:{' '}
                <span className="font-mono">{result.tagFormat}</span>)
              </span>
            </h2>
            <button
              onClick={() => downloadCsv(activeTab)}
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            >
              Export CSV
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === activeTab
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                {TAB_LABELS[tab]}{' '}
                <span className="opacity-60">({result[tab].length})</span>
              </button>
            ))}
          </div>

          <TagTable rows={result[activeTab]} />
        </div>
      )}
    </div>
  );
}
