import { getTesseractWorker, terminateTesseractWorker } from '../ocr/tesseractWorker';

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

  const worker = await getTesseractWorker();
  const { data: { text } } = await worker.recognize(tempCanvas);
  return text;
}

export async function terminateOCRWorker(): Promise<void> {
  await terminateTesseractWorker();
}
