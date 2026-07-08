'use client';

import { useState, useRef } from 'react';
import type { ExtractionResult, ExtractionOptions } from '@/lib/littledrop/htm-graphic-extract/types';

export default function HtmGraphicExtractTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<ExtractionOptions>({
    includeStaticText: false,
    filterStaticText: false,
  });
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'tags' | 'shapes' | 'scripts' | 'custom'>('tags');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.htm')
    );
    if (dropped.length) setFiles((p) => [...p, ...dropped]);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter((f) =>
      f.name.toLowerCase().endsWith('.htm')
    );
    if (selected.length) setFiles((p) => [...p, ...selected]);
    e.target.value = '';
  }

  function clearAll() {
    setFiles([]);
    setResult(null);
    setError(null);
  }

  async function runExtraction() {
    if (!files.length) return;
    setIsRunning(true);
    setResult(null);
    setError(null);

    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    fd.append('options', JSON.stringify(options));

    try {
      const res = await fetch('/api/process/htm-graphic-extract', { method: 'POST', body: fd });
      const json = (await res.json()) as ExtractionResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
      setActiveTab('tags');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsRunning(false);
    }
  }

  async function downloadExcel() {
    if (!result) return;
    const { exportToExcel } = await import('@/lib/littledrop/htm-graphic-extract/excel');
    const blob = await exportToExcel(result);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'htm-graphic-extract.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs = [
    { key: 'tags', label: 'Tags By Graphic' },
    { key: 'shapes', label: 'Shape Appearance' },
    { key: 'scripts', label: `All Scripts (${result?.stats.scriptCount ?? 0})` },
    { key: 'custom', label: `Custom Scripts (${result?.stats.customScriptCount ?? 0})` },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">HTM Graphic Extract</h1>
          <p className="text-sm text-muted mt-1">
            Parse Honeywell Experion .htm graphics and extract tags, shapes, and VBScripts.
          </p>
        </div>
        {files.length > 0 && (
          <button onClick={clearAll} className="text-xs text-muted hover:text-white transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-white/20 p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
      >
        <input ref={fileInputRef} type="file" accept=".htm" multiple onChange={handleSelect} className="hidden" />
        <p className="text-sm text-muted">
          <span className="text-accent font-medium">Browse</span> or drag &amp; drop Honeywell .htm files here
        </p>
        {files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {files.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
              >
                {f.name}
                <button
                  onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((_, j) => j !== i)); }}
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
      <div className="rounded-lg bg-navy-light p-4 space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Options</p>
        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeStaticText}
            onChange={(e) => setOptions((o) => ({ ...o, includeStaticText: e.target.checked }))}
            className="rounded accent-accent"
          />
          Include static text (textboxes)
        </label>
        {options.includeStaticText && (
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer ml-5">
            <input
              type="checkbox"
              checked={options.filterStaticText}
              onChange={(e) => setOptions((o) => ({ ...o, filterStaticText: e.target.checked }))}
              className="rounded accent-accent"
            />
            Filter to tag-like values only
          </label>
        )}
      </div>

      {/* Run button */}
      <button
        onClick={runExtraction}
        disabled={files.length === 0 || isRunning}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? 'Extracting...' : `Extract from ${files.length} file${files.length !== 1 ? 's' : ''}`}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-500/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Graphics', value: result.stats.graphicCount },
              { label: 'Unique Tags', value: result.stats.tagCount },
              { label: 'Shapes', value: result.stats.shapeCount },
              { label: 'Custom Scripts', value: result.stats.customScriptCount },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-navy-light p-3 text-center">
                <div className="text-2xl font-bold text-accent">{value}</div>
                <div className="text-xs text-muted mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Download */}
          <div className="flex justify-end">
            <button
              onClick={downloadExcel}
              className="rounded-md bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            >
              Download Excel
            </button>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === t.key
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="overflow-x-auto rounded-lg border border-white/10">
            {activeTab === 'tags' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-muted uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Graphic</th>
                    <th className="px-4 py-2">Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {result.graphics.flatMap((g) =>
                    g.tags.length === 0
                      ? [
                          <tr key={g.graphicName} className="border-t border-white/5">
                            <td className="px-4 py-2 text-white/80">{g.graphicName}</td>
                            <td className="px-4 py-2 text-muted italic">none</td>
                          </tr>,
                        ]
                      : g.tags.map((tag) => (
                          <tr key={`${g.graphicName}:${tag}`} className="border-t border-white/5">
                            <td className="px-4 py-2 text-white/80">{g.graphicName}</td>
                            <td className="px-4 py-2 text-white/60 font-mono">{tag}</td>
                          </tr>
                        ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'shapes' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-muted uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Graphic</th>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Shapes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.graphics.map((g) => {
                    const counts: Record<string, number> = {};
                    for (const s of g.shapes) {
                      if (s.shapeFileName) counts[s.shapeFileName] = (counts[s.shapeFileName] ?? 0) + 1;
                    }
                    return (
                      <tr key={g.graphicName} className="border-t border-white/5">
                        <td className="px-4 py-2 text-white/80">{g.graphicName}</td>
                        <td className="px-4 py-2 text-white/60">{g.title || <span className="italic text-muted">none</span>}</td>
                        <td className="px-4 py-2 text-white/60 font-mono">
                          {Object.entries(counts)
                            .map(([f, c]) => `${c}x ${f}`)
                            .join(', ') || <span className="italic text-muted">none</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'scripts' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-muted uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Graphic</th>
                    <th className="px-4 py-2">Shape</th>
                    <th className="px-4 py-2">Code (truncated)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scripts.map((s, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-4 py-2 text-white/80">{s.graphicName}</td>
                      <td className="px-4 py-2 text-white/60">{s.shapeName}</td>
                      <td className="px-4 py-2 text-white/40 font-mono truncate max-w-xs">
                        {s.scriptCode.replace(/[\t\n\r]+/g, ' ').slice(0, 120)}
                      </td>
                    </tr>
                  ))}
                  {result.scripts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted italic">No scripts found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'custom' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-muted uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Graphic</th>
                    <th className="px-4 py-2">Shape</th>
                    <th className="px-4 py-2">Code (truncated)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.customScripts.map((s, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-4 py-2 text-white/80">{s.graphicName}</td>
                      <td className="px-4 py-2 text-white/60">{s.shapeName}</td>
                      <td className="px-4 py-2 text-white/40 font-mono truncate max-w-xs">
                        {s.scriptCode.replace(/[\t\n\r]+/g, ' ').slice(0, 120)}
                      </td>
                    </tr>
                  ))}
                  {result.customScripts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted italic">No custom scripts found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
