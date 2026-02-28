'use client';

import type { NavigationLink } from '@/lib/hmi/types';

interface HMINavTableProps {
  links: NavigationLink[];
  className?: string;
}

export default function HMINavTable({ links, className = '' }: HMINavTableProps) {
  const headerClass = 'px-3 py-2 text-left text-xs font-medium text-muted uppercase tracking-wider';
  const cellClass = 'px-3 py-2 text-sm text-white/80 whitespace-nowrap';

  return (
    <div className={`overflow-auto rounded-lg border border-white/10 ${className}`}>
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-navy-light">
          <tr>
            <th className={headerClass}>Destination</th>
            <th className={headerClass}>X</th>
            <th className={headerClass}>Y</th>
            <th className={headerClass}>Width</th>
            <th className={headerClass}>Height</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-navy">
          {links.map((link, i) => (
            <tr key={`${link.destination}-${i}`} className="hover:bg-white/5 transition-colors">
              <td className={`${cellClass} font-mono font-medium text-accent`}>{link.destination || '(empty)'}</td>
              <td className={`${cellClass} font-mono`}>{link.x}</td>
              <td className={`${cellClass} font-mono`}>{link.y}</td>
              <td className={`${cellClass} font-mono`}>{link.width}</td>
              <td className={`${cellClass} font-mono`}>{link.height}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {links.length === 0 && (
        <div className="py-8 text-center text-sm text-muted">No navigation links extracted</div>
      )}
    </div>
  );
}
