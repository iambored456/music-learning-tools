<script lang="ts">
  import { onMount } from 'svelte';

  type TypographyRole = {
    name: string;
    token: string;
    sample: string;
  };

  type ComputedTypography = {
    size: string;
    weight: string;
    lineHeight: string;
    letterSpacing: string;
  };

  const roles: TypographyRole[] = [
    { name: 'Display text', token: '--typography-display', sample: 'Student Notation' },
    { name: 'Dialog title', token: '--typography-dialog-title', sample: 'Import score settings' },
    { name: 'Section title', token: '--typography-section-title', sample: 'Pitch controls' },
    { name: 'Body text', token: '--typography-body', sample: 'Build, hear, and refine a musical idea.' },
    { name: 'Small body text', token: '--typography-small-body', sample: 'Changes are saved in this browser.' },
    { name: 'Standard control', token: '--typography-control', sample: 'Apply changes' },
    { name: 'Dense control', token: '--typography-dense-control', sample: 'Snap: 1/16' },
    { name: 'Label', token: '--typography-label', sample: 'TEMPO' },
    { name: 'Value', token: '--typography-value', sample: '120 BPM' },
    { name: 'Caption', token: '--typography-caption', sample: 'Drag to adjust the selected note.' },
    { name: 'Monospace diagnostic', token: '--typography-diagnostic', sample: 'row=42 col=16 time=3.250' },
    { name: 'Fluid tab', token: '--typography-fluid-tab', sample: 'Rhythm' },
    { name: 'Notation label', token: '--typography-notation-label', sample: 'C♯4  ·  ♭3' },
    { name: 'User annotation', token: '--typography-annotation', sample: 'dolce — breathe here' },
  ];

  const themes = [
    { id: 'light', name: 'Light theme' },
    { id: 'dark', name: 'Dark theme' },
  ] as const;

  let specimenRoot: HTMLElement | undefined = $state();
  let computedTypography = $state<Record<string, ComputedTypography>>({});

  function roleStyle(token: string): string {
    return [
      `font-family: var(${token}-font-family)`,
      `font-size: var(${token}-font-size)`,
      `font-weight: var(${token}-font-weight)`,
      `line-height: var(${token}-line-height)`,
      `letter-spacing: var(${token}-letter-spacing)`,
    ].join('; ');
  }

  function readComputedTypography(): void {
    if (!specimenRoot) {return;}

    const next: Record<string, ComputedTypography> = {};
    specimenRoot.querySelectorAll<HTMLElement>('[data-typography-id]').forEach((element) => {
      const id = element.dataset.typographyId;
      if (!id) {return;}

      const style = window.getComputedStyle(element);
      next[id] = {
        size: style.fontSize,
        weight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
      };
    });
    computedTypography = next;
  }

  function metric(id: string, property: keyof ComputedTypography): string {
    return computedTypography[id]?.[property] ?? '…';
  }

  onMount(() => {
    let animationFrame = window.requestAnimationFrame(readComputedTypography);
    const handleResize = (): void => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(readComputedTypography);
    };

    window.addEventListener('resize', handleResize);
    void document.fonts?.ready.then(readComputedTypography);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<svelte:head>
  <title>Student Notation Typography Specimen</title>
</svelte:head>

<main class="specimen" bind:this={specimenRoot}>
  <header class="specimen-header">
    <p class="eyebrow">Development-only review surface</p>
    <h1>Student Notation typography</h1>
    <p class="introduction">
      Proposed semantic roles are rendered directly from the foundation tokens. Values below are
      read from computed styles after the fonts load and whenever the viewport changes.
    </p>
  </header>

  <div class="theme-grid">
    {#each themes as theme}
      <section class:theme-panel--dark={theme.id === 'dark'} class="theme-panel">
        <header class="theme-header">
          <h2>{theme.name}</h2>
          <span>Semantic colour aliases</span>
        </header>

        <div class="colour-list" aria-label={`${theme.name} semantic text colours`}>
          <span class="colour-primary">Primary</span>
          <span class="colour-secondary">Secondary</span>
          <span class="colour-on-accent">On accent</span>
          <span class="colour-inverse">Inverse</span>
          <span class="colour-danger">Danger</span>
          <span class="colour-notation">Notation</span>
          <span class="colour-notation-inverse">Inverse notation</span>
          <span class="colour-notation-outline">Notation outline</span>
        </div>

        <div class="role-list">
          {#each roles as role}
            <article class="role-card">
              <div class="role-meta">
                <h3>{role.name}</h3>
                <code>{role.token}-*</code>
              </div>
              <div class="role-preview">
                <p
                  class:notation-sample={role.token === '--typography-notation-label'}
                  class="role-sample"
                  data-typography-id={`${theme.id}-${role.token}`}
                  style={roleStyle(role.token)}
                >{role.sample}</p>
              </div>
              <dl class="metrics">
                <div><dt>Size</dt><dd>{metric(`${theme.id}-${role.token}`, 'size')}</dd></div>
                <div><dt>Weight</dt><dd>{metric(`${theme.id}-${role.token}`, 'weight')}</dd></div>
                <div><dt>Line</dt><dd>{metric(`${theme.id}-${role.token}`, 'lineHeight')}</dd></div>
                <div><dt>Spacing</dt><dd>{metric(`${theme.id}-${role.token}`, 'letterSpacing')}</dd></div>
              </dl>
            </article>
          {/each}
        </div>

        <section class="state-section">
          <h3>Standard control states</h3>
          <div class="state-grid">
            <button class="state-control" type="button">Normal</button>
            <button class="state-control is-selected" type="button" aria-pressed="true">Selected</button>
            <button class="state-control" type="button" disabled>Disabled</button>
            <button class="state-control is-focus" type="button">Focus</button>
            <button class="state-control is-error" type="button">Error</button>
          </div>
        </section>
      </section>
    {/each}
  </div>

  <section class="fluid-section">
    <header>
      <p class="eyebrow">Responsive role</p>
      <h2>Fluid tab sizing</h2>
      <p>Both examples use the same <code>--typography-fluid-tab-*</code> tokens.</p>
    </header>
    <div class="fluid-examples">
      <div class="fluid-example fluid-example--constrained">
        <span class="frame-label">Constrained · 224px container</span>
        <span
          class="fluid-tab"
          data-typography-id="fluid-constrained"
          style={roleStyle('--typography-fluid-tab')}
        >Timbre</span>
        <span class="frame-metric">Computed size: {metric('fluid-constrained', 'size')}</span>
      </div>
      <div class="fluid-example fluid-example--unconstrained">
        <span class="frame-label">Unconstrained · up to 640px container</span>
        <span
          class="fluid-tab"
          data-typography-id="fluid-unconstrained"
          style={roleStyle('--typography-fluid-tab')}
        >Timbre</span>
        <span class="frame-metric">Computed size: {metric('fluid-unconstrained', 'size')}</span>
      </div>
    </div>
  </section>
</main>

<style>
  .specimen {
    box-sizing: border-box;
    width: 100%;
    min-height: 100%;
    overflow: auto;
    padding: clamp(1rem, 3vw, 2.5rem);
    color: var(--text-color-primary);
    background: var(--c-bg);
    font-family: var(--typography-body-font-family);
  }

  .specimen *,
  .specimen *::before,
  .specimen *::after {
    box-sizing: border-box;
  }

  .specimen-header,
  .fluid-section {
    max-width: 90rem;
    margin-inline: auto;
  }

  .specimen-header h1 {
    margin: 0;
    color: var(--text-color-primary);
    font-family: var(--typography-display-font-family);
    font-size: var(--typography-display-font-size);
    font-weight: var(--typography-display-font-weight);
    line-height: var(--typography-display-line-height);
    letter-spacing: var(--typography-display-letter-spacing);
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    color: var(--text-color-secondary);
    font-family: var(--typography-label-font-family);
    font-size: var(--typography-label-font-size);
    font-weight: var(--typography-label-font-weight);
    line-height: var(--typography-label-line-height);
    letter-spacing: var(--typography-label-letter-spacing);
    text-transform: uppercase;
  }

  .introduction {
    max-width: 48rem;
    margin: 0.75rem 0 1.5rem;
    color: var(--text-color-secondary);
    font-family: var(--typography-body-font-family);
    font-size: var(--typography-body-font-size);
    font-weight: var(--typography-body-font-weight);
    line-height: var(--typography-body-line-height);
    letter-spacing: var(--typography-body-letter-spacing);
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    max-width: 90rem;
    margin-inline: auto;
  }

  .theme-panel {
    --c-bg: #f5f7fb;
    --c-surface: #fff;
    --c-surface-muted: #f1f3f5;
    --c-text: #212529;
    --c-text-muted: #6c757d;
    --c-border: #dee2e6;
    --c-border-strong: #adb5bd;
    --c-accent: #4a90e2;
    --c-danger: #dc3545;
    --text-color-primary: var(--c-text);
    --text-color-secondary: var(--c-text-muted);
    --text-color-danger: var(--c-danger);

    min-width: 0;
    padding: 1rem;
    color: var(--text-color-primary);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 0.75rem;
    box-shadow: var(--box-shadow-sm);
    color-scheme: light;
  }

  .theme-panel--dark {
    --c-bg: #101418;
    --c-surface: #20262d;
    --c-surface-muted: #2a323b;
    --c-text: #e9eef4;
    --c-text-muted: #aab6c2;
    --c-border: #3a4551;
    --c-border-strong: #556170;
    --c-accent: #4a90e2;
    --c-danger: #ff6b78;

    color-scheme: dark;
  }

  .theme-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--c-border);
  }

  .theme-header h2,
  .fluid-section h2 {
    margin: 0;
    color: var(--text-color-primary);
    font-family: var(--typography-dialog-title-font-family);
    font-size: var(--typography-dialog-title-font-size);
    font-weight: var(--typography-dialog-title-font-weight);
    line-height: var(--typography-dialog-title-line-height);
    letter-spacing: var(--typography-dialog-title-letter-spacing);
  }

  .theme-header span {
    color: var(--text-color-secondary);
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
    letter-spacing: var(--typography-caption-letter-spacing);
  }

  .role-list {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .colour-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
  }

  .colour-list span {
    padding: 0.3rem 0.5rem;
    background: var(--c-surface-muted);
    border: 1px solid var(--c-border);
    border-radius: 999px;
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
    letter-spacing: var(--typography-caption-letter-spacing);
  }

  .colour-list .colour-primary {
    color: var(--text-color-primary);
  }

  .colour-list .colour-secondary {
    color: var(--text-color-secondary);
  }

  .colour-list .colour-on-accent {
    color: var(--text-color-on-accent);
    background: var(--c-accent);
    border-color: var(--c-accent);
  }

  .colour-list .colour-inverse {
    color: var(--text-color-inverse);
    background: #212529;
    border-color: #212529;
  }

  .colour-list .colour-danger {
    color: var(--text-color-danger);
  }

  .colour-list .colour-notation {
    color: var(--text-color-notation);
    background: #fff;
  }

  .colour-list .colour-notation-inverse {
    color: var(--text-color-notation-inverse);
    background: #212529;
    border-color: #212529;
  }

  .colour-list .colour-notation-outline {
    color: var(--text-color-notation-inverse);
    background: #6c757d;
    text-shadow:
      -1px -1px 0 var(--text-color-notation-outline),
      1px -1px 0 var(--text-color-notation-outline),
      -1px 1px 0 var(--text-color-notation-outline),
      1px 1px 0 var(--text-color-notation-outline);
  }

  .role-card {
    display: grid;
    grid-template-columns: minmax(8rem, 0.9fr) minmax(10rem, 1.3fr);
    gap: 0.65rem 1rem;
    align-items: center;
    min-width: 0;
    padding: 0.75rem;
    background: var(--c-surface-muted);
    border: 1px solid var(--c-border);
    border-radius: 0.5rem;
  }

  .role-meta h3,
  .state-section h3 {
    margin: 0;
    color: var(--text-color-primary);
    font-family: var(--typography-section-title-font-family);
    font-size: var(--typography-section-title-font-size);
    font-weight: var(--typography-section-title-font-weight);
    line-height: var(--typography-section-title-line-height);
    letter-spacing: var(--typography-section-title-letter-spacing);
  }

  code,
  .frame-metric {
    color: var(--text-color-secondary);
    font-family: var(--typography-diagnostic-font-family);
    font-size: var(--typography-diagnostic-font-size);
    font-weight: var(--typography-diagnostic-font-weight);
    line-height: var(--typography-diagnostic-line-height);
    letter-spacing: var(--typography-diagnostic-letter-spacing);
  }

  .role-meta code {
    display: block;
    margin-top: 0.2rem;
    overflow-wrap: anywhere;
  }

  .role-preview {
    container-type: inline-size;
    min-width: 0;
  }

  .role-sample {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--text-color-primary);
  }

  .role-sample.notation-sample {
    color: var(--text-color-notation);
    text-shadow: 0 0 1px var(--text-color-notation-inverse);
  }

  .metrics {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.35rem;
    margin: 0;
  }

  .metrics div {
    min-width: 0;
    padding-top: 0.35rem;
    border-top: 1px solid var(--c-border);
  }

  .metrics dt {
    color: var(--text-color-secondary);
    font-family: var(--typography-label-font-family);
    font-size: var(--typography-label-font-size);
    font-weight: var(--typography-label-font-weight);
    line-height: var(--typography-label-line-height);
    letter-spacing: var(--typography-label-letter-spacing);
  }

  .metrics dd {
    margin: 0.15rem 0 0;
    overflow-wrap: anywhere;
    color: var(--text-color-primary);
    font-family: var(--typography-diagnostic-font-family);
    font-size: var(--typography-diagnostic-font-size);
    font-weight: var(--typography-diagnostic-font-weight);
    line-height: var(--typography-diagnostic-line-height);
    letter-spacing: var(--typography-diagnostic-letter-spacing);
  }

  .state-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--c-border);
  }

  .state-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.65rem;
  }

  .state-control {
    appearance: none;
    min-height: 2.25rem;
    padding: 0.45rem 0.75rem;
    color: var(--text-color-primary);
    background: var(--c-surface);
    border: 1px solid var(--c-border-strong);
    border-radius: 0.35rem;
    font-family: var(--typography-control-font-family);
    font-size: var(--typography-control-font-size);
    font-weight: var(--typography-control-font-weight);
    line-height: var(--typography-control-line-height);
    letter-spacing: var(--typography-control-letter-spacing);
  }

  .state-control.is-selected {
    color: var(--text-color-on-accent);
    background: var(--c-accent);
    border-color: var(--c-accent);
  }

  .state-control:disabled {
    color: var(--text-color-secondary);
    opacity: 0.55;
  }

  .state-control.is-focus {
    outline: 3px solid color-mix(in srgb, var(--c-accent) 45%, transparent);
    outline-offset: 2px;
  }

  .state-control.is-error {
    color: var(--text-color-danger);
    border-color: var(--text-color-danger);
  }

  .fluid-section {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 0.75rem;
  }

  .fluid-section header > p:last-child {
    margin: 0.45rem 0 0;
    color: var(--text-color-secondary);
    font-family: var(--typography-small-body-font-family);
    font-size: var(--typography-small-body-font-size);
    font-weight: var(--typography-small-body-font-weight);
    line-height: var(--typography-small-body-line-height);
    letter-spacing: var(--typography-small-body-letter-spacing);
  }

  .fluid-examples {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }

  .fluid-example {
    container-type: inline-size;
    display: grid;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--c-surface-muted);
    border: 1px solid var(--c-border);
    border-radius: 0.5rem;
  }

  .fluid-example--constrained {
    width: min(100%, 14rem);
  }

  .fluid-example--unconstrained {
    width: min(100%, 40rem);
  }

  .frame-label {
    color: var(--text-color-secondary);
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
    letter-spacing: var(--typography-caption-letter-spacing);
  }

  .fluid-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.5rem;
    padding: 0.5rem 1rem;
    color: var(--text-color-on-accent);
    background: var(--c-accent);
    border-radius: 0.4rem;
  }

  @media (max-width: 70rem) {
    .theme-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 35rem) {
    .role-card {
      grid-template-columns: 1fr;
    }

    .metrics {
      grid-column: 1;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
