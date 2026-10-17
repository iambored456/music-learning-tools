<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { CHORD_QUALITIES, DIFFICULTIES, GAME_MODES, TrainerSession, allowedDegrees, applyPreset, defaultLessonTiming, difficultyIndex, emptyState, hasAnswerReview, isChordMode, isScored, isSequenceMode, lessonTiming, levelAccess, migrateFreeplaySettingsDefaults, migrateSettingsDefaults, nextPreset, normalizeCustomPresets, normalizeFreeplaySettings, normalizeLevelLocks, normalizeProgress, normalizeSettings, questionLength, recordProgress, settingsError, type CustomPreset, type GameMode, type Preset, type Progress, type Settings } from '@mlt/audiationer-trainer-core';
  import TrainerWheel from './TrainerWheel.svelte';
  import PracticeSettings from './PracticeSettings.svelte';
  import PocketSettings from './PocketSettings.svelte';
  import DegreesSettings from './DegreesSettings.svelte';
  import Presets from './Presets.svelte';
  import SessionResults from './SessionResults.svelte';
  import MelodyAnswer from './MelodyAnswer.svelte';
  import FreePlay from './FreePlay.svelte';
  import Icon from './Icon.svelte';
  import Gems from './Gems.svelte';
  import ContinueClock from './ContinueClock.svelte';
  import LevelLockSettings from './LevelLockSettings.svelte';
  import { BrowserTrainerAudio } from './audio.ts';
  import { MODE_PAIRS, modeIcon, modePair } from './modePairs.ts';

  type Screen = 'landing' | 'presets' | 'practice';
  const prefix = 'mlt.audiationer-trainer.';
  const modeOrder = GAME_MODES.filter(mode => mode.id !== 'cycle' && modePair(mode.id)?.modes[1] !== mode.id).map(mode => mode.id);
  const modeNames = Object.fromEntries(GAME_MODES.map(m => [m.id, m.name]));
  let settings = $state<Settings>(normalizeSettings({}));
  let freeplaySettings = $state(normalizeFreeplaySettings({}));
  let sessionState = $state(emptyState());
  let screen = $state<Screen>('landing');
  let custom = $state<CustomPreset[]>([]);
  let progress = $state<Progress>({});
  let levelLocks = $state(normalizeLevelLocks({}));
  let loaded = $state(false);
  let modal = $state<'practice' | 'custom' | 'pocket' | null>(null);
  let dialog = $state<HTMLDialogElement>();
  let draft = $state<Settings>(normalizeSettings({}));
  let exerciseOnSettingsOpen = '';
  let presetName = $state('');
  let editingId = $state<string | null>(null);
  let selection = $state<{ id: string | null; name: string }>({ id: null, name: 'Custom' });
  let clockNow = $state(0);
  let storageNotice = $state('');
  let runSettings = $state<Settings>(normalizeSettings({}));
  let runPreset = $state<string | null>(null);
  let runName = $state('Custom');
  const audio = new BrowserTrainerAudio();
  const session = new TrainerSession(audio, next => {
    const justFinished = next.phase === 'finished' && sessionState.phase !== 'finished';
    sessionState = next;
    if (justFinished) {
      progress = recordProgress(progress, runSettings, runPreset, next.results);
      focusHeading();
    }
  });
  const active = $derived(!['idle', 'finished'].includes(sessionState.phase));
  const scored = $derived(isScored(settings.mode));
  const correctAnswers = $derived(sessionState.results.filter(result => result.correct).length);
  const answeredQuestions = $derived(sessionState.results.length);
  const showingResults = $derived(screen === 'practice' && sessionState.phase === 'finished' && scored && sessionState.results.length > 0);
  const answerState = $derived(screen === 'practice' && scored && !modal
    ? sessionState.phase === 'answering' ? 'accepting'
      : sessionState.phase === 'feedback' ? sessionState.results.at(-1)?.correct ? 'correct' : 'incorrect'
      : null
    : null);
  const reviewFeedback = $derived(hasAnswerReview(sessionState));
  const sequenceMode = $derived(isSequenceMode(settings.mode));
  const sequenceFeedback = $derived(sequenceMode && reviewFeedback);
  const skippedFeedback = $derived(sessionState.phase === 'feedback' && sessionState.reviewSkipped);
  const autoContinuing = $derived(sessionState.phase === 'feedback' && sessionState.autoContinueDeadline !== null);
  const selectedMode = $derived(GAME_MODES.find(m => m.id === settings.mode)!);
  const selectedPair = $derived(modePair(settings.mode));
  const draftPair = $derived(modePair(draft.mode));
  const combinedPresets = $derived(screen === 'presets' && !!selectedPair);
  const degrees = $derived(allowedDegrees(settings));
  const error = $derived(settingsError(settings));
  const draftError = $derived(settingsError(draft));
  const secondsLeft = $derived(sessionState.answerDeadline === null ? null : Math.min(settings.answerSeconds, Math.max(0, (sessionState.answerDeadline - clockNow) / 1000)));
  const centreLabel = $derived(reviewFeedback || autoContinuing ? sessionState.results.length >= settings.rounds ? 'Show results' : 'Next question' : sessionState.tonicizing ? 'Establishing key' : !active ? (sessionState.results.length ? 'Start again' : 'Start') : sessionState.phase === 'exploring' ? 'Play cadence' : sessionState.phase === 'answering' ? 'Hear again' : sessionState.phase === 'feedback' ? 'Answer' : 'Listening');
  const centreEnabled = $derived(autoContinuing || reviewFeedback || !active || ['exploring', 'answering'].includes(sessionState.phase));
  const centreIcon = $derived(reviewFeedback ? 'next' : sessionState.tonicizing ? 'hourglass' : sessionState.phase === 'listening' ? 'ear' : answerState === 'accepting' ? 'question' : centreEnabled ? 'play' : 'note');
  const currentTonic = $derived(active ? sessionState.tonic : settings.tonic);
  const nextBuiltIn = $derived(nextPreset(runSettings.mode, runPreset));
  const nextLevelAccess = $derived(levelAccess(runSettings.mode, nextBuiltIn?.id ?? null, progress, levelLocks));
  const nextLevelLocked = $derived(!nextLevelAccess.unlocked);
  const nextLevelPrerequisite = $derived(nextLevelAccess.prerequisite?.name ?? null);
  const nextCustom = $derived.by(() => {
    const pair = modePair(runSettings.mode);
    const saved = custom.filter(preset => pair ? pair.modes.some(mode => mode === preset.settings.mode) : preset.settings.mode === runSettings.mode);
    const index = saved.findIndex(preset => preset.id === runPreset);
    return index < 0 ? null : saved[index + 1] ?? null;
  });
  const nextLevelName = $derived(nextBuiltIn?.name ?? nextCustom?.name ?? null);

  function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(prefix + key) ?? 'null'); } catch { return null; } }
  function save(key: string, value: unknown) {
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); }
    catch { storageNotice = 'Storage is unavailable. Changes will last for this visit only.'; }
  }
  onMount(() => {
    settings = migrateSettingsDefaults(read('settings.v1'));
    if (settings.mode === 'cycle') settings.mode = 'freeplay';
    freeplaySettings = migrateFreeplaySettingsDefaults(read('freeplay.v1') ?? { tonic: settings.tonic, octave: settings.octave });
    custom = normalizeCustomPresets(read('presets.v1')).map(preset => ({
      ...preset, settings: { ...preset.settings, mode: preset.settings.mode === 'cycle' ? 'freeplay' : preset.settings.mode },
    }));
    progress = normalizeProgress(read('progress.v1'));
    levelLocks = normalizeLevelLocks(read('level-locks.v1'));
    loaded = true;
    readRoute();
    const timer = setInterval(() => { if (sessionState.answerDeadline !== null) clockNow = performance.now(); }, 100);
    const stop = () => session.stop();
    window.addEventListener('hashchange', readRoute);
    window.addEventListener('pagehide', stop);
    return () => { clearInterval(timer); window.removeEventListener('hashchange', readRoute); window.removeEventListener('pagehide', stop); };
  });
  onDestroy(() => { session.destroy(); audio.dispose(); });
  $effect(() => { const value = $state.snapshot(settings); if (loaded) save('settings.v1', value); });
  $effect(() => { const value = $state.snapshot(freeplaySettings); if (loaded) save('freeplay.v1', value); });
  $effect(() => { const value = $state.snapshot(custom); if (loaded) save('presets.v1', value); });
  $effect(() => { const value = $state.snapshot(progress); if (loaded) save('progress.v1', value); });
  $effect(() => { const value = $state.snapshot(levelLocks); if (loaded) save('level-locks.v1', value); });
  $effect(() => {
    if (modal === 'practice' && exerciseSelection(settings) !== exerciseOnSettingsOpen) selection = { id: null, name: 'Custom' };
  });
  $effect(() => {
    if (!dialog) return;
    if (modal && !dialog.open) dialog.showModal();
    else if (!modal && dialog.open) dialog.close();
  });
  function readRoute() {
    const [page, requestedMode] = window.location.hash.slice(1).split('/');
    const requestedPair = page === 'presets' ? MODE_PAIRS.find(pair => pair.id === requestedMode) : undefined;
    const mode = requestedMode === 'cycle' ? 'freeplay' : requestedPair
      ? requestedPair.modes.some(member => member === settings.mode) ? settings.mode : requestedPair.modes[0] : requestedMode;
    const requestedTarget = (page === 'presets' || page === 'practice') && GAME_MODES.some(m => m.id === mode) ? page : 'landing';
    const target = requestedTarget === 'presets' && mode === 'freeplay' ? 'practice' : requestedTarget;
    if (target !== 'landing') {
      const routeMode = target === 'presets' ? modePair(mode as GameMode)?.id ?? mode : mode;
      if (requestedMode !== routeMode || target !== requestedTarget) window.history.replaceState(window.history.state, '', `#${target}/${routeMode}`);
    }
    if (target === screen && (target === 'landing' || mode === settings.mode)) return;
    session.reset(); modal = null; selection = { id: null, name: 'Custom' };
    if (target !== 'landing') {
      settings.mode = mode as GameMode;
    }
    screen = target;
    focusHeading();
  }
  function go(target: Screen, mode = settings.mode) {
    if (mode === 'cycle') mode = 'freeplay';
    if (mode === 'freeplay' && target !== 'landing') target = 'practice';
    session.reset(); modal = null; settings.mode = mode; screen = target;
    const routeMode = target === 'presets' ? modePair(mode)?.id ?? mode : mode;
    window.location.hash = target === 'landing' ? '' : `${target}/${routeMode}`;
    focusHeading();
  }
  function focusHeading() { void tick().then(() => document.getElementById('at-page-heading')?.focus({ preventScroll: true })); window.scrollTo({ top: 0 }); }
  function chooseMode(mode: GameMode) {
    selection = { id: null, name: 'Custom' };
    go(mode === 'freeplay' ? 'practice' : 'presets', mode);
  }
  function choosePreset(preset: Preset, mode = settings.mode) {
    if (!levelAccess(mode, preset.id, progress, levelLocks).unlocked) return;
    settings = applyPreset({ ...settings, mode }, preset);
    selection = { id: preset.id, name: preset.name };
    go('practice');
  }
  function chooseCustom(preset: CustomPreset, mode = preset.settings.mode) {
    settings = normalizeSettings({ ...preset.settings, mode, answerSeconds: settings.answerSeconds,
      timings: { ...settings.timings, ...Object.fromEntries((modePair(mode)?.modes ?? [mode]).map(member => [member, preset.settings.timings[member] ?? defaultLessonTiming(preset.settings, member)])) },
      randomOctave: mode === 'degrees' || mode === 'melody' ? true : preset.settings.randomOctave });
    selection = { id: preset.id, name: preset.name };
    go('practice');
  }
  function start() {
    if (!levelAccess(settings.mode, selection.id, progress, levelLocks).unlocked) { go('presets'); return; }
    clockNow = performance.now();
    runSettings = normalizeSettings($state.snapshot(settings));
    runPreset = selection.id; runName = selection.name;
    void session.start(runSettings);
  }
  function centreAction() {
    if (reviewFeedback || autoContinuing) void session.next();
    else if (!active) start();
    else if (sessionState.phase === 'exploring') void session.cadence();
    else if (sessionState.phase === 'answering') void session.repeat();
  }
  function openModeSettings() {
    if (!showingResults) session.reset();
    if (settings.mode === 'pocket') { modal = 'pocket'; return; }
    exerciseOnSettingsOpen = exerciseSelection(settings);
    modal = 'practice';
  }
  function exerciseSelection(value: Settings) {
    return JSON.stringify([value.mode, value.scale, value.degrees, value.qualities, questionLength(value)]);
  }
  function openCustom(preset?: CustomPreset) {
    draft = normalizeSettings(preset?.settings ?? $state.snapshot(settings));
    presetName = preset?.name ?? ''; editingId = preset?.id ?? null; modal = 'custom';
  }
  function savePreset(event: SubmitEvent) {
    event.preventDefault();
    if (draftError || !presetName.trim()) return;
    const preset = { id: editingId ?? `custom-${crypto.randomUUID()}`, name: presetName.trim().slice(0, 50), settings: normalizeSettings($state.snapshot(draft)) };
    const changed = JSON.stringify(custom.find(p => p.id === editingId)?.settings) !== JSON.stringify(preset.settings);
    custom = normalizeCustomPresets([...custom.filter(p => p.id !== preset.id), preset]);
    if (editingId && changed) {
      const next = { ...progress };
      for (const mode of draftPair?.modes ?? [draft.mode]) delete next[`${mode}:${editingId}`];
      progress = next;
    }
    if (editingId && selection.id === editingId) selection = { id: preset.id, name: preset.name };
    modal = null;
  }
  function deletePreset(id: string) {
    custom = custom.filter(p => p.id !== id);
    const next = { ...progress };
    for (const mode of GAME_MODES) delete next[`${mode.id}:${id}`];
    progress = next;
    if (selection.id === id) selection = { id: null, name: 'Custom' };
  }
  function playAgain() {
    start(); focusHeading();
  }
  function playNextLevel() {
    if (nextLevelLocked) return;
    if (nextBuiltIn) choosePreset(nextBuiltIn, runSettings.mode);
    else if (nextCustom) chooseCustom(nextCustom, runSettings.mode);
    else { go('presets', runSettings.mode); return; }
    start(); focusHeading();
  }
