// (file path: src/playback.ts)

import { appState } from './state/appState.ts';
import { MODE_SCALE_DEGREES, DEGREE_MAP, DIATONIC_INTERVALS, PLAYBACK_NOTE_DURATION_MS, PLAYBACK_PAUSE_MS } from './core/constants.ts';
import { indexAtTop, normAngle } from './core/math.ts';
import { initAudio, playNote } from './audio/synth.ts';

// ... (getScaleSequence and playNextNote functions are unchanged)

function getScaleSequence() {
  const { pitchClass, degree, chromatic } = appState.rings;
  const rootNoteIndex = indexAtTop(normAngle(pitchClass - chromatic));
  const modeDegreeIndex = indexAtTop(normAngle(degree - chromatic));
  const tonicInterval = (DIATONIC_INTERVALS as string[])[modeDegreeIndex];
  const modeKey = (DEGREE_MAP as Record<string, string>)[tonicInterval];
  if (!modeKey) return [];
  const modeIntervals = (MODE_SCALE_DEGREES as Record<string, number[]>)[modeKey];
  const scale = modeIntervals.map((interval: number) => rootNoteIndex + interval);
  scale.push(scale[0] + 12);
  return scale;
}

function playNextNote() {
  if (!appState.playback.isPlaying) {
    stopPlayback(); 
    return;
  }
  const sequence = appState.playback.sequence;
  if (sequence.length === 0) {
    stopPlayback();
    return;
  }
  const currentNote = sequence.shift();
  if (currentNote === undefined) {
    stopPlayback();
    return;
  }
  appState.playback.currentNoteIndex = currentNote;
  playNote(currentNote, PLAYBACK_NOTE_DURATION_MS / 1000);
  const timeoutId = setTimeout(playNextNote, PLAYBACK_NOTE_DURATION_MS + PLAYBACK_PAUSE_MS);
  appState.playback.timeoutId = timeoutId;
}


export function startPlayback() {
  if (appState.playback.isPlaying) return;
  initAudio();
  const sequence = getScaleSequence();
  if (sequence.length === 0) {
    return;
  }
  appState.playback.rootNoteIndexForPlayback = sequence[0];
  appState.playback.isPlaying = true;
  appState.playback.sequence = sequence;
  
  // REMOVED: Direct DOM manipulation.
  // document.getElementById('result-container').classList.add('playback-active');
  
  playNextNote();
}

export function stopPlayback() {
  if (!appState.playback.isPlaying) return;
  
  clearTimeout(appState.playback.timeoutId ?? undefined);
  
  appState.playback.isPlaying = false;
  appState.playback.currentNoteIndex = null;
  appState.playback.sequence = [];
  appState.playback.timeoutId = null;
  appState.playback.rootNoteIndexForPlayback = null;

  // REMOVED: Direct DOM manipulation.
  // document.getElementById('result-container').classList.remove('playback-active');
}
