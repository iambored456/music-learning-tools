<script lang="ts">
  import type { LessonSection } from './lessons';

  export let steps: LessonSection[] = [];
  export let currentStep = 1;
  export let completedCurrentStep = false;
  export let onSelectStep: ((step: number) => void) | undefined = undefined;

  function canSelectStep(stepNumber: number): boolean {
    return Boolean(onSelectStep) && stepNumber <= currentStep;
  }
</script>

<div
  class="lesson-progress"
  role="group"
  aria-label="Lesson subsection progress"
  style={`grid-template-columns: repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr));`}
>
  {#each steps as step, index (step.id)}
    {@const stepNumber = index + 1}
    {@const state =
      stepNumber < currentStep || (completedCurrentStep && stepNumber === currentStep)
        ? 'completed'
        : stepNumber === currentStep
          ? 'current'
          : 'upcoming'}
    <button
      class={`lesson-progress-segment is-${state}`}
      type="button"
      title={`${step.code} ${step.label}`}
      aria-current={state === 'current' ? 'step' : undefined}
      aria-label={`Subsection ${step.code}: ${step.label}`}
      disabled={!canSelectStep(stepNumber)}
      onclick={() => onSelectStep?.(stepNumber)}
    >
      <span>{stepNumber}</span>
    </button>
  {/each}
</div>

<style>
  .lesson-progress {
    display: grid;
    gap: 0;
    width: fit-content;
    max-width: 100%;
    overflow: hidden;
    border: 1px solid rgba(27, 33, 39, 0.16);
    border-radius: 0.42rem;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 6px 16px rgba(39, 28, 18, 0.06);
  }

  .lesson-progress-segment {
    width: 2.35rem;
    min-width: 2.35rem;
    min-height: 2.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: rgba(255, 255, 255, 0.86);
    color: #27313a;
    font: inherit;
    font-size: 1.35rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0;
    white-space: nowrap;
    cursor: default;
    transition:
      background-color 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
  }

  .lesson-progress-segment span {
    pointer-events: none;
  }

  .lesson-progress-segment.is-completed {
    background: #31dc5e;
    color: #0d1a10;
    cursor: pointer;
  }

  .lesson-progress-segment.is-current {
    background: #f07b7b;
    color: #241313;
    cursor: pointer;
    box-shadow: inset 0 0 0 3px rgba(126, 30, 30, 0.42);
  }

  .lesson-progress-segment.is-upcoming {
    background: #f7f7f7;
    color: #2d2f32;
  }

  .lesson-progress-segment:not(:disabled):hover,
  .lesson-progress-segment:not(:disabled):focus-visible {
    filter: brightness(0.97);
  }

  .lesson-progress-segment:disabled {
    opacity: 1;
  }

  @media (max-width: 720px) {
    .lesson-progress {
      border-width: 1px;
    }

    .lesson-progress-segment {
      width: 2rem;
      min-width: 2rem;
      min-height: 2rem;
      font-size: 1.05rem;
    }
  }
</style>
