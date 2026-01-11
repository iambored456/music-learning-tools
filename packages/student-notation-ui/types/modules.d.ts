import type { AppState, MacrobeatGrouping, ModulationMarker, ModulationRatio } from './state.js';

declare module '@components/canvas/pitchGrid/renderers/rendererUtils.js' {
  export interface RendererOptions {
    cellWidth: number;
    cellHeight: number;
    columnWidths?: number[];
    [key: string]: unknown;
  }

  export function getColumnX(index: number, options: RendererOptions): number;
  export function getRowY(rowIndex: number, options: RendererOptions): number;
}

declare module '@components/rhythm/glyphs/diamond.js' {
  export function diamondPath(cx: number, cy: number, width: number, height: number): string;
}

// Note: @state/selectors.ts and @state/index.ts are now proper TypeScript files
// with their own type definitions, so no ambient declarations needed here

// Note: drawToolsController is now a TypeScript file with its own type definitions

declare module '@components/toolbar/initializers/toolSelectorInitializer.js' {
  export function initToolbar(): void;
}

declare module '@components/toolbar/initializers/playbackInitializer.js' {
  interface PlaybackInitializer {
    init?(): void;
  }
  const playbackInitializer: PlaybackInitializer;
  export default playbackInitializer;
}

declare module '@components/toolbar/initializers/fileActionsInitializer.js' {
  interface FileActionsInitializer {
    init?(): void;
  }
  const fileActionsInitializer: FileActionsInitializer;
  export default fileActionsInitializer;
}

declare module '@components/toolbar/initializers/audioControlsInitializer.js' {
  export function initAudioControls(): void;
}

declare module '@components/toolbar/initializers/modulationInitializer.js' {
  interface ModulationInitializer {
    init?(): void;
  }
  const modulationInitializer: ModulationInitializer;
  export default modulationInitializer;
}
