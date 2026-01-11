// js/bootstrap/input/initInputAndDiagnostics.ts
import { initKeyboardHandler } from '@services/keyboardHandler.ts';
import { initSpacebarHandler } from '@services/spacebarHandler.ts';
import { initTransportKeyboardShortcuts } from '@services/transportKeyboardShortcuts.ts';
import logger from '@utils/logger.ts';
import { initUIDiagnostics } from '@utils/uiDiagnostics.ts';

export function initInputAndDiagnostics() {
  logger.section('SETTING UP INPUT HANDLERS');
  initKeyboardHandler();
  initTransportKeyboardShortcuts();
  initSpacebarHandler();

  // Optionally enable UI diagnostics if present
  if ((window as typeof window & { enableUIDiagnostics?: boolean }).enableUIDiagnostics) {
    initUIDiagnostics();
  }
}
