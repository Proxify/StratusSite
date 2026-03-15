import type { Metadata } from 'next';
import DeltaVConverter from '@/components/deltav/DeltaVConverter';

export const metadata: Metadata = {
  title: 'DeltaV Render | Stratus Software',
  description:
    'Convert Emerson DeltaV Live graphics to rendered images, Raddical visualizations, and data exports.',
};

export default function DeltaVRenderPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <DeltaVConverter />
      </div>
    </main>
  );
}
