'use client';

import { useState, useRef } from 'react';
import type { ConditionType, AndOrType, ReplaceConfig, FileReplaceResult } from '@/lib/littledrop/cond-cp-replace';

const CONDITIONS: ConditionType[] = [
  'Contains',
  'Does Not Contain',
  'Equals',
  'Does Not Equal',
  'Exists',
];

interface CondRowProps {
  label: string;
  cpName: string;
  condition: ConditionType;
  cpParam: string;
  onChange: (updates: Partial<{ cpName: string; condition: ConditionType; cpParam: string }>) => void;
}

function CondRow({ label, cpName, condition, cpParam, onChange }: CondRowProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-muted mb-1">CP Name</label>
          <input
            type="text"
            value={cpName}
            onChange={(e) => onChange({ cpName: e.target.value })}
            placeholder="e.g. LOOP_NAME"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Condition</label>
          <select
            value={condition}
            onChange={(e) => onChange({ condition: e.target.value as ConditionType })}
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c} className="bg-navy">
                {c}
              </option>
            ))}
          </select>
        </div>
        {condition !== 'Exists' && (
          <div>
            <label className="block text-xs text-muted mb-1">CP Param</label>
            <input
              type="text"
              value={cpParam}
              onChange={(e) => onChange({ cpParam: e.target.value })}
              placeholder="e.g. REACTOR"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface State {
  cond1: { cpName: string; condition: ConditionType; cpParam: string };
  andOr: AndOrType | '';
  cond2: { cpName: string; condition: ConditionType; cpParam: string };
  changeCPName: string;
  changeCPParam: string;
}

const defaultState: State = {
  cond1: { cpName: '', condition: 'Contains', cpParam: '' },
  andOr: '',
  cond2: { cpName: '', condition: 'Contains', cpParam: '' },
  changeCPName: '',
  changeCPParam: '',
};

export default function CondCpReplaceTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<State>(defaultState);
  const [results, setResults] = useState<FileReplaceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.htm')
    );
    if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter((f) =>
      f.name.toLowerCase().endsWith('.htm')
    );
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setFiles([]);
    setResults(null);
    setError(null);
    setState(defaultState);
  }

  function buildConfig(): ReplaceConfig {
    const config: ReplaceConfig = {
      cond1: {
        cpName: state.cond1.cpName,
        condition: state.cond1.condition,
        cpParam: state.cond1.cpParam,
      },
      changeCPName: state.changeCPName,
      changeCPParam: state.changeCPParam,
    };
    if (state.andOr && state.cond2.cpName) {
      config.andOr = state.andOr as AndOrType;
      config.cond2 = {
        cpName: state.cond2.cpName,
        condition: state.cond2.condition,
        cpParam: state.cond2.cpParam,
      };
    }
    return config;
  }

  const canRun =
    files.length > 0 &&
    state.cond1.cpName.trim() &&
    state.changeCPName.trim() &&
    state.changeCPParam.trim() &&
    (state.cond1.condition === 'Exists' || state.cond1.cpParam.trim());

  async function run() {
    if (!canRun) return;
    setIsRunning(true);
    setResults(null);
    setError(null);

    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    fd.append('config', JSON.stringify(buildConfig()));

    try {
      const res = await fetch('/api/process/cond-cp-replace', { method: 'POST', body: fd });
      const json = (await res.json()) as { results?: FileReplaceResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResults(json.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsRunning(false);
    }
  }

  function downloadFile(r: FileReplaceResult) {
    const blob = new Blob([r.modifiedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAll() {
    if (!results) return;
    for (const r of results.filter((r) => r.changed)) downloadFile(r);
  }

  const changedCount = results?.filter((r) => r.changed).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cond CP Replace</h1>
          <p className="text-sm text-muted mt-1">
            Conditionally bulk-replace control point references across HMI graphic files.
          </p>
        </div>
        {(files.length > 0 || results) && (
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".htm"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-muted text-sm">
          <span className="text-accent font-medium">Browse</span> or drag &amp; drop .htm files here
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

      {/* Rules */}
      <div className="rounded-lg bg-navy-light border border-white/10 p-4 space-y-5">
        <h2 className="text-sm font-semibold text-white">Replacement Rules</h2>

        <CondRow
          label="Condition 1"
          cpName={state.cond1.cpName}
          condition={state.cond1.condition}
          cpParam={state.cond1.cpParam}
          onChange={(u) => setState((s) => ({ ...s, cond1: { ...s.cond1, ...u } }))}
        />

        {/* And / Or connector */}
        <div>
          <label className="block text-xs text-muted mb-1">And / Or (optional second condition)</label>
          <select
            value={state.andOr}
            onChange={(e) => setState((s) => ({ ...s, andOr: e.target.value as AndOrType | '' }))}
            className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="" className="bg-navy">— none —</option>
            <option value="And" className="bg-navy">And</option>
            <option value="Or" className="bg-navy">Or</option>
          </select>
        </div>

        {state.andOr && (
          <CondRow
            label="Condition 2"
            cpName={state.cond2.cpName}
            condition={state.cond2.condition}
            cpParam={state.cond2.cpParam}
            onChange={(u) => setState((s) => ({ ...s, cond2: { ...s.cond2, ...u } }))}
          />
        )}

        <div className="border-t border-white/10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">Change CP Name</label>
            <input
              type="text"
              value={state.changeCPName}
              onChange={(e) => setState((s) => ({ ...s, changeCPName: e.target.value }))}
              placeholder="e.g. SOURCE_TAG"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">New CP Value</label>
            <input
              type="text"
              value={state.changeCPParam}
              onChange={(e) => setState((s) => ({ ...s, changeCPParam: e.target.value }))}
              placeholder="e.g. NEW_TAG_VALUE"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Run */}
      <button
        onClick={run}
        disabled={!canRun || isRunning}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning
          ? 'Processing…'
          : `Process ${files.length} file${files.length !== 1 ? 's' : ''}`}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Results{' '}
              <span className="text-sm font-normal text-muted">
                — {changedCount} of {results.length} file{results.length !== 1 ? 's' : ''} modified
              </span>
            </h2>
            {changedCount > 0 && (
              <button
                onClick={downloadAll}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                Download all modified
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-muted">No files processed.</p>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.fileName}
                  className="rounded-lg border border-white/10 bg-navy-light px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{r.fileName}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {r.changed
                        ? `${r.replacements} block${r.replacements !== 1 ? 's' : ''} replaced`
                        : 'No changes'}
                    </p>
                  </div>
                  {r.changed && (
                    <button
                      onClick={() => downloadFile(r)}
                      className="shrink-0 rounded-md bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/30 transition-colors"
                    >
                      Download
                    </button>
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
