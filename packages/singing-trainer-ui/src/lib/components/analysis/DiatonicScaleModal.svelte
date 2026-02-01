<script lang="ts">
  import type { DiatonicMajorResult, Candidate } from '../../services/diatonicAnalysis.js';
  import type { KeySegment } from '../../services/scanKeyChangesMajor.js';

  interface Props {
    result: DiatonicMajorResult;
    segments: KeySegment[];
    onApply: (tonicPc: number, tonicName: string) => void;
    onAcceptAll: () => void;
    onClose: () => void;
  }

  let { result, segments, onApply, onAcceptAll, onClose }: Props = $props();

  const best = $derived(result.candidates[0]);
  const certainty = $derived(result.certainty);

  const allSegmentsCertain = $derived(
    segments.length > 1 && segments.every(s =>
      s.summary.certain > 0 && s.summary.uncertain === 0
    )
  );

  function handleApply(candidate: Candidate) {
    onApply(candidate.tonicPc, candidate.tonicName);
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="modal-backdrop"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="diatonic-title"
  tabindex="-1"
>
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="diatonic-title" class="modal-title">Diatonic Scale (Major)</h2>
      <div class="diagnostics-summary">
        <span class="diag-item">Pitch classes: {result.diagnostics.presentNotes.join(', ')}</span>
        <span class="diag-item">Tritone pairs: {result.diagnostics.tritonePairs.length} | Semitone pairs: {result.diagnostics.semitonePairs.length}</span>
      </div>
    </div>

    {#if allSegmentsCertain}
      <div class="result-section multi-key">
        <p class="rationale">
          Multiple tonics detected — scale degrees will update automatically during playback.
        </p>
        <div class="tonic-chips">
          {#each segments as seg, i (i)}
            <span class="tonic-chip">{seg.tonicName} Major</span>
          {/each}
        </div>
        <div class="actions">
          <button class="btn-primary" onclick={onAcceptAll}>Accept</button>
          <button class="btn-secondary" onclick={onClose}>Cancel</button>
        </div>
      </div>

    {:else if certainty === 'CERTAIN' && segments.length <= 1}
      <div class="result-section certain">
        <div class="scale-hero">
          <span class="scale-name">{best.tonicName} Major</span>
          <span class="certainty-badge">100% diatonic (major)</span>
        </div>
        <div class="scale-notes">{best.scaleNames.join('  ')}</div>
        <div class="degree-map">
          {#each best.scaleNames as name, i}
            <span class="degree-pair"><span class="deg-num">{i + 1}</span><span class="deg-name">={name}</span></span>
          {/each}
        </div>
        <div class="actions">
          <button class="btn-primary" onclick={() => handleApply(best)}>Apply</button>
          <button class="btn-secondary" onclick={onClose}>Close</button>
        </div>
      </div>

    {:else}
      <div class="result-section uncertain">
        <p class="rationale">Could not determine the key with certainty.</p>
        <div class="actions">
          <button class="btn-secondary" onclick={onClose}>Close</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.75);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .modal-content {
    background-color: var(--color-bg, #1a1a2e);
    border-radius: var(--radius-lg, 12px);
    padding: 1.5rem;
    max-width: 480px;
    width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp 0.25s ease;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-header { display: flex; flex-direction: column; gap: 0.25rem; }
  .modal-title { margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--color-text, #eee); }
  .diagnostics-summary { display: flex; flex-direction: column; gap: 0.1rem; }
  .diag-item { font-size: 0.7rem; color: var(--color-text-muted, #888); font-family: monospace; }

  .result-section.certain .scale-hero { display: flex; align-items: center; gap: 0.75rem; }
  .scale-name { font-size: 1.4rem; font-weight: 700; color: var(--color-text, #eee); }
  .certainty-badge {
    font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.5rem;
    border-radius: 999px; background-color: #28a745; color: white;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .scale-notes { font-size: 1rem; font-family: monospace; color: var(--color-text, #eee); letter-spacing: 0.05em; }
  .degree-map { display: flex; flex-wrap: wrap; gap: 0.4rem; font-size: 0.75rem; color: var(--color-text-muted, #aaa); font-family: monospace; }
  .deg-num { color: var(--color-primary, #5b9bd5); }

  .rationale { font-size: 0.85rem; color: var(--color-text-muted, #aaa); margin: 0; }

  .actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .btn-primary {
    flex: 1; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600;
    background-color: var(--color-primary, #5b9bd5); color: white;
    border: none; border-radius: var(--radius-sm, 6px); cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .btn-primary:hover:not(:disabled) { background-color: var(--color-primary-dark, #4a7bc8); }
  .btn-secondary {
    padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 500;
    background-color: transparent; color: var(--color-text-muted, #aaa);
    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: var(--radius-sm, 6px);
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-secondary:hover { background-color: rgba(255, 255, 255, 0.05); color: var(--color-text, #eee); }

  .tonic-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .tonic-chip {
    font-size: 0.85rem; font-weight: 600; padding: 0.3rem 0.7rem;
    background-color: var(--color-surface, #252540); color: var(--color-text, #eee);
    border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.15);
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
