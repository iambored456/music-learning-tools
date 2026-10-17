<script lang="ts">
  import { CHROMATIC_NOTES } from '@mlt/compass-core';
  import { DIFFICULTIES, difficultyIndex, type Result, type Settings } from '@mlt/audiationer-trainer-core';
  import DifficultyCard from './DifficultyCard.svelte';
  import Gem from './Gem.svelte';
  import Icon from './Icon.svelte';

  let { results, settings, presetName, nextLevelName, nextLevelLocked, nextLevelPrerequisite, nextDifficulty, ondifficulty, onagain, onnext, onfinish }: {
    results: Result[]; settings: Settings; presetName: string; nextLevelName: string | null;
    nextLevelLocked: boolean; nextLevelPrerequisite: string | null;
    nextDifficulty: number; ondifficulty: (seconds: number) => void;
    onagain: () => void; onnext: () => void; onfinish: () => void;
  } = $props();
  let changeDifficulty = $state(false);
  const correct = $derived(results.filter(r => r.correct).length);
  const difficulty = $derived(DIFFICULTIES[difficultyIndex(settings.answerSeconds)]);
  const target = $derived(Math.ceil(settings.rounds * 0.8));
  const complete = $derived(results.length === settings.rounds);
  const cleared = $derived(complete && correct >= target);
</script>
<section class="at-results" aria-label="Session results">
  <div class="at-result-overview">
    <h1 id="at-page-heading" tabindex="-1">Results</h1>
    <div class="at-result-preset"><span>{presetName}</span><span>{difficulty.name}</span></div>
    <p class="at-result-score" aria-label={`${correct} out of ${results.length} correct`}>{correct}/{results.length}</p>
    <div class="at-result-gem" role="img" aria-label={cleared ? `${difficulty.name} cleared` : `${difficulty.name} not cleared`}><Gem lit={cleared} colour={difficulty.colour} /></div>
    <div class="at-result-messages" role="status">
      <span class="at-result-message-dot" aria-hidden="true"></span>
      <div><p>{cleared ? 'Well played!' : 'Back to Rehearsal!'}</p><p>{cleared ? `${difficulty.name} cleared.` : !complete ? `Complete all ${settings.rounds} questions to clear ${difficulty.name}.` : `Get ${target}/${settings.rounds} to clear ${difficulty.name}.`}</p></div>
    </div>
  </div>
  <div>
    <nav class="at-result-options" aria-label="Continue practicing">
      <button type="button" onclick={onagain}><Icon name="replay" size={25} /><span>Play again</span></button>
      <button type="button" disabled={nextLevelLocked} onclick={onnext}><Icon name={nextLevelLocked ? 'lock' : 'next'} size={25} /><span>Next Level<small>{nextLevelName ?? 'Choose another level'}</small></span></button>
      <button type="button" aria-expanded={changeDifficulty} aria-controls="at-result-difficulty" onclick={() => { changeDifficulty = !changeDifficulty; }}><Icon name="sliders" size={25} /><span>Change difficulty</span><span class="at-result-disclosure" class:at-expanded={changeDifficulty}><Icon name="chevron" size={20} /></span></button>
    </nav>
    {#if nextLevelLocked && nextLevelPrerequisite}<p class="at-hint">Earn a gem in {nextLevelPrerequisite} to unlock {nextLevelName}.</p>{/if}
    <div id="at-result-difficulty" class="at-result-difficulty" hidden={!changeDifficulty}>
      <p class="at-hint">Applies to your next game.</p>
      <DifficultyCard seconds={nextDifficulty} onchange={ondifficulty} />
    </div>
  </div>
  <details class="at-result-details" open><summary>Answer breakdown</summary>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus this region to scroll through all table columns.) -->
    <div class="at-table-wrap" role="region" aria-label="Question results" tabindex="0">
      <table class="at-question-results">
        <caption class="at-sr-only">Each question in the order it was played</caption>
        <thead><tr><th scope="col">Question</th><th scope="col">Key</th><th scope="col" title="The tonic's octave for this question">Octave</th><th scope="col">Correct answer</th><th scope="col">Your answer</th><th scope="col">Result</th><th scope="col">Time</th></tr></thead>
        <tbody>
          {#each results as result, index}
            <tr><th scope="row">{index + 1}</th><td>{CHROMATIC_NOTES[result.tonic]}</td><td>{result.octave}</td><td>{result.expected}</td><td>{result.received}</td><td>{result.correct ? 'Correct' : result.received === 'Time out' ? 'Timed out' : 'Incorrect'}</td><td>{result.seconds.toFixed(1)} s</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
  <div class="at-result-bottom"><button type="button" class="at-primary" onclick={onfinish}><Icon name="check" size={23} />Finish game</button></div>
</section>
