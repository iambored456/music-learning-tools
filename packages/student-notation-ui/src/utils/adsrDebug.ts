// Toggle in console: window.__adsrFlowDebug = true
export function logAdsrFlow(stage: string, payload?: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }

  const debugFlag = (window as typeof window & { __adsrFlowDebug?: boolean }).__adsrFlowDebug;
  if (!debugFlag) {
    return;
  }

  if (payload === undefined) {
    console.log('[ADSR Flow]', stage);
    return;
  }

  console.log('[ADSR Flow]', stage, payload);
}
