import { beforeEach, describe, expect, it, vi } from 'vitest';

const createWorker = vi.fn();

vi.mock('tesseract.js', () => ({
  createWorker,
}));

async function loadModule() {
  return import('../ocr/tesseractWorker');
}

beforeEach(() => {
  createWorker.mockReset();
  vi.resetModules();
});

describe('tesseractWorker', () => {
  it('reuses a single worker across calls', async () => {
    const worker = {
      recognize: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    createWorker.mockResolvedValue(worker);

    const { getTesseractWorker } = await loadModule();

    const first = getTesseractWorker();
    const second = getTesseractWorker();

    expect(first).toBe(second);
    await expect(first).resolves.toBe(worker);
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(createWorker).toHaveBeenCalledWith('eng', 1, expect.objectContaining({
      logger: expect.any(Function),
    }));
  });

  it('clears the cached promise after init failure so later calls can retry', async () => {
    const initError = new Error('cdn failed');
    const worker = {
      recognize: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    createWorker.mockRejectedValueOnce(initError).mockResolvedValueOnce(worker);

    const { getTesseractWorker } = await loadModule();

    await expect(getTesseractWorker()).rejects.toThrow('cdn failed');
    await expect(getTesseractWorker()).resolves.toBe(worker);
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('terminates the current worker, clears ready state, and allows a fresh one to be created', async () => {
    const firstWorker = {
      recognize: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    const secondWorker = {
      recognize: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    createWorker.mockResolvedValueOnce(firstWorker).mockResolvedValueOnce(secondWorker);

    const { getTesseractWorker, isTesseractWorkerReady, terminateTesseractWorker } = await loadModule();

    await expect(getTesseractWorker()).resolves.toBe(firstWorker);
    expect(isTesseractWorkerReady()).toBe(true);
    await terminateTesseractWorker();
    expect(isTesseractWorkerReady()).toBe(false);
    await expect(getTesseractWorker()).resolves.toBe(secondWorker);

    expect(firstWorker.terminate).toHaveBeenCalledTimes(1);
    expect(createWorker).toHaveBeenCalledTimes(2);
  });
});
