import { describe, it, expect } from 'vitest';
import { autoBalance } from '../editor/autoBalance';

describe('autoBalance', () => {
  it('returns fixed padding for Auto ratio', () => {
    const result = autoBalance(1920, 1080, 'Auto');
    expect(result).toBe(48);
  });

  it('returns at least minPadding for 16:9 with matching image', () => {
    const result = autoBalance(1920, 1080, '16:9');
    expect(result).toBeGreaterThanOrEqual(32);
  });

  it('produces more padding for a tall image in 16:9 than a native 16:9 image', () => {
    const native = autoBalance(1920, 1080, '16:9');
    const tall = autoBalance(1000, 1000, '16:9');
    expect(tall).toBeGreaterThan(native);
  });

  it('1:1 and 16:9 return different values for a 1920x1080 image', () => {
    const a = autoBalance(1920, 1080, '16:9');
    const b = autoBalance(1920, 1080, '1:1');
    expect(a).not.toBe(b);
  });
});
