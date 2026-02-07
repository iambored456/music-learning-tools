import type { AvatarAssetSet, AvatarAssetKey } from "./types.ts";

export type AvatarViewDom = {
  /** The container element */
  el: HTMLElement;
  /** Preload all assets to avoid flicker */
  preload(): Promise<void>;
  /** Set which SVG to display */
  setSvg(key: AvatarAssetKey): void;
  /** Show or hide the container */
  setVisible(visible: boolean): void;
  /** Animate slide-in entrance */
  enter(): Promise<void>;
  /** Clean up and remove from DOM */
  dispose(): void;
};

/**
 * CSS styles for the avatar container
 */
const CONTAINER_STYLES = `
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: translateX(-100%);
  transition: opacity 240ms ease-out, transform 240ms ease-out;
  pointer-events: none;
`;

const CONTAINER_VISIBLE_STYLES = `
  opacity: 1;
  transform: translateX(0);
`;

const IMG_STYLES = `
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

/**
 * Create the avatar DOM view component
 */
export function createAvatarViewDom(
  assets: AvatarAssetSet,
  mount: HTMLElement
): AvatarViewDom {
  // Create container
  const container = document.createElement("div");
  container.className = "talking-avatar-container";
  container.style.cssText = CONTAINER_STYLES;
  container.setAttribute("aria-hidden", "true");

  // Create img element
  const img = document.createElement("img");
  img.className = "talking-avatar-img";
  img.style.cssText = IMG_STYLES;
  img.alt = "";
  img.draggable = false;

  container.appendChild(img);
  mount.appendChild(container);

  // Track preload status
  const preloadedImages = new Map<string, HTMLImageElement>();
  let currentKey: AvatarAssetKey = "smile_nowave";

  const preload = (): Promise<void> => {
    const keys = Object.keys(assets) as AvatarAssetKey[];
    const promises = keys.map((key) => {
      return new Promise<void>((resolve) => {
        const preloadImg = new Image();
        preloadImg.onload = () => {
          preloadedImages.set(key, preloadImg);
          resolve();
        };
        preloadImg.onerror = () => {
          // Still resolve on error to not block
          console.warn(`Failed to preload avatar asset: ${key}`);
          resolve();
        };
        preloadImg.src = assets[key];
      });
    });

    return Promise.all(promises).then(() => undefined);
  };

  const setSvg = (key: AvatarAssetKey): void => {
    if (key === currentKey && img.src) return;
    currentKey = key;
    img.src = assets[key];
  };

  const setVisible = (visible: boolean): void => {
    if (visible) {
      container.style.opacity = "1";
      container.style.transform = "translateX(0)";
    } else {
      container.style.opacity = "0";
      container.style.transform = "translateX(-100%)";
    }
  };

  const enter = (): Promise<void> => {
    return new Promise((resolve) => {
      // Set initial state (smile_nowave)
      setSvg("smile_nowave");

      // Force reflow to ensure transition works
      void container.offsetHeight;

      // Trigger slide-in
      container.style.opacity = "1";
      container.style.transform = "translateX(0)";

      // Wait for transition to complete
      const onTransitionEnd = (e: TransitionEvent) => {
        if (e.propertyName === "transform") {
          container.removeEventListener("transitionend", onTransitionEnd);
          resolve();
        }
      };
      container.addEventListener("transitionend", onTransitionEnd);

      // Fallback in case transitionend doesn't fire
      setTimeout(resolve, 300);
    });
  };

  const dispose = (): void => {
    preloadedImages.clear();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  // Set initial SVG
  setSvg("smile_nowave");

  return {
    el: container,
    preload,
    setSvg,
    setVisible,
    enter,
    dispose,
  };
}
