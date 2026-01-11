/// <reference types="vite/client" />

declare module '*.html?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly glob: (pattern: string, options?: { eager?: boolean; as?: string }) => Record<string, any>;
}

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleRequestCallback = (deadline: IdleDeadline) => void;

interface IdleRequestOptions {
  timeout?: number;
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
  diatonicCompassTutorial?: any;
}

interface Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface HTMLElement {
  _originalParent?: Node | null;
  _originalNextSibling?: ChildNode | null;
  _isFlattened?: boolean;
  _beltElements?: HTMLElement[];
  _beltsContainer?: HTMLElement | null;
}
