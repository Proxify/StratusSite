import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'LittleDrop Suite | Stratus Software',
  description:
    'Web port of the LittleDrop Suite utilities for HMI graphic extraction, tag analysis, and configuration tooling.',
};

const modules = [
  {
    slug: 'associated-display',
    name: 'Associated Display',
    description:
      'Map HMI displays to their associated control modules and produce navigation reports.',
  },
  {
    slug: 'available-tags',
    name: 'Available Tags',
    description:
      'Inventory available tags across exported displays and produce a consolidated tag list.',
  },
  {
    slug: 'cond-cp-replace',
    name: 'Cond CP Replace',
    description:
      'Bulk-replace conditional control point references across HMI graphic files.',
  },
  {
    slug: 'config-siphon',
    name: 'Config Siphon',
    description:
      'Extract configuration metadata from HMI source files into structured exports.',
  },
  {
    slug: 'eb-explorer',
    name: 'EB Explorer',
    description:
      'Browse and analyze Experion engineering binder (EB) artifacts.',
  },
  {
    slug: 'htm-graphic-extract',
    name: 'HTM Graphic Extract',
    description:
      'Parse Honeywell .htm export files and extract embedded graphic primitives.',
  },
  {
    slug: 'xgrep',
    name: 'xGrep',
    description:
      'Recursive content search across exported HMI directories with structured results.',
  },
];

export default function LittleDropSectionPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <Link
            href="/app"
            className="text-xs text-muted hover:text-accent transition-colors"
          >
            ← Tools
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white">LittleDrop Suite</h1>
          <p className="mt-2 text-muted">
            Utilities ported from the desktop LittleDrop Suite — graphic extraction,
            tag inventories, and HMI configuration tooling.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <Link
              key={m.slug}
              href={`/app/littledrop/${m.slug}`}
              className="group rounded-xl border border-white/10 bg-navy-light p-5 hover:border-accent/40 transition-colors"
            >
              <h2 className="text-base font-semibold text-white group-hover:text-accent transition-colors">
                {m.name}
              </h2>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                {m.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
