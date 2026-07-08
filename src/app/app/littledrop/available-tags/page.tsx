import type { Metadata } from 'next';
import AvailableTagsTool from '@/components/littledrop/AvailableTagsTool';

export const metadata: Metadata = {
  title: 'Available Tags | LittleDrop Suite | Stratus Software',
  description: 'Inventory available tag ranges across uploaded files and produce a consolidated gap list.',
};

export default function AvailableTagsPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <AvailableTagsTool />
      </div>
    </main>
  );
}
