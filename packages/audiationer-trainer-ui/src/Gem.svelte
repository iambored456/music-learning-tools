<script lang="ts">
  let { colour = '#4ed795', lit = true }: { colour?: string; lit?: boolean } = $props();
</script>
<svg class="at-gem" viewBox="0 0 36 48" aria-hidden="true" style={`color:${lit ? colour : 'var(--at-gem-off)'}`}>
  <path d="M18 1 35 33 18 47 1 33Z" fill="currentColor" />
  <path d="M18 1v27L1 33Z" fill="#000" opacity=".17" />
  <path d="M18 1 35 33 18 28Z" fill="#000" opacity=".32" />
  <path d="m18 21 8 13-8 13-8-13Z" fill="#fff" opacity=".4" />
  <path d="m1 33 17-5v19Z" fill="#fff" opacity=".14" />
</svg>
