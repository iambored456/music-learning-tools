// js/components/ADSR/adsrRender.ts
import store from '@state/initStore.ts';
import { hexToRgba, shadeHexColor } from '@utils/colorUtils.ts';

interface Point {
  x: number;
  y: number;
}

interface Dimensions {
  width: number;
  height: number;
}

interface EffectParams {
  time?: number;
  feedback?: number;
  decay?: number;
  roomSize?: number;
}

interface EffectsCoordinator {
  getEffectParameters(colorKey: string, effectType: string): EffectParams;
}

declare global {
  interface Window {
    effectsCoordinator?: EffectsCoordinator;
  }
}

export function drawTempoGridlines(gridLayer: SVGGElement, { width, height }: Dimensions, totalADRTime: number): void {
  while (gridLayer.firstChild) {gridLayer.removeChild(gridLayer.firstChild);}

  // Draw time markers (1s, 2s, 3s, 4s, 5s) in the background
  if (totalADRTime > 0) {
    for (let seconds = 1; seconds <= 5; seconds++) {
      if (seconds <= totalADRTime) {
        const x = (seconds / totalADRTime) * width;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(height - 5)); // Bottom-aligned with 5px padding
        text.setAttribute('fill', '#d0d0d0'); // Light gray
        text.setAttribute('font-size', '24');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'auto');
        text.setAttribute('opacity', '0.3');
        text.textContent = `${seconds}s`;
        gridLayer.appendChild(text);
      }
    }
  }

  const tempo = store.state.tempo;
  if (tempo <= 0 || totalADRTime <= 0) {return;}
  const microbeatDuration = 30 / tempo;
  let beatCount = 0;
  for (let time = microbeatDuration; time < totalADRTime; time += microbeatDuration) {
    const x = (time / totalADRTime) * width;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', '0');
    line.setAttribute('x2', String(x));
    line.setAttribute('y2', String(height));
    const isMacrobeat = (beatCount + 1) % 2 === 0;
    line.setAttribute('stroke', isMacrobeat ? '#adb5bd' : '#ced4da');
    line.setAttribute('stroke-width', isMacrobeat ? '1' : '0.5');
    line.setAttribute('stroke-dasharray', '3,3'); // Dashed line pattern for both
    gridLayer.appendChild(line);
    beatCount++;
  }
}

