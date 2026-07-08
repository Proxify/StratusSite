// @vitest-environment node
// Route tests run in node (not jsdom): undici's Request/FormData must come from
// the same realm or req.formData() never resolves, and node exercises the
// production jsdom DOMParser shim in src/lib/server/dom.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

import { auth } from '@/auth';
import { POST } from '@/app/api/process/hmi/route';
import type { NextRequest } from 'next/server';

const mockAuth = vi.mocked(auth);

function makeRequest(formData: FormData): NextRequest {
  return new Request('http://localhost/api/process/hmi', {
    method: 'POST',
    body: formData,
  }) as unknown as NextRequest;
}

const sampleHtm = readFileSync(
  join(__dirname, '../../fixtures/sample-graphic.htm'),
  'utf-8'
);

describe('POST /api/process/hmi', () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(403);
  });

  it('rejects users without an active subscription', async () => {
    mockAuth.mockResolvedValue({ user: { subscriptionActive: false } } as never);
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(403);
  });

  it('rejects requests with no files', async () => {
    mockAuth.mockResolvedValue({ user: { subscriptionActive: true } } as never);
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(400);
  });

  it('parses, extracts, and renders an uploaded .htm file', async () => {
    mockAuth.mockResolvedValue({ user: { subscriptionActive: true } } as never);
    const formData = new FormData();
    formData.append('files', new File([sampleHtm], 'sample-graphic.htm', { type: 'text/html' }));
    formData.append('settings', JSON.stringify({ imageScale: 1 }));

    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);

    const result = body.results[0];
    expect(result.error).toBeUndefined();
    expect(result.fileName).toBe('sample-graphic');
    expect(result.graphic.objects.length).toBeGreaterThan(0);
    expect(Array.isArray(result.pointTags)).toBe(true);
    expect(Array.isArray(result.navigationLinks)).toBe(true);
    // Server-side @napi-rs/canvas render produces a JPEG
    expect(typeof result.imageBase64).toBe('string');
    expect(Buffer.from(result.imageBase64, 'base64').subarray(0, 2)).toEqual(
      Buffer.from([0xff, 0xd8])
    );
  });

  it('reports per-file errors without failing the whole batch', async () => {
    mockAuth.mockResolvedValue({ user: { subscriptionActive: true } } as never);
    const formData = new FormData();
    formData.append('files', new File([sampleHtm], 'good.htm'));
    formData.append('files', new File([''], 'empty.htm'));

    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.results[0].error).toBeUndefined();
  });
});
