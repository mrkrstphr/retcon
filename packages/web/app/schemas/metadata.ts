import { z } from 'zod';

/**
 * Schema for metadata search result from providers
 */
export const metadataSearchResultSchema = z.object({
  provider: z.string(),
  id: z.string(),
  series: z.string(),
  volume: z.string().optional(),
  number: z.string().optional(),
  title: z.string().optional(),
  publisher: z.string().optional(),
  releaseDate: z.string().optional(),
  summary: z.string().optional(),
  coverUrl: z.string().url().optional(),
  creators: z
    .object({
      writer: z.array(z.string()).optional(),
      penciller: z.array(z.string()).optional(),
      inker: z.array(z.string()).optional(),
      colorist: z.array(z.string()).optional(),
      letterer: z.array(z.string()).optional(),
      coverArtist: z.array(z.string()).optional(),
      editor: z.array(z.string()).optional(),
    })
    .optional(),
});

export type MetadataSearchResult = z.infer<typeof metadataSearchResultSchema>;

/**
 * Schema for applying metadata to a comic
 */
export const applyMetadataSchema = z.object({
  resultId: z.string(),
  metadata: metadataSearchResultSchema,
});

export type ApplyMetadataData = z.infer<typeof applyMetadataSchema>;
