import { SmartRedactCandidate } from './store';
import { getTesseractWorker } from '../ocr/tesseractWorker';

interface TesseractWord {
  text?: unknown;
  confidence?: unknown;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

interface TesseractLine {
  words?: TesseractWord[];
}

interface TesseractParagraph {
  lines?: TesseractLine[];
}

interface TesseractBlock {
  paragraphs?: TesseractParagraph[];
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

  const worker = await getTesseractWorker();
  const { data } = await worker.recognize(targetCanvas, {}, { text: true, blocks: true });

  const pageData = data as { blocks?: TesseractBlock[] | null; words?: TesseractWord[] | null };
  const blockWords: TesseractWord[] = Array.isArray(pageData.blocks)
    ? pageData.blocks
        .flatMap((block) => block.paragraphs ?? [])
        .flatMap((paragraph) => paragraph.lines ?? [])
        .flatMap((line) => line.words ?? [])
    : [];
  const words: TesseractWord[] =
    blockWords.length > 0
      ? blockWords
      : Array.isArray(pageData.words)
        ? pageData.words
        : [];

  const now = Date.now();
  const candidates = words
    .map((word: TesseractWord, index: number): SmartRedactCandidate | null => {
      const bbox = word?.bbox;
      const text = typeof word?.text === 'string' ? word.text.trim() : '';
      if (!bbox || !text) return null;

      const width = bbox.x1 - bbox.x0;
      const height = bbox.y1 - bbox.y0;
      if (width <= 0 || height <= 0) return null;

      const rawConfidence = typeof word.confidence === 'number' && Number.isFinite(word.confidence)
        ? word.confidence
        : 0;
      const confidence = Math.max(0, Math.min(100, rawConfidence));

      return {
        id: `candidate-${now}-${index}`,
        x: cropX + bbox.x0,
        y: cropY + bbox.y0,
        width,
        height,
        text,
        confidence,
        status: 'pending' as const,
      };
    })
    .filter(
      (candidate: SmartRedactCandidate | null): candidate is SmartRedactCandidate => candidate !== null
    );

  return candidates;
}
