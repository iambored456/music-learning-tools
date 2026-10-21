/** Only generated SVG markup is trusted; all score text and attribute values are escaped. */
export function escapeXml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  })[character]!);
}

export function svgElement(tag: string, attributes: Record<string, string | number>, content = ''): string {
  return `<${tag} ${Object.entries(attributes).map(([key, value]) => `${key}="${escapeXml(value)}"`).join(' ')}>${content}</${tag}>`;
}

export function printColor(value: string | undefined, monochrome = false): string {
  const color = value && /^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/i.test(value) ? value : '#333333';
  if (!monochrome) return color;
  const hex = color.replace('#', '');
  if (/^[\da-f]{6}([\da-f]{2})?$/i.test(hex)) {
    const gray = Math.round(parseInt(hex.slice(0, 2), 16) * 0.299 + parseInt(hex.slice(2, 4), 16) * 0.587 + parseInt(hex.slice(4, 6), 16) * 0.114);
    return `rgb(${gray},${gray},${gray})`;
  }
  return '#555555';
}

export function svgText(x: number, y: number, value: unknown, size: number, color = '#333333', extra: Record<string, string | number> = {}): string {
  return svgElement('text', { x, y, 'font-size': size, fill: color, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...extra }, escapeXml(value));
}

export function svgLine(x1: number, y1: number, x2: number, y2: number, color = '#adb5bd', width = 1, dash = ''): string {
  return svgElement('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': width, 'stroke-dasharray': dash });
}

export function svgRect(x: number, y: number, width: number, height: number, fill: string, extra: Record<string, string | number> = {}): string {
  return svgElement('rect', { x, y, width: Math.max(0, width), height: Math.max(0, height), fill, ...extra });
}