</script>

{#snippet centreSymbol(size: number)}
  {#if autoContinuing && sessionState.autoContinueDeadline !== null}
    {#key sessionState.autoContinueDeadline}<ContinueClock deadline={sessionState.autoContinueDeadline} seconds={lessonTiming(runSettings).correctDelaySeconds} {size} />{/key}
  {:else if !skippedFeedback}<Icon name={centreIcon} {size} />{/if}
{/snippet}

{#snippet homeButton()}
  {#if screen === 'landing'}
    <a class="at-icon-button" href={import.meta.env.BASE_URL} aria-label="Music Learning Tools home" title="Music Learning Tools home"><span class="at-home-icon" aria-hidden="true"></span></a>
  {:else if showingResults}
    {@const modeName = modePair(runSettings.mode)?.name ?? modeNames[runSettings.mode]}
    <button class="at-icon-button" aria-label={`Back to ${modeName} levels`} title={`Back to ${modeName} levels`} onclick={() => go('presets', runSettings.mode)}><span class="at-home-icon" aria-hidden="true"></span></button>
  {:else}
    <button class="at-icon-button" aria-label="Audiation Trainer home" title="Audiation Trainer home" onclick={() => go('landing')}><span class="at-home-icon" aria-hidden="true"></span></button>
  {/if}
{/snippet}

{#snippet appHeader()}
  <header class="at-header" class:at-game-header={screen === 'practice' && !showingResults}>
    {@render homeButton()}
    {#if screen === 'practice' && !showingResults}<h1 id="at-page-heading" tabindex="-1">{selectedMode.name}</h1>{/if}
    {#if screen === 'practice'}<button class="at-icon-button" aria-label={`${selectedMode.name} settings`} title={`${selectedMode.name} settings`} onclick={openModeSettings}><span class="at-gear-icon" aria-hidden="true"></span></button>{/if}
  </header>
{/snippet}

<main class="audiationer-trainer at-dark-mode" class:at-landing={screen === 'landing'} class:at-selecting={screen === 'presets'} class:at-combined-presets={combinedPresets} class:at-practising={screen === 'practice'} class:at-results-screen={showingResults} class:at-melody-screen={screen === 'practice' && sequenceMode && !showingResults} class:at-freeplay-screen={screen === 'practice' && settings.mode === 'freeplay'} data-mode={combinedPresets ? selectedPair?.modes[0] : settings.mode} data-answer-state={answerState} data-review-skipped={skippedFeedback} aria-label="Audiation Trainer">
  <div class="at-state-gradient at-accepting-gradient" aria-hidden="true"></div>
  <div class="at-state-gradient at-correct-gradient" aria-hidden="true"></div>
  <div class="at-state-gradient at-incorrect-gradient" aria-hidden="true"></div>
  <div class="at-shell">
    {#if showingResults}
      {@render appHeader()}
      <SessionResults results={sessionState.results} settings={runSettings} presetName={runName} {nextLevelName} {nextLevelLocked} {nextLevelPrerequisite}
        nextDifficulty={settings.answerSeconds} ondifficulty={(seconds) => { settings.answerSeconds = seconds; }}
        onagain={playAgain} onnext={playNextLevel} onfinish={() => go('presets')} />
    {:else}
    {#if screen === 'practice' && settings.mode === 'freeplay'}
      <FreePlay bind:settings={freeplaySettings} {homeButton} />
    {:else}
    {#if screen !== 'presets'}{@render appHeader()}{/if}
    {#if screen === 'landing'}
      <section class="at-hero" aria-label="Welcome"><h1 id="at-page-heading" tabindex="-1"><span>Audiation Trainer</span></h1></section>
      <nav class="at-mode-list" aria-label="Choose a game mode">
        {#each modeOrder as mode}
          {#if mode === 'degrees' || mode === 'pocket'}<hr class="at-mode-divider" />{/if}
          <button class="at-landing-mode at-pill" class:at-mode-tile={isScored(mode)} class:at-combined-mode={!!modePair(mode)} data-mode={mode} onclick={() => chooseMode(mode)}><span class="at-mode-icon"><Icon name={modeIcon(mode)} size={28} /></span><span><span>{#if modePair(mode)}{modePair(mode)!.landingName}{:else if mode === 'quality'}Chord<br />Quality{:else}{modeNames[mode]}{/if}</span></span>{#if !isScored(mode)}<span class="at-mode-arrow"><Icon name="chevron" size={20} /></span>{/if}</button>
        {/each}
      </nav>
    {:else}
      {#if screen === 'presets'}<h1 id="at-page-heading" class="at-sr-only" tabindex="-1">{selectedPair?.name ?? selectedMode.name} presets</h1>{/if}
      {#if screen === 'presets'}
        <Presets {settings} {progress} locks={levelLocks} {custom} {homeButton} onsettings={openModeSettings} ondifficulty={(seconds) => { settings.answerSeconds = seconds; }} onchoose={choosePreset} oncustom={chooseCustom} onadd={() => openCustom()} onedit={openCustom} ondelete={deletePreset} />
      {:else}
        <section class="at-practice" aria-label="Practice">
          <div class="at-session-chips"><button onclick={() => go('presets')}>{selection.name}</button>{#if scored}<Gems value={difficultyIndex(settings.answerSeconds) + 1} showBlanks={false} label={`${DIFFICULTIES[difficultyIndex(settings.answerSeconds)].name} difficulty`} /><span class="at-round-count" aria-label={`${correctAnswers} correct out of ${answeredQuestions} answered`}>{correctAnswers}/{answeredQuestions}</span>{/if}</div>
          {#if sequenceMode}
            <div class="at-melody-stage"><MelodyAnswer input={sessionState.input} revealed={sessionState.revealed} length={questionLength(settings)} scale={settings.scale} chords={isChordMode(settings.mode)} feedback={sequenceFeedback} answering={sessionState.phase === 'answering'} onundo={() => session.undoAnswer()} onreplay={(source) => { void session.replaySequence(source); }} /></div>
          {/if}
          {#if settings.mode === 'pocket'}
            <div class="at-pocket"><div class="at-pocket-symbol" class:at-is-playing={active}><Icon name="pocket" size={86} /></div><h2>{active ? 'Pocket Mode is playing.' : 'Practice by listening.'}</h2><p>{modeNames[settings.pocket.exercise]} · {settings.pocket.tempo} BPM</p><p>{settings.pocket.speakAnswer ? 'Listen to the question, think of the answer, then hear it spoken.' : 'Listen and think of the answer. Spoken answers are off.'}</p>{#if !active}<p class="at-hint">Keep this page open and your screen awake. Background audio and speech depend on your browser.</p>{/if}<button class="at-primary" disabled={!!error} onclick={() => active ? session.stop() : start()}><Icon name={active ? 'stop' : 'play'} size={20} />{active ? 'Stop listening' : 'Start listening'}</button></div>
          {:else if settings.mode === 'quality'}
            <div class="at-quality-stage"><Icon name="quality" size={72} /><button class="at-play-button" class:at-listening={sessionState.phase === 'listening'} disabled={!centreEnabled || !!error} onclick={centreAction} aria-label={centreLabel}>{@render centreSymbol(45)}{#if !skippedFeedback}<small>{centreLabel}</small>{/if}</button></div>
            <div class="at-quality-answers">{#each CHORD_QUALITIES as quality, i}{#if settings.qualities.includes(i)}<button class:at-revealed={sessionState.phase === 'feedback' && sessionState.revealed[0] === i} disabled={sessionState.phase !== 'answering'} onclick={() => { void session.answer(i); }}>{quality.name}</button>{/if}{/each}</div>
          {:else}
            <div class="at-wheel-stage" class:at-minimal={settings.wheelStyle === 'minimal'}><TrainerWheel minimal={settings.wheelStyle === 'minimal'} showCentre={false} tonic={currentTonic} scale={settings.scale} order={settings.order} allowed={degrees} active={sessionState.activeDegree} enabled={sessionState.phase === 'answering' || sessionState.phase === 'exploring' || reviewFeedback} chords={isChordMode(settings.mode)} onanswer={(degree) => { void session.answer(degree); }} /><button class="at-play-button at-wheel-centre" class:at-listening={sessionState.phase === 'listening'} disabled={!centreEnabled || !!error} onclick={centreAction} aria-label={centreLabel}>{@render centreSymbol(48)}{#if !skippedFeedback && !sequenceFeedback}<small>{centreLabel}</small>{/if}</button></div>
          {/if}
          {#if secondsLeft !== null && sessionState.phase === 'answering' && (settings.mode !== 'degrees' || settings.degreeOptions.showTimeLeft)}<div class="at-timer" role="timer" aria-label="Answer time remaining"><span>{secondsLeft.toFixed(1)} s</span><progress max={settings.answerSeconds} value={secondsLeft}></progress></div>{/if}
          <div class="at-feedback" class:at-sr-only={skippedFeedback || settings.mode === 'degrees' || sequenceMode} class:at-correct={sessionState.phase === 'feedback' && sessionState.results.at(-1)?.correct} class:at-incorrect={sessionState.phase === 'feedback' && !sessionState.results.at(-1)?.correct} role="status" aria-live="polite">{sessionState.message}</div>
          {#if sessionState.error}<p class="at-error" role="alert">{sessionState.error}</p>{/if}{#if error && !active}<p class="at-error" role="alert">{error}<button onclick={openModeSettings}>Edit {selectedMode.name} settings</button></p>{/if}
        </section>
      {/if}
    {/if}
    {/if}
    {/if}
    {#if storageNotice}<p class="at-storage-notice" role="status">{storageNotice}</p>{/if}
  </div>
  <dialog bind:this={dialog} class="at-dialog" class:at-mode-settings-dialog={modal === 'pocket' || (modal === 'practice' && (settings.mode === 'degrees' || combinedPresets))} aria-labelledby="at-dialog-title" onclose={() => { modal = null; }} oncancel={() => { modal = null; }}>
    <div class="at-dialog-heading">{#if modal === 'pocket'}{@render homeButton()}{/if}<h2 id="at-dialog-title">{modal === 'custom' ? editingId ? 'Edit preset' : 'Create preset' : `${selectedMode.name} settings`}</h2><button class="at-icon-button" aria-label={modal === 'custom' ? 'Close preset editor' : `Close ${selectedMode.name} settings`} onclick={() => { modal = null; }}><Icon name="close" /></button></div>
    {#if modal === 'pocket'}
      <PocketSettings bind:settings />
      {#if error}<p class="at-error" role="alert">{error}</p>{/if}
    {:else if modal === 'practice'}
      {#if combinedPresets}
        <div class="at-settings-segment at-combined-settings" role="group" aria-label="Exercise settings">
          {#each selectedPair?.modes ?? [] as mode}<button type="button" aria-pressed={settings.mode === mode} onclick={() => { settings.mode = mode; }}>{modeNames[mode]}</button>{/each}
        </div>
      {/if}
      {#if isScored(settings.mode)}<LevelLockSettings locks={levelLocks} onunlock={() => { levelLocks.unlockAll = true; }} onreset={() => { levelLocks.unlockAll = false; }} />{/if}
      {#if settings.mode === 'degrees'}<DegreesSettings bind:settings />{:else}<PracticeSettings bind:settings />{/if}
      {#if error}<p class="at-error" role="alert">{error}</p>{/if}
      <div class="at-dialog-actions"><button type="button" class="at-primary" onclick={() => { modal = null; }}>Done</button></div>
    {:else if modal === 'custom'}
      <form onsubmit={savePreset}>
        <label class="at-field">Preset name<input required maxlength="50" placeholder="My practice" bind:value={presetName} /></label>
        {#if draftPair}
          <div class="at-settings-segment at-combined-settings" role="group" aria-label="Preset exercise settings">
            {#each draftPair.modes as mode}<button type="button" aria-pressed={draft.mode === mode} onclick={() => { draft.mode = mode; }}>{modeNames[mode]}</button>{/each}
          </div>
        {/if}
        {#if draft.mode === 'pocket'}<PocketSettings bind:settings={draft} />{:else if draft.mode === 'degrees'}<DegreesSettings bind:settings={draft} custom />{:else}<PracticeSettings bind:settings={draft} difficultyEditable={false} />{/if}
        {#if draftError}<p class="at-error" role="alert">{draftError}</p>{/if}
        <div class="at-dialog-actions"><button type="button" onclick={() => { modal = null; }}>Cancel</button><button type="submit" class="at-primary" disabled={!!draftError || !presetName.trim()}>Save preset</button></div>
      </form>
    {/if}
  </dialog>
</main>
