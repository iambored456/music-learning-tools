export interface LayoutServiceDOMRefs {
  pitchGridWrapper: HTMLElement | null;
  canvas: HTMLCanvasElement | null;
  legendLeftCanvas: HTMLCanvasElement | null;
  legendRightCanvas: HTMLCanvasElement | null;
  drumGridWrapper: HTMLElement | null;
  drumCanvas: HTMLCanvasElement | null;
  drumPlayheadCanvas: HTMLCanvasElement | null;
  playheadCanvas: HTMLCanvasElement | null;
  hoverCanvas: HTMLCanvasElement | null;
  drumHoverCanvas: HTMLCanvasElement | null;
  buttonGridWrapper: HTMLElement | null;
  canvasContainer: HTMLElement | null;
  ctx: CanvasRenderingContext2D | null;
  drumCtx: CanvasRenderingContext2D | null;
  legendLeftCtx: CanvasRenderingContext2D | null;
  legendRightCtx: CanvasRenderingContext2D | null;
}

export function initLayoutDOMElements(): LayoutServiceDOMRefs {
  const pitchGridWrapper = document.getElementById('pitch-grid-wrapper');
  const canvas = document.getElementById('notation-grid') as HTMLCanvasElement | null;
  const legendLeftCanvas = document.getElementById('legend-left-canvas') as HTMLCanvasElement | null;
  const legendRightCanvas = document.getElementById('legend-right-canvas') as HTMLCanvasElement | null;
  const drumGridWrapper = document.getElementById('drum-grid-wrapper');
  const drumCanvas = document.getElementById('drum-grid') as HTMLCanvasElement | null;
  const drumPlayheadCanvas = document.getElementById('drum-playhead-canvas') as HTMLCanvasElement | null;
  const playheadCanvas = document.getElementById('playhead-canvas') as HTMLCanvasElement | null;
  const hoverCanvas = document.getElementById('hover-canvas') as HTMLCanvasElement | null;
  const drumHoverCanvas = document.getElementById('drum-hover-canvas') as HTMLCanvasElement | null;
  const buttonGridWrapper = document.getElementById('button-grid');
  const canvasContainer = document.getElementById('canvas-container');

  return {
    pitchGridWrapper,
    canvas,
    legendLeftCanvas,
    legendRightCanvas,
    drumGridWrapper,
    drumCanvas,
    drumPlayheadCanvas,
    playheadCanvas,
    hoverCanvas,
    drumHoverCanvas,
    buttonGridWrapper,
    canvasContainer,
    ctx: canvas?.getContext('2d') ?? null,
    drumCtx: drumCanvas?.getContext('2d') ?? null,
    legendLeftCtx: legendLeftCanvas?.getContext('2d') ?? null,
    legendRightCtx: legendRightCanvas?.getContext('2d') ?? null
  };
}
