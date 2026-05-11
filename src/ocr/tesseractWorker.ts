import { createWorker } from 'tesseract.js';

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;
let workerReady = false;

export function isTesseractWorkerReady(): boolean {
  return workerReady;
}

export function getTesseractWorker(onProgress?: (progress: number) => void): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: (m) => {
        // Track progress during model/core download
        if (m.status === 'loading tesseract core' || m.status === 'loading language traineddata') {
          onProgress?.(Math.round(m.progress * 100));
        }
      }
    }).then((w) => {
      workerReady = true;
      return w;
    }).catch((error: unknown) => {
      workerPromise = null;
      workerReady = false;
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
  workerReady = false;

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
