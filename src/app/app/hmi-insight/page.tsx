import type { Metadata } from 'next';
import HMIConverter from '@/components/hmi/HMIConverter';

export const metadata: Metadata = {
  title: 'HMI Insight | Stratus Software',
  description: 'Convert Honeywell Experion HMI graphics to rendered images, Raddical visualizations, and data exports.',
};

export default function HMIInsightPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <HMIConverter />
      </div>
    </main>
  );
}
