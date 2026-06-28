import { describe, expect, it } from 'vitest';
import { buildSearchQuery, parseFilename } from './parseFilename.js';

describe('parseFilename', () => {
  describe('basic series + issue number', () => {
    it('parses hash-prefixed issue number', () => {
      const result = parseFilename('Batman #42.cbz');
      expect(result.series).toBe('Batman');
      expect(result.number).toBe('42');
    });

    it('parses trailing number without hash', () => {
      const result = parseFilename('Batman 42.cbz');
      expect(result.series).toBe('Batman');
      expect(result.number).toBe('42');
    });

    it('parses decimal issue numbers', () => {
      const result = parseFilename('Batman #42.5.cbz');
      expect(result.number).toBe('42.5');
    });
  });

  describe('year extraction', () => {
    it('extracts year from parentheses', () => {
      const result = parseFilename('Batman 42 (2020).cbz');
      expect(result.year).toBe('2020');
      expect(result.series).toBe('Batman');
      expect(result.number).toBe('42');
    });

    it('extracts publisher and year from combined parentheses', () => {
      const result = parseFilename('Batman #1 (DC Comics, 2016).cbz');
      expect(result.publisher).toBe('DC Comics');
      expect(result.year).toBe('2016');
      expect(result.series).toBe('Batman');
      expect(result.number).toBe('1');
    });
  });

  describe('publisher dash prefix', () => {
    it('extracts known publisher from "Publisher - Series" format', () => {
      const result = parseFilename('Marvel - Superman #1.cbz');
      expect(result.publisher).toBe('Marvel');
      expect(result.series).toBe('Superman');
      expect(result.number).toBe('1');
    });

    it('does not treat unknown prefix as publisher', () => {
      const result = parseFilename('Amazing - Spider-Man #1.cbz');
      expect(result.publisher).toBeUndefined();
      expect(result.number).toBe('1');
    });
  });

  describe('volume extraction', () => {
    it('parses v-prefix volume', () => {
      const result = parseFilename('Batman v2 #10.cbz');
      expect(result.volume).toBe('2');
      expect(result.series).toBe('Batman');
      expect(result.number).toBe('10');
    });

    it('parses Vol. prefix', () => {
      const result = parseFilename('Batman Vol. 3 #10.cbz');
      expect(result.volume).toBe('3');
    });

    it('parses Volume prefix', () => {
      const result = parseFilename('Batman Volume 4 #1.cbz');
      expect(result.volume).toBe('4');
    });
  });

  describe('file extensions', () => {
    it('strips .cbz', () => {
      expect(parseFilename('Batman #1.cbz').series).toBe('Batman');
    });

    it('strips .cbr', () => {
      expect(parseFilename('Batman #1.cbr').series).toBe('Batman');
    });

    it('strips .zip', () => {
      expect(parseFilename('Batman #1.zip').series).toBe('Batman');
    });

    it('strips extension case-insensitively', () => {
      expect(parseFilename('Batman #1.CBZ').series).toBe('Batman');
    });
  });

  describe('edge cases', () => {
    it('treats unrecognizable content as series name (no crash)', () => {
      expect(() => parseFilename('???.cbz')).not.toThrow();
    });

    it('does not blow up on empty string', () => {
      expect(() => parseFilename('')).not.toThrow();
    });

    it('does not treat a numeric-only parenthetical as publisher', () => {
      const result = parseFilename('Batman (42).cbz');
      expect(result.publisher).toBeUndefined();
    });

    it('handles multi-word series names without hyphens', () => {
      const result = parseFilename('The Amazing Superman #1.cbz');
      expect(result.series).toBe('The Amazing Superman');
      expect(result.number).toBe('1');
    });
  });
});

describe('buildSearchQuery', () => {
  it('builds from series and number', () => {
    expect(buildSearchQuery({ series: 'Batman', number: '42' })).toBe('Batman #42');
  });

  it('includes volume when present', () => {
    expect(buildSearchQuery({ series: 'Batman', number: '1', volume: '2' })).toBe('Batman #1 v2');
  });

  it('includes publisher when present', () => {
    expect(buildSearchQuery({ series: 'Batman', publisher: 'DC' })).toBe('Batman DC');
  });

  it('returns empty string for empty parsed result', () => {
    expect(buildSearchQuery({})).toBe('');
  });
});
