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

export default function DeltaVConverter() {
  const [fileSets, setFileSets] = useState<DeltaVFileSet[]>([]);
  const [gemFiles, setGemFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<DeltaVSettings>(defaultSettings);
  const [isConverting, setIsConverting] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  }

  async function convertFiles() {
    if (fileSets.length === 0) return;
    setIsConverting(true);
    setLog([]);

    addLog(
      `Starting conversion of ${fileSets.length} display file(s) — ${settings.conversionType} mode, theme: ${settings.theme}`
    );
    if (gemFiles.length > 0) {
      addLog(`Gem library: ${gemFiles.length} .gc.ahc file(s) loaded`);
    }

    // Processing infrastructure is under active development (STR-5).
    // This stub logs intent and readies the file pipeline.
    await new Promise((r) => setTimeout(r, 600));

    for (const set of fileSets) {
      addLog(`Queued: ${set.displayFile.name} (${(set.displayFile.size / 1024).toFixed(1)} KB)`);
    }

    addLog('');
    addLog('⚠  DeltaV Render processing engine is under active development.');
    addLog('   The TypeScript port of SCILiveConverter is tracked in STR-5.');
    addLog('   File upload and settings are ready — processing will be wired up shortly.');

    setIsConverting(false);
  }

  const totalFiles = fileSets.length;

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
    </div>
  );
}
