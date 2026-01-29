<script lang="ts">
  /**
   * Settings Renderer Component
   *
   * Renders a generic settings UI from a schema definition.
   * Supports integer and boolean field types.
   */

  import type { LessonSettingsSchema, SettingField } from '@mlt/lesson-templates';

  interface Props {
    schema: LessonSettingsSchema;
    values: Record<string, number | boolean>;
    onchange?: (key: string, value: number | boolean) => void;
    disabled?: boolean;
  }

  let { schema, values, onchange, disabled = false }: Props = $props();

  function handleIntegerChange(field: SettingField, event: Event) {
    const target = event.target as HTMLInputElement;
    let value = parseInt(target.value, 10);

    // Clamp to min/max
    if (field.min !== undefined && value < field.min) {
      value = field.min;
    }
    if (field.max !== undefined && value > field.max) {
      value = field.max;
    }

    onchange?.(field.key, value);
  }

  function handleBooleanChange(field: SettingField, event: Event) {
    const target = event.target as HTMLInputElement;
    onchange?.(field.key, target.checked);
  }

  function getValue(key: string, defaultValue: number | boolean): number | boolean {
    return values[key] ?? defaultValue;
  }
</script>

<div class="settings-renderer">
  {#each schema.fields as field}
    <div class="setting-field" class:boolean-field={field.type === 'boolean'}>
      {#if field.type === 'integer'}
        <label class="field-label">
          <span class="label-text">{field.label}</span>
          <input
            type="number"
            class="field-input"
            value={getValue(field.key, field.default)}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onchange={(e) => handleIntegerChange(field, e)}
            {disabled}
          />
        </label>
      {:else if field.type === 'boolean'}
        <label class="field-label toggle-label">
          <span class="label-text">{field.label}</span>
          <input
            type="checkbox"
            class="field-checkbox"
            checked={Boolean(getValue(field.key, field.default))}
            onchange={(e) => handleBooleanChange(field, e)}
            {disabled}
          />
          <span class="toggle-slider"></span>
        </label>
      {/if}
      {#if field.description}
        <span class="field-description">{field.description}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .settings-renderer {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .setting-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .setting-field.boolean-field {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .field-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .toggle-label {
    cursor: pointer;
    position: relative;
  }

  .label-text {
    color: var(--color-text);
    font-weight: 500;
  }

  .field-input {
    width: 80px;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    text-align: right;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .field-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Custom toggle switch */
  .field-checkbox {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    width: 40px;
    height: 22px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 11px;
    position: relative;
    transition: background-color 0.2s ease;
    flex-shrink: 0;
  }

  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background-color: var(--color-text-muted);
    border-radius: 50%;
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  .field-checkbox:checked + .toggle-slider {
    background-color: var(--color-primary);
  }

  .field-checkbox:checked + .toggle-slider::after {
    transform: translateX(18px);
    background-color: white;
  }

  .field-checkbox:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .field-description {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-left: 0;
  }

  .boolean-field .field-description {
    display: none;
  }
</style>
