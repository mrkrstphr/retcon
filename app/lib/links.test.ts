import { describe, expect, it } from 'vitest';
import { isInAppPath } from './links.js';

describe('isInAppPath', () => {
  it('accepts normal relative paths', () => {
    expect(isInAppPath('/comic/abc123/batman')).toBe(true);
    expect(isInAppPath('/')).toBe(true);
  });

  it('rejects protocol-relative URLs (//evil.com)', () => {
    expect(isInAppPath('//evil.com/steal')).toBe(false);
  });

  it('rejects absolute URLs', () => {
    expect(isInAppPath('https://evil.com')).toBe(false);
    expect(isInAppPath('http://evil.com')).toBe(false);
  });

  it('rejects relative paths without leading slash', () => {
    expect(isInAppPath('comic/abc')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isInAppPath(null)).toBe(false);
    expect(isInAppPath(undefined)).toBe(false);
    expect(isInAppPath(42)).toBe(false);
    expect(isInAppPath({})).toBe(false);
  });
});
