<script lang="ts">
  let { deadline, seconds, size = 48 }: { deadline: number; seconds: number; size?: number } = $props();
  // The session owns the deadline; negative delay keeps the sweep aligned with it.
  const delay = $derived(Math.min(0, (deadline - performance.now()) / 1000 - seconds));
</script>

<span class="at-continue-clock" style={`width:${size}px;height:${size}px;animation-duration:${seconds}s;animation-delay:${delay}s`} aria-hidden="true"></span>
