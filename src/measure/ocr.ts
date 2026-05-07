import { createWorker } from 'tesseract.js';

// CDN mode: worker downloads eng model from jsDelivr on first call.
// Requires network access on first OCR use per session.
let workerPromise: Promise<Awaited<ReturnType<typeof createWorker>>> | null = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1);
  }
  return workerPromise;
}

export async function extractTextFromCanvas(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = region.width;
  tempCanvas.height = region.height;
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) throw new Error('Could not create temp canvas context');

  tempCtx.drawImage(
    canvas,
    region.x, region.y, region.width, region.height,
    0, 0, region.width, region.height
  );

  const worker = await getWorker();
  const { data: { text } } = await worker.recognize(tempCanvas);
  return text;
}

export async function terminateOCRWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
