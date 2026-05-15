<script lang="ts">
  export let label: string;
  export let markerClass = '';
  export let iconClass: string | null = null;
</script>

{#if iconClass}
  <span class={`glyph-icon ${iconClass}`} aria-hidden="true"></span>
  <span class="sr-only">{label}</span>
{:else}
  <span class={markerClass}>{label}</span>
{/if}

<style>
  .glyph-icon {
    display: block;
    width: 1.02em;
    height: 1.02em;
    background-color: #111;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
  }

  .glyph-icon--clap {
    -webkit-mask-image: url('./assets/clap.svg');
    mask-image: url('./assets/clap.svg');
  }

  .glyph-icon--stomp {
    -webkit-mask-image: url('./assets/stomp.svg');
    mask-image: url('./assets/stomp.svg');
  }

  .glyph-icon--djembe {
    -webkit-mask-image: url('./assets/djembe.svg');
    mask-image: url('./assets/djembe.svg');
  }

  .glyph-icon--stick-clicks {
    -webkit-mask-image: url('./assets/stick-clicks.svg');
    mask-image: url('./assets/stick-clicks.svg');
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
