import { createWorker } from 'tesseract.js';

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;

export function getTesseractWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    // Reset the singleton on init failure so later OCR attempts can retry.
    workerPromise = createWorker('eng', 1).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
}

export async function terminateTesseractWorker(): Promise<void> {
  const activeWorkerPromise = workerPromise;
  workerPromise = null;

  if (!activeWorkerPromise) {
    return;
  }

  try {
    const worker = await activeWorkerPromise;
    await worker.terminate();
  } catch {
    // Ignore init failures: the singleton has already been reset for retry.
  }
}
