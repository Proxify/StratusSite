'use client';

import { useState, useRef } from 'react';
import { ConversionType } from '@/lib/hmi/types';

interface DeltaVSettings {
  conversionType: ConversionType;
  gemLibraryPath: string;
  imageScale: number;
  theme: string;
}

interface DeltaVFileSet {
  displayFile: File;
  gemFiles: File[];
}

const defaultSettings: DeltaVSettings = {
  conversionType: ConversionType.RENDER,
  gemLibraryPath: '',
  imageScale: 1.0,
  theme: 'DEFAULT',
};

const THEMES = ['DEFAULT', 'DG', 'DB', 'TAN', 'LB', 'MOT'];

interface DVResult {
  fileName: string;
  width?: number;
  height?: number;
  svg?: string;
  imageBase64?: string;
  tagLinks?: { tagname: string; objectName: string; gemName?: string }[];
  error?: string;
}

export default function DeltaVConverter() {
  const [fileSets, setFileSets] = useState<DeltaVFileSet[]>([]);
  const [gemFiles, setGemFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<DeltaVSettings>(defaultSettings);
  const [isConverting, setIsConverting] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [results, setResults] = useState<DVResult[]>([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);

  const displayInputRef = useRef<HTMLInputElement>(null);
  const gemInputRef = useRef<HTMLInputElement>(null);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  }

  function handleDisplayDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.di.ahc')
    );
    if (dropped.length > 0) {
      const newSets = dropped.map((f) => ({ displayFile: f, gemFiles: [] }));
      setFileSets((prev) => [...prev, ...newSets]);
    }
  }

  function handleDisplaySelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith('.di.ahc')
    );
    if (selected.length > 0) {
      const newSets = selected.map((f) => ({ displayFile: f, gemFiles: [] }));
      setFileSets((prev) => [...prev, ...newSets]);
    }
    e.target.value = '';
  }

  function handleGemDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.gc.ahc')
    );
    if (dropped.length > 0) setGemFiles((prev) => [...prev, ...dropped]);
  }

  function handleGemSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith('.gc.ahc')
    );
    if (selected.length > 0) setGemFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  }

  function removeDisplayFile(idx: number) {
    setFileSets((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeGemFile(idx: number) {
    setGemFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setFileSets([]);
    setGemFiles([]);
    setLog([]);
    setResults([]);
    setActiveResultIdx(0);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function convertFiles() {
    if (fileSets.length === 0) return;
    setIsConverting(true);
    setLog([]);
    setResults([]);

    addLog(
      `Uploading ${fileSets.length} display file(s) for server-side conversion — ${settings.conversionType} mode, theme: ${settings.theme}`
    );
    if (gemFiles.length > 0) {
      addLog(`Gem library: ${gemFiles.length} .gc.ahc file(s)`);
    }

    try {
      const formData = new FormData();
      fileSets.forEach((set) => formData.append('displays', set.displayFile));
      gemFiles.forEach((f) => formData.append('gems', f));
      formData.append(
        'settings',
        JSON.stringify({
          conversionType: settings.conversionType,
          theme: settings.theme,
          imageScale: settings.imageScale,
        })
      );

      const res = await fetch('/api/process/deltav', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Server error (${res.status})`);
      }
      const data: { results: DVResult[]; gemErrors: string[]; gemCount: number } =
        await res.json();

      if (data.gemCount > 0) addLog(`Resolved ${data.gemCount} gem definition(s)`);
      data.gemErrors.forEach((e) => addLog(`  Gem library warning: ${e}`));

      let ok = 0;
      for (const r of data.results) {
        if (r.error) {
          addLog(`  ERROR in ${r.fileName}: ${r.error}`);
        } else {
          ok++;
          addLog(
            `  ${r.fileName}: ${r.width}x${r.height}, ${r.tagLinks?.length ?? 0} tag link(s)`
          );
        }
      }

      setResults(data.results);
      setActiveResultIdx(0);
      addLog(`Conversion complete. ${ok}/${data.results.length} successful.`);
    } catch (err) {
      addLog(`ERROR: ${err instanceof Error ? err.message : 'Conversion failed'}`);
    }

    setIsConverting(false);
  }

  const totalFiles = fileSets.length;
  const activeResult = results[activeResultIdx];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">DeltaV Render</h1>
          <p className="text-sm text-muted mt-1">
            Convert Emerson DeltaV Live graphics to rendered images, Raddical visualizations, and
            data exports.
          </p>
        </div>
        {(totalFiles > 0 || gemFiles.length > 0) && (
          <button
            onClick={clearAll}
            className="text-xs text-muted hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Display File Upload Zone */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted uppercase tracking-wide">
          Display Files (.di.ahc)
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDisplayDrop}
          className="rounded-lg border-2 border-dashed border-white/20 p-6 text-center hover:border-accent/50 transition-colors cursor-pointer"
          onClick={() => displayInputRef.current?.click()}
        >
          <input
            ref={displayInputRef}
            type="file"
            accept=".di.ahc"
            multiple
            onChange={handleDisplaySelect}
            className="hidden"
          />
          <div className="text-muted text-sm">
            <span className="text-accent font-medium">Browse</span> or drag & drop .di.ahc files
            here
          </div>
          {fileSets.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {fileSets.map((set, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
                >
                  {set.displayFile.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDisplayFile(i);
                    }}
                    className="ml-1 text-muted hover:text-red-400"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gem Library File Upload Zone */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted uppercase tracking-wide">
          Gem Library Files (.gc.ahc) — optional
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleGemDrop}
          className="rounded-lg border-2 border-dashed border-white/10 p-4 text-center hover:border-accent/30 transition-colors cursor-pointer"
          onClick={() => gemInputRef.current?.click()}
        >
          <input
            ref={gemInputRef}
            type="file"
            accept=".gc.ahc"
            multiple
            onChange={handleGemSelect}
            className="hidden"
          />
          <div className="text-muted text-xs">
            <span className="text-white/60 font-medium">Browse</span> or drag & drop .gc.ahc gem
            library files
          </div>
          {gemFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {gemFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60"
                >
                  {f.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGemFile(i);
                    }}
                    className="ml-1 text-muted hover:text-red-400"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-white/10 bg-navy-light">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          <span>Settings</span>
          <span className="text-muted">{settingsOpen ? '▲' : '▼'}</span>
        </button>

        {settingsOpen && (
          <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-4">
            {/* Conversion Type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Conversion Type</label>
              <div className="flex gap-2">
                {[ConversionType.RENDER, ConversionType.RADDICAL, ConversionType.PROCESS_BOOK].map(
                  (ct) => (
                    <button
                      key={ct}
                      onClick={() => setSettings((s) => ({ ...s, conversionType: ct }))}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        settings.conversionType === ct
                          ? 'bg-accent text-white'
                          : 'bg-white/5 text-muted hover:bg-white/10'
                      }`}
                    >
                      {ct}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Color Theme</label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSettings((s) => ({ ...s, theme: t }))}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      settings.theme === t
                        ? 'bg-accent text-white'
                        : 'bg-white/5 text-muted hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Scale */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Image Scale: {settings.imageScale.toFixed(1)}x
              </label>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.5}
                value={settings.imageScale}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, imageScale: parseFloat(e.target.value) }))
                }
                className="w-full accent-accent"
              />
            </div>

            {/* Gem Library Path hint */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Gem Library Path (optional)
              </label>
              <input
                type="text"
                value={settings.gemLibraryPath}
                onChange={(e) => setSettings((s) => ({ ...s, gemLibraryPath: e.target.value }))}
                placeholder="e.g. C:\DeltaV\DVData\Graphics\GemLibrary"
                className="w-full rounded-md border border-white/10 bg-navy px-3 py-2 text-xs text-white placeholder:text-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="mt-1 text-xs text-muted">
                Path hint for gem resolution — upload .gc.ahc files above to load gems directly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Convert Button */}
      <button
        onClick={convertFiles}
        disabled={totalFiles === 0 || isConverting}
        aria-label="Convert"
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isConverting
          ? 'Processing...'
          : `Convert ${totalFiles} display${totalFiles !== 1 ? 's' : ''}`}
      </button>

      {/* Log */}
      {log.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
          <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Log</p>
          <div className="space-y-0.5 font-mono text-xs">
            {log.map((entry, i) =>
              entry === '' ? (
                <div key={i} className="h-2" />
              ) : (
                <div key={i} className="text-white/70">
                  <span className="select-none text-white/30 mr-2">{String(i + 1).padStart(3, ' ')}</span>
                  {entry}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Results</h2>

          {results.length > 1 && (
            <div className="flex gap-1 overflow-x-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setActiveResultIdx(i)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    i === activeResultIdx
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  {r.fileName}
                </button>
              ))}
            </div>
          )}

          {activeResult && !activeResult.error && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>
                  {activeResult.width}&times;{activeResult.height} &mdash;{' '}
                  {activeResult.tagLinks?.length ?? 0} tag link(s)
                </span>
                <div className="flex gap-3">
                  {activeResult.svg && (
                    <button
                      onClick={() =>
                        downloadBlob(
                          new Blob([activeResult.svg!], { type: 'image/svg+xml' }),
                          `${activeResult.fileName}.svg`
                        )
                      }
                      className="text-accent hover:text-accent-hover text-xs"
                    >
                      Download SVG
                    </button>
                  )}
                  {activeResult.imageBase64 && (
                    <button
                      onClick={() => {
                        const bytes = Uint8Array.from(atob(activeResult.imageBase64!), (c) =>
                          c.charCodeAt(0)
                        );
                        downloadBlob(
                          new Blob([bytes], { type: 'image/png' }),
                          `${activeResult.fileName}.png`
                        );
                      }}
                      className="text-accent hover:text-accent-hover text-xs"
                    >
                      Download PNG
                    </button>
                  )}
                </div>
              </div>

              {/* Rendered preview */}
              {activeResult.imageBase64 && (
                <div className="overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${activeResult.imageBase64}`}
                    alt={`Rendered ${activeResult.fileName}`}
                    className="max-w-full"
                  />
                </div>
              )}

              {/* Tag links table */}
              {(activeResult.tagLinks?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    Tag Links ({activeResult.tagLinks!.length})
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Tag</th>
                          <th className="px-3 py-2 font-medium">Object</th>
                          <th className="px-3 py-2 font-medium">Gem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeResult.tagLinks!.map((t, i) => (
                          <tr key={i} className="border-t border-white/5 text-white/80">
                            <td className="px-3 py-1.5 font-mono">{t.tagname}</td>
                            <td className="px-3 py-1.5">{t.objectName}</td>
                            <td className="px-3 py-1.5 text-muted">{t.gemName ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
