'use client';

import { useRef, useEffect } from 'react';

interface HMILogViewProps {
  entries: string[];
  className?: string;
}

export default function HMILogView({ entries, className = '' }: HMILogViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries (port of C# LogView.xaml.cs auto-scroll)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      ref={containerRef}
      className={`max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs ${className}`}
    >
      {entries.length === 0 ? (
        <span className="text-muted">Waiting for conversion...</span>
      ) : (
        entries.map((entry, i) => (
          <div key={i} className="text-white/70 leading-5">
            <span className="text-muted mr-2 select-none">[{String(i + 1).padStart(3, '0')}]</span>
            {entry}
          </div>
        ))
      )}
    </div>
  );
}
