import type { Metadata } from 'next';
import Link from 'next/link';
import AssociatedDisplayTool from '@/components/littledrop/AssociatedDisplayTool';

export const metadata: Metadata = {
  title: 'Associated Display | LittleDrop Suite',
  description: 'Map HMI displays to associated control modules and produce CMD.EC / CLEANUP.EC scripts.',
};

export default function AssociatedDisplayPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <Link
            href="/app/littledrop"
            className="text-xs text-muted hover:text-accent transition-colors"
          >
            ← LittleDrop Suite
          </Link>
        </div>
        <AssociatedDisplayTool />
      </div>
    </main>
  );
}
