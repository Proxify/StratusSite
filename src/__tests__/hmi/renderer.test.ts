import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  HMIGraphic,
  HMIWebRectangle,
  HMIWebOval,
  HMIWebTextBox,
  HMIWebDataValue,
  HMIWebButton,
  HMIWebGroup,
  HMIWebArc,
  HMIWebLine,
} from '@/lib/hmi/types';

// Mock OffscreenCanvas and its context since jsdom doesn't support it
const mockCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
  textBaseline: '',
  globalAlpha: 1,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
};

class MockOffscreenCanvas {
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return mockCtx;
  }
  convertToBlob() {
    return Promise.resolve(new Blob(['fake'], { type: 'image/jpeg' }));
  }
}

// Set up the global mock before importing
vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

// Now import after mocks are in place
const { renderGraphic, canvasToJpegBlob } = await import('@/lib/hmi/renderer');

describe('renderGraphic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx.fillStyle = '';
    mockCtx.strokeStyle = '';
    mockCtx.globalAlpha = 1;
  });

  function makeGraphic(objects: any[], width = 800, height = 600): HMIGraphic {
    return { name: 'test', width, height, objects };
  }

  it('creates a canvas with scaled dimensions', () => {
    const graphic = makeGraphic([], 400, 300);
    const canvas = renderGraphic(graphic, { scale: 2.0 });
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('uses default 3.0x scale', () => {
    const graphic = makeGraphic([], 100, 100);
    const canvas = renderGraphic(graphic);
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(300);
  });

  it('fills background color', () => {
    const graphic = makeGraphic([]);
    renderGraphic(graphic, { backgroundColor: '#FF0000' });
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('applies scale transform', () => {
    renderGraphic(makeGraphic([]), { scale: 2.0 });
    expect(mockCtx.scale).toHaveBeenCalledWith(2.0, 2.0);
  });

  it('renders rectangles with fill and stroke', () => {
    const rect: HMIWebRectangle = {
      objectType: 'Rectangle',
      objectId: 'r1',
      styleClass: '',
      style: { fillColor: '#FF0000', strokeColor: '#00FF00', strokeWidth: 2 },
      visible: true,
      x: 10, y: 20, width: 100, height: 50,
    };
    renderGraphic(makeGraphic([rect]));
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.strokeRect).toHaveBeenCalled();
  });

  it('renders ovals using ellipse', () => {
    const oval: HMIWebOval = {
      objectType: 'Oval',
      objectId: 'o1',
      styleClass: '',
      style: { fillColor: '#0000FF' },
      visible: true,
      x: 10, y: 10, width: 80, height: 60,
    };
    renderGraphic(makeGraphic([oval]));
    expect(mockCtx.ellipse).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
  });

  it('renders text boxes', () => {
    const text: HMIWebTextBox = {
      objectType: 'TextBox',
      objectId: 't1',
      styleClass: '',
      style: { fontSize: 14, fontFamily: 'Arial' },
      visible: true,
      x: 10, y: 10, width: 200, height: 30,
      text: 'Hello World',
      textColor: '#FFFFFF',
    };
    renderGraphic(makeGraphic([text]));
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      'Hello World',
      expect.any(Number),
      expect.any(Number),
      200
    );
  });

  it('renders data values as text', () => {
    const dv: HMIWebDataValue = {
      objectType: 'DataValue',
      objectId: 'dv1',
      styleClass: '',
      style: {},
      visible: true,
      x: 50, y: 100, width: 120, height: 30,
      fullTag: 'F101.PV',
      textColor: '#00FF00',
      text: '1234.56',
    };
    renderGraphic(makeGraphic([dv]));
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  it('renders buttons with background and label', () => {
    const btn: HMIWebButton = {
      objectType: 'Button',
      objectId: 'btn1',
      styleClass: '',
      style: { fillColor: '#444444' },
      visible: true,
      x: 10, y: 10, width: 150, height: 40,
      navigateTo: 'Display_002',
      label: 'Go to Display',
    };
    renderGraphic(makeGraphic([btn]));
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      'Go to Display',
      expect.any(Number),
      expect.any(Number),
      150
    );
  });

  it('renders Group children recursively', () => {
    const group: HMIWebGroup = {
      objectType: 'Group',
      objectId: 'g1',
      styleClass: '',
      style: {},
      visible: true,
      x: 0, y: 0, width: 200, height: 200,
      children: [
        {
          objectType: 'Rectangle',
          objectId: 'r1',
          styleClass: '',
          style: { fillColor: '#FF0000' },
          visible: true,
          x: 10, y: 10, width: 50, height: 50,
        } as HMIWebRectangle,
      ],
    };
    renderGraphic(makeGraphic([group]));
    // fillRect called for: background + group potential fill + child rectangle
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('renders arcs using ellipse', () => {
    const arc: HMIWebArc = {
      objectType: 'Arc',
      objectId: 'a1',
      styleClass: '',
      style: { fillColor: '#9933CC', strokeColor: '#660099' },
      visible: true,
      x: 100, y: 100, width: 80, height: 80,
      startAngle: 0,
      sweepAngle: 180,
    };
    renderGraphic(makeGraphic([arc]));
    expect(mockCtx.ellipse).toHaveBeenCalled();
  });

  it('renders lines', () => {
    const line: HMIWebLine = {
      objectType: 'Line',
      objectId: 'l1',
      styleClass: '',
      style: { strokeColor: '#FF0000' },
      visible: true,
      x: 10, y: 10, width: 100, height: 100,
      x2: 110, y2: 110,
    };
    renderGraphic(makeGraphic([line]));
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('renders lines with multiple points', () => {
    const line: HMIWebLine = {
      objectType: 'Line',
      objectId: 'l2',
      styleClass: '',
      style: { strokeColor: '#00FF00' },
      visible: true,
      x: 0, y: 0, width: 100, height: 50,
      x2: 100, y2: 50,
      points: [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 100, y: 10 },
      ],
    };
    renderGraphic(makeGraphic([line]));
    expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 10);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(50, 50);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 10);
  });

  it('skips invisible objects', () => {
    const rect: HMIWebRectangle = {
      objectType: 'Rectangle',
      objectId: 'r_hidden',
      styleClass: '',
      style: { fillColor: '#FF0000' },
      visible: false,
      x: 10, y: 10, width: 100, height: 50,
    };
    vi.clearAllMocks();
    renderGraphic(makeGraphic([rect]));
    // fillRect is only called once for the background, not for the hidden rect
    const fillRectCalls = mockCtx.fillRect.mock.calls;
    // Background fill = 1 call, no rect fill
    expect(fillRectCalls.length).toBe(1);
  });
});

describe('canvasToJpegBlob', () => {
  it('returns a JPEG blob', async () => {
    const canvas = new MockOffscreenCanvas(100, 100) as unknown as OffscreenCanvas;
    const blob = await canvasToJpegBlob(canvas);
    expect(blob).toBeInstanceOf(Blob);
  });
});
