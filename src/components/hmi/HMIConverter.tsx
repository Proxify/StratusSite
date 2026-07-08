'use client';

import { useState, useCallback, useRef } from 'react';
import {
  ConversionType,
  DEFAULT_IMAGE_SCALE,
  type HMISettings,
  type ConversionResult,
  type ConversionProgress as ProgressType,
  type HMIGraphic,
  type PointTag,
  type NavigationLink,
} from '@/lib/hmi/types';
import { exportTagsCsv, csvToBlob } from '@/lib/hmi/exporters/csv-exporter';
import {
  createRaddicalConvert,
  createRaddicalDisplay,
  exportRaddical,
} from '@/lib/hmi/exporters/raddical-exporter';
import HMISettingsPanel from './HMISettingsPanel';
import HMITagTable from './HMITagTable';
import HMINavTable from './HMINavTable';
import HMILogView from './HMILogView';
import ConversionProgress from './ConversionProgress';

const defaultSettings: HMISettings = {
  conversionType: ConversionType.RENDER,
  piServerName: '',
  raddicalNetworkPath: '',
  multiThreaded: true,
  imageScale: DEFAULT_IMAGE_SCALE,
  tagConversionMap: new Map(),
};

export default function HMIConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<HMISettings>(defaultSettings);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [progress, setProgress] = useState<ProgressType[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  }, []);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.htm')
    );
    if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith('.htm')
    );
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setFiles([]);
    setResults([]);
    setProgress([]);
    setLog([]);
    setActiveResultIdx(0);
  }

  async function convertFiles() {
    if (files.length === 0) return;
    setIsConverting(true);
    setResults([]);
    setLog([]);
    const progressItems: ProgressType[] = files.map((f) => ({
      fileName: f.name,
      status: 'processing',
    }));
    setProgress([...progressItems]);
    addLog(`Uploading ${files.length} file(s) for server-side conversion — ${settings.conversionType} mode`);

    interface ServerResult {
      fileName: string;
      graphic?: HMIGraphic;
      pointTags?: PointTag[];
      navigationLinks?: NavigationLink[];
      imageBase64?: string;
      error?: string;
    }

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append(
        'settings',
        JSON.stringify({
          conversionType: settings.conversionType,
          piServerName: settings.piServerName,
          imageScale: settings.imageScale,
          tagConversionEntries: Array.from(settings.tagConversionMap.entries()),
        })
      );

      const res = await fetch('/api/process/hmi', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Server error (${res.status})`);
      }
      const { results: serverResults }: { results: ServerResult[] } = await res.json();

      const newResults: ConversionResult[] = [];
      serverResults.forEach((r, i) => {
        if (r.error || !r.graphic || !r.pointTags || !r.navigationLinks) {
          const msg = r.error ?? 'No result returned';
          addLog(`  ERROR in ${r.fileName}: ${msg}`);
          progressItems[i] = { ...progressItems[i], status: 'error', message: msg };
          return;
        }

        let imageBlob: Blob | undefined;
        let imageDataUrl: string | undefined;
        if (r.imageBase64) {
          const bytes = Uint8Array.from(atob(r.imageBase64), (c) => c.charCodeAt(0));
          imageBlob = new Blob([bytes], { type: 'image/jpeg' });
          imageDataUrl = URL.createObjectURL(imageBlob);
        }

        addLog(
          `  ${r.fileName}: ${r.graphic.objects.length} objects, ${r.pointTags.length} tags, ${r.navigationLinks.length} nav links`
        );
        newResults.push({
          fileName: r.fileName,
          graphic: r.graphic,
          pointTags: r.pointTags,
          navigationLinks: r.navigationLinks,
          imageBlob,
          imageDataUrl,
        });
        progressItems[i] = { ...progressItems[i], status: 'complete', message: `${r.pointTags.length} tags` };
      });

      setProgress([...progressItems]);
      setResults(newResults);
      setActiveResultIdx(0);
      addLog(`Conversion complete. ${newResults.length}/${files.length} successful.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      addLog(`ERROR: ${msg}`);
      setProgress(files.map((f) => ({ fileName: f.name, status: 'error', message: msg })));
    }

    setIsConverting(false);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadCsv() {
    if (results.length === 0) return;
    const allTags = results.flatMap((r) => r.pointTags);
    const csv = exportTagsCsv(allTags);
    downloadBlob(csvToBlob(csv), 'hmi-tags.csv');
  }

  function handleDownloadRaddical() {
    if (results.length === 0) return;
    const convert = createRaddicalConvert(settings.piServerName, settings.raddicalNetworkPath);
    for (const r of results) {
      convert.displays.push(
        createRaddicalDisplay(
          r.fileName,
          `${r.fileName}.jpg`,
          r.graphic.width,
          r.graphic.height,
          r.pointTags,
          r.navigationLinks
        )
      );
    }
    const { infoBlob, jsonBlob } = exportRaddical(convert, '/output/');
    downloadBlob(infoBlob, 'Raddical.info');
    downloadBlob(jsonBlob, 'Raddical.json');
  }

  async function handleDownloadPdf() {
    if (results.length === 0) return;
    try {
      const { exportToPdf } = await import('@/lib/hmi/exporters/pdf-exporter');
      const blob = await exportToPdf(results, 'HMI Graphics Report');
      downloadBlob(blob, 'hmi-report.pdf');
    } catch (err) {
      addLog(`PDF export error: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  async function handleDownloadExcel() {
    if (results.length === 0) return;
    try {
      const { exportToExcel } = await import('@/lib/hmi/exporters/excel-exporter');
      const blob = await exportToExcel(results, 'HMI Graphics Report');
      downloadBlob(blob, 'hmi-report.xlsx');
    } catch (err) {
      addLog(`Excel export error: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  function handleDownloadImage(result: ConversionResult) {
    if (result.imageBlob) {
      downloadBlob(result.imageBlob, `${result.fileName}.jpg`);
    }
  }

  const activeResult = results[activeResultIdx];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">HMI Insight</h1>
          <p className="text-sm text-muted mt-1">
            Convert Honeywell Experion HMI graphics to rendered images, Raddical visualizations, and more.
          </p>
        </div>
        {files.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-muted hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* File Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className="rounded-lg border-2 border-dashed border-white/20 p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".htm"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-muted text-sm">
          <span className="text-accent font-medium">Browse</span> or drag & drop .htm files here
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
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <HMISettingsPanel settings={settings} onSettingsChange={setSettings} />

      {/* Execute Button */}
      <button
        onClick={convertFiles}
        disabled={files.length === 0 || isConverting}
        aria-label="Convert"
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isConverting ? 'Converting...' : `Convert ${files.length} file${files.length !== 1 ? 's' : ''}`}
      </button>

      {/* Progress */}
      {progress.length > 0 && <ConversionProgress items={progress} />}

      {/* Log */}
      {log.length > 0 && <HMILogView entries={log} />}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Results</h2>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadCsv}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={handleDownloadRaddical}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                Export Raddical
              </button>
              <button
                onClick={handleDownloadPdf}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                Export PDF
              </button>
              <button
                onClick={handleDownloadExcel}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                Export Excel
              </button>
            </div>
          </div>

          {/* Result tabs */}
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

          {/* Active result detail */}
          {activeResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>
                  {activeResult.graphic.width}&times;{activeResult.graphic.height} &mdash;{' '}
                  {activeResult.pointTags.length} tags, {activeResult.navigationLinks.length} nav links
                </span>
                {activeResult.imageBlob && (
                  <button
                    onClick={() => handleDownloadImage(activeResult)}
                    className="text-accent hover:text-accent-hover text-xs"
                  >
                    Download JPEG
                  </button>
                )}
              </div>

              {/* Rendered preview */}
              {activeResult.imageDataUrl && (
                <div className="overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
                  <img
                    src={activeResult.imageDataUrl}
                    alt={`Rendered ${activeResult.fileName}`}
                    className="max-w-full"
                  />
                </div>
              )}

              {/* Tag table */}
              {activeResult.pointTags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    Point Tags ({activeResult.pointTags.length})
                  </h3>
                  <HMITagTable tags={activeResult.pointTags} />
                </div>
              )}

              {/* Nav links table */}
              {activeResult.navigationLinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    Navigation Links ({activeResult.navigationLinks.length})
                  </h3>
                  <HMINavTable links={activeResult.navigationLinks} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
