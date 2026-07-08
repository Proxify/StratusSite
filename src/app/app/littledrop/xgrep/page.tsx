import type { Metadata } from 'next';
import XGrepTool from '@/components/littledrop/XGrepTool';

export const metadata: Metadata = {
  title: 'xGrep | LittleDrop Suite | Stratus Software',
  description: 'Recursive content search across uploaded HMI files with structured results.',
};

export default function XGrepPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <XGrepTool />
      </div>
    </main>
  );
}
