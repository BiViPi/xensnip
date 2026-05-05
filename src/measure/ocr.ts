import { createWorker } from 'tesseract.js';

export async function extractTextFromCanvas(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = region.width;
  tempCanvas.height = region.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) throw new Error('Could not create temp canvas context');
  
  // Draw the region onto the temp canvas
  tempCtx.drawImage(
    canvas,
    region.x, region.y, region.width, region.height,
    0, 0, region.width, region.height
  );
  
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(tempCanvas);
  await worker.terminate();
  
  return text;
}
