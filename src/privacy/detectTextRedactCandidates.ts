import { createWorker, Worker } from 'tesseract.js';
import { SmartRedactCandidate } from './store';

let workerInstance: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerInstance) {
    workerInstance = await createWorker('eng');
  }
  return workerInstance;
}

export async function detectTextRedactCandidates(
  canvas: HTMLCanvasElement,
  region?: { x: number; y: number; width: number; height: number }
): Promise<SmartRedactCandidate[]> {
  const targetCanvas = document.createElement('canvas');
  const cropX = Math.max(0, Math.floor(region ? region.x : 0));
  const cropY = Math.max(0, Math.floor(region ? region.y : 0));
  const requestedW = Math.ceil(region ? region.width : canvas.width);
  const requestedH = Math.ceil(region ? region.height : canvas.height);
  const cropW = Math.max(1, Math.min(canvas.width - cropX, requestedW));
  const cropH = Math.max(1, Math.min(canvas.height - cropY, requestedH));

  targetCanvas.width = cropW;
  targetCanvas.height = cropH;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create temp canvas context');

  ctx.drawImage(
    canvas,
    cropX, cropY, cropW, cropH,
    0, 0, cropW, cropH
  );

  const worker = await getWorker();
  const { data } = await worker.recognize(targetCanvas);
  const words = Array.isArray((data as any).words) ? (data as any).words : [];

  const candidates: SmartRedactCandidate[] = words
    .map((word: any, index: number) => {
      const bbox = word?.bbox;
      const text = typeof word?.text === 'string' ? word.text.trim() : '';
      if (!bbox || !text) return null;

      const width = bbox.x1 - bbox.x0;
      const height = bbox.y1 - bbox.y0;
      if (width <= 0 || height <= 0) return null;

      return {
        id: `candidate-${Date.now()}-${index}`,
        x: cropX + bbox.x0,
        y: cropY + bbox.y0,
        width,
        height,
        text,
        confidence: word.confidence,
        status: 'pending' as const,
      };
    })
    .filter(
      (candidate: SmartRedactCandidate | null): candidate is SmartRedactCandidate => candidate !== null
    );

  return candidates;
}
