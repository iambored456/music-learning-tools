import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disposePrintFrame, printPreparedDocument } from './printService.ts';
import type { PrintDocument } from './print/printDocument.ts';

const prepared: PrintDocument = {
  pages: [{ width: 792, height: 612, svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Score</text></svg>' }],
  barCount: 8, hasPickup: false, lineCount: 2, warnings: [], topRow: 30, bottomRow: 40
};
let decoded: () => void;
let rejectDecode: (error: Error) => void;
let afterPrint: () => void;
let frame: ReturnType<typeof makeFrame>;
let printWindow: { focus: ReturnType<typeof vi.fn>; print: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> };
let sheets: { children: unknown[]; style: Record<string, string> }[];
let images: { src: string; decode: () => Promise<void> }[];

function makeFrame() {
  return {
    style: { cssText: '' }, title: '', tabIndex: 0, srcdoc: '',
    onload: () => {}, onerror: () => {}, remove: vi.fn(), setAttribute: vi.fn(),
    contentWindow: printWindow,
    contentDocument: {
      head: { appendChild: vi.fn() }, fonts: { ready: Promise.resolve() },
      body: { appendChild: (sheet: typeof sheets[number]) => sheets.push(sheet) },
      createElement: (tag: string) => {
        if (tag === 'img') {
          const ready = new Promise<void>((resolve, reject) => { decoded = resolve; rejectDecode = reject; });
          const image = { src: '', alt: '', decode: () => ready };
          images.push(image);
          return image;
        }
        return { style: {}, className: '', textContent: '', children: [] as unknown[],
          appendChild(child: unknown) { this.children.push(child); } };
      }
    }
  };
}

beforeEach(() => {
  sheets = [];
  images = [];
  printWindow = {
    focus: vi.fn(), print: vi.fn(() => afterPrint()),
    addEventListener: vi.fn((event: string, handler: () => void) => { if (event === 'afterprint') afterPrint = handler; })
  };
  frame = makeFrame();
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubGlobal('document', {
    createElement: (tag: string) => { expect(tag).toBe('iframe'); return frame; },
    body: { appendChild: () => queueMicrotask(() => frame.onload()) }
  });
});

afterEach(() => { disposePrintFrame(); vi.unstubAllGlobals(); });

describe('isolated print handoff', () => {
  it('waits for image decoding and prints the exact prepared page in a separate document', async () => {
    const operation = printPreparedDocument(prepared);
    await vi.waitFor(() => expect(images).toHaveLength(1));
    expect(printWindow.print).not.toHaveBeenCalled();
    expect(decodeURIComponent(images[0]!.src.split(',')[1]!)).toBe(prepared.pages[0]!.svg);
    expect(sheets[0]!.style).toEqual({ width: '792pt', height: '612pt' });
    decoded();
    await operation;
    expect(printWindow.print).toHaveBeenCalledOnce();
    expect(frame.remove).toHaveBeenCalledOnce();
  });

  it('reports image failures without opening a broken print dialog', async () => {
    const operation = printPreparedDocument(prepared);
    const rejected = expect(operation).rejects.toThrow('decode failed');
    await vi.waitFor(() => expect(images).toHaveLength(1));
    rejectDecode(new Error('decode failed'));
    await rejected;
    expect(printWindow.print).not.toHaveBeenCalled();
    expect(frame.remove).toHaveBeenCalledOnce();
  });

  it('retains the frame for asynchronous dialogs and cleans up after cancellation', async () => {
    printWindow.print.mockImplementation(() => {});
    const operation = printPreparedDocument(prepared);
    await vi.waitFor(() => expect(images).toHaveLength(1));
    decoded();
    await operation;
    expect(frame.remove).not.toHaveBeenCalled();
    afterPrint();
    expect(frame.remove).toHaveBeenCalledOnce();
  });

  it('supports another print after a completed or cancelled dialog', async () => {
    for (let i = 0; i < 2; i++) {
      frame = makeFrame();
      images = [];
      const operation = printPreparedDocument(prepared);
      await vi.waitFor(() => expect(images).toHaveLength(1));
      decoded();
      await operation;
      expect(frame.remove).toHaveBeenCalledOnce();
    }
    expect(printWindow.print).toHaveBeenCalledTimes(2);
  });
});

