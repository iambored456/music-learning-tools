export type SemanticTypographyRole =
  | 'display'
  | 'dialog-title'
  | 'section-title'
  | 'body'
  | 'small-body'
  | 'control'
  | 'dense-control'
  | 'label'
  | 'value'
  | 'caption'
  | 'diagnostic'
  | 'fluid-tab'
  | 'notation-label'
  | 'annotation';

export type SemanticTextColor =
  | 'primary'
  | 'secondary'
  | 'on-accent'
  | 'inverse'
  | 'danger'
  | 'notation'
  | 'notation-inverse'
  | 'notation-outline';

export const TYPOGRAPHY_CHANGED_EVENT = 'studentNotationTypographyChanged';

export interface ResolvedTypography {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: string;
  lineHeightPx: number;
  lineHeightRatio: number;
  letterSpacing: string;
}

interface CanvasFontOptions {
  fontSizePx?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
}

const FALLBACK_TYPOGRAPHY: ResolvedTypography = {
  fontFamily: "'Atkinson Hyperlegible Next', system-ui, sans-serif",
  fontSizePx: 16,
  fontWeight: '400',
  lineHeightPx: 19.2,
  lineHeightRatio: 1.2,
  letterSpacing: '0px'
};

const FALLBACK_COLORS: Record<SemanticTextColor, string> = {
  primary: '#212529',
  secondary: '#6c757d',
  'on-accent': '#fff',
  inverse: '#fff',
  danger: '#dc3545',
  notation: '#212529',
  'notation-inverse': '#fff',
  'notation-outline': '#000'
};

const typographyCache = new Map<SemanticTypographyRole, ResolvedTypography>();
const colorCache = new Map<SemanticTextColor, string>();
let cacheInvalidationInstalled = false;

function parsePixels(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clearTypographyCache(): void {
  typographyCache.clear();
  colorCache.clear();
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new Event(TYPOGRAPHY_CHANGED_EVENT));
  }
}

function installCacheInvalidation(): void {
  if (cacheInvalidationInstalled || typeof document === 'undefined') {
    return;
  }

  cacheInvalidationInstalled = true;
  const observer = new MutationObserver(clearTypographyCache);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  document.fonts?.addEventListener('loadingdone', clearTypographyCache);
}

function createProbe(): HTMLSpanElement | null {
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.position = 'fixed';
  probe.style.pointerEvents = 'none';
  probe.style.visibility = 'hidden';
  probe.style.inset = '0 auto auto 0';
  document.body.appendChild(probe);
  return probe;
}

export function getSemanticTypography(role: SemanticTypographyRole): ResolvedTypography {
  const cached = typographyCache.get(role);
  if (cached) {
    return cached;
  }

  installCacheInvalidation();
  const probe = createProbe();
  if (!probe) {
    return FALLBACK_TYPOGRAPHY;
  }

  const prefix = `--typography-${role}`;
  probe.style.fontFamily = `var(${prefix}-font-family)`;
  probe.style.fontSize = `var(${prefix}-font-size)`;
  probe.style.fontWeight = `var(${prefix}-font-weight)`;
  probe.style.lineHeight = `var(${prefix}-line-height)`;
  probe.style.letterSpacing = `var(${prefix}-letter-spacing)`;

  const computed = window.getComputedStyle(probe);
  const fontSizePx = parsePixels(computed.fontSize, FALLBACK_TYPOGRAPHY.fontSizePx);
  const lineHeightPx = parsePixels(
    computed.lineHeight,
    fontSizePx * FALLBACK_TYPOGRAPHY.lineHeightRatio
  );
  const resolved: ResolvedTypography = {
    fontFamily: computed.fontFamily || FALLBACK_TYPOGRAPHY.fontFamily,
    fontSizePx,
    fontWeight: computed.fontWeight || FALLBACK_TYPOGRAPHY.fontWeight,
    lineHeightPx,
    lineHeightRatio: fontSizePx > 0 ? lineHeightPx / fontSizePx : FALLBACK_TYPOGRAPHY.lineHeightRatio,
    letterSpacing: computed.letterSpacing === 'normal' ? '0px' : computed.letterSpacing
  };

  probe.remove();
  typographyCache.set(role, resolved);
  return resolved;
}

export function buildCanvasFont(
  role: SemanticTypographyRole,
  options: CanvasFontOptions = {}
): string {
  const typography = getSemanticTypography(role);
  const fontStyle = options.fontStyle === 'italic' ? 'italic ' : '';
  const fontWeight = options.fontWeight ?? typography.fontWeight;
  const fontSizePx = options.fontSizePx ?? typography.fontSizePx;
  return `${fontStyle}${fontWeight} ${fontSizePx}px ${typography.fontFamily}`;
}

export function getSemanticTextColor(color: SemanticTextColor): string {
  const cached = colorCache.get(color);
  if (cached) {
    return cached;
  }

  installCacheInvalidation();
  const probe = createProbe();
  if (!probe) {
    return FALLBACK_COLORS[color];
  }

  probe.style.color = `var(--text-color-${color})`;
  const resolved = window.getComputedStyle(probe).color || FALLBACK_COLORS[color];
  probe.remove();
  colorCache.set(color, resolved);
  return resolved;
}

export function applySvgTypography(
  element: SVGElement,
  role: SemanticTypographyRole,
  options: { fontSize?: string; fontWeight?: string | number; fontStyle?: 'normal' | 'italic' } = {}
): void {
  const prefix = `--typography-${role}`;
  element.style.fontFamily = `var(${prefix}-font-family)`;
  element.style.fontSize = options.fontSize ?? `var(${prefix}-font-size)`;
  element.style.fontWeight = String(options.fontWeight ?? `var(${prefix}-font-weight)`);
  element.style.fontStyle = options.fontStyle ?? 'normal';
  element.style.lineHeight = `var(${prefix}-line-height)`;
  element.style.letterSpacing = `var(${prefix}-letter-spacing)`;
}
