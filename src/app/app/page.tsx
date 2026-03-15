import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tools | Stratus Software',
  description: 'Web-based processing tools for industrial DCS graphics.',
};

const tools = [
  {
    href: '/app/hmi-insight',
    name: 'HMI Insight',
    tagline: 'Honeywell Experion HMI graphics',
    description:
      'Convert .htm files exported from Honeywell Experion into rendered images, Raddical visualizations, tag inventories, and PDF/Excel reports.',
    accepts: '.htm',
    status: 'available' as const,
    modes: ['RENDER', 'RADDICAL', 'PROCESS_BOOK'],
  },
  {
    href: '/app/deltav-render',
    name: 'DeltaV Render',
    tagline: 'Emerson DeltaV Live graphics',
    description:
      'Convert .di.ahc display files from Emerson DeltaV Live into rendered images, Raddical visualizations, and tag exports.',
    accepts: '.di.ahc + .gc.ahc',
    status: 'in-development' as const,
    modes: ['RENDER', 'RADDICAL', 'PROCESS_BOOK'],
  },
];

export default function AppsPortalPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Tools</h1>
          <p className="mt-2 text-muted">
            Web-based processing tools for industrial DCS graphics.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative rounded-xl border border-white/10 bg-navy-light p-6 hover:border-accent/40 transition-colors"
            >
              {tool.status === 'in-development' && (
                <span className="absolute right-4 top-4 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                  In development
                </span>
              )}

              <h2 className="text-lg font-semibold text-white group-hover:text-accent transition-colors">
                {tool.name}
              </h2>
              <p className="mt-0.5 text-xs text-muted">{tool.tagline}</p>

              <p className="mt-3 text-sm text-white/70 leading-relaxed">{tool.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-white/50">
                  {tool.accepts}
                </span>
                {tool.modes.map((m) => (
                  <span
                    key={m}
                    className="rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent/80"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