export function drawEnvelope(envelopeLayer: SVGGElement, nodeLayer: SVGGElement, points: Point[], { height, width }: Dimensions, colorKey: string, maxTime: number, canvasCtx: CanvasRenderingContext2D | null): void {
  while (envelopeLayer.firstChild) {envelopeLayer.removeChild(envelopeLayer.firstChild);}
  while (nodeLayer.firstChild) {nodeLayer.removeChild(nodeLayer.firstChild);}
  if (points.length < 4) {return;}
  const startPoint = points[0];
  const attackPoint = points[1];
  const decayPoint = points[2];
  const releasePoint = points[3];
  if (!startPoint || !attackPoint || !decayPoint || !releasePoint) {return;}

  // Get the color pair from the store's palette
  const palette = store.state.colorPalette[colorKey] || { primary: colorKey, light: colorKey };
  const primaryColor = palette.primary;
  const lightColor = palette.light;

  // Get delay parameters from effectsCoordinator
  let delayParams: EffectParams = { time: 0, feedback: 0 };
  if (window.effectsCoordinator) {
    delayParams = window.effectsCoordinator.getEffectParameters(colorKey, 'delay');
  }

  // Clear canvas for new frame
  if (canvasCtx) {
    canvasCtx.clearRect(0, 0, width, height);
  }

  // --- Draw Delay Echoes (behind main envelope) ---
  if ((delayParams.time || 0) > 0 && (delayParams.feedback || 0) > 0 && maxTime) {
    // Convert delay time from percentage (0-100) to seconds (0-0.5s as per delayAudioEffect.js)
    const delayTimeSeconds = Math.max(0.01, ((delayParams.time || 0) / 100) * 0.5);
    // Convert feedback from percentage to 0-1
    const feedbackAmount = Math.min(0.95, (delayParams.feedback || 0) / 100);

    // Calculate how many echoes to draw (stop when opacity becomes too low)
    const minOpacity = 0.05;
    let currentOpacity = feedbackAmount;
    let echoCount = 0;

    while (currentOpacity > minOpacity && echoCount < 10) {
      echoCount++;
      const delayOffsetPx = (delayTimeSeconds * echoCount / maxTime) * width;

      // Shift all points by the delay offset
      const echoPoints = points.map(p => ({ x: p.x + delayOffsetPx, y: p.y }));

      const echoStart = echoPoints[0];
      const echoRelease = echoPoints[3];
      if (!echoStart || !echoRelease) {
        continue;
      }

      // Only draw if the echo is still visible within the canvas
      if (echoStart.x < width) {
        // Draw echo fill
        const echoFill = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const echoFillPoints = `${echoStart.x},${height} ` +
                                       echoPoints.map(p => `${p.x},${p.y}`).join(' ') +
                                       ` ${Math.min(echoRelease.x, width)},${height}`;
        echoFill.setAttribute('points', echoFillPoints);
        echoFill.setAttribute('fill', hexToRgba(lightColor, 0.7 * currentOpacity));
        echoFill.setAttribute('class', 'delay-echo');
        envelopeLayer.appendChild(echoFill);

        // Draw echo line
        const echoLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        echoLine.setAttribute('points', echoPoints.map(p => `${p.x},${p.y}`).join(' '));
        echoLine.setAttribute('stroke-width', '2');
        echoLine.setAttribute('fill', 'none');
        echoLine.setAttribute('stroke', hexToRgba(primaryColor, currentOpacity));
        echoLine.setAttribute('class', 'delay-echo');
        envelopeLayer.appendChild(echoLine);
      }

      // Reduce opacity for next echo (each echo is quieter)
      currentOpacity *= feedbackAmount;
    }
  }

  // --- Draw Main Envelope Shape ---
  const fillPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const fillPoints = `0,${height} ` + points.map(p => `${p.x},${p.y}`).join(' ') + ` ${width},${height}`;
  fillPolygon.setAttribute('points', fillPoints);
  // Use the new light color with transparency for the fill
  fillPolygon.setAttribute('fill', hexToRgba(lightColor, 0.7));

  envelopeLayer.appendChild(fillPolygon);

  // Draw envelope line in segments so we can soften the release based on reverb
  // Attack segment (p0 to p1)
  const attackLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  attackLine.setAttribute('x1', String(startPoint.x));
  attackLine.setAttribute('y1', String(startPoint.y));
  attackLine.setAttribute('x2', String(attackPoint.x));
  attackLine.setAttribute('y2', String(attackPoint.y));
  attackLine.setAttribute('stroke', primaryColor);
  attackLine.setAttribute('stroke-width', '2');
  envelopeLayer.appendChild(attackLine);

  // Decay segment (p1 to p2)
  const decayLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  decayLine.setAttribute('x1', String(attackPoint.x));
  decayLine.setAttribute('y1', String(attackPoint.y));
  decayLine.setAttribute('x2', String(decayPoint.x));
  decayLine.setAttribute('y2', String(decayPoint.y));
  decayLine.setAttribute('stroke', primaryColor);
  decayLine.setAttribute('stroke-width', '2');
  envelopeLayer.appendChild(decayLine);

  // Release segment (p2 to p3)
  const releaseOpacity = 1.0;

  const releaseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  releaseLine.setAttribute('x1', String(decayPoint.x));
  releaseLine.setAttribute('y1', String(decayPoint.y));
  releaseLine.setAttribute('x2', String(releasePoint.x));
  releaseLine.setAttribute('y2', String(releasePoint.y));
  releaseLine.setAttribute('stroke', hexToRgba(primaryColor, releaseOpacity));
  releaseLine.setAttribute('stroke-width', '2');
  envelopeLayer.appendChild(releaseLine);

  // --- Draw Draggable Nodes ---
  const nodeIds: [string, string, string] = ['attack-node', 'decay-sustain-node', 'release-node'];
  const nodePoints: Point[] = [attackPoint, decayPoint, releasePoint];

  nodePoints.forEach((point, i) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('id', nodeIds[i]!);
    node.setAttribute('class', 'adsr-node');
    node.setAttribute('cx', String(point.x));
    node.setAttribute('cy', String(point.y));
    node.setAttribute('r', '8');
    node.setAttribute('fill', primaryColor); // Use primary color for node fill
    node.setAttribute('stroke', shadeHexColor(primaryColor, -0.3));
    node.setAttribute('stroke-width', '2');
    node.style.cursor = 'grab';

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    node.appendChild(title);

    nodeLayer.appendChild(node);
  });
}


export function applyTheme(parentContainer: HTMLElement | null, color: string): void {
  if (!parentContainer) {return;}
  const darkColor = shadeHexColor(color, -0.2);
  parentContainer.style.setProperty('--c-accent', color);
  parentContainer.style.setProperty('--c-accent-hover', darkColor);
}
