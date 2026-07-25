const STORAGE_KEY = 'studentNotation.adsrPlayheadsEnabled';

type AdsrPlayheadSettingListener = (enabled: boolean) => void;

const listeners = new Set<AdsrPlayheadSettingListener>();
let cachedEnabled: boolean | null = null;

function readStoredSetting(): boolean {
  if (cachedEnabled !== null) {
    return cachedEnabled;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    cachedEnabled = stored !== 'false';
  } catch {
    cachedEnabled = true;
  }

  return cachedEnabled;
}

export function getAdsrPlayheadsEnabled(): boolean {
  return readStoredSetting();
}

export function setAdsrPlayheadsEnabled(enabled: boolean): void {
  const previous = readStoredSetting();
  cachedEnabled = enabled;

  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // The setting still applies for this session when storage is unavailable.
  }

  if (enabled === previous) {
    return;
  }

  listeners.forEach(listener => listener(enabled));
}

export function toggleAdsrPlayheadsEnabled(): boolean {
  const enabled = !getAdsrPlayheadsEnabled();
  setAdsrPlayheadsEnabled(enabled);
  return enabled;
}

export function subscribeToAdsrPlayheadsEnabled(
  listener: AdsrPlayheadSettingListener
): () => void {
  listeners.add(listener);
  listener(getAdsrPlayheadsEnabled());
  return () => listeners.delete(listener);
}
