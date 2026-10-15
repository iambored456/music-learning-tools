<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { CHROMATIC_NOTES } from '@mlt/compass-core';
  import { CHORD_QUALITIES, DIFFICULTIES, GAME_MODES, TrainerSession, allowedDegrees, applyPreset, difficultyIndex, emptyState, isScored, normalizeCustomPresets, normalizeFreeplaySettings, normalizeProgress, normalizeSettings, recordProgress, settingsError, type CustomPreset, type GameMode, type Preset, type Progress, type Settings } from '@mlt/audiationer-trainer-core';
  import TrainerWheel from './TrainerWheel.svelte';
  import PracticeSettings from './PracticeSettings.svelte';
  import Presets from './Presets.svelte';
  import SessionResults from './SessionResults.svelte';
  import MelodyAnswer from './MelodyAnswer.svelte';
  import FreePlay from './FreePlay.svelte';
  import Icon from './Icon.svelte';
  import Gems from './Gems.svelte';
  import { BrowserTrainerAudio } from './audio.ts';

  type Screen = 'landing' | 'presets' | 'practice';
  const prefix = 'mlt.audiationer-trainer.';
  const modeOrder = GAME_MODES.filter(mode => mode.id !== 'cycle').map(mode => mode.id);
  const modeNames = Object.fromEntries(GAME_MODES.map(m => [m.id, m.name]));
  let settings = $state<Settings>(normalizeSettings({}));
  let freeplaySettings = $state(normalizeFreeplaySettings({}));
  let sessionState = $state(emptyState());
  let screen = $state<Screen>('landing');
  let darkMode = $state(readTheme());
  let custom = $state<CustomPreset[]>([]);
  let progress = $state<Progress>({});
  let loaded = $state(false);
  let modal = $state<'preferences' | 'practice' | 'custom' | 'help' | null>(null);
  let dialog = $state<HTMLDialogElement>();
  let draft = $state<Settings>(normalizeSettings({}));
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
  const showingResults = $derived(screen === 'practice' && sessionState.phase === 'finished' && scored && sessionState.results.length > 0);
  const melodyFeedback = $derived(settings.mode === 'melody' && sessionState.phase === 'feedback');
  const selectedMode = $derived(GAME_MODES.find(m => m.id === settings.mode)!);
  const degrees = $derived(allowedDegrees(settings));
  const error = $derived(settingsError(settings));
  const draftError = $derived(settingsError(draft));
  const secondsLeft = $derived(sessionState.answerDeadline === null ? null : Math.min(settings.answerSeconds, Math.max(0, (sessionState.answerDeadline - clockNow) / 1000)));
  const centreLabel = $derived(melodyFeedback ? sessionState.results.length >= settings.rounds ? 'Show results' : 'Next question' : !active ? (sessionState.results.length ? 'Start again' : 'Start') : sessionState.phase === 'exploring' ? 'Play cadence' : sessionState.phase === 'answering' ? 'Hear again' : sessionState.phase === 'feedback' ? 'Answer' : 'Listening');
  const centreEnabled = $derived(melodyFeedback || !active || ['exploring', 'answering'].includes(sessionState.phase));
  const currentTonic = $derived(active ? sessionState.tonic : settings.tonic);
  const currentOctave = $derived(active ? sessionState.octave : settings.octave);

  function readTheme() { try { return localStorage.getItem(prefix + 'theme.v1') !== 'light'; } catch { return true; } }
  function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(prefix + key) ?? 'null'); } catch { return null; } }
  function save(key: string, value: unknown) {
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); }
    catch { storageNotice = 'Storage is unavailable. Changes will last for this visit only.'; }
  }
  onMount(() => {
    settings = normalizeSettings(read('settings.v1'));
    if (settings.mode === 'cycle') settings.mode = 'freeplay';
    freeplaySettings = normalizeFreeplaySettings(read('freeplay.v1') ?? { tonic: settings.tonic, octave: settings.octave });
    custom = normalizeCustomPresets(read('presets.v1')).map(preset => ({
      ...preset, settings: { ...preset.settings, mode: preset.settings.mode === 'cycle' ? 'freeplay' : preset.settings.mode },
    }));
    progress = normalizeProgress(read('progress.v1'));
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
  $effect(() => {
    const value = darkMode ? 'dark' : 'light';
    if (loaded) { try { localStorage.setItem(prefix + 'theme.v1', value); } catch { /* Theme still works without storage. */ } }
  });
  $effect(() => {
    if (!dialog) return;
    if (modal && !dialog.open) dialog.showModal();
    else if (!modal && dialog.open) dialog.close();
  });
  function readRoute() {
    const [page, requestedMode] = window.location.hash.slice(1).split('/');
    const mode = requestedMode === 'cycle' ? 'freeplay' : requestedMode;
    const requestedTarget = (page === 'presets' || page === 'practice') && GAME_MODES.some(m => m.id === mode) ? page : 'landing';
    const target = requestedTarget === 'presets' && mode === 'freeplay' ? 'practice' : requestedTarget;
    if (target !== 'landing' && (requestedMode === 'cycle' || target !== requestedTarget)) window.history.replaceState(window.history.state, '', `#${target}/freeplay`);
    if (target === screen && (target === 'landing' || mode === settings.mode)) return;
    session.reset(); modal = null; selection = { id: null, name: 'Custom' };
    if (target !== 'landing') {
      if (mode === 'melody' && settings.mode !== 'melody') settings.wheelStyle = 'minimal';
      settings.mode = mode as GameMode;
    }
    screen = target;
    focusHeading();
  }
  function go(target: Screen, mode = settings.mode) {
    if (mode === 'cycle') mode = 'freeplay';
    if (mode === 'freeplay' && target !== 'landing') target = 'practice';
    if (mode === 'melody' && settings.mode !== 'melody') settings.wheelStyle = 'minimal';
    session.reset(); modal = null; settings.mode = mode; screen = target;
    window.location.hash = target === 'landing' ? '' : `${target}/${mode}`;
    focusHeading();
  }
  function focusHeading() { void tick().then(() => document.getElementById('at-page-heading')?.focus({ preventScroll: true })); window.scrollTo({ top: 0 }); }
  function chooseMode(mode: GameMode) {
    if (mode === 'melody') settings.wheelStyle = 'minimal';
    selection = { id: null, name: 'Custom' };
    go(mode === 'freeplay' ? 'practice' : 'presets', mode);
  }
  function choosePreset(preset: Preset) {
    settings = applyPreset(settings, preset);
    selection = { id: preset.id, name: preset.name };
    go('practice');
  }
  function chooseCustom(preset: CustomPreset) {
    settings = normalizeSettings({ ...preset.settings, answerSeconds: settings.answerSeconds });
    selection = { id: preset.id, name: preset.name };
    go('practice');
  }
  function start() {
    clockNow = performance.now();
    runSettings = normalizeSettings($state.snapshot(settings));
    runPreset = selection.id; runName = selection.name;
    void session.start(runSettings);
  }
  function centreAction() {
    if (melodyFeedback) void session.next();
    else if (!active) start();
    else if (sessionState.phase === 'exploring') void session.cadence();
    else if (sessionState.phase === 'answering') void session.repeat();
  }
  function openPractice() {
    if (active) session.stop();
    draft = normalizeSettings($state.snapshot(settings)); modal = 'practice';
  }
  function openCustom(preset?: CustomPreset) {
    draft = normalizeSettings(preset?.settings ?? $state.snapshot(settings));
    presetName = preset?.name ?? ''; editingId = preset?.id ?? null; modal = 'custom';
  }
  function submitSettings(event: SubmitEvent) {
    event.preventDefault();
    if (draftError) return;
    if (modal === 'custom') {
      if (!presetName.trim()) return;
      const preset = { id: editingId ?? `custom-${crypto.randomUUID()}`, name: presetName.trim().slice(0, 50), settings: normalizeSettings($state.snapshot(draft)) };
      const changed = JSON.stringify(custom.find(p => p.id === editingId)?.settings) !== JSON.stringify(preset.settings);
      custom = normalizeCustomPresets([...custom.filter(p => p.id !== preset.id), preset]);
      if (editingId && changed) { const next = { ...progress }; delete next[`${draft.mode}:${editingId}`]; progress = next; }
      if (editingId && selection.id === editingId) selection = { id: preset.id, name: preset.name };
    } else {
      settings = normalizeSettings($state.snapshot(draft)); selection = { id: null, name: 'Custom' }; session.reset();
    }
    modal = null;
  }
  function deletePreset(id: string) {
    custom = custom.filter(p => p.id !== id);
    const next = { ...progress }; delete next[`${settings.mode}:${id}`]; progress = next;
    if (selection.id === id) selection = { id: null, name: 'Custom' };
  }
  function changeOctave(delta: number) {
    if (melodyFeedback) { session.setFeedbackOctave(currentOctave + delta); return; }
  }
  function modeProgress(mode: GameMode) { return Math.max(0, ...Object.entries(progress).filter(([key]) => key.startsWith(`${mode}:`)).map(([, value]) => value)); }
  function playAgain() {
    settings = normalizeSettings($state.snapshot(runSettings));
    selection = { id: runPreset, name: runName };
    start(); focusHeading();
  }
  function continueIn(mode: 'degrees' | 'freeplay') {
    if (mode === 'freeplay') {
      freeplaySettings = normalizeFreeplaySettings({ ...$state.snapshot(freeplaySettings), tonic: sessionState.tonic, octave: sessionState.octave });
      selection = { id: null, name: 'Custom' }; go('practice', mode); return;
    }
    settings = normalizeSettings({ ...$state.snapshot(runSettings), mode, tonic: sessionState.tonic, octave: sessionState.octave });
    selection = { id: runPreset, name: runName };
    go('practice', mode); start();
  }
  function exportResults() {
    const content = JSON.stringify({ app: 'Audiationer Trainer', date: new Date().toISOString(), preset: runPreset, settings: runSettings, results: sessionState.results }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'audiationer-trainer-results.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<main class="audiationer-trainer" class:at-dark-mode={darkMode} class:at-landing={screen === 'landing'} class:at-selecting={screen === 'presets'} class:at-practising={screen === 'practice'} class:at-results-screen={showingResults} class:at-melody-screen={screen === 'practice' && settings.mode === 'melody' && !showingResults} class:at-freeplay-screen={screen === 'practice' && settings.mode === 'freeplay'} data-mode={settings.mode} aria-label="Audiationer Trainer">
  <div class="at-shell">
    {#if showingResults}
      <SessionResults results={sessionState.results} settings={runSettings} presetName={runName} degreesProgress={runPreset ? progress[`degrees:${runPreset}`] ?? 0 : 0} onexport={exportResults} onagain={playAgain} ondegrees={() => continueIn('degrees')} onfreeplay={() => continueIn('freeplay')} onfinish={() => go('presets')} />
    {:else}
    {#if screen === 'practice' && settings.mode === 'freeplay'}
      <FreePlay bind:settings={freeplaySettings} onclose={() => go('landing')} onhelp={() => { modal = 'help'; }} />
    {:else}
    {#if screen !== 'practice' || settings.mode !== 'melody'}
    <header class="at-header">
      <div class="at-global-actions"><a class="at-icon-button" href={import.meta.env.BASE_URL} aria-label="Music Learning Tools home" title="Music Learning Tools home"><span class="at-home-icon" aria-hidden="true"></span></a><button class="at-icon-button" aria-label="Settings" title="Settings" onclick={() => { modal = 'preferences'; }}><span class="at-gear-icon" aria-hidden="true"></span></button></div>
      <button class="at-icon-button" aria-label="Practice guide" title="Practice guide" onclick={() => { modal = 'help'; }}><Icon name="book" size={25} /></button>
    </header>
    {/if}
    {#if screen === 'landing'}
      <section class="at-hero" aria-label="Welcome"><h1 id="at-page-heading" tabindex="-1"><span>Audiation</span> <small>Trainer</small></h1></section>
      <nav class="at-mode-list" aria-label="Choose a game mode">
        {#each modeOrder as mode}
          {#if mode === 'degrees' || mode === 'pocket'}<hr class="at-mode-divider" />{/if}
          <button class="at-landing-mode at-pill" data-mode={mode} onclick={() => chooseMode(mode)}><span class="at-mode-icon"><Icon name={mode === 'degrees' ? 'note' : mode} size={28} /></span><span>{modeNames[mode]}</span>{#if isScored(mode)}<Gems value={modeProgress(mode)} />{:else}<span class="at-mode-arrow"><Icon name="chevron" size={20} /></span>{/if}</button>
        {/each}
      </nav>
    {:else}
      <div class="at-screen-heading"><button class="at-icon-button" aria-label={screen === 'practice' ? 'Back to presets' : 'Back to Audiationer Trainer'} onclick={() => go(screen === 'practice' ? 'presets' : 'landing')}><Icon name={screen === 'practice' ? 'close' : 'back'} size={27} /></button><h1 id="at-page-heading" tabindex="-1">{screen === 'presets' ? 'Presets' : settings.mode === 'melody' ? 'Melodies' : selectedMode.name}</h1>{#if screen === 'practice'}<div class="at-practice-tools">{#if settings.mode === 'melody'}<button class="at-icon-button" aria-label="Practice guide" onclick={() => { modal = 'help'; }}><Icon name="help" size={25} /></button>{/if}<button class="at-icon-button" aria-label="Practice settings" onclick={openPractice}><Icon name="sliders" size={26} /></button></div>{:else}<span class="at-header-spacer"></span>{/if}</div>
      {#if screen === 'presets'}
        <Presets {settings} {progress} {custom} onmode={(mode) => { selection = { id: null, name: 'Custom' }; go('presets', mode); }} ondifficulty={(seconds) => { settings.answerSeconds = seconds; }} onchoose={choosePreset} oncustom={chooseCustom} onadd={() => openCustom()} onedit={openCustom} ondelete={deletePreset} />
      {:else}
        <section class="at-practice" aria-label="Practice">
          <div class="at-session-chips"><button onclick={() => go('presets')}>{selection.name}</button>{#if settings.mode !== 'melody'}<button onclick={openPractice}>{settings.randomTonic ? 'Random key' : `${CHROMATIC_NOTES[currentTonic]} · Octave ${currentOctave}`}</button>{/if}{#if scored}<span>{DIFFICULTIES[difficultyIndex(settings.answerSeconds)].name}</span>{#if settings.mode !== 'melody'}<span class="at-round-count">{Math.min(sessionState.round, settings.rounds)} / {settings.rounds}</span>{/if}{/if}</div>
          {#if settings.mode === 'melody'}
            <div class="at-melody-stage"><MelodyAnswer input={sessionState.input} revealed={sessionState.revealed} length={settings.melodyLength} scale={settings.scale} feedback={melodyFeedback} answering={sessionState.phase === 'answering'} onundo={() => session.undoAnswer()} onreplay={(source) => { void session.replayMelody(source); }} /></div>
          {/if}
          {#if settings.mode === 'pocket'}
            <div class="at-pocket"><div class="at-pocket-symbol" class:at-is-playing={active}><Icon name="pocket" size={86} /></div><h2>{active ? 'Pocket mode is playing.' : 'Practice by listening.'}</h2><p>{active ? 'The degree is spoken after each note.' : 'Hear a note, imagine its degree, then listen for the spoken answer.'}</p>{#if !active}<p class="at-hint">Keep this page open and your screen awake. Background audio and speech depend on your browser.</p>{/if}<button class="at-primary" disabled={!!error} onclick={() => active ? session.stop() : start()}><Icon name={active ? 'stop' : 'play'} size={20} />{active ? 'Stop listening' : 'Start listening'}</button></div>
          {:else if settings.mode === 'quality'}
            <div class="at-quality-stage"><Icon name="quality" size={72} /><button class="at-play-button" disabled={!centreEnabled || !!error} onclick={centreAction} aria-label={centreLabel}><Icon name={centreEnabled ? 'play' : 'note'} size={45} /><small>{centreLabel}</small></button></div>
            <div class="at-quality-answers">{#each CHORD_QUALITIES as quality, i}{#if settings.qualities.includes(i)}<button class:at-revealed={sessionState.phase === 'feedback' && sessionState.revealed[0] === i} disabled={sessionState.phase !== 'answering'} onclick={() => { void session.answer(i); }}>{quality.name}</button>{/if}{/each}</div>
          {:else}
            <div class="at-wheel-stage" class:at-minimal={settings.wheelStyle === 'minimal'}><TrainerWheel minimal={settings.wheelStyle === 'minimal'} tonic={currentTonic} scale={settings.scale} order={settings.order} allowed={degrees} active={sessionState.activeDegree} enabled={sessionState.phase === 'answering' || sessionState.phase === 'exploring' || melodyFeedback} chords={settings.mode === 'chords'} onanswer={(degree) => { void session.answer(degree); }} /><button class="at-play-button at-wheel-centre" disabled={!centreEnabled || !!error} onclick={centreAction} aria-label={centreLabel}><Icon name={melodyFeedback ? 'next' : centreEnabled ? 'play' : 'note'} size={48} />{#if settings.mode !== 'melody' || !melodyFeedback}<small>{centreLabel}</small>{/if}</button></div>
          {/if}
          {#if settings.mode !== 'pocket' && settings.mode !== 'quality' && settings.mode !== 'melody'}
            <div class="at-wheel-order" role="group" aria-label="Wheel view">
              {#each ['fifths', 'chromatic', 'minimal'] as view}<button class:selected={(settings.wheelStyle === 'minimal' ? 'minimal' : settings.order) === view} aria-pressed={(settings.wheelStyle === 'minimal' ? 'minimal' : settings.order) === view} onclick={() => { settings.wheelStyle = view === 'minimal' ? 'minimal' : 'compass'; settings.order = view === 'chromatic' ? 'chromatic' : 'fifths'; }}>{view === 'fifths' ? 'Fifths' : view === 'chromatic' ? 'Chromatic' : 'Minimal'}</button>{/each}
            </div>
          {/if}
          {#if settings.mode === 'melody'}<div class="at-practice-footer"><div class="at-question-count"><span>{settings.rounds} questions</span><span>{Math.min(sessionState.round, settings.rounds)}/{settings.rounds}</span></div><div class="at-octave"><span>Octave</span><div><button class="at-icon-button" aria-label="Lower octave" disabled={currentOctave <= 2 || !melodyFeedback} onclick={() => changeOctave(-1)}><Icon name="minus" /></button><span>{currentOctave}</span><button class="at-icon-button" aria-label="Higher octave" disabled={currentOctave >= 6 || !melodyFeedback} onclick={() => changeOctave(1)}><Icon name="plus" /></button></div></div></div>{/if}
          {#if secondsLeft !== null && sessionState.phase === 'answering'}<div class="at-timer" role="timer" aria-label="Answer time remaining"><span>{secondsLeft.toFixed(1)} s</span><progress max={settings.answerSeconds} value={secondsLeft}></progress></div>{/if}
          <div class="at-feedback" class:at-sr-only={settings.mode === 'melody' && melodyFeedback} class:at-correct={sessionState.phase === 'feedback' && sessionState.results.at(-1)?.correct} class:at-incorrect={sessionState.phase === 'feedback' && !sessionState.results.at(-1)?.correct} role="status" aria-live="polite">{sessionState.message}</div>
          {#if sessionState.error}<p class="at-error" role="alert">{sessionState.error}</p>{/if}{#if error && !active}<p class="at-error" role="alert">{error}<button onclick={openPractice}>Edit settings</button></p>{/if}
          {#if active && settings.mode !== 'pocket'}<div class="at-actions"><button onclick={() => session.stop()}>End session</button></div>{/if}
        </section>
      {/if}
    {/if}
    {/if}
    {/if}
    {#if storageNotice}<p class="at-storage-notice" role="status">{storageNotice}</p>{/if}
  </div>
  <dialog bind:this={dialog} class="at-dialog" aria-labelledby="at-dialog-title" onclose={() => { modal = null; }} oncancel={() => { modal = null; }}>
    <div class="at-dialog-heading"><h2 id="at-dialog-title">{modal === 'preferences' ? 'Settings' : modal === 'help' ? 'Practice guide' : modal === 'custom' ? editingId ? 'Edit preset' : 'Create preset' : 'Practice settings'}</h2><button class="at-icon-button" aria-label="Close settings" onclick={() => { modal = null; }}><Icon name="close" /></button></div>
    {#if modal === 'preferences'}
      <label class="at-theme-toggle"><span>Dark mode</span><input type="checkbox" role="switch" bind:checked={darkMode} /><span class="at-switch-track" aria-hidden="true"></span></label>
      <p class="at-hint">Your appearance and presets are saved on this device.</p>
      <button class="at-wide-button" onclick={openPractice}><Icon name="sliders" size={20} />Practice settings</button>
    {:else if modal === 'help'}
      <div class="at-guide"><p>Choose a mode, then explore <strong>The Path</strong>, try the modal <strong>Challenges</strong>, or create a <strong>Custom</strong> preset.</p><p>Press the centre play button to begin. Listen to the tonic context, then select a degree on the wheel. In Melody, enter each note in order; in Chord Progressions, choose a Roman numeral.</p><p>Melody notes stay grey until the whole answer is submitted. Feedback marks each answer green or red and shows the correct melody below it. Use the speaker buttons to compare the two melodies, or play the wheel freely. Press the centre arrow when you are ready for the next question or your results.</p><p>Novice has no time limit. Adept gives you 5 seconds and Master gives you 2 seconds for the whole answer, after playback ends. Hear again replays the question and restarts the answer clock.</p><p>Complete a full session with at least 80% accuracy to earn gems. Your highest completed difficulty is kept for each preset.</p><p>Free Play has no levels: all twelve degrees are ready to play. Click a degree for a short note, or drag from it to sustain it after release. Click a sustained degree to stop it. With the wheel focused, Enter or Space toggles sustain. Random Key changes the tonic; Key of opens all twelve keys. Octave transposes the notes from 3 to 6 without changing the sound preset. Use Cycle beside Random Key to hear all twelve degrees in order. The centre pause button stops all notes and the drone. Free Play settings have a sound chooser and separate drone and melody volumes. Pocket mode is unscored and speaks the answers.</p><p class="at-hint">Choose the original Fifths and Chromatic wheels or the sparse Minimal view in Practice settings. Use Tab and Enter to play the wheel with a keyboard. All presets are available.</p><p class="at-hint">Inspired by <a href="https://github.com/SaverinOnRails/MyPitch" target="_blank" rel="noreferrer">MyPitch</a>.</p></div>
    {:else if modal === 'practice' || modal === 'custom'}
      <form onsubmit={submitSettings}>{#if modal === 'custom'}<label class="at-field">Preset name<input required maxlength="50" placeholder="My practice" bind:value={presetName} /></label>{/if}<PracticeSettings bind:settings={draft} difficultyEditable={modal !== 'custom'} />{#if draftError}<p class="at-error" role="alert">{draftError}</p>{/if}<div class="at-dialog-actions"><button type="button" onclick={() => { modal = null; }}>Cancel</button><button type="submit" class="at-primary" disabled={!!draftError || (modal === 'custom' && !presetName.trim())}>{modal === 'custom' ? 'Save preset' : 'Apply settings'}</button></div></form>
    {/if}
  </dialog>
</main>
