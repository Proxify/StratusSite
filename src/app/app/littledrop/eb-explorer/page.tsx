import type { Metadata } from 'next';
import EbExplorerTool from '@/components/littledrop/EbExplorerTool';

export const metadata: Metadata = {
  title: 'EB Explorer | Stratus Software',
  description:
    'Parse and browse Honeywell Experion Engineering Binder (EB) export files by point type.',
};

export default function EbExplorerPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <EbExplorerTool />
      </div>
    </main>
  );
}
