'use client';

import { useState, useRef } from 'react';
import type { XGrepResult, XGrepFileResult } from '@/lib/littledrop/xgrep';

interface Options {
  keyword: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

const defaultOptions: Options = {
  keyword: '',
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
};

export default function XGrepTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [result, setResult] = useState<XGrepResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setFiles([]);
    setResult(null);
    setError(null);
    setOptions(defaultOptions);
  }

  async function runSearch() {
    if (files.length === 0 || !options.keyword.trim()) return;
    setIsSearching(true);
    setResult(null);
    setError(null);
    setExpandedFile(null);

    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    fd.append('options', JSON.stringify(options));

    try {
      const res = await fetch('/api/process/xgrep', { method: 'POST', body: fd });
      const json = await res.json() as XGrepResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }

  function downloadCsv() {
    if (!result) return;
    const rows = [['File', 'Line', 'Content']];
    for (const f of result.files) {
      for (const m of f.matches) {
        rows.push([f.fileName, String(m.lineNumber), m.lineContent.replace(/"/g, '""')]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xgrep-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const canRun = files.length > 0 && options.keyword.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">xGrep</h1>
          <p className="text-sm text-muted mt-1">
            Recursive content search across uploaded HMI files with structured results.
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
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-white/20 p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
      >
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
        <div className="text-muted text-sm">
          <span className="text-accent font-medium">Browse</span> or drag & drop files here
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
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
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
      <div className="rounded-lg bg-navy-light border border-white/10 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-white">Search Options</h2>
        <div>
          <label className="block text-xs text-muted mb-1">Search keyword / pattern</label>
          <input
            type="text"
            value={options.keyword}
            onChange={(e) => setOptions((o) => ({ ...o, keyword: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter' && canRun) runSearch(); }}
            placeholder="e.g.  REACTOR_TEMP"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['caseSensitive', 'Case-sensitive'],
              ['wholeWord', 'Whole word'],
              ['useRegex', 'Regex'],
            ] as [keyof Options, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options[key] as boolean}
                onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                className="accent-accent"
              />
              <span className="text-xs text-muted">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={runSearch}
        disabled={!canRun || isSearching}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isSearching ? 'Searching…' : `Search ${files.length} file${files.length !== 1 ? 's' : ''}`}
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
                — {result.files.length} file{result.files.length !== 1 ? 's' : ''} matched,{' '}
                {result.totalMatches} line{result.totalMatches !== 1 ? 's' : ''}
              </span>
            </h2>
            {result.totalMatches > 0 && (
              <button
                onClick={downloadCsv}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                Export CSV
              </button>
            )}
          </div>

          {result.files.length === 0 ? (
            <p className="text-sm text-muted">No results found.</p>
          ) : (
            <div className="space-y-2">
              {result.files.map((f: XGrepFileResult) => (
                <div key={f.fileName} className="rounded-lg border border-white/10 bg-navy-light overflow-hidden">
                  <button
                    onClick={() => setExpandedFile(expandedFile === f.fileName ? null : f.fileName)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-medium text-white truncate">{f.fileName}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted">
                      {f.matchCount} match{f.matchCount !== 1 ? 'es' : ''}
                      <span className="ml-2">{expandedFile === f.fileName ? '▲' : '▼'}</span>
                    </span>
                  </button>
                  {expandedFile === f.fileName && (
                    <div className="border-t border-white/10 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="px-3 py-2 text-left font-medium text-muted w-12">Line</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Content</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.matches.map((m) => (
                            <tr key={m.lineNumber} className="border-t border-white/5 hover:bg-white/5">
                              <td className="px-3 py-1.5 text-muted font-mono">{m.lineNumber}</td>
                              <td className="px-3 py-1.5 text-white/80 font-mono break-all">{m.lineContent}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
