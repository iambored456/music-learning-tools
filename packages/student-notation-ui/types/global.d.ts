/* Global ambient declarations for browser-only helpers exposed on window */
declare global {
  interface Window {
    initAudio?: () => Promise<void>;
    scheduleCell?: (...args: unknown[]) => void;
    stateGuard?: {
      enable: () => void;
      disable: () => void;
      getLog: () => unknown[];
      clearLog: () => void;
    };
    __uiDiagnosticsTrackedElements?: { label: string; selector: string }[];
    __uiDiagnosticsInitialized?: boolean;
    __uiDiagnosticsAutoLog?: boolean;
    __uiDiagnosticsLastSnapshot?: unknown[];
    logUIState?: (reason?: string) => unknown;
    enableUIDiagnosticsAutoLog?: () => void;
    disableUIDiagnosticsAutoLog?: () => void;
    drumGridRenderer?: DrumGridRenderer;
    synthEngine?: any;
    audioEffectsManager?: any;
    adsrComponent?: {
      triggerPlayheadVisual: (noteId: string, phase: 'attack' | 'release', color: string, adsr: unknown) => void;
      clearAllPlayheadVisuals: () => void;
    };
    getDrumVolume?: () => number;
    drawToolsController?: any;
    drumVolumeNode?: any;
    transportService?: any;
    __transportTimeMap?: number[];
    __transportMusicalEnd?: string;
  }
  interface DrumGridRenderer {
    animationFrameId: number | null;
    render(): void;
    startAnimationLoop(): void;
    stopAnimationLoop(): void;
  }
}

export {};
