'use client';

import { useState } from 'react';
import type { PointTag } from '@/lib/hmi/types';

interface HMITagTableProps {
  tags: PointTag[];
  className?: string;
}

type SortField = 'tagname' | 'x' | 'y' | 'width' | 'height';

export default function HMITagTable({ tags, className = '' }: HMITagTableProps) {
  const [sortField, setSortField] = useState<SortField>('tagname');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...tags].sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sortAsc ? cmp : -cmp;
  });

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const headerClass = 'px-3 py-2 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer hover:text-accent select-none';
  const cellClass = 'px-3 py-2 text-sm text-white/80 whitespace-nowrap';

  return (
    <div className={`overflow-auto rounded-lg border border-white/10 ${className}`}>
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-navy-light">
          <tr>
            <th className={headerClass} onClick={() => handleSort('tagname')}>
              Tag Name {sortField === 'tagname' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th className={headerClass}>Color</th>
            <th className={headerClass} onClick={() => handleSort('x')}>
              X {sortField === 'x' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th className={headerClass} onClick={() => handleSort('y')}>
              Y {sortField === 'y' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th className={headerClass} onClick={() => handleSort('width')}>
              Width {sortField === 'width' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th className={headerClass} onClick={() => handleSort('height')}>
              Height {sortField === 'height' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-navy">
          {sorted.map((tag, i) => (
            <tr key={`${tag.tagname}-${i}`} className="hover:bg-white/5 transition-colors">
              <td className={`${cellClass} font-mono font-medium text-accent`}>{tag.tagname}</td>
              <td className={cellClass}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-white/20"
                    style={{ backgroundColor: tag.fontHexColor }}
                  />
                  <span className="font-mono text-xs">{tag.fontHexColor}</span>
                </span>
              </td>
              <td className={`${cellClass} font-mono`}>{tag.x}</td>
              <td className={`${cellClass} font-mono`}>{tag.y}</td>
              <td className={`${cellClass} font-mono`}>{tag.width}</td>
              <td className={`${cellClass} font-mono`}>{tag.height}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tags.length === 0 && (
        <div className="py-8 text-center text-sm text-muted">No tags extracted</div>
      )}
    </div>
  );
}
