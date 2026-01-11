/**
 * Handoff Initializer
 *
 * Handles the "Take to Singing Trainer" button functionality.
 * Validates the current notation for monophonic requirements and
 * exports to Singing Trainer via the handoff slot.
 */

import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import {
  convertToSnapshot,
  validateForExport,
  writeHandoffSlot,
  navigateToSingingTrainer,
  type StudentNotationState,
} from '@mlt/handoff';

/**
 * Show a validation error popup to the user.
 */
function showValidationError(summary: string, details: string[]): void {
  const overlay = document.getElementById('notification-overlay');
  const messageEl = overlay?.querySelector('.notification-message');
  const titleEl = overlay?.querySelector('.notification-title');

  if (!overlay || !messageEl) {
    // Fallback to alert if notification system unavailable
    alert(`${summary}\n\n${details.join('\n')}`);
    return;
  }

  if (titleEl) {
    titleEl.textContent = 'Cannot Export to Singing Trainer';
  }

  // Format the error message with details
  const formattedDetails = details.length > 0
    ? `<ul style="text-align: left; margin-top: 8px; padding-left: 20px;">${details.map(d => `<li style="margin-bottom: 4px;">${escapeHtml(d)}</li>`).join('')}</ul>`
    : '';

  messageEl.innerHTML = `<p>${escapeHtml(summary)}</p>${formattedDetails}`;

  overlay.classList.add('visible');

  // Setup close handlers
  const closeBtn = overlay.querySelector('.notification-close');
  const okBtn = overlay.querySelector('.notification-button');

  const closeHandler = (): void => {
    overlay.classList.remove('visible');
    closeBtn?.removeEventListener('click', closeHandler);
    okBtn?.removeEventListener('click', closeHandler);
  };

  closeBtn?.addEventListener('click', closeHandler);
  okBtn?.addEventListener('click', closeHandler);
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show a success notification.
 */
function showSuccessNotification(message: string): void {
  const overlay = document.getElementById('notification-overlay');
  const messageEl = overlay?.querySelector('.notification-message');
  const titleEl = overlay?.querySelector('.notification-title');

  if (!overlay || !messageEl) {
    return;
  }

  if (titleEl) {
    titleEl.textContent = 'Exporting to Singing Trainer';
  }

  messageEl.innerHTML = `<p>${escapeHtml(message)}</p>`;
  overlay.classList.add('visible');

  // Auto-close after a short delay
  setTimeout(() => {
    overlay.classList.remove('visible');
  }, 1500);
}

/**
 * Check if there are any pitch notes to export.
 */
function hasPitchNotes(): boolean {
  return store.state.placedNotes.some(note => !note.isDrum);
}

/**
 * Handle the "Take to Singing Trainer" button click.
 */
async function handleTakeToSingingTrainer(): Promise<void> {
  logger.info('HandoffInitializer', 'Take to Singing Trainer clicked', null, 'general');

  // Check if there are any notes to export
  if (!hasPitchNotes()) {
    showValidationError(
      'No notes to export',
      ['Add some pitch notes to the grid before exporting to Singing Trainer.']
    );
    return;
  }

  // Build the state object for conversion
  const state: StudentNotationState = {
    placedNotes: store.state.placedNotes,
    macrobeatGroupings: store.state.macrobeatGroupings,
    macrobeatBoundaryStyles: store.state.macrobeatBoundaryStyles,
    fullRowData: store.state.fullRowData,
    pitchRange: store.state.pitchRange,
    tempo: store.state.tempo,
    annotations: store.state.annotations,
  };

  // Convert to snapshot
  const snapshot = convertToSnapshot(state);

  // Validate for Singing Trainer requirements
  const validation = validateForExport(snapshot);

  if (!validation.isValid) {
    logger.warn('HandoffInitializer', 'Validation failed', validation.details, 'general');

    // Format conflicts for display
    const conflictMessages: string[] = [];
    for (const conflict of validation.details.conflicts) {
      const colRange = conflict.conflictColumns.length === 1
        ? `column ${conflict.conflictColumns[0]}`
        : `columns ${conflict.conflictColumns[0]}-${conflict.conflictColumns[conflict.conflictColumns.length - 1]}`;

      conflictMessages.push(
        `Voice "${conflict.color}": Overlap at ${colRange}`
      );
    }

    showValidationError(validation.summary, conflictMessages);
    return;
  }

  // Validation passed - write to handoff slot
  try {
    showSuccessNotification('Preparing handoff...');

    const handoffId = await writeHandoffSlot(snapshot);
    logger.info('HandoffInitializer', 'Handoff slot written', { handoffId }, 'general');

    // Navigate to Singing Trainer
    navigateToSingingTrainer(handoffId);
  } catch (error) {
    logger.error('HandoffInitializer', 'Failed to write handoff slot', error, 'general');
    showValidationError(
      'Export failed',
      ['An error occurred while preparing the handoff. Please try again.']
    );
  }
}

/**
 * Initialize the handoff button.
 */
export function initHandoff(): void {
  const button = document.getElementById('take-to-singing-trainer-button');

  if (!button) {
    logger.warn('HandoffInitializer', 'Take to Singing Trainer button not found', null, 'general');
    return;
  }

  button.addEventListener('click', () => {
    void handleTakeToSingingTrainer();
  });

  logger.info('HandoffInitializer', 'Handoff button initialized', null, 'general');
}
