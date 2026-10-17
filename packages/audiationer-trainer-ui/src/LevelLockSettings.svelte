<script lang="ts">
  import type { LevelLocks } from '@mlt/audiationer-trainer-core';
  let { locks, onunlock, onreset }: { locks: LevelLocks; onunlock: () => void; onreset: () => void } = $props();
</script>

<section class="at-level-lock-settings" aria-label="Level locks">
  <h3>Level locks</h3>
  <p>Applies to all Levels and Challenges in Pitch, Chords, and Chord Quality. Earn a gem to open the next card in each list; either paired exercise counts.</p>
  <div class="at-level-lock-actions">
    <button type="button" disabled={locks.unlockAll} onclick={onunlock}>Unlock all levels</button>
    <button type="button" disabled={!locks.unlockAll} onclick={onreset}>Reset Level Lock</button>
  </div>
  <p class="at-hint" role="status">{locks.unlockAll ? 'All levels and challenges are unlocked.' : 'Gem-based progression is active.'} Reset restores the locks and keeps earned gems.</p>
</section>
