<script lang="ts">
  import ListeningEar from './ListeningEar.svelte';
  let { name, size = 24 }: { name: string; size?: number } = $props();
  const paths: Record<string, string> = {
    back: 'm14 5-7 7 7 7M7 12h14', close: 'm6 6 12 12M6 18 18 6',
    chevron: 'm6 9 6 6 6-6', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3',
    note: 'M15 4v12m0-12 4 3M15 16c0 4-7 5-7 1 0-3 7-4 7-1',
    question: 'M9 7a3 3 0 0 1 6 1c0 2-3 2.5-3 4.5M12 17.5h.01',
    hourglass: 'M5 3h14M5 21h14M7 3v4c0 2 3 3 5 5-2 2-5 3-5 5v4M17 3v4c0 2-3 3-5 5 2 2 5 3 5 5v4M9 6h6M9 18h6',
    melody: 'M8 16V6l11-3v11M8 16c0 4-6 5-6 1 0-3 6-4 6-1m11-2c0 4-6 5-6 1 0-3 6-4 6-1',
    pocket: 'M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4zm13 0h3v8h-3z',
    'no-touch': 'M8 13V5a2 2 0 0 1 4 0v6m0-4a2 2 0 0 1 4 0v5m0-3a2 2 0 0 1 4 0v7a6 6 0 0 1-6 6h-2c-2 0-3-1-4-3l-4-6a2 2 0 0 1 3-2l1 1M2 2l20 20',
    freeplay: 'M3 5h18v14H3zM7 5v14M12 5v14M17 5v14M5 5v7M10 5v7M15 5v7',
    chords: 'M6 4v16M12 4v16M18 4v16M3 9h6M9 15h6M15 7h6',
    quality: 'm12 3 9 5v8l-9 5-9-5V8zm-9 5 9 5 9-5M12 13v8',
    cycle: 'M20 8a8 8 0 0 0-13-3L4 8m0-5v5h5M4 16a8 8 0 0 0 13 3l3-3m0 5v-5h-5',
    shuffle: 'M3 5h3l12 14h3m-4-4 4 4-4 4M3 19h3l4-5m4-4 4-5h3m-4-4 4 4-4 4',
    book: 'M12 5C8 2 3 3 2 4v15c3-2 7-1 10 1 3-2 7-3 10-1V4c-3-2-7-1-10 1zm0 0v15m4-12h3m-3 4h3',
    sliders: 'M4 3v7m0 4v7M12 3v12m0 4v2M20 3v2m0 4v12M1 10h6M9 15h6M17 5h6',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
    edit: 'm14 5 5 5M4 20l5-1L21 7l-5-5L4 14z',
    check: 'm5 12 4 4L19 6',
    forward: 'M4 12h16m-6-6 6 6-6 6',
    next: 'm5 5 6 7-6 7m8-14 6 7-6 7',
    speaker: 'M4 9h4l5-4v14l-5-4H4zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
    replay: 'M5 9a8 8 0 1 1-1 6M5 3v6h6',
    undo: 'M9 6 3 12l6 6h12V6zm3 3 6 6m0-6-6 6',
  };
</script>
{#if name === 'ear'}
  <ListeningEar {size} />
{:else}
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'play'}<path d="m8 4 12 8-12 8z" fill="currentColor" stroke="none" />
  {:else if name === 'stop'}<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  {:else if name === 'pause'}<path d="M8 6v12m8-12v12" stroke-width="4" />
  {:else if name === 'help'}<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 5.5c-2.3 0-4 1.5-4 3.6h2c0-1 .8-1.7 2-1.7s2 .7 2 1.6c0 .7-.4 1.2-1.3 1.8-1.2.8-1.7 1.6-1.7 3.2h2c0-.9.2-1.3 1.3-2 1.1-.8 1.7-1.7 1.7-3 0-2-1.7-3.5-4-3.5ZM13.2 17a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
  {:else if name === 'chord-progressions'}
    <g transform="translate(0 3) scale(.48 .8)"><path d={paths.chords} /></g>
    <g transform="translate(13 0) scale(.48 .8)"><path d={paths.chords} /></g>
  {:else}<path d={paths[name] ?? paths.note} />{/if}
</svg>
{/if}
