import { describe, expect, it } from 'vitest';
import { buildComicInfoXML } from './comicInfoBuilder.js';
import type { MetadataSearchResult } from '../metadata/providers/types.js';

const base: MetadataSearchResult = {
  provider: 'comicvine',
  id: 'cv-1234',
  series: 'Batman',
};

describe('buildComicInfoXML', () => {
  it('produces valid XML with required wrapper', () => {
    const xml = buildComicInfoXML(base);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<ComicInfo');
    expect(xml).toContain('</ComicInfo>');
  });

  it('includes series name', () => {
    const xml = buildComicInfoXML({ ...base, series: 'Batman' });
    expect(xml).toContain('<Series>Batman</Series>');
  });

  it('includes issue number when provided', () => {
    const xml = buildComicInfoXML({ ...base, number: '42' });
    expect(xml).toContain('<Number>42</Number>');
  });

  it('omits fields that are absent', () => {
    const xml = buildComicInfoXML(base);
    expect(xml).not.toContain('<Number>');
    expect(xml).not.toContain('<Publisher>');
  });

  it('splits release date into Year/Month/Day', () => {
    const xml = buildComicInfoXML({ ...base, releaseDate: '2023-06-15' });
    expect(xml).toContain('<Year>2023</Year>');
    expect(xml).toContain('<Month>6</Month>');
    expect(xml).toContain('<Day>15</Day>');
  });

  it('handles release date with only year and month', () => {
    const xml = buildComicInfoXML({ ...base, releaseDate: '2023-06' });
    expect(xml).toContain('<Year>2023</Year>');
    expect(xml).toContain('<Month>6</Month>');
    expect(xml).not.toContain('<Day>');
  });

  it('joins multiple writers with comma separator', () => {
    const xml = buildComicInfoXML({
      ...base,
      creators: { writer: ['Grant Morrison', 'Scott Snyder'] },
    });
    expect(xml).toContain('<Writer>Grant Morrison, Scott Snyder</Writer>');
  });

  it('includes all creator roles when provided', () => {
    const xml = buildComicInfoXML({
      ...base,
      creators: {
        writer: ['Writer A'],
        penciller: ['Penciller A'],
        inker: ['Inker A'],
        colorist: ['Colorist A'],
        letterer: ['Letterer A'],
        coverArtist: ['Cover A'],
        editor: ['Editor A'],
      },
    });
    expect(xml).toContain('<Writer>Writer A</Writer>');
    expect(xml).toContain('<Penciller>Penciller A</Penciller>');
    expect(xml).toContain('<Inker>Inker A</Inker>');
    expect(xml).toContain('<Colorist>Colorist A</Colorist>');
    expect(xml).toContain('<Letterer>Letterer A</Letterer>');
    expect(xml).toContain('<CoverArtist>Cover A</CoverArtist>');
    expect(xml).toContain('<Editor>Editor A</Editor>');
  });

  it('adds Notes field referencing provider and id', () => {
    const xml = buildComicInfoXML(base);
    expect(xml).toContain('comicvine');
    expect(xml).toContain('cv-1234');
  });
});
