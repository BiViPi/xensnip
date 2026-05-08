import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectTextRedactCandidates } from '../detectTextRedactCandidates';

const { recognize, getTesseractWorker } = vi.hoisted(() => ({
  recognize: vi.fn(),
  getTesseractWorker: vi.fn(),
}));

vi.mock('../../ocr/tesseractWorker', () => ({
  getTesseractWorker,
}));

beforeEach(() => {
  recognize.mockReset();
  getTesseractWorker.mockReset();
  getTesseractWorker.mockResolvedValue({ recognize });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    drawImage: vi.fn(),
  }) as unknown as CanvasRenderingContext2D);
});

describe('detectTextRedactCandidates', () => {
  it('requests blocks output so word bounding boxes are available', async () => {
    recognize.mockResolvedValue({
      data: {
        words: [
          {
            text: 'phubui277@gmail.com',
            confidence: 96,
            bbox: { x0: 10, y0: 20, x1: 110, y1: 42 },
          },
        ],
      },
    });

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 160;
    const candidates = await detectTextRedactCandidates(canvas, {
      x: 30,
      y: 40,
      width: 150,
      height: 80,
    });

    expect(recognize).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      {},
      { text: true, blocks: true }
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      x: 40,
      y: 60,
      width: 100,
      height: 22,
      text: 'phubui277@gmail.com',
      confidence: 96,
      status: 'pending',
    });
  });
});
