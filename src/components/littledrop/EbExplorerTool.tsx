'use client';

import { useState, useCallback, useRef } from 'react';
import type { EbTag } from '@/lib/littledrop/eb-explorer';

interface ParsedResult {
  files: string[];
  tags: EbTag[];
  byPointType: Record<string, EbTag[]>;
  allColumns: string[];
  totalTags: number;
  pointTypes: string[];
}

export default function EbExplorerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [activeType, setActiveType] = useState<string>('__all__');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter((f) => /\.eb$/i.test(f.name));
    if (valid.length > 0) setFiles((prev) => [...prev, ...valid]);
  }, []);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setFiles([]);
    setResult(null);
    setError(null);
    setActiveType('__all__');
  }

  async function parseFiles() {
    if (files.length === 0) return;
    setIsParsing(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);

      const res = await fetch('/api/process/eb-explorer', { method: 'POST', body: fd });
      const data = (await res.json()) as ParsedResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setResult(data);
      setActiveType('__all__');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setIsParsing(false);
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

  function handleDownloadJson() {
    if (!result) return;
    downloadBlob(
      new Blob([JSON.stringify(result.byPointType, null, 2)], { type: 'application/json' }),
      'eb-explorer.json'
    );
  }

  async function handleDownloadExcel() {
    if (!result) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      for (const pt of result.pointTypes) {
        const tags = result.byPointType[pt];
        if (!tags?.length) continue;
        // Collect columns for this point type
        const colSet = new Set<string>();
        for (const t of tags) t.parameterOrder.forEach((p) => colSet.add(p));
        const cols = ['Tagname', '&T', '&N', ...Array.from(colSet)];
        const rows = tags.map((t) => {
          const row: Record<string, string> = {
            Tagname: t.entityName,
            '&T': t.pointType,
            '&N': t.name,
          };
          for (const p of colSet) row[p] = t.parameters[p] ?? '';
          return row;
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: cols }), pt.slice(0, 31));
      }

      // All Types sheet
      const allCols = ['Tagname', '&T', '&N', ...result.allColumns];
      const allRows = result.tags.map((t) => {
        const row: Record<string, string> = { Tagname: t.entityName, '&T': t.pointType, '&N': t.name };
        for (const p of result.allColumns) row[p] = t.parameters[p] ?? '';
        return row;
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows, { header: allCols }), 'All Types');

      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'eb-explorer.xlsx');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel export failed');
    }
  }

  // Determine which tags/columns to show in the table
  const viewTags = result
    ? activeType === '__all__'
      ? result.tags
      : (result.byPointType[activeType] ?? [])
    : [];

  const viewColumns =
    result && activeType !== '__all__'
      ? (() => {
          const colSet = new Set<string>();
          (result.byPointType[activeType] ?? []).forEach((t) =>
            t.parameterOrder.forEach((p) => colSet.add(p))
          );
          return Array.from(colSet);
        })()
      : result?.allColumns ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">EB Explorer</h1>
          <p className="text-sm text-muted mt-1">
            Parse Honeywell Experion Engineering Binder files — browse tags by point type.
          </p>
        </div>
        {(files.length > 0 || result) && (
          <button onClick={clearAll} className="text-xs text-muted hover:text-white transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-white/20 p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".eb,.EB"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-muted text-sm">
          <span className="text-accent font-medium">Browse</span> or drag &amp; drop .EB files here
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
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="ml-1 text-muted hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Parse Button */}
      <button
        onClick={parseFiles}
        disabled={files.length === 0 || isParsing}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isParsing ? 'Parsing…' : `Parse ${files.length > 0 ? `${files.length} ` : ''}EB File${files.length !== 1 ? 's' : ''}`}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span>
              <span className="text-white font-medium">{result.totalTags}</span> tags
            </span>
            <span>
              <span className="text-white font-medium">{result.pointTypes.length}</span> point types
            </span>
            <span className="text-xs">{result.files.join(', ')}</span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleDownloadJson}
                className="rounded px-3 py-1 text-xs bg-white/5 text-muted hover:bg-white/10 hover:text-white transition-colors"
              >
                JSON
              </button>
              <button
                onClick={handleDownloadExcel}
                className="rounded px-3 py-1 text-xs bg-white/5 text-muted hover:bg-white/10 hover:text-white transition-colors"
              >
                Excel
              </button>
            </div>
          </div>

          {/* Point type tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveType('__all__')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeType === '__all__'
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              All Types ({result.totalTags})
            </button>
            {result.pointTypes.map((pt) => (
              <button
                key={pt}
                onClick={() => setActiveType(pt)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  activeType === pt
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                {pt} ({result.byPointType[pt]?.length ?? 0})
              </button>
            ))}
          </div>

          {/* Tag table */}
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 py-2 text-muted font-medium whitespace-nowrap">Tagname</th>
                  <th className="px-3 py-2 text-muted font-medium whitespace-nowrap">&amp;T</th>
                  <th className="px-3 py-2 text-muted font-medium whitespace-nowrap">&amp;N</th>
                  {viewColumns.map((col) => (
                    <th key={col} className="px-3 py-2 text-muted font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewTags.map((tag, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-3 py-2 text-white font-mono whitespace-nowrap">
                      {tag.entityName}
                    </td>
                    <td className="px-3 py-2 text-accent whitespace-nowrap">{tag.pointType}</td>
                    <td className="px-3 py-2 text-white/80 whitespace-nowrap">{tag.name}</td>
                    {viewColumns.map((col) => (
                      <td key={col} className="px-3 py-2 text-white/70 whitespace-nowrap">
                        {tag.parameters[col] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {viewTags.length === 0 && (
              <div className="p-8 text-center text-muted text-sm">No tags in this view.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
