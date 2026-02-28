'use client';

import { useState } from 'react';
import { ConversionType } from '@/lib/hmi/types';
import type { HMISettings } from '@/lib/hmi/types';
import { parseTagConversionMap } from '@/lib/hmi/utils';

interface HMISettingsPanelProps {
  settings: HMISettings;
  onSettingsChange: (settings: HMISettings) => void;
  className?: string;
}

export default function HMISettingsPanel({
  settings,
  onSettingsChange,
  className = '',
}: HMISettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isRaddical = settings.conversionType === ConversionType.RADDICAL;

  function handleConversionTypeChange(value: string) {
    onSettingsChange({ ...settings, conversionType: value as ConversionType });
  }

  async function handleMapFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const map = parseTagConversionMap(text);
    onSettingsChange({ ...settings, tagConversionMap: map });
  }

  const inputClass =
    'w-full rounded-md border border-white/10 bg-navy px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40';
  const labelClass = 'block text-xs font-medium text-muted uppercase tracking-wider mb-1';

  return (
    <div className={`rounded-lg border border-white/10 bg-navy-light ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white hover:bg-white/5 transition-colors"
      >
        <span>Settings</span>
        <span className="text-muted">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4">
          {/* Conversion Type */}
          <div>
            <label className={labelClass}>Conversion Type</label>
            <div className="flex gap-2">
              {Object.values(ConversionType).map((type) => (
                <button
                  key={type}
                  onClick={() => handleConversionTypeChange(type)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    settings.conversionType === type
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {type === 'PROCESS_BOOK' ? 'Process Book' : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Image Scale */}
          <div>
            <label className={labelClass}>Image Scale ({settings.imageScale}x)</label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={settings.imageScale}
              onChange={(e) =>
                onSettingsChange({ ...settings, imageScale: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>

          {/* PI Server Name (Raddical only) */}
          <div>
            <label className={labelClass}>PI Server Name</label>
            <input
              type="text"
              className={inputClass}
              value={settings.piServerName}
              onChange={(e) =>
                onSettingsChange({ ...settings, piServerName: e.target.value })
              }
              placeholder="\\\\PISERVER"
              disabled={!isRaddical}
            />
          </div>

          {/* Raddical Network Path */}
          <div>
            <label className={labelClass}>Raddical Network Path</label>
            <input
              type="text"
              className={inputClass}
              value={settings.raddicalNetworkPath}
              onChange={(e) =>
                onSettingsChange({ ...settings, raddicalNetworkPath: e.target.value })
              }
              placeholder="\\\\server\\share\\CCU"
              disabled={!isRaddical}
            />
          </div>

          {/* Tag Conversion Map */}
          <div>
            <label className={labelClass}>
              Tag Conversion Map {settings.tagConversionMap.size > 0 && `(${settings.tagConversionMap.size} mappings)`}
            </label>
            <input
              type="file"
              accept=".tsv,.txt,.csv"
              onChange={handleMapFileUpload}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/30"
            />
          </div>

          {/* Multithreading */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="multithread"
              checked={settings.multiThreaded}
              onChange={(e) =>
                onSettingsChange({ ...settings, multiThreaded: e.target.checked })
              }
              className="h-4 w-4 rounded border-white/20 bg-navy text-accent focus:ring-accent"
            />
            <label htmlFor="multithread" className="text-sm text-white/80">
              Parallel processing
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
