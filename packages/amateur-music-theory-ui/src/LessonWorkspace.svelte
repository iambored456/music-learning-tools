<script module lang="ts">
  // Shared by lesson routes in this page; a browser refresh restores the panel.
  let dismissedForPage = false;
</script>

<script lang="ts">
  import { getContext, tick, untrack, type Snippet } from 'svelte';
  import { lessonInspectorKey, type LessonInspector } from './lessonInspector.svelte';
  import type { LessonSection } from './lessons';

  let { children, sections, currentStep, isPlaying, onSelectSection, onRestart, onTogglePlayback }: {
    children: Snippet;
    sections: LessonSection[];
    currentStep: number;
    isPlaying: boolean;
    onSelectSection: (step: number) => void;
    onRestart: () => void;
    onTogglePlayback: () => void;
  } = $props();

  const inspector = getContext<LessonInspector>(lessonInspectorKey);
  let open = $state(!dismissedForPage);
  let expanded = $state<Record<string, boolean>>({});
  let panel = $state<HTMLElement | null>(null);
  let pointerInPanel = $state(false);
  let followSuspended = $state(false);
  let followedScrollTop = 0;

  function suspendFollow(): void {
    followSuspended = true;
  }

  function handlePanelScroll(): void {
    if (panel && Math.abs(panel.scrollTop - followedScrollTop) > 1) suspendFollow();
  }

  $effect(() => {
    inspector.sectionCode;
    followSuspended = false;
  });

  function segmentLetter(index: number): string {
    let value = index + 1;
    let letters = '';
    while (value > 0) {
      value -= 1;
      letters = String.fromCharCode(97 + value % 26) + letters;
      value = Math.floor(value / 26);
    }
    return letters;
  }

  function segmentId(index: number): string {
    return `${inspector.sectionCode}.${segmentLetter(index)}`;
  }

  // Manual scrolling holds the user's place until a seek, restart, or section change.
  $effect(() => {
    const cue = inspector.currentCueId;
    if (cue && !followSuspended) untrack(() => { expanded = { ...expanded, [cue]: true }; });
  });

  $effect(() => {
    const cue = inspector.currentCueId;
    const action = inspector.currentActionId;
    const element = panel;
    // Let the user inspect or double-click another action without scrolling it away.
    if (!cue || !element || pointerInPanel || followSuspended) return;
    void tick().then(() => {
      if (followSuspended || pointerInPanel || inspector.currentCueId !== cue || inspector.currentActionId !== action || panel !== element) return;
      const current = element.querySelector<HTMLElement>('[data-current-action="true"]')
        ?? element.querySelector<HTMLElement>('[data-current-cue="true"]');
      if (!current) return;
      element.style.setProperty('--follow-end-space', `${element.clientHeight / 2}px`);
      const bounds = element.getBoundingClientRect();
      const target = current.getBoundingClientRect();
      // Scroll only the panel; never move the lesson or the page.
      element.scrollTop += (target.top + target.bottom - bounds.top - bounds.bottom) / 2;
      followedScrollTop = element.scrollTop;
    });
  });

  function playFrom(cueId: string, actionId?: string): void {
    if (!inspector.canSeek) return;
    followSuspended = false;
    expanded = { ...expanded, [cueId]: true };
    // Cancel and restore before resuming, so the previous speech cannot briefly restart.
    inspector.jump(cueId, actionId);
    if (!isPlaying) onTogglePlayback();
  }

  function closeInspector(): void {
    dismissedForPage = true;
    open = false;
  }
</script>

