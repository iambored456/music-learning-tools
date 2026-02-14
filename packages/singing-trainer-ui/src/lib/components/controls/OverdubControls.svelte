<script lang="ts">
  import { appState, type MicTrailColorMode } from '../../stores/appState.svelte.js';
  import { overdubState } from '../../stores/overdubState.svelte.js';
  import { overdubExerciseState } from '../../stores/overdubExerciseState.svelte.js';
  import { highwayState } from '../../stores/highwayState.svelte.js';

  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();

  const machine = $derived(overdubState.state.engine);
  const project = $derived(machine.project);
  const layers = $derived(project.layers);
  const mode = $derived(machine.mode);
  const warning = $derived(overdubState.state.warning);
  const isBusy = $derived(overdubState.state.isBusy);
  const isRecording = $derived(overdubState.state.isRecordingActive);
  const isCountIn = $derived(overdubState.state.isCountInActive);
  const captureRatio = $derived(overdubState.captureProgressRatio);
  const captureDurationMs = $derived(overdubState.captureDurationMs);
  const pendingTake = $derived(machine.pendingTake);
  const overdubIsActive = $derived(overdubExerciseState.state.isActive);
  const overdubExerciseName = $derived(overdubExerciseState.state.template?.name ?? '');
  const overdubExerciseId = $derived(overdubExerciseState.state.exerciseId);
  const overdubVoices = $derived(overdubExerciseState.getVoiceList());
  const overdubActiveVoiceId = $derived(overdubExerciseState.state.activeVoiceId);
  const overdubExercisePlaying = $derived(overdubExerciseState.state.isPlaying);
  const beatLineMode = $derived(appState.state.beatLineMode);
  const overdubMicTrailColorMode = $derived(appState.state.overdubMicTrailColorMode);
  const DEFAULT_VOICE_GAIN = 1.1;
  const DEFAULT_SYNTH_GAIN = 1;
  const TIMELINE_MIN_ZOOM = 1;
  const TIMELINE_MAX_ZOOM = 15;
  let voiceSettingsVoiceId = $state<string | null>(null);
  let hasRecordedInCurrentExerciseSession = $state(false);
  let lastSeenExerciseId = $state<string | null>(null);

  function getVoiceById(voiceId: string) {
    return overdubVoices.find((voice) => voice.voiceId === voiceId) ?? null;
  }

  function getLayerByVoiceId(voiceId: string) {
    const voice = getVoiceById(voiceId);
    if (!voice) return null;
    return layers.find((layer) => layer.name === voice.name) ?? null;
  }

  const hasExerciseRecordTarget = $derived.by(() => {
    if (!overdubIsActive) return true;
    if (!overdubActiveVoiceId) return false;
    return getLayerByVoiceId(overdubActiveVoiceId) !== null;
  });

  const canKeep = $derived(mode === 'reviewing' && !!pendingTake);
  const canRedoPendingTake = $derived(
    canKeep && (!overdubIsActive || hasRecordedInCurrentExerciseSession)
  );
  const canStopCapture = $derived(isCountIn || isRecording);
  const isPendingTakePreviewActive = $derived(overdubState.state.isPendingTakePreviewActive);
  const isPlaybackRunning = $derived(overdubExercisePlaying || mode === 'playing' || isPendingTakePreviewActive);
  const canRecord = $derived(
    canStopCapture
    || canRedoPendingTake
    || (
      !isBusy
      && !isRecording
      && mode !== 'playing'
      && mode !== 'exporting'
      && !overdubExercisePlaying
      && hasExerciseRecordTarget
    )
  );
  let scaffoldInFlight = $state(false);

  function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function fitTimelineToExerciseDuration() {
    const durationMs = overdubIsActive
      ? (overdubExerciseState.state.durationMs || overdubState.captureDurationMs)
      : overdubState.captureDurationMs;
    if (durationMs > 0) {
      const phraseTempoBpm = Math.max(20, Math.round(project.phrase.tempoBpm));
      const denominator = Math.max(1, Math.round(project.phrase.timeSignatureDenominator));
      const beatDurationMs = (60_000 / phraseTempoBpm) * (4 / denominator);
      const boundaryPaddingMs = overdubIsActive
        ? Math.max(0, Math.round(beatDurationMs * 4))
        : 0;
      highwayState.fitTimelineToDuration(durationMs, {
        paddingBeforeMs: boundaryPaddingMs,
        paddingAfterMs: boundaryPaddingMs,
      });
    }
  }

  const timelineDurationMs = $derived(
    Math.max(1, Math.round(highwayState.state.timelineDurationMs))
  );
  const timelineViewDurationMs = $derived(
    clampNumber(
      Math.round(highwayState.state.timelineViewDurationMs),
      1,
      timelineDurationMs,
    )
  );
  const timelineMaxStartMs = $derived(
    Math.max(0, timelineDurationMs - timelineViewDurationMs)
  );
  const timelineViewStartMs = $derived(
    clampNumber(
      Math.round(highwayState.state.timelineViewStartMs),
      0,
      timelineMaxStartMs,
    )
  );
  const timelineZoomRatio = $derived(
    timelineViewDurationMs > 0
      ? timelineDurationMs / timelineViewDurationMs
      : 1
  );
  const timelineScrollPercent = $derived(
    timelineMaxStartMs > 0
      ? (timelineViewStartMs / timelineMaxStartMs) * 100
      : 0
  );
  const timelineViewportControlsEnabled = $derived(
    !isCountIn
    && !isRecording
    && (highwayState.state.targetNotes.length > 0 || overdubIsActive)
  );

  function setTimelineZoomRatio(zoomRatio: number, anchorRatio: number = 0.5) {
    const clampedZoom = clampNumber(
      Number.isFinite(zoomRatio) ? zoomRatio : 1,
      TIMELINE_MIN_ZOOM,
      TIMELINE_MAX_ZOOM,
    );
    const nextViewDurationMs = timelineDurationMs / clampedZoom;
    highwayState.setTimelineViewDurationMs(nextViewDurationMs, anchorRatio);
  }

  function handleTimelineZoomIn() {
    setTimelineZoomRatio(timelineZoomRatio * 1.2);
  }

  function handleTimelineZoomOut() {
    setTimelineZoomRatio(timelineZoomRatio / 1.2);
  }

  function handleTimelineFit() {
    highwayState.resetTimelineViewport();
  }

  function handleTimelineZoomInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const zoomRatio = Number.parseFloat(target.value);
    if (!Number.isFinite(zoomRatio)) return;
    setTimelineZoomRatio(zoomRatio);
  }

  function handleTimelineScrollInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const ratio = clampNumber(Number.parseFloat(target.value), 0, 100) / 100;
    const nextStartMs = ratio * timelineMaxStartMs;
    highwayState.setTimelineViewStartMs(nextStartMs);
  }

  type PlaybackTempoContext = {
    phraseTempoBpm: number;
    effectiveTempoBpm: number;
    highwayTempoBpm: number;
  };

  function getPlaybackTempoContext(): PlaybackTempoContext {
    const denominator = Math.max(1, project.phrase.timeSignatureDenominator);
    const phraseTempoBpm = Math.max(20, Math.round(project.phrase.tempoBpm));
    const exerciseTempoBpm = Math.max(20, Math.round(overdubExerciseState.state.tempo || phraseTempoBpm));
    const effectiveTempoBpm = overdubIsActive ? exerciseTempoBpm : phraseTempoBpm;
    const highwayTempoBpm = effectiveTempoBpm * (denominator / 4);
    return {
      phraseTempoBpm,
      effectiveTempoBpm,
      highwayTempoBpm,
    };
  }

  function syncProjectTempoWithExercise(): PlaybackTempoContext {
    const context = getPlaybackTempoContext();
    if (overdubIsActive && context.phraseTempoBpm !== context.effectiveTempoBpm) {
      overdubState.setPhraseSettings({ tempoBpm: context.effectiveTempoBpm });
    }
    return context;
  }

  async function handleInitialize() {
    await overdubState.initialize();
  }

  async function handleRecord() {
    if (isCountIn || isRecording) {
      if (overdubIsActive) {
        overdubExerciseState.stop();
      }
      await overdubState.stopAndRedoCurrentTake();
      fitTimelineToExerciseDuration();
      return;
    }

    if (canRedoPendingTake) {
      handleRedoTake();
      return;
    }

    if (overdubIsActive && overdubActiveVoiceId) {
      const layer = getLayerByVoiceId(overdubActiveVoiceId);
      if (layer) {
        overdubState.armLayer(layer.id);
      }
    }

    if (overdubIsActive) {
      const tempoContext = syncProjectTempoWithExercise();
      try {
        await overdubState.startRecordingCycle({
          onScheduled: (schedule) => {
            hasRecordedInCurrentExerciseSession = true;
            void overdubExerciseState.start({
              startDelayMs: schedule.startDelayMs,
              startAtPerfMs: schedule.startAtPerfMs,
              leadInBeats: Math.max(0, Math.round(project.phrase.countInBeats)),
              tempoBpm: tempoContext.highwayTempoBpm,
            });
          },
        });
      } finally {
        overdubExerciseState.stop();
        fitTimelineToExerciseDuration();
      }
      return;
    }

    await overdubState.startRecordingCycle();
    fitTimelineToExerciseDuration();
  }

  async function handleKeepTake() {
    await overdubState.keepPendingTake();
  }

  async function handlePreviewTake() {
    if (isPendingTakePreviewActive) {
      await overdubState.stopCompositePlayback();
      return;
    }
    await overdubState.previewPendingTake();
  }

  function handleRedoTake() {
    overdubState.redoPendingTake();
  }

  async function handlePlayback() {
    if (isPlaybackRunning) {
      overdubExerciseState.stop();
      await overdubState.stopCompositePlayback();
      return;
    }

    if (canRedoPendingTake) {
      await handlePreviewTake();
      return;
    }

    if (overdubIsActive) {
      const tempoContext = syncProjectTempoWithExercise();
      const playback = await overdubState.playComposite();
      await overdubExerciseState.start({
        startDelayMs: playback.startDelayMs,
        startAtPerfMs: playback.startAtPerfMs,
        leadInBeats: Math.max(0, Math.round(project.phrase.countInBeats)),
        tempoBpm: tempoContext.highwayTempoBpm,
      });
      return;
    }

    await overdubState.playComposite();
  }

  const COUNT_IN_OPTIONS = [0, 4, 8] as const;
  const BEAT_LINE_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'beat', label: 'Beat' },
    { value: 'bar', label: 'Bar' },
  ] as const;
  const MIC_TRAIL_COLOR_OPTIONS: Array<{ value: MicTrailColorMode; label: string }> = [
    { value: 'voice', label: 'Voice' },
    { value: 'rainbow', label: 'Rainbow' },
  ];
  const CLICK_TRACK_OPTIONS: Array<{ enabled: boolean; label: string }> = [
    { enabled: true, label: 'On' },
    { enabled: false, label: 'Off' },
  ];

  function handleCountInSelect(countInBeats: number) {
    overdubState.setPhraseSettings({ countInBeats });
  }

  function handleBeatLineModeSelect(mode: 'none' | 'beat' | 'bar') {
    appState.setBeatLineMode(mode);
  }

  function handleMicTrailColorModeSelect(mode: MicTrailColorMode) {
    appState.setOverdubMicTrailColorMode(mode);
  }

  function handleClickTrackEnabled(enabled: boolean) {
    overdubState.setClickEnabled(enabled);
  }

  function handleOverdubReset() {
    overdubExerciseState.reset();
    void overdubState.stopCompositePlayback();
  }

  function handleVoiceSelect(voiceId: string) {
    const nextVoiceId = overdubActiveVoiceId === voiceId ? null : voiceId;
    overdubExerciseState.setActiveVoice(nextVoiceId);

    if (!nextVoiceId) return;
    const layer = getLayerByVoiceId(nextVoiceId);
    if (layer) {
      overdubState.armLayer(layer.id);
    }
  }

  function isGuideEnabled(voiceId: string): boolean {
    return overdubExerciseState.isGuideVoiceEnabled(voiceId);
  }

  function isVoiceVisible(voiceId: string): boolean {
    return overdubExerciseState.isVoiceVisible(voiceId);
  }

  function isVoiceHiddenAndMuted(voiceId: string): boolean {
    return !isVoiceVisible(voiceId) && !isGuideEnabled(voiceId);
  }

  function handleVoiceHideMuteToggle(voiceId: string) {
    const shouldShowAndUnmute = isVoiceHiddenAndMuted(voiceId);
    overdubExerciseState.setGuideVoiceEnabled(voiceId, shouldShowAndUnmute);
    overdubExerciseState.setVoiceVisible(voiceId, shouldShowAndUnmute);
  }

  function isVoiceSettingsOpen(voiceId: string): boolean {
    return voiceSettingsVoiceId === voiceId;
  }

  function toggleVoiceSettings(voiceId: string) {
    voiceSettingsVoiceId = voiceSettingsVoiceId === voiceId ? null : voiceId;
  }

  function getVoiceLayerGain(voiceId: string): number {
    const layer = getLayerByVoiceId(voiceId);
    if (!layer) return DEFAULT_VOICE_GAIN;
    const gain = Number.isFinite(layer.gain) ? layer.gain : DEFAULT_VOICE_GAIN;
    return clampNumber(gain, 0, 2);
  }

  function getVoiceLayerPan(voiceId: string): number {
    const layer = getLayerByVoiceId(voiceId);
    if (!layer) return 0;
    const pan = Number.isFinite(layer.pan) ? layer.pan : 0;
    return clampNumber(pan, -1, 1);
  }

  function getVoiceSynthGain(voiceId: string): number {
    const gain = overdubExerciseState.getSynthGain(voiceId);
    if (!Number.isFinite(gain)) return DEFAULT_SYNTH_GAIN;
    return clampNumber(gain, 0, 2);
  }

  function getVoiceSynthPan(voiceId: string): number {
    const pan = overdubExerciseState.getSynthPan(voiceId);
    if (!Number.isFinite(pan)) return 0;
    return clampNumber(pan, -1, 1);
  }

  function formatPanLabel(pan: number): string {
    const clamped = clampNumber(pan, -1, 1);
    if (Math.abs(clamped) < 0.01) return 'C';
    if (clamped < 0) return `L${Math.abs(clamped).toFixed(2)}`;
    return `R${clamped.toFixed(2)}`;
  }

  function handleVoiceGainInput(voiceId: string, event: Event) {
    const layer = getLayerByVoiceId(voiceId);
    if (!layer) return;
    const target = event.target as HTMLInputElement;
    const gain = clampNumber(Number.parseFloat(target.value), 0, 2);
    if (!Number.isFinite(gain)) return;
    overdubState.setLayerGain(layer.id, gain);
  }

  function handleVoicePanInput(voiceId: string, event: Event) {
    const layer = getLayerByVoiceId(voiceId);
    if (!layer) return;
    const target = event.target as HTMLInputElement;
    const pan = clampNumber(Number.parseFloat(target.value), -1, 1);
    if (!Number.isFinite(pan)) return;
    overdubState.setLayerPan(layer.id, pan);
  }

  function handleVoiceSynthGainInput(voiceId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const gain = clampNumber(Number.parseFloat(target.value), 0, 2);
    if (!Number.isFinite(gain)) return;
    overdubExerciseState.setSynthGain(voiceId, gain);
  }

  function handleVoiceSynthPanInput(voiceId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const pan = clampNumber(Number.parseFloat(target.value), -1, 1);
    if (!Number.isFinite(pan)) return;
    overdubExerciseState.setSynthPan(voiceId, pan);
  }

  function shouldVoiceSettingsOpenUp(voiceIndex: number): boolean {
    const voiceCount = overdubVoices.length;
    return voiceCount > 2 && voiceIndex >= voiceCount - 2;
  }

  const VISIBLE_TAKE_SLOTS = 3;

  function getTakeForSlot(voiceId: string, slotIndex: number) {
    const layer = getLayerByVoiceId(voiceId);
    if (!layer) return null;
    return layer.takes[slotIndex] ?? null;
  }

  function isTakeSlotActive(voiceId: string, slotIndex: number): boolean {
    const layer = getLayerByVoiceId(voiceId);
    const take = getTakeForSlot(voiceId, slotIndex);
    if (!layer || !take) return false;
    if (!overdubState.hasTakeAudio(take.id)) return false;
    return layer.activeTakeId === take.id && !layer.muted;
  }

  function isTakeSlotPlayable(voiceId: string, slotIndex: number): boolean {
    const take = getTakeForSlot(voiceId, slotIndex);
    if (!take) return false;
    return overdubState.hasTakeAudio(take.id);
  }

  function isTakeSlotMissingAudio(voiceId: string, slotIndex: number): boolean {
    const take = getTakeForSlot(voiceId, slotIndex);
    return !!take && !overdubState.hasTakeAudio(take.id);
  }

  function handleTakeSlotToggle(voiceId: string, slotIndex: number) {
    const layer = getLayerByVoiceId(voiceId);
    const take = getTakeForSlot(voiceId, slotIndex);
    if (!layer || !take) return;
    if (!overdubState.hasTakeAudio(take.id)) return;

    const active = layer.activeTakeId === take.id && !layer.muted;
    if (active) {
      overdubState.setLayerMuted(layer.id, true);
      overdubState.setLayerSolo(layer.id, false);
      return;
    }

    overdubState.setActiveTake(layer.id, take.id);
    overdubState.setLayerMuted(layer.id, false);
    overdubState.setLayerSolo(layer.id, false);
  }

  function getNextRecordTakeSlot(voiceId: string): number {
    const layer = getLayerByVoiceId(voiceId);
    if (!layer) return 1;
    return clampNumber(layer.takes.length + 1, 1, VISIBLE_TAKE_SLOTS);
  }

  function isProjectScaffoldedForTemplate(template: { name: string; config: { voices: { name: string }[] } }): boolean {
    const expectedTitle = `${template.name} Takes`;
    if (project.title !== expectedTitle) return false;

    const expectedVoiceNames = template.config.voices.map((voice) => voice.name);
    if (layers.length !== expectedVoiceNames.length) return false;

    for (let i = 0; i < expectedVoiceNames.length; i++) {
      if (layers[i]?.name !== expectedVoiceNames[i]) {
        return false;
      }
    }
    return true;
  }

  $effect(() => {
    if (overdubState.state.initialized) return;
    void handleInitialize();
  });

  $effect(() => {
    const session = overdubExerciseState.state;
    if (!session.isActive || !session.template || !session.exerciseId) {
      return;
    }
    if (isProjectScaffoldedForTemplate(session.template)) {
      return;
    }
    if (scaffoldInFlight) {
      return;
    }

    scaffoldInFlight = true;
    void overdubState.loadExerciseScaffold(session.template)
      .catch((error) => {
        console.error('[OverdubBuilder] scaffold:error', error);
      })
      .finally(() => {
        scaffoldInFlight = false;
      });
  });

  $effect(() => {
    if (overdubExerciseId !== lastSeenExerciseId) {
      lastSeenExerciseId = overdubExerciseId;
      hasRecordedInCurrentExerciseSession = false;
    }

    if (!overdubIsActive) {
      hasRecordedInCurrentExerciseSession = false;
    }
  });

  $effect(() => {
    if (!overdubIsActive) {
      voiceSettingsVoiceId = null;
      return;
    }

    if (
      voiceSettingsVoiceId
      && !overdubVoices.some((voice) => voice.voiceId === voiceSettingsVoiceId)
    ) {
      voiceSettingsVoiceId = null;
    }
  });

  $effect(() => {
    if (!voiceSettingsVoiceId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.voice-row-wrap')) return;
      voiceSettingsVoiceId = null;
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  });
</script>

<div class="overdub-panel" class:overdub-panel--compact={compact}>
  {#if warning}
    <div class="warning">{warning}</div>
  {/if}

  <div class="builder-layout" class:builder-layout--no-voices={!overdubIsActive}>
    {#if overdubIsActive}
      <section class="exercise-section" aria-label="Exercise voices">
        <div class="voice-rows">
          {#each overdubVoices as voice, voiceIndex}
            <div
              class="voice-row-wrap"
              class:voice-row-wrap--settings-open={isVoiceSettingsOpen(voice.voiceId)}
            >
              <div class="voice-row" class:voice-row--active={overdubActiveVoiceId === voice.voiceId}>
                <div class="voice-left">
                  <button class="voice-select-btn" onclick={() => handleVoiceSelect(voice.voiceId)}>
                    <span class="voice-swatch" style="background-color: {voice.color}"></span>
                    <span class="voice-label">{voice.name}</span>
                  </button>
                  {#if overdubActiveVoiceId === voice.voiceId}
                    <span class="voice-rec-indicator">REC T{getNextRecordTakeSlot(voice.voiceId)}</span>
                  {/if}
                </div>
                <div class="take-slots" role="group" aria-label={`${voice.name} take slots`}>
                  {#each Array.from({ length: VISIBLE_TAKE_SLOTS }) as _, slotIndex}
                    <button
                      class="take-slot-btn"
                      class:take-slot-btn--active={isTakeSlotActive(voice.voiceId, slotIndex)}
                      class:take-slot-btn--missing={isTakeSlotMissingAudio(voice.voiceId, slotIndex)}
                      disabled={!isTakeSlotPlayable(voice.voiceId, slotIndex)}
                      onclick={() => handleTakeSlotToggle(voice.voiceId, slotIndex)}
                      title={isTakeSlotMissingAudio(voice.voiceId, slotIndex) ? 'Take audio missing for this slot' : undefined}
                    >
                      T{slotIndex + 1}
                    </button>
                  {/each}
                </div>
                <div class="voice-visibility">
                  <button
                    type="button"
                    class="show-btn"
                    class:show-btn--off={isVoiceHiddenAndMuted(voice.voiceId)}
                    aria-pressed={!isVoiceHiddenAndMuted(voice.voiceId)}
                    onclick={() => handleVoiceHideMuteToggle(voice.voiceId)}
                    title={isVoiceHiddenAndMuted(voice.voiceId)
                      ? 'Show voice on pitch grid and unmute guide voice'
                      : 'Hide voice from pitch grid and mute guide voice'}
                  >
                    {isVoiceHiddenAndMuted(voice.voiceId) ? 'Show' : 'Hide'}
                  </button>
                </div>
                <div class="voice-settings">
                  <button
                    type="button"
                    class="voice-settings-btn"
                    class:voice-settings-btn--active={isVoiceSettingsOpen(voice.voiceId)}
                    onclick={() => toggleVoiceSettings(voice.voiceId)}
                    aria-expanded={isVoiceSettingsOpen(voice.voiceId)}
                    aria-label={`Voice mix settings for ${voice.name}`}
                    title="Voice mix settings"
                  >
                    &#9881;
                  </button>
                </div>
              </div>

              {#if isVoiceSettingsOpen(voice.voiceId)}
                <div
                  class="voice-settings-panel"
                  class:voice-settings-panel--up={shouldVoiceSettingsOpenUp(voiceIndex)}
                  role="group"
                  aria-label={`${voice.name} mix settings`}
                >
                  <div class="voice-settings-section-label">Synth</div>
                  <label class="voice-slider-row">
                    <span class="voice-slider-label">Gain</span>
                    <input
                      class="voice-slider"
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={getVoiceSynthGain(voice.voiceId)}
                      oninput={(event) => handleVoiceSynthGainInput(voice.voiceId, event)}
                    />
                    <span class="voice-slider-value">{getVoiceSynthGain(voice.voiceId).toFixed(2)}x</span>
                  </label>

                  <label class="voice-slider-row">
                    <span class="voice-slider-label">Pan</span>
                    <input
                      class="voice-slider"
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={getVoiceSynthPan(voice.voiceId)}
                      oninput={(event) => handleVoiceSynthPanInput(voice.voiceId, event)}
                    />
                    <span class="voice-slider-value">{formatPanLabel(getVoiceSynthPan(voice.voiceId))}</span>
                  </label>

                  <div class="voice-settings-section-label voice-settings-section-label--spaced">Take</div>
                  <label class="voice-slider-row">
                    <span class="voice-slider-label">Gain</span>
                    <input
                      class="voice-slider"
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={getVoiceLayerGain(voice.voiceId)}
                      oninput={(event) => handleVoiceGainInput(voice.voiceId, event)}
                    />
                    <span class="voice-slider-value">{getVoiceLayerGain(voice.voiceId).toFixed(2)}x</span>
                  </label>

                  <label class="voice-slider-row">
                    <span class="voice-slider-label">Pan</span>
                    <input
                      class="voice-slider"
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={getVoiceLayerPan(voice.voiceId)}
                      oninput={(event) => handleVoicePanInput(voice.voiceId, event)}
                    />
                    <span class="voice-slider-value">{formatPanLabel(getVoiceLayerPan(voice.voiceId))}</span>
                  </label>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <section class="controls-section" aria-label="Recording controls">
      <div class="overdub-header">
        <span class="title">
          Overdub Builder
          {#if overdubIsActive && overdubExerciseName}
            {' - '}
            {overdubExerciseName}
          {/if}
        </span>
        {#if overdubIsActive}
          <button class="mini-btn" onclick={handleOverdubReset} aria-label="Close exercise">&#10005;</button>
        {/if}
      </div>

      <div class="controls-layout">
        <div class="controls-column controls-column--timing">
          <div class="field">
            <span>Count-In Beats</span>
            <div class="count-in-buttons" role="group" aria-label="Count-in beats">
              {#each COUNT_IN_OPTIONS as countInBeats}
                <button
                  type="button"
                  class="count-in-btn"
                  class:count-in-btn--active={project.phrase.countInBeats === countInBeats}
                  onclick={() => handleCountInSelect(countInBeats)}
                >
                  {countInBeats}
                </button>
              {/each}
            </div>
          </div>
          <div class="field">
            <span>Beatlines</span>
            <div class="mode-buttons" role="group" aria-label="Beatline visibility mode">
              {#each BEAT_LINE_OPTIONS as option}
                <button
                  type="button"
                  class="mode-btn"
                  class:mode-btn--active={beatLineMode === option.value}
                  onclick={() => handleBeatLineModeSelect(option.value)}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="controls-column controls-column--trail">
          <div class="field">
            <span>Mic Trail Color</span>
            <div class="mode-buttons" role="group" aria-label="Mic trail color mode">
              {#each MIC_TRAIL_COLOR_OPTIONS as option}
                <button
                  type="button"
                  class="mode-btn"
                  class:mode-btn--active={overdubMicTrailColorMode === option.value}
                  onclick={() => handleMicTrailColorModeSelect(option.value)}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </div>
          <div class="field">
            <span>Click Track</span>
            <div class="mode-buttons" role="group" aria-label="Click track mode">
              {#each CLICK_TRACK_OPTIONS as option}
                <button
                  type="button"
                  class="mode-btn"
                  class:mode-btn--active={project.clickEnabled === option.enabled}
                  onclick={() => handleClickTrackEnabled(option.enabled)}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="controls-column controls-column--timeline">
          <div class="field timeline-field">
            <span>Timeline View</span>
            <div class="timeline-zoom-row" role="group" aria-label="Timeline zoom controls">
              <button
                type="button"
                class="timeline-btn"
                onclick={handleTimelineZoomOut}
                disabled={!timelineViewportControlsEnabled}
              >
                -
              </button>
              <input
                class="timeline-zoom-slider"
                type="range"
                min={TIMELINE_MIN_ZOOM}
                max={TIMELINE_MAX_ZOOM}
                step="0.05"
                value={timelineZoomRatio}
                oninput={handleTimelineZoomInput}
                disabled={!timelineViewportControlsEnabled}
                aria-label="Timeline zoom"
              />
              <button
                type="button"
                class="timeline-btn"
                onclick={handleTimelineZoomIn}
                disabled={!timelineViewportControlsEnabled}
              >
                +
              </button>
              <button
                type="button"
                class="timeline-btn timeline-btn--fit"
                onclick={handleTimelineFit}
                disabled={!timelineViewportControlsEnabled}
              >
                Full
              </button>
            </div>
            <div class="timeline-scroll-row">
              <input
                class="timeline-scroll-slider"
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={timelineScrollPercent}
                oninput={handleTimelineScrollInput}
                disabled={!timelineViewportControlsEnabled || timelineMaxStartMs <= 0}
                aria-label="Timeline scroll"
              />
              <span class="timeline-zoom-readout">
                {Math.round(timelineZoomRatio * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div class="controls-column controls-column--actions">
          <div class="main-controls">
            <button
              class="record-btn"
              class:record-btn--redo={canRedoPendingTake && !canStopCapture}
              onclick={handleRecord}
              disabled={!canRecord}
              title={!canRedoPendingTake && !canStopCapture && overdubIsActive && !overdubActiveVoiceId
                ? 'Select a voice to record'
                : undefined}
            >
              {#if canStopCapture}
                Stop &amp; Redo
              {:else if canRedoPendingTake}
                Redo Take
              {:else}
                Record Take
              {/if}
            </button>
            <button class="play-btn" onclick={handlePlayback} disabled={isBusy || isRecording || isCountIn}>
              {#if canRedoPendingTake}
                {isPendingTakePreviewActive ? 'Stop Listen' : 'Listen Back'}
              {:else}
                {isPlaybackRunning ? 'Stop' : 'Play'}
              {/if}
            </button>
            <button class="keep-btn" onclick={handleKeepTake} disabled={isBusy || !canKeep}>Keep Take</button>
          </div>

          {#if isCountIn || isRecording}
            <div class="progress-wrap">
              <div class="progress-label">
                {isCountIn ? 'Count-In' : 'Recording'} ({Math.round(captureDurationMs / 1000)}s phrase)
              </div>
              <div class="progress-track">
                <div class="progress-fill" style={`width: ${Math.round(captureRatio * 100)}%`}></div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .overdub-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .overdub-panel--compact {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: var(--spacing-xs);
    align-items: start;
  }

  .overdub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .title {
    font-weight: 700;
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .warning {
    background: rgba(255, 153, 0, 0.12);
    border: 1px solid rgba(255, 153, 0, 0.45);
    color: #ffd48a;
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    line-height: 1.3;
  }

  .builder-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, 1fr);
    gap: var(--spacing-xs);
    align-items: start;
  }

  .builder-layout--no-voices {
    grid-template-columns: minmax(0, 1fr);
  }

  .exercise-section {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0;
    background: rgba(9, 14, 22, 0.55);
    overflow-x: auto;
  }

  .voice-rows {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: max-content;
  }

  .voice-row-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: max-content;
  }

  .voice-row-wrap--settings-open {
    z-index: 30;
  }

  .voice-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 4px;
    padding: 1px 3px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    min-width: max-content;
  }

  .voice-row--active {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }

  .voice-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .voice-select-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 6px;
    border: none;
    background: none;
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
    min-width: 0;
    flex: 1 1 auto;
  }

  .voice-select-btn:hover {
    opacity: 0.9;
  }

  .voice-swatch {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .voice-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .voice-rec-indicator {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #ffb48a;
    border: 1px solid rgba(255, 180, 138, 0.35);
    background: rgba(255, 120, 80, 0.12);
    border-radius: 999px;
    padding: 2px 6px;
    white-space: nowrap;
  }

  .take-slots {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .take-slot-btn {
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-muted);
    font-size: 10px;
    font-weight: 700;
    padding: 3px 6px;
    cursor: pointer;
    min-width: 30px;
  }

  .take-slot-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .take-slot-btn--active {
    color: #fff;
    border-color: rgba(84, 214, 144, 0.65);
    background: rgba(32, 147, 93, 0.5);
  }

  .take-slot-btn--missing {
    border-color: rgba(255, 176, 102, 0.62);
    background: rgba(128, 70, 20, 0.34);
    color: rgba(255, 223, 192, 0.95);
  }

  .voice-visibility {
    display: inline-flex;
    align-items: center;
  }

  .voice-settings {
    display: inline-flex;
    align-items: center;
  }

  .voice-settings-btn {
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 700;
    width: 28px;
    height: 24px;
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }

  .voice-settings-btn--active {
    color: #fff;
    border-color: rgba(115, 166, 255, 0.75);
    background: rgba(40, 93, 179, 0.58);
  }

  .voice-settings-panel {
    position: absolute;
    right: 3px;
    top: calc(100% + 2px);
    z-index: 35;
    width: min(280px, calc(100% - 6px));
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 7px 8px 8px 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(12, 18, 30, 0.96);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  }

  .voice-settings-panel--up {
    top: auto;
    bottom: calc(100% + 2px);
  }

  .voice-settings-section-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #93b7ff;
  }

  .voice-settings-section-label--spaced {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .voice-slider-row {
    display: grid;
    grid-template-columns: 36px minmax(120px, 1fr) 52px;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .voice-slider-label {
    font-weight: 700;
    color: var(--color-text);
  }

  .voice-slider {
    width: 100%;
    accent-color: #5f95ff;
  }

  .voice-slider-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #dfe8ff;
    font-weight: 700;
  }

  .show-btn {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(90, 129, 210, 0.3);
    color: #dfe8ff;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    min-width: 44px;
    cursor: pointer;
  }

  .show-btn--off {
    color: rgba(223, 232, 255, 0.55);
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    opacity: 0.55;
  }

  .controls-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 8px;
    background: rgba(9, 14, 22, 0.55);
  }

  .controls-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(170px, 220px);
    gap: var(--spacing-xs);
    align-items: start;
  }

  .controls-column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 0;
  }

  .controls-column--timeline {
    min-width: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .count-in-buttons {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .count-in-btn {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-muted);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    padding: 6px 10px;
    min-width: 34px;
    cursor: pointer;
  }

  .count-in-btn--active {
    color: #fff;
    border-color: rgba(84, 214, 144, 0.65);
    background: rgba(32, 147, 93, 0.5);
  }

  .mode-buttons {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .mode-btn {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-muted);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    padding: 6px 10px;
    min-width: 44px;
    cursor: pointer;
  }

  .mode-btn--active {
    color: #fff;
    border-color: rgba(98, 181, 255, 0.65);
    background: rgba(34, 110, 186, 0.52);
  }

  .timeline-field {
    gap: 6px;
  }

  .timeline-zoom-row {
    display: grid;
    grid-template-columns: auto minmax(120px, 1fr) auto auto;
    gap: 6px;
    align-items: center;
  }

  .timeline-btn {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-muted);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    min-height: 28px;
    min-width: 30px;
    padding: 5px 8px;
    cursor: pointer;
  }

  .timeline-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .timeline-btn--fit {
    min-width: 46px;
  }

  .timeline-zoom-slider,
  .timeline-scroll-slider {
    width: 100%;
    accent-color: #5f95ff;
  }

  .timeline-scroll-row {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .timeline-zoom-readout {
    min-width: 44px;
    text-align: right;
    font-size: 11px;
    font-weight: 700;
    color: #dfe8ff;
    font-variant-numeric: tabular-nums;
  }

  .main-controls {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: var(--spacing-xs);
  }

  .main-controls > button {
    width: 100%;
  }

  .record-btn,
  .play-btn,
  .keep-btn,
  .mini-btn {
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease;
    font-weight: 600;
  }

  .record-btn,
  .play-btn,
  .keep-btn {
    padding: 8px 10px;
    font-size: var(--font-size-xs);
    color: #fff;
  }

  .record-btn {
    background: #d54e3a;
  }

  .record-btn--redo {
    background: #aa6a2a;
  }

  .play-btn {
    background: #2a8f60;
  }

  .keep-btn {
    background: #2a6fbc;
  }

  .mini-btn {
    padding: 5px 8px;
    font-size: 11px;
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .progress-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .progress-track {
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.09);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3ccf8c, #64a6ff);
  }

  .overdub-panel--compact .warning,
  .overdub-panel--compact .builder-layout {
    grid-column: 1 / -1;
  }

  .overdub-panel--compact .builder-layout {
    grid-template-columns: minmax(0, 1.55fr) minmax(260px, 1fr);
  }

  .overdub-panel--compact .controls-section {
    gap: 6px;
  }

  .overdub-panel--compact .controls-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.25fr) minmax(150px, 190px);
  }

  .overdub-panel--compact .field {
    font-size: 11px;
  }

  .overdub-panel--compact .count-in-btn {
    padding: 5px 9px;
    font-size: 11px;
  }

  @media (max-width: 1200px) {
    .builder-layout,
    .overdub-panel--compact .builder-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .controls-layout,
    .overdub-panel--compact .controls-layout {
      grid-template-columns: 1fr;
    }

    .voice-slider-row {
      grid-template-columns: 36px minmax(120px, 1fr) 52px;
      justify-items: stretch;
    }

    .voice-slider-value {
      text-align: right;
    }
  }
</style>

