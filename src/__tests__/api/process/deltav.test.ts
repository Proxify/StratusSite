// @vitest-environment node
// See hmi.test.ts — node realm for undici formData + the production DOMParser shim.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

import { auth } from '@/auth';
import { POST } from '@/app/api/process/deltav/route';
import type { NextRequest } from 'next/server';

const mockAuth = vi.mocked(auth);

function makeRequest(formData: FormData): NextRequest {
  return new Request('http://localhost/api/process/deltav', {
    method: 'POST',
    body: formData,
  }) as unknown as NextRequest;
}

const minimalDisplay = `<?xml version="1.0" encoding="UTF-8"?>
<LiveGraphic Name="Test" Width="720000" Height="576000" BackColor="#FFD0D0D0" Theme="DEFAULT">
  <Objects>
    <Rectangle Name="rect1" Left="72000" Top="72000" Width="144000" Height="72000" FillColor="#FFFF0000" />
  </Objects>
</LiveGraphic>`;

describe('POST /api/process/deltav', () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(403);
  });

  it('rejects requests with no display files', async () => {
    mockAuth.mockResolvedValue({ user: { subscriptionActive: true } } as never);
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(400);
  });

  it('parses and renders an uploaded .di.ahc display', async () => {
    mockAuth.mockResolvedValue({ user: { subscriptionActive: true } } as never);
    const formData = new FormData();
    formData.append('displays', new File([minimalDisplay], 'Test.di.ahc'));
    formData.append('settings', JSON.stringify({ theme: 'DEFAULT', imageScale: 1 }));

    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);

    const result = body.results[0];
    expect(result.error).toBeUndefined();
    expect(result.fileName).toBe('Test');
    expect(result.svg).toContain('<svg');
    expect(result.width).toBeGreaterThan(0);
    // Server-side SVG → PNG rasterization
    expect(typeof result.imageBase64).toBe('string');
    expect(Buffer.from(result.imageBase64, 'base64').subarray(0, 4)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47])
    );
  });

  it('reports per-file errors without failing the whole batch', async () => {
    mockAuth.mockResolvedValue({ user: { subscriptionActive: true } } as never);
    const formData = new FormData();
    formData.append('displays', new File([minimalDisplay], 'Good.di.ahc'));
    formData.append('displays', new File(['not xml at all <<<'], 'Bad.di.ahc'));

    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.results[0].error).toBeUndefined();
  });
});
