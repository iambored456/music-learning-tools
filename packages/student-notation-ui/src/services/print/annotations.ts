import type { Annotation, AnnotationArrowheadStyle, TextAnnotationSettings } from '@mlt/types';
import { escapeXml, svgElement as el, svgLine as line, svgRect as rect } from './svg.ts';

function arrowhead(kind: AnnotationArrowheadStyle, size: number, shade: string): string {
  if (kind === 'none') return '';
  const open = kind.startsWith('open-') || kind.startsWith('unfilled');
  const fill = open ? 'none' : shade;
  const attrs = { fill, stroke: shade, 'stroke-width': 1 };
  if (kind.includes('circle')) return el('circle', { cx: 0, cy: 0, r: size / 3, ...attrs });
  if (kind.includes('square')) return rect(-size / 3, -size / 3, size * 2 / 3, size * 2 / 3, fill, attrs);
  if (kind.includes('diamond')) return el('path', { d: `M ${size / 2} 0 L 0 ${size / 2} L ${-size / 2} 0 L 0 ${-size / 2} Z`, ...attrs });
  if (kind === 'bar') return line(0, -size / 2, 0, size / 2, shade);
  return el('path', { d: `M ${-size} ${-size / 2} L 0 0 L ${-size} ${size / 2}${kind === 'open-arrow' ? '' : ' Z'}`, ...attrs });
}

type Format = 'normal' | 'sup' | 'sub';
function formattedCharacters(value: string, settings: TextAnnotationSettings): { value: string; format: Format }[] {
  const characters: { value: string; format: Format }[] = [];
  const pattern = /<sup>([\s\S]*?)<\/sup>|<sub>([\s\S]*?)<\/sub>|\^([^\s]+)|([^<^]+|[<^])/g;
  for (const match of value.matchAll(pattern)) {
    const content = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
    const format = settings.superscript ? 'sup' : settings.subscript ? 'sub' : match[1] !== undefined || match[3] !== undefined ? 'sup' : match[2] !== undefined ? 'sub' : 'normal';
    for (const character of content) characters.push({ value: character, format });
  }
  return characters;
}

/** Text measurement uses its own context, never the editor's canvas or CSS. */
function textWidth(value: string, size: number, settings: TextAnnotationSettings, context: CanvasRenderingContext2D | null): number {
  if (!context) return value.length * size * 0.6;
  context.font = `${settings.italic ? 'italic' : 'normal'} ${settings.bold ? 'bold' : 'normal'} ${size}px Arial`;
  return context.measureText(value).width;
}

export function renderPrintAnnotations(annotations: Annotation[], x: (column: number) => number, y: (row: number) => number, color: (value: string | undefined) => string, cell: number): string {
  const parts: string[] = [];
  const context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  for (const annotation of annotations) {
    const settings = annotation.settings;
    const shade = color(settings.color);
    if (annotation.type === 'arrow') {
      const settings = annotation.settings;
      const sx = x(annotation.startCol), sy = y(annotation.startRow), ex = x(annotation.endCol), ey = y(annotation.endRow);
      const angle = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;
      const dash = { solid: '', 'dashed-big': '10 6', 'dashed-small': '5 3', dotted: '1 3' }[settings.lineStyle];
      parts.push(el('g', { 'stroke-linecap': settings.roundedEnds ? 'round' : 'butt' },
        line(sx, sy, ex, ey, shade, settings.strokeWeight, dash)
        + el('g', { transform: `translate(${sx} ${sy}) rotate(${angle + 180})` }, arrowhead(settings.startArrowhead, settings.arrowheadSize || 12, shade))
        + el('g', { transform: `translate(${ex} ${ey}) rotate(${angle})` }, arrowhead(settings.endArrowhead, settings.arrowheadSize || 12, shade))));
    } else if (annotation.type === 'text') {
      const settings = annotation.settings;
      const startX = x(annotation.col), startY = y(annotation.row);
      const boxWidth = Math.max(1, x(annotation.col + annotation.widthCols) - startX);
      const boxHeight = Math.max(cell / 2, y(annotation.row + annotation.heightRows) - startY);
      if (settings.background) parts.push(rect(startX, startY, boxWidth, boxHeight, '#ffffff'));
      const padding = settings.background ? 8 : 4;
      const size = Math.max(1, settings.size);
      const available = Math.max(1, boxWidth - padding * 2);
      const characters = formattedCharacters(annotation.text, settings);
      // Break at whitespace when possible, then split oversized words at character boundaries.
      const tokens: typeof characters[] = [];
      for (const character of characters) {
        if (!tokens.length || /\s/.test(character.value) || /\s/.test(tokens.at(-1)!.at(-1)!.value)) tokens.push([]);
        tokens.at(-1)!.push(character);
      }
      let offset = 0, lineIndex = 0;
      for (const token of tokens) {
        const tokenWidth = token.reduce((sum, character) => sum + textWidth(character.value, size * (character.format === 'normal' ? 1 : 0.6), settings, context), 0);
        if (offset > 0 && offset + tokenWidth > available && !/\s/.test(token[0]!.value)) { offset = 0; lineIndex++; }
        for (const character of token) {
          if (character.value === '\n') { offset = 0; lineIndex++; continue; }
          const fontSize = size * (character.format === 'normal' ? 1 : 0.6);
          const w = textWidth(character.value, fontSize, settings, context);
          if (offset > 0 && offset + w > available) { offset = 0; lineIndex++; }
          if (offset === 0 && character.value === ' ') continue;
          const dy = character.format === 'sup' ? -size * 0.4 : character.format === 'sub' ? size * 0.3 : 0;
          parts.push(el('text', { x: startX + padding + offset, y: startY + 4 + size + lineIndex * size * 1.2 + dy,
            'font-size': fontSize, fill: shade, 'font-weight': settings.bold ? 'bold' : 'normal',
            'font-style': settings.italic ? 'italic' : 'normal', 'text-decoration': settings.underline ? 'underline' : 'none'
          }, escapeXml(character.value)));
          offset += w;
        }
      }
    } else {
      const settings = annotation.settings;
      if (annotation.path.length < 2) continue;
      const d = annotation.path.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.col)} ${y(point.row)}`).join(' ');
      parts.push(el('path', { d, fill: 'none', stroke: shade, 'stroke-width': settings.size,
        opacity: 1 - Math.max(0, Math.min(95, settings.transparency ?? (annotation.type === 'highlighter' ? 70 : 0))) / 100,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    }
  }
  return parts.join('');
}
