import { describe, it, expect } from 'vitest';
import { normalizeFilenameStem } from '../normalizeFilenameStem';

describe('normalizeFilenameStem', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeFilenameStem('')).toBe('');
    expect(normalizeFilenameStem('   ')).toBe('');
  });

  it('replaces invalid Windows chars', () => {
    expect(normalizeFilenameStem('foo:bar?')).toBe('foo_bar_');
    expect(normalizeFilenameStem('<test>|\\/')).toBe('_test____');
  });

  it('prefixes reserved names with underscore', () => {
    expect(normalizeFilenameStem('CON')).toBe('_CON');
    expect(normalizeFilenameStem('nul')).toBe('_nul');
    expect(normalizeFilenameStem('COM1')).toBe('_COM1');
    expect(normalizeFilenameStem('LPT9')).toBe('_LPT9');
  });

  it('truncates very long strings to 120 chars', () => {
    const longName = 'a'.repeat(200);
    expect(normalizeFilenameStem(longName)).toBe('a'.repeat(120));
  });

  it('strips common image extensions', () => {
    expect(normalizeFilenameStem('foo.png')).toBe('foo');
    expect(normalizeFilenameStem('bar.JPG')).toBe('bar');
    expect(normalizeFilenameStem('test.jpeg')).toBe('test');
    expect(normalizeFilenameStem('image.webp')).toBe('image');
    expect(normalizeFilenameStem('test.txt')).toBe('test.txt'); // shouldn't strip
  });
});
