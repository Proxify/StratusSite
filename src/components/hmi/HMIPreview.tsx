'use client';

import { useRef, useEffect } from 'react';
import type { HMIGraphic } from '@/lib/hmi/types';
import { renderGraphicToCanvas } from '@/lib/hmi/renderer';

interface HMIPreviewProps {
  graphic: HMIGraphic;
  scale?: number;
  className?: string;
}

export default function HMIPreview({ graphic, scale = 1.0, className = '' }: HMIPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    renderGraphicToCanvas(graphic, canvasRef.current, { scale });
  }, [graphic, scale]);

  return (
    <div className={`overflow-auto rounded-lg border border-white/10 bg-black/20 ${className}`}>
      <canvas
        ref={canvasRef}
        className="max-w-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}
