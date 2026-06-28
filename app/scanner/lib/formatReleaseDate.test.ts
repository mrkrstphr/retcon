import { describe, expect, it } from 'vitest';
import { formatReleaseDate } from './formatReleaseDate.js';

describe('formatReleaseDate', () => {
  it('returns null for undefined', () => {
    expect(formatReleaseDate(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatReleaseDate('')).toBeNull();
  });

  it('passes through valid YYYY-MM-DD unchanged', () => {
    expect(formatReleaseDate('2023-06-15')).toBe('2023-06-15');
  });

  it('appends -01 to YYYY-MM format', () => {
    expect(formatReleaseDate('2023-06')).toBe('2023-06-01');
  });

  it('returns null for free-form date strings', () => {
    expect(formatReleaseDate('June 2023')).toBeNull();
    expect(formatReleaseDate('2023')).toBeNull();
    expect(formatReleaseDate('01/06/2023')).toBeNull();
  });
});
