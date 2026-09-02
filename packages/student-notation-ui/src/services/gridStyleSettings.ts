const RED_C_LINES_STORAGE_KEY = 'app.redCLinesEnabled';

let redCLinesEnabled = false;
let hasLoaded = false;

function loadSetting(): void {
  if (hasLoaded) return;
  hasLoaded = true;
  try {
    redCLinesEnabled = window.localStorage.getItem(RED_C_LINES_STORAGE_KEY) === 'true';
  } catch {
    redCLinesEnabled = false;
  }
}

export function isRedCLinesEnabled(): boolean {
  loadSetting();
  return redCLinesEnabled;
}

export function setRedCLinesEnabled(enabled: boolean): void {
  hasLoaded = true;
  redCLinesEnabled = enabled;
  try {
    window.localStorage.setItem(RED_C_LINES_STORAGE_KEY, String(enabled));
  } catch {
    // The visual preference still applies for this session when storage is unavailable.
  }
}