<div class="lesson-workspace">
  <div class="lesson-surface" inert={!isPlaying}>{@render children()}</div>
  {#if open}
    <aside id="lesson-inspector" aria-label="Expected lesson sequence" bind:this={panel}
      onwheel={suspendFollow} ontouchmove={suspendFollow} onscroll={handlePanelScroll}
      onpointerenter={() => pointerInPanel = true} onpointerleave={() => pointerInPanel = false}>
      <div class="panel-top"><button type="button" class="close-button" aria-label="Close Lesson Inspector" title="Close Lesson Inspector" onclick={closeInspector}>×</button></div>
      <div class="panel-navigation">
        <select aria-label="Select section" value={currentStep} onchange={(event) => {
          expanded = {};
          onSelectSection(Number(event.currentTarget.value));
        }}>
          {#each sections as section}
            <option value={Number(section.code.split('.').at(-1))}>{section.code} - {section.label}</option>
          {/each}
        </select>
      </div>
      <div class="controls">
        <button type="button" onclick={onTogglePlayback}>{isPlaying ? 'Pause' : 'Resume'}</button>
        <button type="button" onclick={() => { followSuspended = false; onRestart(); }}>Restart section</button>
      </div>
      <ol class="cue-list" aria-label="Expected segments">
        {#each inspector.cues as cue, index}
          {@const groupId = segmentId(index)}
          <li>
            <button type="button" class="cue-heading" class:current={cue.id === inspector.currentCueId}
              data-current-cue={cue.id === inspector.currentCueId}
              aria-expanded={expanded[cue.id] ?? false} aria-controls={`cue-actions-${cue.id}`}
              title="Click to expand. Double-click to play from the beginning of this segment."
              onclick={(event) => {
                if (event.detail < 2) expanded = { ...expanded, [cue.id]: !expanded[cue.id] };
              }}
              ondblclick={() => void playFrom(cue.id)}>
              <span class="chevron" class:expanded={expanded[cue.id]} aria-hidden="true"></span>
              <span>{groupId} {cue.title}</span>
            </button>
            {#if expanded[cue.id]}
              <ol id={`cue-actions-${cue.id}`} class="action-list" aria-label={`${cue.title} expected sub-segments`}>
                {#each cue.actions ?? [] as action, actionIndex}
                  {@const current = cue.id === inspector.currentCueId && action.id === inspector.currentActionId}
                  <li>
                    <button type="button" class="action-button" class:current
                      data-current-action={current} aria-current={current ? 'step' : undefined}
                      title={`${groupId}.${actionIndex + 1} · ${cue.id} / ${action.id}. Double-click or press Enter to play from here.`}
                      disabled={!inspector.canSeek}
                      onclick={(event) => { if (event.detail === 0) void playFrom(cue.id, action.id); }}
                      ondblclick={() => void playFrom(cue.id, action.id)}>
                      <span class="action-title">{groupId}.{actionIndex + 1} {action.title}</span>
                      <span class="action-detail">{action.detail}</span>
                    </button>
                  </li>
                {/each}
              </ol>
            {/if}
          </li>
        {/each}
      </ol>
    </aside>
  {/if}
</div>

<style>
  .lesson-workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; align-items: start; min-width: 0; }
  .lesson-surface { min-width: 0; display: grid; gap: 1rem; }
  aside { max-height: 70dvh; overflow: auto; overscroll-behavior: contain;
    overflow-anchor: none;
    padding: 1rem; border: 1px solid #b9ccc5; border-radius: 16px; background: #f8fcf9; color: #243e36; }
  .panel-top { display: flex; justify-content: flex-end; margin: -0.35rem -0.35rem 0.35rem; }
  .close-button { width: 1.8rem; height: 1.8rem; display: grid; place-items: center; padding: 0; font-size: 1.2rem; line-height: 1; }
  .panel-navigation { display: flex; align-items: center; gap: .5rem; }
  button, select { font: inherit; font-size: .82rem; }
  button { border: 1px solid #9dafaa; border-radius: 7px; padding: .45rem .65rem; background: white; color: #243e36; cursor: pointer; }
  button:hover:not(:disabled) { background: #e6f1ec; } button:disabled { opacity: .5; cursor: default; }
  button:focus-visible, select:focus-visible { outline: 2px solid #237a6a; outline-offset: 2px; }
  select { width: 100%; min-width: 0; border: 1px solid #9dafaa; border-radius: 6px; padding: .4rem; background: white; color: inherit; }
  .controls { display: flex; flex-wrap: wrap; gap: .4rem; margin: .6rem 0 1rem; }
  .cue-list, .action-list { padding: 0; margin: 0; list-style: none; display: grid; gap: .4rem; }
  .cue-list::after { content: ''; display: block; height: var(--follow-end-space, 0px); }
  .cue-heading { width: 100%; text-align: left; display: flex; align-items: center; gap: .6rem; font-weight: 700; }
  .cue-heading.current { background: #e0efe8; border-color: #2f8d83; }
  .chevron { flex: 0 0 .4rem; height: .4rem; border-right: 2px solid; border-bottom: 2px solid; transform: rotate(-45deg); }
  .chevron.expanded { transform: rotate(45deg); }
  .action-list { margin: .4rem 0 .75rem .65rem; padding-left: .6rem; border-left: 1px solid #bed3c8; }
  .action-button { display: grid; gap: .3rem; text-align: left; width: 100%; border-color: transparent; background: transparent; }
  .action-button.current { border-color: #2f8d83; background: #e0efe8; box-shadow: inset 3px 0 #2f8d83; }
  .action-title { font-weight: 600; overflow-wrap: anywhere; }
  .action-detail { font-size: .76rem; line-height: 1.45; color: #52655d; }
  /* Leave room for the centered 1220px lesson and the inspector in its right gutter. */
  @media (min-width: 2100px) {
    aside {
      position: fixed;
      top: 1rem;
      right: 1rem;
      bottom: 1rem;
      width: 25rem;
      max-width: calc((100vw - var(--amt-content-max)) / 2 - 2rem);
      max-height: calc(100dvh - 2rem);
      z-index: 40;
    }
  }
</style>
