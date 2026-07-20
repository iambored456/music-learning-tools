<script lang="ts" module>
  /**
   * NotificationModal - Programmatic API for showing notifications
   *
   * This replaces: src/components/ui/notificationSystem.ts
   */

  interface NotificationButton {
    text: string;
    primary?: boolean;
    action?: () => void;
  }

  interface NotificationOptions {
    title?: string;
    message?: string;
    details?: string[];
    buttons?: NotificationButton[];
  }

  // Module-level state for programmatic API
  let showNotification: ((options: NotificationOptions) => void) | null = null;
  let hideNotification: (() => void) | null = null;

  export const notificationSystem = {
    show(options: NotificationOptions = {}) {
      showNotification?.(options);
    },
    hide() {
      hideNotification?.();
    },
    alert(message: string, title = 'Notice') {
      showNotification?.({
        title,
        message,
        buttons: [{ text: 'OK', primary: true }]
      });
    },
    confirm(message: string, title = 'Confirm'): Promise<boolean> {
      return new Promise((resolve) => {
        showNotification?.({
          title,
          message,
          buttons: [
            { text: 'Cancel', primary: false, action: () => { hideNotification?.(); resolve(false); } },
            { text: 'OK', primary: true, action: () => { hideNotification?.(); resolve(true); } }
          ]
        });
      });
    }
  };
</script>

<script lang="ts">
  // Reactive state using Svelte 5 runes
  let visible = $state(false);
  let title = $state('Notice');
  let message = $state('');
  let details = $state<string[]>([]);
  let buttons = $state<NotificationButton[]>([{ text: 'OK', primary: true }]);

  // Expose API at module level
  showNotification = (options: NotificationOptions = {}) => {
    title = options.title || 'Notice';
    message = options.message || '';
    details = options.details || [];
    buttons = options.buttons || [{ text: 'OK', primary: true }];
    visible = true;

    // Focus first button for keyboard accessibility
    setTimeout(() => {
      const firstButton = document.querySelector('.notification-button') as HTMLElement | null;
      firstButton?.focus();
    }, 100);
  };

  hideNotification = () => {
    visible = false;
  };

  // Event handlers
  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      visible = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && visible) {
      visible = false;
    }
  }

  function handleButtonClick(button: NotificationButton) {
    if (button.action) {
      button.action();
    } else {
      visible = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
  <div
    class="notification-overlay visible"
    role="presentation"
    onclick={handleOverlayClick}
  >
    <div class="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notification-title">
      <button class="notification-close" onclick={() => (visible = false)} aria-label="Close">
        ×
      </button>

      <h2 id="notification-title" class="notification-title">{title}</h2>
      <p class="notification-message">{message}</p>
      {#if details.length > 0}
        <ul class="notification-details">
          {#each details as detail}
            <li>{detail}</li>
          {/each}
        </ul>
      {/if}

      <div class="notification-actions">
        {#each buttons as button}
          <button
            class="notification-button {button.primary ? '' : 'secondary'}"
            onclick={() => handleButtonClick(button)}
          >
            {button.text}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .notification-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .notification-overlay.visible {
    display: flex;
  }

  .notification-modal {
    position: relative;
    color: var(--text-color-primary);
    background-color: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 24px;
    min-width: 320px;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .notification-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: var(--text-color-secondary);
    cursor: pointer;
    padding: 4px 8px;
    font-family: var(--typography-control-font-family);
    font-size: var(--font-size-500);
    font-weight: var(--typography-control-font-weight);
    line-height: var(--line-height-solid);
    letter-spacing: var(--typography-control-letter-spacing);
  }

  .notification-close:hover {
    color: var(--text-color-primary);
  }

  .notification-title {
    margin: 0 0 12px 0;
    color: var(--text-color-primary);
    font-family: var(--typography-dialog-title-font-family);
    font-size: var(--typography-dialog-title-font-size);
    font-weight: var(--typography-dialog-title-font-weight);
    line-height: var(--typography-dialog-title-line-height);
    letter-spacing: var(--typography-dialog-title-letter-spacing);
  }

  .notification-message {
    margin: 0 0 20px 0;
    color: var(--text-color-primary);
    font-family: var(--typography-body-font-family);
    font-size: var(--typography-body-font-size);
    font-weight: var(--typography-body-font-weight);
    line-height: var(--typography-body-line-height);
    letter-spacing: var(--typography-body-letter-spacing);
  }

  .notification-details {
    margin: -8px 0 20px;
    padding-left: 20px;
    color: var(--text-color-secondary);
    font-family: var(--typography-small-body-font-family);
    font-size: var(--typography-small-body-font-size);
    font-weight: var(--typography-small-body-font-weight);
    line-height: var(--typography-small-body-line-height);
    letter-spacing: var(--typography-small-body-letter-spacing);
  }

  .notification-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .notification-button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-family: var(--typography-control-font-family);
    font-size: var(--typography-control-font-size);
    font-weight: var(--typography-control-font-weight);
    line-height: var(--typography-control-line-height);
    letter-spacing: var(--typography-control-letter-spacing);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .notification-button:not(.secondary) {
    background-color: #4a90e2;
    color: var(--text-color-on-accent);
  }

  .notification-button:not(.secondary):hover {
    background-color: #357abd;
  }

  .notification-button.secondary {
    background-color: #444;
    color: var(--text-color-inverse);
  }

  .notification-button.secondary:hover {
    background-color: #555;
  }

  .notification-button:focus {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
  }
</style>
