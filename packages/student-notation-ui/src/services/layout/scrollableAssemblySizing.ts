import {
  resolveNotationAssemblySizing,
  type NotationAssemblySizing,
  type NotationAssemblyVisibility
} from './assemblySizing.ts';
import { getHorizontalScrollbarBlockSize } from './pitchRangeState.ts';

/** Decide overflow before the scrollbar reduces height and therefore cell width. */
export function resolveScrollableNotationAssemblySizing(params: NotationAssemblyVisibility & {
  container: HTMLElement | null;
  fallbackAvailableHeight: number;
  rowCount: number;
  getContentWidth: (sizing: NotationAssemblySizing) => number;
}): NotationAssemblySizing {
  const { container } = params;
  // grids-wrapper has no borders. Adding back its native scrollbar gives the
  // same height basis on every pass, whether the scrollbar is currently visible.
  const fullHeight = container
    ? container.clientHeight + getHorizontalScrollbarBlockSize(container)
    : params.fallbackAvailableHeight;
  const unscrolledSizing = resolveNotationAssemblySizing({ ...params, availableHeight: fullHeight });
  if (!container) {
    return unscrolledSizing;
  }

  const needsScrollbar = params.getContentWidth(unscrolledSizing) > container.clientWidth;
  const overflowX = needsScrollbar ? 'scroll' : 'hidden';
  if (container.style.overflowX !== overflowX) {
    container.style.overflowX = overflowX;
  }

  // Read after applying overflow so native/overlay scrollbar thickness is
  // reflected in the final budget. Keep the decision even if smaller cells now
  // fit horizontally; auto overflow would otherwise restart the resize loop.
  return resolveNotationAssemblySizing({ ...params, availableHeight: container.clientHeight });
}
