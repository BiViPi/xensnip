import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectTextRedactCandidates } from '../detectTextRedactCandidates';
import { unscaleSmartRedactCandidates } from '../smartRedactRegion';
import { DEFAULT_PRESET } from '../../compose/preset';

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
  it('extracts words from tesseract.js v7 blocks hierarchy and filters blank or zero-area boxes', async () => {
    recognize.mockResolvedValue({
      data: {
        words: undefined,
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  {
                    words: [
                      {
                        text: '  phubui277@gmail.com  ',
                        confidence: 96,
                        bbox: { x0: 10, y0: 20, x1: 110, y1: 42 },
                      },
                      {
                        text: '   ',
                        confidence: 80,
                        bbox: { x0: 120, y0: 20, x1: 150, y1: 42 },
                      },
                      {
                        text: 'zero',
                        confidence: 90,
                        bbox: { x0: 50, y0: 50, x1: 50, y1: 70 },
                      },
                      {
                        text: 'secret-token',
                        confidence: 125,
                        bbox: { x0: 12, y0: 50, x1: 92, y1: 68 },
                      },
                    ],
                  },
                ],
              },
            ],
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
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      x: 40,
      y: 60,
      width: 100,
      height: 22,
      text: 'phubui277@gmail.com',
      confidence: 96,
      status: 'pending',
    });
    expect(candidates[1]).toMatchObject({
      x: 42,
      y: 90,
      width: 80,
      height: 18,
      text: 'secret-token',
      confidence: 100,
      status: 'pending',
    });
  });
});

describe('unscaleSmartRedactCandidates', () => {
  const preset = {
    ...DEFAULT_PRESET,
    ratio: 'Auto' as const,
    padding: 20,
    border_width: 10,
  };
  const image = { width: 400, height: 200 } as HTMLImageElement;

  it('keeps 1x canvas coordinates unchanged in composition space', () => {
    const scaled = unscaleSmartRedactCandidates(
      [
        {
          id: 'c1',
          x: 60,
          y: 50,
          width: 100,
          height: 20,
          text: 'hello',
          confidence: 95,
          status: 'pending',
        },
      ],
      460,
      260,
      image,
      preset
    );

    expect(scaled[0]).toMatchObject({
      x: 60,
      y: 50,
      width: 100,
      height: 20,
    });
  });

  it('unscales 2x HiDPI preview canvas coordinates back to composition coordinates', () => {
    const scaled = unscaleSmartRedactCandidates(
      [
        {
          id: 'c2',
          x: 120,
          y: 100,
          width: 200,
          height: 40,
          text: 'secret',
          confidence: 92,
          status: 'pending',
        },
      ],
      920,
      520,
      image,
      preset
    );

    expect(scaled[0]).toMatchObject({
      x: 60,
      y: 50,
      width: 100,
      height: 20,
    });
  });
});
