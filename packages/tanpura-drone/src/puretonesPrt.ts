const KEY_NAME = {
  drone: 'puretones',
  scale: 'musicscale',
} as const;

export type PureTonesAppName = keyof typeof KEY_NAME;
export type PureTonesPrtState = Record<string, number>;

const SCALE_REVERB_PATH = '/Zita_Light/';

function toFiniteNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePureTonesPrt(settingsText: string, appName: PureTonesAppName = 'drone'): PureTonesPrtState {
  const key = KEY_NAME[appName];
  const keyPattern = new RegExp(`${key}`, 'g');
  const state: PureTonesPrtState = {};

  for (const line of settingsText.replace(keyPattern, 'FaustDSP').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace <= 0) continue;

    const valuePart = trimmed.slice(0, firstSpace).trim();
    let path = trimmed.slice(firstSpace + 1).trim();
    const value = toFiniteNumber(valuePart);
    if (value == null || path.length === 0) continue;

    if (appName === 'scale' && path.includes(SCALE_REVERB_PATH)) {
      path = path.replace('/FaustDSP', '');
    }

    state[path] = value;
  }

  return state;
}

export function serializePureTonesPrt(state: PureTonesPrtState, appName: PureTonesAppName = 'drone'): string {
  const key = KEY_NAME[appName];

  return Object.entries(state)
    .map(([path, value]) => {
      let normalizedPath = path;
      if (appName === 'scale' && normalizedPath.includes(SCALE_REVERB_PATH)) {
        normalizedPath = normalizedPath.replace('/FaustDSP', '');
      }
      return `${value} ${normalizedPath}`;
    })
    .join('\n')
    .replace(/FaustDSP/g, key);
}
