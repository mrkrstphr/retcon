import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { APP_VERSION } from '~/constants';

export type Release = {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
};

type Cache = {
  releases: Release[];
};

const GITHUB_REPO = 'mrkrstphr/retcon';

function getCachePath() {
  return join(process.env.DATA_DIRECTORY!, 'changelog-cache.json');
}

async function readCache(): Promise<Release[]> {
  try {
    const data = await readFile(getCachePath(), 'utf-8');
    const cache = JSON.parse(data) as Cache;
    return cache.releases ?? [];
  } catch {
    return [];
  }
}

async function writeCache(releases: Release[]): Promise<void> {
  await writeFile(getCachePath(), JSON.stringify({ releases }, null, 2), 'utf-8');
}

function isNewerVersion(latest: string, current: string): boolean {
  const [lMaj = 0, lMin = 0, lPatch = 0] = latest.split('.').map(Number);
  const [cMaj = 0, cMin = 0, cPatch = 0] = current.split('.').map(Number);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPatch > cPatch;
}

export type ChangelogResult = {
  releases: Release[];
  latestVersion?: string;
  hasUpdate?: boolean;
  error?: string;
};

export async function getChangelog(): Promise<ChangelogResult> {
  const cached = await readCache();
  const newestCachedDate = cached.length > 0 ? cached[0].published_at : null;

  const toResult = (releases: Release[], extra?: Partial<ChangelogResult>): ChangelogResult => {
    const latestVersion = releases[0]?.tag_name?.replace(/^v/, '');
    const hasUpdate = latestVersion ? isNewerVersion(latestVersion, APP_VERSION) : false;
    return { releases, latestVersion, hasUpdate, ...extra };
  };

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'retcon-app',
      },
    });

    if (!response.ok) {
      const error = `GitHub API returned ${response.status} ${response.statusText}`;
      console.error('[changelog]', error);
      return toResult(cached, { error });
    }

    const apiReleases = (await response.json()) as Release[];
    const newestApiDate = apiReleases.length > 0 ? apiReleases[0].published_at : null;

    if (newestApiDate === newestCachedDate) {
      return toResult(cached);
    }

    const releases = apiReleases.map((r) => ({
      id: r.id,
      tag_name: r.tag_name,
      name: r.name,
      body: r.body ?? '',
      published_at: r.published_at,
      html_url: r.html_url,
    }));

    await writeCache(releases);
    return toResult(releases);
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error fetching releases';
    console.error('[changelog]', error);
    return toResult(cached, { error });
  }
}
