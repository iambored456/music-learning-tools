import logger from '@utils/logger.ts';

logger.moduleLoaded('TransportKeyboardShortcuts', 'keyboard');

function isKeyboardShortcutContextActive(): boolean {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) {return true;}

  const tagName = activeElement.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tagName)) {return false;}
  if (activeElement.isContentEditable) {return false;}
  return true;
}

export function initTransportKeyboardShortcuts(): void {
  let spacePressed = false;

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code !== 'Space' || spacePressed || e.repeat) {return;}
    if (!isKeyboardShortcutContextActive()) {return;}

    const playBtn = document.getElementById('play-button') as HTMLButtonElement | null;
    if (!playBtn) {return;}

    e.preventDefault();
    spacePressed = true;
    playBtn.click();
  });

  document.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.code !== 'Space') {return;}
    spacePressed = false;
  });

  logger.info('TransportKeyboardShortcuts', 'Initialized', null, 'keyboard');
}
