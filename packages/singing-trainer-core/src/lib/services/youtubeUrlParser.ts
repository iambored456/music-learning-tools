/**
 * YouTube URL Parser
 *
 * Extracts YouTube video IDs from various URL formats
 * and raw video ID strings.
 */

/** YouTube video ID regex: 11 characters of [A-Za-z0-9_-] */
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

/**
 * Parse a YouTube URL or raw video ID and return the video ID.
 * Returns null if the input cannot be parsed.
 *
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEOID
 * - https://youtu.be/VIDEOID
 * - https://www.youtube.com/shorts/VIDEOID
 * - https://youtube.com/embed/VIDEOID
 * - Raw 11-character video ID
 */
export function parseYouTubeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw video ID
  if (VIDEO_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, '');

    // youtube.com/watch?v=ID
    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      // /watch?v=ID
      const v = url.searchParams.get('v');
      if (v && VIDEO_ID_REGEX.test(v)) return v;

      // /shorts/ID, /embed/ID, /v/ID
      const pathMatch = url.pathname.match(/^\/(shorts|embed|v)\/([A-Za-z0-9_-]{11})/);
      if (pathMatch) return pathMatch[2];
    }

    // youtu.be/ID
    if (hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split(/[/?&]/)[0];
      if (id && VIDEO_ID_REGEX.test(id)) return id;
    }
  } catch {
    // Not a valid URL — already checked raw ID above
  }

  return null;
}
