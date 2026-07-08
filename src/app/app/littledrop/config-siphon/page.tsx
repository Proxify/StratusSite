import type { Metadata } from 'next';
import ConfigSiphonTool from '@/components/littledrop/ConfigSiphonTool';

export const metadata: Metadata = {
  title: 'Config Siphon | LittleDrop Suite | Stratus Software',
  description:
    'Extract configuration metadata from DeltaV FHX export files into structured xlsx or JSON exports.',
};

export default function ConfigSiphonPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <ConfigSiphonTool />
      </div>
    </main>
  );
}
