const splitToMany = (str: string | undefined) =>
  str?.split(',').map((s) => s.trim());

export function parseComicInfo(metadata: any) {
  if (!metadata) return {};

  return {
    series: metadata.Series || null,
    number: metadata.Number || null,
    volume: metadata.Volume?.toString() || null,
    publisher: metadata.Publisher || null,
    metadata: {
      title: metadata.Title?.trim(),
      releaseDate: [
        metadata.Year,
        metadata.Month?.toString().padStart(2, '0'),
        metadata.Day?.toString().padStart(2, '0'),
      ]
        .filter(Boolean)
        .join('-'),
      summary: metadata.Summary?.trim(),
      writer: splitToMany(metadata.Writer),
      penciller: splitToMany(metadata.Penciller),
      inker: splitToMany(metadata.Inker),
      colorist: splitToMany(metadata.Colorist),
      letterer: splitToMany(metadata.Letterer),
      coverArtist: splitToMany(metadata.CoverArtist),
      editor: splitToMany(metadata.Editor),
      notes: metadata.Notes?.trim(),
    },
  };
}

function findContributor(
  credits: { role: string; person: string }[],
  role: string,
) {
  if (!credits || !Array.isArray(credits)) return;

  return credits
    .filter(
      (credit) =>
        credit.role.trim().toLowerCase() === role.trim().toLowerCase(),
    )
    .map((credit) => credit.person.trim())
    .filter(Boolean);
}

export function parseComicBookInfo(comicBookInfo: any) {
  if (!comicBookInfo) return {};

  return {
    series: comicBookInfo.series || null,
    number: comicBookInfo.issue ? String(comicBookInfo.issue) : null,
    volume: comicBookInfo.volume ? String(comicBookInfo.volume) : null,
    publisher: comicBookInfo.publisher || null,
    metadata: {
      title: comicBookInfo.title?.trim(),
      releaseDate: [
        comicBookInfo.publicationYear,
        comicBookInfo.publicationMonth?.toString().padStart(2, '0'),
        comicBookInfo.publicationDay?.toString().padStart(2, '0'),
      ]
        .filter(Boolean)
        .join('-'),
      writer: findContributor(comicBookInfo.credits, 'writer'),
      penciller: findContributor(comicBookInfo.credits, 'penciller'),
      inker: findContributor(comicBookInfo.credits, 'inker'),
      colorist: findContributor(comicBookInfo.credits, 'colorist'),
      letterer: findContributor(comicBookInfo.credits, 'letterer'),
      coverArtist: findContributor(comicBookInfo.credits, 'cover artist'),
      editor: findContributor(comicBookInfo.credits, 'editor'),
    },
  };
}

