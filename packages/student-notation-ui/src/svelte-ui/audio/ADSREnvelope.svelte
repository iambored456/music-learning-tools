<script lang="ts">
  import store from '@state/initStore.ts';
  import logger from '@utils/logger.ts';
  import {
    ADSR_NODE_PAINTED_RADIUS,
    applyTheme,
    drawEnvelope,
    drawTempoGridlines
  } from '@components/audio/adsr/adsrRender.ts';
  import {
    getAnimationEffectsManager
  } from '@services/runtimeGlobals.ts';
  import {
    attachAdsrPlayheadCanvas,
    clearAdsrPlayheads,
    pauseAdsrPlayheads,
    refreshAdsrPlayheadGeometry,
    resizeAdsrPlayheadCanvas,
    resumeAdsrPlayheads,
    type AdsrPlayheadEnvelope
  } from '@components/audio/adsr/adsrPlayheadCanvas.ts';

  const BASE_ADSR_TIME_SECONDS = 2.5;
  const MIN_STAGE_GAP = 0.01;

  interface ADSRValues {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  }

  interface EnvelopePoint {
    x: number;
    y: number;
  }

  interface CanvasPlotBounds {
    inset: number;
    left: number;
    bottom: number;
    width: number;
    height: number;
  }

  type TimeHandle = 'attack' | 'decay' | 'release';

  interface AbsoluteTimes {
    a: number;
    d: number;
    r: number;
  }

  interface NoteChangedPayload {
    newNote?: {
      color?: string;
    };
  }

  interface TremoloAmplitudePayload {
    activeColors?: string[];
  }

  interface AudioEffectPayload {
    effectType?: string;
    color?: string;
  }

  interface PlaybackStatePayload {
    isPlaying?: boolean;
    isPaused?: boolean;
  }

  let attack = 0;
  let decay = 0;
  let sustain = 0;
  let release = 0;
  let currentColor: string = store.state.selectedNote?.color || '#4a90e2';
  let timeAxisScale = store.state.adsrTimeAxisScale;

  let width = 0;
  let height = 0;
  let renderQueued = false;
  let playheadGeometryRefreshQueued = false;

  let container: HTMLElement | null = null;
  let parentContainer: HTMLElement | null = null;
  let sustainTrack: HTMLElement | null = null;
  let sustainThumb: HTMLElement | null = null;
  let multiSliderContainer: HTMLElement | null = null;
  let thumbA: HTMLElement | null = null;
  let thumbD: HTMLElement | null = null;
  let thumbR: HTMLElement | null = null;

  let reverbCanvas: HTMLCanvasElement | null = null;
  let playheadCanvas: HTMLCanvasElement | null = null;
  let reverbCtx: CanvasRenderingContext2D | null = null;
  let svgContainer: SVGSVGElement | null = null;
  let gridLayer: SVGGElement | null = null;
  let envelopeLayer: SVGGElement | null = null;
  let nodeLayer: SVGGElement | null = null;

  function scheduleRender(refreshPlayheadGeometry = false): void {
    playheadGeometryRefreshQueued ||= refreshPlayheadGeometry;
    if (renderQueued) {return;}
    renderQueued = true;

    const run = () => {
      renderQueued = false;
      const shouldRefreshPlayheadGeometry = playheadGeometryRefreshQueued;
      playheadGeometryRefreshQueued = false;
      render();
      if (shouldRefreshPlayheadGeometry) {
        refreshAdsrPlayheadGeometry();
      }
      updateControls();
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  }

  function getEnvelopeAmplitude(color: string): number {
    let tremoloMultiplier = 1.0;
    const animationManager = getAnimationEffectsManager();
    if (animationManager?.shouldTremoloBeRunning?.()) {
      tremoloMultiplier = animationManager.getADSRTremoloAmplitudeMultiplier?.(color) ?? 1.0;
    }

    return tremoloMultiplier;
  }

  function updateFromStore(): void {
    const timbre = store.state.timbres[currentColor];
    if (!timbre) {return;}

    const nextAdsr = timbre.adsr;

    attack = nextAdsr.attack;
    decay = nextAdsr.decay;
    sustain = nextAdsr.sustain;
    release = nextAdsr.release;

    scheduleRender();
  }

  function getCurrentMaxTime(): number {
    return BASE_ADSR_TIME_SECONDS * timeAxisScale;
  }

  function getCanvasPlotBounds(): CanvasPlotBounds {
    const sliderThumbRadius = (thumbA?.offsetWidth ?? 0) / 2;
    const requestedInset = Math.max(ADSR_NODE_PAINTED_RADIUS, sliderThumbRadius);
    const inset = Math.min(requestedInset, width / 2, height / 2);

    return {
      inset,
      left: inset,
      bottom: height - inset,
      width: width - (2 * inset),
      height: height - (2 * inset)
    };
  }

  function resolvePushedAbsoluteTimes(
    handle: TimeHandle,
    requestedTime: number,
    currentTimes: AbsoluteTimes
  ): AbsoluteTimes {
    const maxTime = getCurrentMaxTime();
    const gap = Math.min(MIN_STAGE_GAP, maxTime / 2);
    const next = { ...currentTimes };

    if (handle === 'attack') {
      next.a = Math.max(0, Math.min(maxTime - (2 * gap), requestedTime));
      next.d = Math.max(next.d, next.a + gap);
      next.r = Math.max(next.r, next.d + gap);

      if (next.r > maxTime) {
        next.r = maxTime;
        next.d = maxTime - gap;
        next.a = maxTime - (2 * gap);
      }
    } else if (handle === 'decay') {
      next.d = Math.max(gap, Math.min(maxTime - gap, requestedTime));

      if (next.d < next.a + gap) {
        next.a = next.d - gap;
      }
      if (next.d > next.r - gap) {
        next.r = next.d + gap;
      }
    } else {
      next.r = Math.max(2 * gap, Math.min(maxTime, requestedTime));

      if (next.r < next.d + gap) {
        next.d = next.r - gap;
      }
      if (next.d < next.a + gap) {
        next.a = next.d - gap;
      }
    }

    return next;
  }

  function updateADSRFromAbsoluteTimes(times: { a: number; d: number; r: number }): void {
    const timbre = store.state.timbres[currentColor];
    if (!timbre) {return;}

    const { sustain: currentSustain } = timbre.adsr;
    const nextTimes = { ...times };

    nextTimes.d = Math.max(nextTimes.a + MIN_STAGE_GAP, nextTimes.d);
    nextTimes.r = Math.max(nextTimes.d + MIN_STAGE_GAP, nextTimes.r);

    const nextAttack = nextTimes.a;
    const nextDecay = nextTimes.d - nextTimes.a;
    const nextRelease = nextTimes.r - nextTimes.d;

    if (Number.isNaN(nextAttack) || Number.isNaN(nextDecay) || Number.isNaN(nextRelease)) {
      logger.error(
        'ADSREnvelope',
        'NaN value detected before setting ADSR. Aborting update.',
        { nextAttack, nextDecay, nextRelease },
        'audio'
      );
      return;
    }

    const nextAdsr: ADSRValues = {
      attack: nextAttack,
      decay: nextDecay,
      release: nextRelease,
      sustain: currentSustain
    };

    store.setADSR(currentColor, nextAdsr);
  }

  function updateControls(): void {
    if (!sustainThumb || !sustainTrack || !thumbA || !thumbD || !thumbR || !multiSliderContainer) {
      return;
    }

    const timbre = store.state.timbres[currentColor];
    if (!timbre) {return;}

    const sustainPercent = sustain * 100;
    sustainThumb.style.bottom = `${sustainPercent}%`;
    sustainTrack.style.setProperty('--sustain-progress', `${sustainPercent}%`);

    const maxTimeValue = getCurrentMaxTime();
    const aPercent = maxTimeValue > 0 ? (attack / maxTimeValue) * 100 : 0;
    const dPercent = maxTimeValue > 0 ? ((attack + decay) / maxTimeValue) * 100 : 0;
    const rPercent = maxTimeValue > 0 ? ((attack + decay + release) / maxTimeValue) * 100 : 0;

    thumbA.style.left = `${aPercent}%`;
    thumbD.style.left = `${dPercent}%`;
    thumbR.style.left = `${rPercent}%`;
    multiSliderContainer.style.setProperty('--adr-progress', `${rPercent}%`);

    const formatTime = (value: number) => `${value.toFixed(3)}s`;
    const formatSustain = (value: number) => `${(value * 100).toFixed(0)}%`;

    thumbA.title = `Attack: ${formatTime(attack)}`;
    thumbD.title = `Decay: ${formatTime(decay)}`;
    thumbR.title = `Release: ${formatTime(release)}`;
    sustainThumb.title = `Sustain: ${formatSustain(sustain)}`;

    const attackNodeTitle = nodeLayer?.querySelector<SVGTitleElement>('#attack-node > title');
    if (attackNodeTitle) {
      attackNodeTitle.textContent = `Attack: ${formatTime(attack)}`;
    }

    const decaySustainNodeTitle = nodeLayer?.querySelector<SVGTitleElement>('#decay-sustain-node > title');
    if (decaySustainNodeTitle) {
      decaySustainNodeTitle.textContent = `Decay: ${formatTime(decay)}\nSustain: ${formatSustain(sustain)}`;
    }

    const releaseNodeTitle = nodeLayer?.querySelector<SVGTitleElement>('#release-node > title');
    if (releaseNodeTitle) {
      releaseNodeTitle.textContent = `Release: ${formatTime(release)}`;
    }
  }

  function calculateEnvelopePoints(sourceAdsr: AdsrPlayheadEnvelope): EnvelopePoint[] {
    if (!width || !height) {return [];}

    const maxTimeValue = getCurrentMaxTime();
    if (!Number.isFinite(maxTimeValue) || maxTimeValue <= 0) {return [];}

    const normalizedAmplitude = getEnvelopeAmplitude(currentColor);
    if (!Number.isFinite(normalizedAmplitude)) {return [];}

    const plotBounds = getCanvasPlotBounds();
    const timeToX = (time: number) => {
      const timeRatio = Math.max(0, Math.min(1, time / maxTimeValue));
      return plotBounds.left + (timeRatio * plotBounds.width);
    };
    const amplitudeToY = (amplitude: number) => {
      const safeAmplitude = Math.max(0, Math.min(1, amplitude));
      return plotBounds.bottom - (safeAmplitude * plotBounds.height);
    };

    return [
      { x: plotBounds.left, y: height },
      { x: timeToX(sourceAdsr.attack), y: amplitudeToY(normalizedAmplitude) },
      {
        x: timeToX(sourceAdsr.attack + sourceAdsr.decay),
        y: amplitudeToY(Math.min(sourceAdsr.sustain * normalizedAmplitude, normalizedAmplitude))
      },
      {
        x: timeToX(sourceAdsr.attack + sourceAdsr.decay + sourceAdsr.release),
        y: plotBounds.bottom
      }
    ];
  }

  function render(): void {
    if (!gridLayer || !envelopeLayer || !nodeLayer) {return;}
    if (!width || !height) {return;}

    const maxTimeValue = getCurrentMaxTime();
    if (!Number.isFinite(maxTimeValue) || maxTimeValue <= 0) {return;}

    const normalizedAmplitude = getEnvelopeAmplitude(currentColor);
    if (!Number.isFinite(normalizedAmplitude)) {return;}

    const points = calculateEnvelopePoints({ attack, decay, sustain, release });
    const { inset: plotInset } = getCanvasPlotBounds();

    drawTempoGridlines(gridLayer, { width, height }, maxTimeValue, plotInset);
    drawEnvelope(
      envelopeLayer,
      nodeLayer,
      points,
      { width, height },
      currentColor,
      maxTimeValue,
      reverbCtx,
      plotInset
    );
    applyTheme(parentContainer, currentColor);
  }

  function resize(): void {
    if (!container) {return;}

    const nextWidth = container.clientWidth;
    const nextHeight = container.clientHeight;

    if (nextWidth <= 0 || nextHeight <= 0) {return;}

    width = nextWidth;
    height = nextHeight;

    if (reverbCanvas) {
      const dpr = window.devicePixelRatio || 1;
      reverbCanvas.width = nextWidth * dpr;
      reverbCanvas.height = nextHeight * dpr;

      if (!reverbCtx) {
        reverbCtx = reverbCanvas.getContext('2d');
      }

      if (reverbCtx) {
        reverbCtx.setTransform(1, 0, 0, 1, 0, 0);
        reverbCtx.scale(dpr, dpr);
      }
    }

    if (svgContainer) {
      svgContainer.setAttribute('viewBox', `0 0 ${nextWidth} ${nextHeight}`);
    }

    resizeAdsrPlayheadCanvas(nextWidth, nextHeight);

    scheduleRender();
  }

  $effect(() => {
    container = document.getElementById('adsr-envelope');
    if (!container) {
      logger.error('ADSREnvelope', 'ADSR container element not found', null, 'adsr');
      return;
    }

    parentContainer = container.closest('.adsr-container') as HTMLElement | null;
    sustainTrack = document.getElementById('sustain-slider-track');
    sustainThumb = document.getElementById('sustain-slider-thumb');
    multiSliderContainer = document.getElementById('multi-thumb-slider-container');
    thumbA = document.getElementById('thumb-a');
    thumbD = document.getElementById('thumb-d');
    thumbR = document.getElementById('thumb-r');
    reverbCtx = reverbCanvas?.getContext('2d') ?? null;

    const detachPlayheadCanvas = playheadCanvas
      ? attachAdsrPlayheadCanvas({
          canvas: playheadCanvas,
          getEnvelopePoints: calculateEnvelopePoints
        })
      : () => undefined;

    const observer = new ResizeObserver(() => resize());
    observer.observe(container);
    resize();

    return () => {
      observer.disconnect();
      detachPlayheadCanvas();
    };
  });

  $effect(() => {
    const handleNoteChanged = (payload: NoteChangedPayload = {}) => {
      const nextColor = payload.newNote?.color;
      if (nextColor && nextColor !== currentColor) {
        currentColor = nextColor;
        updateFromStore();
      }
    };

    const handleTimbreChanged = (color?: string) => {
      if (color === currentColor) {
        updateFromStore();
      }
    };

    const handleTempoChanged = () => scheduleRender();

    const handleAdsrTimeScaleChanged = () => {
      timeAxisScale = store.state.adsrTimeAxisScale;
      refreshAdsrPlayheadGeometry();
      scheduleRender();
    };

    const handleTremoloAmplitudeUpdate = (payload?: TremoloAmplitudePayload) => {
      if (payload?.activeColors?.includes(currentColor)) {
        scheduleRender(true);
      }
    };

    const handleAudioEffectChanged = (payload?: AudioEffectPayload) => {
      if (!payload) {return;}
      if (payload.color === currentColor && (payload.effectType === 'delay' || payload.effectType === 'reverb')) {
        scheduleRender();
      }
    };

    const handlePlaybackStateChanged = (payload?: PlaybackStatePayload) => {
      if (!payload?.isPlaying) {
        clearAdsrPlayheads();
      } else if (payload.isPaused) {
        pauseAdsrPlayheads();
      } else {
        resumeAdsrPlayheads();
      }
    };

    store.on('noteChanged', handleNoteChanged);
    store.on('timbreChanged', handleTimbreChanged);
    store.on('tempoChanged', handleTempoChanged);
    store.on('adsrTimeAxisScaleChanged', handleAdsrTimeScaleChanged);
    store.on('tremoloAmplitudeUpdate', handleTremoloAmplitudeUpdate);
    store.on('audioEffectChanged', handleAudioEffectChanged);
    store.on('playbackStateChanged', handlePlaybackStateChanged);

    updateFromStore();

    return () => {
      store.off('noteChanged', handleNoteChanged);
      store.off('timbreChanged', handleTimbreChanged);
      store.off('tempoChanged', handleTempoChanged);
      store.off('adsrTimeAxisScaleChanged', handleAdsrTimeScaleChanged);
      store.off('tremoloAmplitudeUpdate', handleTremoloAmplitudeUpdate);
      store.off('audioEffectChanged', handleAudioEffectChanged);
      store.off('playbackStateChanged', handlePlaybackStateChanged);
    };
  });

  $effect(() => {
    if (!sustainTrack || !multiSliderContainer || !svgContainer || !nodeLayer) {
      return;
    }

    let isDraggingSustain = false;
    let activeThumb: HTMLElement | null = null;
    let activeNode: SVGElement | null = null;

    const handleSustainDrag = (event: PointerEvent): void => {
      if (!isDraggingSustain || !sustainTrack) {return;}

      const rect = sustainTrack.getBoundingClientRect();
      const y = event.clientY - rect.top;
      let percent = 100 - (y / rect.height) * 100;
      percent = Math.max(0, Math.min(100, percent));

      const timbre = store.state.timbres[currentColor];
      if (!timbre) {return;}

      const nextAdsr = { ...timbre.adsr, sustain: percent / 100 };
      store.setADSR(currentColor, nextAdsr);
    };

    const handleSustainPointerDown = (event: PointerEvent): void => {
      isDraggingSustain = true;
      handleSustainDrag(event);
    };

    const handleSustainPointerUp = (): void => {
      isDraggingSustain = false;
    };

    const handleMultiDrag = (event: PointerEvent): void => {
      if (!activeThumb || !multiSliderContainer) {return;}

      const rect = multiSliderContainer.getBoundingClientRect();
      const x = event.clientX - rect.left;
      let percent = (x / rect.width) * 100;
      percent = Math.max(0, Math.min(100, percent));

      const timeValue = (percent / 100) * getCurrentMaxTime();
      const timbre = store.state.timbres[currentColor];
      if (!timbre) {return;}

      const { attack: currentAttack, decay: currentDecay, release: currentRelease } = timbre.adsr;
      const currentTimes = {
        a: currentAttack,
        d: currentAttack + currentDecay,
        r: currentAttack + currentDecay + currentRelease
      };

      const handle: TimeHandle = activeThumb.id === 'thumb-a'
        ? 'attack'
        : activeThumb.id === 'thumb-d'
          ? 'decay'
          : 'release';

      updateADSRFromAbsoluteTimes(resolvePushedAbsoluteTimes(handle, timeValue, currentTimes));
    };

    const handleMultiPointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.classList.contains('time-slider-thumb')) {
        activeThumb = target;
        handleMultiDrag(event);
      }
    };

    const handleMultiPointerUp = (): void => {
      activeThumb = null;
    };

    const handleNodeDrag = (event: PointerEvent): void => {
      if (!activeNode || !svgContainer) {return;}
      if (!width || !height) {return;}

      const point = svgContainer.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;

      const screenCTM = svgContainer.getScreenCTM();
      if (!screenCTM) {return;}

      const svgPoint = point.matrixTransform(screenCTM.inverse());
      const plotBounds = getCanvasPlotBounds();
      if (plotBounds.width <= 0 || plotBounds.height <= 0) {return;}

      let xPercent = ((svgPoint.x - plotBounds.left) / plotBounds.width) * 100;
      let yPercent = (plotBounds.bottom - svgPoint.y) / plotBounds.height;
      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(1, yPercent));

      const timeValue = (xPercent / 100) * getCurrentMaxTime();
      const timbre = store.state.timbres[currentColor];
      if (!timbre) {return;}

      const { attack: currentAttack, decay: currentDecay, release: currentRelease } = timbre.adsr;
      let nextSustain = timbre.adsr.sustain;

      const currentTimes = {
        a: currentAttack,
        d: currentAttack + currentDecay,
        r: currentAttack + currentDecay + currentRelease
      };

      switch (activeNode.id) {
        case 'attack-node':
          Object.assign(currentTimes, resolvePushedAbsoluteTimes('attack', timeValue, currentTimes));
          break;
        case 'decay-sustain-node': {
          Object.assign(currentTimes, resolvePushedAbsoluteTimes('decay', timeValue, currentTimes));
          const normalizedAmplitude = getEnvelopeAmplitude(currentColor);
          if (normalizedAmplitude > 0) {
            // Sustain is an envelope ratio; convert the rendered waveform amplitude back to that ratio.
            nextSustain = Math.min(1, yPercent / normalizedAmplitude);
          }
          break;
        }
        case 'release-node':
          Object.assign(currentTimes, resolvePushedAbsoluteTimes('release', timeValue, currentTimes));
          break;
      }

      const prevSustain = timbre.adsr.sustain;
      if (nextSustain !== prevSustain) {
        const nextAdsr = {
          attack: currentAttack,
          decay: currentDecay,
          release: currentRelease,
          sustain: nextSustain
        };
        store.setADSR(currentColor, nextAdsr);
      }

      updateADSRFromAbsoluteTimes(currentTimes);
    };

    const handleNodePointerDown = (event: PointerEvent): void => {
      const target = event.target as SVGElement | null;
      if (target?.classList.contains('adsr-node')) {
        activeNode = target;
        activeNode.style.cursor = 'grabbing';
        handleNodeDrag(event);
      }
    };

    const handleNodePointerUp = (): void => {
      if (activeNode) {
        activeNode.style.cursor = 'grab';
        activeNode = null;
      }
    };

    sustainTrack.addEventListener('pointerdown', handleSustainPointerDown);
    document.addEventListener('pointermove', handleSustainDrag);
    document.addEventListener('pointerup', handleSustainPointerUp);

    multiSliderContainer.addEventListener('pointerdown', handleMultiPointerDown);
    document.addEventListener('pointermove', handleMultiDrag);
    document.addEventListener('pointerup', handleMultiPointerUp);

    nodeLayer.addEventListener('pointerdown', handleNodePointerDown);
    document.addEventListener('pointermove', handleNodeDrag);
    document.addEventListener('pointerup', handleNodePointerUp);

    return () => {
      sustainTrack?.removeEventListener('pointerdown', handleSustainPointerDown);
      document.removeEventListener('pointermove', handleSustainDrag);
      document.removeEventListener('pointerup', handleSustainPointerUp);

      multiSliderContainer?.removeEventListener('pointerdown', handleMultiPointerDown);
      document.removeEventListener('pointermove', handleMultiDrag);
      document.removeEventListener('pointerup', handleMultiPointerUp);

      nodeLayer?.removeEventListener('pointerdown', handleNodePointerDown);
      document.removeEventListener('pointermove', handleNodeDrag);
      document.removeEventListener('pointerup', handleNodePointerUp);
    };
  });

</script>

<canvas
  class="adsr-reverb-canvas"
  bind:this={reverbCanvas}
  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"
></canvas>
<svg bind:this={svgContainer} width="100%" height="100%">
  <g bind:this={gridLayer}></g>
  <g bind:this={envelopeLayer}></g>
  <g bind:this={nodeLayer}></g>
</svg>
<canvas
  class="adsr-playhead-canvas"
  bind:this={playheadCanvas}
  aria-hidden="true"
  style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;"
></canvas>
