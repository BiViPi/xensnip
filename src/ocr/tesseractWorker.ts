import { createWorker } from 'tesseract.js';

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;

export function getTesseractWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    // Reset the singleton on init failure so later OCR attempts can retry.
    workerPromise = createWorker('eng', 1).catch((error: unknown) => {
      workerPromise = null;
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `OCR engine failed to load. On first use, OCR requires an internet connection to download model files from cdn.jsdelivr.net. Details: ${detail}`
      );
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
