'use client';

import type { ConversionProgress as ProgressType } from '@/lib/hmi/types';

interface ConversionProgressProps {
  items: ProgressType[];
  className?: string;
}

export default function ConversionProgress({ items, className = '' }: ConversionProgressProps) {
  const completed = items.filter((i) => i.status === 'complete').length;
  const errors = items.filter((i) => i.status === 'error').length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted whitespace-nowrap">
          {completed}/{total} {errors > 0 && <span className="text-red-400">({errors} errors)</span>}
        </span>
      </div>

      {/* File list */}
      <div className="max-h-48 overflow-auto space-y-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1 rounded text-xs"
          >
            <span className="flex-shrink-0">
              {item.status === 'pending' && <span className="text-muted">&#x25CB;</span>}
              {item.status === 'processing' && (
                <span className="text-accent animate-pulse">&#x25CF;</span>
              )}
              {item.status === 'complete' && <span className="text-green-400">&#x2713;</span>}
              {item.status === 'error' && <span className="text-red-400">&#x2717;</span>}
            </span>
            <span className="font-mono text-white/70 truncate">{item.fileName}</span>
            {item.message && (
              <span className="text-muted ml-auto truncate max-w-[200px]">{item.message}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
