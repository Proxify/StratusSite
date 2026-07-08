import type { Metadata } from 'next';
import CondCpReplaceTool from '@/components/littledrop/CondCpReplaceTool';

export const metadata: Metadata = {
  title: 'Cond CP Replace | Stratus Software',
  description:
    'Conditionally bulk-replace control point references across Honeywell Experion HMI graphic files.',
};

export default function CondCpReplacePage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <CondCpReplaceTool />
      </div>
    </main>
  );
}
