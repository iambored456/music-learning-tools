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
  let buttons = $state<NotificationButton[]>([{ text: 'OK', primary: true }]);

  // Expose API at module level
  showNotification = (options: NotificationOptions = {}) => {
    title = options.title || 'Notice';
    message = options.message || '';
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

  function handleOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
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
    role="button"
    tabindex="0"
    aria-label="Dismiss notification"
    onclick={handleOverlayClick}
    onkeydown={handleOverlayKeydown}
  >
    <div class="notification-modal">
      <button class="notification-close" onclick={() => (visible = false)} aria-label="Close">
        ×
      </button>

      <h2 class="notification-title">{title}</h2>
      <p class="notification-message">{message}</p>

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
    background-color: #2a2a2a;
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
    font-size: 24px;
    color: #aaa;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
  }

  .notification-close:hover {
    color: #fff;
  }

  .notification-title {
    margin: 0 0 12px 0;
    font-size: 20px;
    font-weight: 600;
    color: #fff;
  }

  .notification-message {
    margin: 0 0 20px 0;
    font-size: 14px;
    line-height: 1.5;
    color: #ccc;
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
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .notification-button:not(.secondary) {
    background-color: #4a90e2;
    color: #fff;
  }

  .notification-button:not(.secondary):hover {
    background-color: #357abd;
  }

  .notification-button.secondary {
    background-color: #444;
    color: #fff;
  }

  .notification-button.secondary:hover {
    background-color: #555;
  }

  .notification-button:focus {
    outline: 2px solid #4a90e2;
    outline-offset: 2px;
  }
</style>
