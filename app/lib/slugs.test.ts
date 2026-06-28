import { describe, expect, it } from 'vitest';
import { createComicSlug, createSlug } from './slugs.js';

describe('createSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(createSlug('Batman Detective Comics')).toBe('batman-detective-comics');
  });

  it('removes special characters', () => {
    expect(createSlug("Batman & Robin's Adventures!")).toBe('batman-robins-adventures');
  });

  it('collapses consecutive hyphens', () => {
    expect(createSlug('Batman  --  Robin')).toBe('batman-robin');
  });

  it('trims leading and trailing hyphens', () => {
    expect(createSlug(' Batman ')).toBe('batman');
  });

  it('replaces underscores with hyphens', () => {
    expect(createSlug('batman_detective')).toBe('batman-detective');
  });

  it('handles already-valid slug unchanged', () => {
    expect(createSlug('batman-42')).toBe('batman-42');
  });

  it('handles names with dots and parentheses', () => {
    expect(createSlug('S.H.I.E.L.D. (2014)')).toBe('shield-2014');
  });

  it('returns empty string for all-special input', () => {
    expect(createSlug('!!!---!!!')).toBe('');
  });
});

describe('createComicSlug', () => {
  it('combines series and number when both provided', () => {
    expect(createComicSlug('Batman', '42', 'file.cbz')).toBe('batman-42');
  });

  it('uses series name alone when no number', () => {
    expect(createComicSlug('Batman', null, 'file.cbz')).toBe('batman');
  });

  it('falls back to filename (without extension) when no series', () => {
    expect(createComicSlug(null, null, 'Batman #42.cbz')).toBe('batman-42');
  });

  it('uses filename path basename when path separator present', () => {
    expect(createComicSlug(null, null, 'DC/Batman #42.cbz')).toBe('batman-42');
  });
});
