const PROFILE_PATH_PATTERN = /^\/(?:[a-z]{2,3}(?:-[a-z0-9]+)*\/)?(\d+)(?:\/|$)/i;

export function getUidFromUrl(value: string, base?: string): string | null {
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }

  if (url.hostname !== 'space.bilibili.com') return null;
  return url.pathname.match(PROFILE_PATH_PATTERN)?.[1] ?? null;
}
