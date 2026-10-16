<script lang="ts">
  import { AUTO_CONTINUE_DELAYS, type Settings } from '@mlt/audiationer-trainer-core';
  let { settings = $bindable() }: { settings: Settings } = $props();
</script>

<section class="at-mode-setting at-auto-continue" aria-label="Auto-continue after correct">
  <h3>Auto-continue after correct</h3>
  <div class="at-settings-segment at-settings-binary" role="group" aria-label="Auto-continue after correct">
    {#each [true, false] as enabled}<button type="button" aria-pressed={settings.autoContinueCorrect === enabled} onclick={() => { settings.autoContinueCorrect = enabled; }}>{enabled ? 'On' : 'Off'}</button>{/each}
  </div>
  {#if settings.autoContinueCorrect}
    <p class="at-continue-hint">Correct answers advance after this delay. Click the centre circle to continue immediately.</p>
    <div class="at-settings-segment" role="group" aria-label="Auto-continue delay">
      {#each AUTO_CONTINUE_DELAYS as seconds}<button type="button" aria-pressed={settings.autoContinueSeconds === seconds} onclick={() => { settings.autoContinueSeconds = seconds; }}>{seconds} s</button>{/each}
    </div>
  {/if}
</section>
