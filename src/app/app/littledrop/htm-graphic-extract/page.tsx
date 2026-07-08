import type { Metadata } from 'next';
import HtmGraphicExtractTool from '@/components/littledrop/HtmGraphicExtractTool';

export const metadata: Metadata = {
  title: 'HTM Graphic Extract | Stratus Software',
  description:
    'Parse Honeywell Experion .htm graphic exports and extract tags, shapes, and VBScripts.',
};

export default function HtmGraphicExtractPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <HtmGraphicExtractTool />
      </div>
    </main>
  );
}
