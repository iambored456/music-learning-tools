<script lang="ts">
  import { tick } from 'svelte';
  import { DIFFICULTIES, difficultyIndex, type Result, type Settings } from '@mlt/audiationer-trainer-core';
  import Gem from './Gem.svelte';
  import Gems from './Gems.svelte';
  import Icon from './Icon.svelte';

  let { results, settings, presetName, degreesProgress, onexport, onagain, ondegrees, onfreeplay, onfinish }: {
    results: Result[]; settings: Settings; presetName: string; degreesProgress: number;
    onexport: () => void; onagain: () => void; ondegrees: () => void;
    onfreeplay: () => void; onfinish: () => void;
  } = $props();
  let page = $state<'score' | 'actions'>('score');
  const correct = $derived(results.filter(r => r.correct).length);
  const average = $derived(results.length ? results.reduce((sum, r) => sum + r.seconds, 0) / results.length : 0);
  const difficulty = $derived(DIFFICULTIES[difficultyIndex(settings.answerSeconds)]);
  const target = $derived(Math.ceil(settings.rounds * 0.8));
  const complete = $derived(results.length === settings.rounds);
  const cleared = $derived(complete && correct >= target);
  async function showActions() {
    page = 'actions';
    await tick();
    document.getElementById('at-page-heading')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
  const summary = $derived.by(() => {
    const rows = new Map<string, { total: number; correct: number; seconds: number; confusions: Set<string> }>();
    for (const result of results) {
      const row = rows.get(result.expected) ?? { total: 0, correct: 0, seconds: 0, confusions: new Set<string>() };
      row.total++; row.correct += Number(result.correct); row.seconds += result.seconds;
      if (!result.correct) row.confusions.add(result.received);
      rows.set(result.expected, row);
    }
    return [...rows.entries()];
  });
</script>
<section class="at-results" class:at-result-actions={page === 'actions'} aria-label="Session results">
  <button class="at-icon-button at-results-close" aria-label="Close results and return to presets" onclick={onfinish}><Icon name="close" size={27} /></button>
  {#if page === 'score'}
    <div class="at-result-score-page">
      <h1 id="at-page-heading" tabindex="-1">Results</h1>
      <div class="at-result-preset"><span>{presetName}</span><span>{difficulty.name}</span></div>
      <p class="at-result-score" aria-label={`${correct} out of ${results.length} correct`}>{correct}/{results.length}</p>
      <div class="at-result-gem" role="img" aria-label={cleared ? `${difficulty.name} cleared` : `${difficulty.name} not cleared`}><Gem lit={cleared} colour={difficulty.colour} /></div>
      <div class="at-result-messages" role="status">
        <span class="at-result-message-dot" aria-hidden="true"></span>
        <div><p>{cleared ? 'Well played!' : 'Back to Rehearsal!'}</p><p>{cleared ? `${difficulty.name} cleared.` : !complete ? `Complete all ${settings.rounds} questions to clear ${difficulty.name}.` : `Get ${target}/${settings.rounds} to clear ${difficulty.name}.`}</p></div>
      </div>
    </div>
    <div class="at-result-bottom"><button class="at-primary" onclick={showActions}><Icon name="forward" size={23} />Next</button></div>
  {:else}
    <div class="at-result-options-page">
      <h1 id="at-page-heading" class="at-result-preset" tabindex="-1"><span>{presetName}</span><span>{difficulty.name}</span></h1>
      <nav class="at-result-options" aria-label="Continue practicing">
        <button onclick={onagain}><Icon name="replay" size={25} /><span>Play again</span></button>
        <button onclick={ondegrees}><span class="at-result-degrees-icon"><Icon name="note" size={25} /></span><span>Play in degrees</span><Gems value={degreesProgress} /></button>
        <button onclick={onfreeplay}><span class="at-result-freeplay-icon"><Icon name="freeplay" size={25} /></span><span>Play in free play</span></button>
      </nav>
      <details class="at-result-details"><summary>Answer breakdown</summary>
        <div class="at-metrics"><div><strong>{Math.round(correct / results.length * 100)}%</strong><span>Accuracy</span></div><div><strong>{average.toFixed(1)}s</strong><span>Average response</span></div></div>
        <button onclick={onexport}>Save results</button>
        <div class="at-table-wrap"><table><thead><tr><th>Answer</th><th>Correct</th><th>Avg. time</th><th>Confused with</th></tr></thead><tbody>{#each summary as [label, row]}<tr><th scope="row">{label}</th><td>{row.correct} / {row.total}</td><td>{(row.seconds / row.total).toFixed(1)}s</td><td>{[...row.confusions].join('; ') || '—'}</td></tr>{/each}</tbody></table></div>
      </details>
    </div>
    <div class="at-result-bottom"><button class="at-primary" onclick={onfinish}><Icon name="check" size={23} />Finish game</button></div>
  {/if}
</section>
