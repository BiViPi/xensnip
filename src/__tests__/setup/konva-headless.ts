/**
 * konva-headless.ts
 *
 * Override Konva's canvas factory to use the `canvas` npm package so that
 * Konva renders in a Node/Vitest (jsdom) environment without a real browser.
 *
 * Import this file in vitest.config.ts via `setupFiles`.
 */
import { createCanvas, Image as NodeCanvasImage, loadImage as nodeLoadImage } from 'canvas';
import Konva from 'konva';

// ── Konva headless mode ───────────────────────────────────────────────────
// Tell Konva it is NOT running in a browser so it does not try to append
// canvas elements to the DOM or measure scrollbars. Must be set before any
// Stage/Layer is constructed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Konva as any).isBrowser = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Konva as any).UA = { isNode: true };

// ── Polyfill CanvasRenderingContext2D if missing (jsdom without canvas patch) ──
// jsdom stubs HTMLCanvasElement.getContext but may not expose the global
// CanvasRenderingContext2D constructor. Grab it from node-canvas first.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NodeCanvasCtx = (createCanvas(1, 1) as any).getContext('2d')?.constructor;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).CanvasRenderingContext2D === 'undefined' && NodeCanvasCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).CanvasRenderingContext2D = NodeCanvasCtx;
}

// ── Canvas style stub helper ──────────────────────────────────────────────
// Konva and browser code frequently set canvas.style.xxx. node-canvas
// objects do not have a .style property; attach a no-op Proxy so those
// assignments do not throw.
function attachStyleStub(c: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = c as any;
  if (!obj.style) {
    obj.style = new Proxy(
      {},
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(_t: any, _p: any, _v: any) { return true; },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get(_t: any, _p: any) { return ''; },
      }
    );
  }
}

// ── document.createElement('canvas') polyfill ─────────────────────────────
// composeWithAnnotations calls document.createElement('canvas') directly.
// jsdom's canvas stub returns a non-functional element; replace it with
// node-canvas so pixel operations actually work.
const originalCreateElement = document.createElement.bind(document);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(document as any).createElement = (tagName: string, ...args: any[]) => {
  if (tagName.toLowerCase() === 'canvas') {
    const c = createCanvas(0, 0);
    attachStyleStub(c);
    return c as unknown as HTMLCanvasElement;
  }
  return originalCreateElement(tagName, ...args);
};

// ── Konva canvas factory override ────────────────────────────────────────────
// Konva.Util.createCanvasElement is the single factory for every canvas it
// creates internally (stage canvas, layer canvas, etc.).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Konva.Util as any).createCanvasElement = () => {
  const c = createCanvas(0, 0);
  attachStyleStub(c);
  return c as unknown as HTMLCanvasElement;
};

// ── HTMLCanvasElement.toBlob polyfill ─────────────────────────────────────
// jsdom does not implement toBlob; node-canvas canvas objects have toBuffer.
// We patch the prototype so composeWithAnnotations's toBlob call works.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeCanvasProto = (createCanvas(1, 1) as any).__proto__;
if (!nodeCanvasProto.toBlob) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeCanvasProto.toBlob = function (callback: (blob: Blob | null) => void, mimeType = 'image/png', quality = 1.0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    let buffer: Buffer;
    if (mimeType === 'image/jpeg') {
      buffer = self.toBuffer('image/jpeg', { quality });
    } else {
      buffer = self.toBuffer('image/png');
    }
    const blob = new Blob([buffer], { type: mimeType });
    callback(blob);
  };
}

// ── FileReader polyfill ───────────────────────────────────────────────────
// jsdom's FileReader stub may not fully implement readAsArrayBuffer for Blobs
// produced by our toBlob above. Patch it to use the buffer directly.
const OriginalFileReader = FileReader;
class PatchedFileReader extends OriginalFileReader {
  readAsArrayBuffer(blob: Blob): void {
    blob.arrayBuffer().then((buf) => {
      Object.defineProperty(this, 'result', { value: buf, configurable: true });
      this.dispatchEvent(new ProgressEvent('load'));
    });
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).FileReader = PatchedFileReader;

// ── HTMLImageElement src polyfill ────────────────────────────────────────
// Tests create HTMLImageElement and set .src to a data URL / buffer.
// jsdom does not fire onload for these; patch to use node-canvas loadImage.
const OrigImageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
Object.defineProperty(HTMLImageElement.prototype, 'src', {
  set(value: string) {
    if (OrigImageDescriptor?.set) OrigImageDescriptor.set.call(this, value);
    if (!value) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    nodeLoadImage(value)
      .then((img: NodeCanvasImage) => {
        Object.defineProperty(self, 'width', { value: img.width, configurable: true });
        Object.defineProperty(self, 'height', { value: img.height, configurable: true });
        // Expose native node-canvas image for drawImage unwrapping below
        self._nodeCanvasImage = img;
        if (typeof self.onload === 'function') self.onload();
      })
      .catch((err: Error) => {
        if (typeof self.onerror === 'function') self.onerror(err);
      });
  },
  get() {
    return OrigImageDescriptor?.get?.call(this) ?? '';
  },
  configurable: true,
});

// ── CanvasRenderingContext2D.drawImage unwrap ────────────────────────────
// Patch drawImage to unwrap _nodeCanvasImage when an HTMLImageElement that
// was loaded via node-canvas is passed (so the native call succeeds).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (NodeCanvasCtx && NodeCanvasCtx.prototype) {
  const origDrawImage = NodeCanvasCtx.prototype.drawImage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NodeCanvasCtx.prototype.drawImage = function (source: any, ...rest: any[]) {
    if (source && source._nodeCanvasImage) {
      return origDrawImage.call(this, source._nodeCanvasImage, ...rest);
    }
    return origDrawImage.call(this, source, ...rest);
  };
}
