// js/components/Toolbar/initializers/gridControlsInitializer.ts
import store from '@state/initStore.ts';

export function initGridControls(): void {
  // Zoom controls are now in container-1
  const zoomInBtn = document.getElementById('grid-zoom-in');
  const zoomOutBtn = document.getElementById('grid-zoom-out');

  // Macrobeat controls are now in the "Rhythm" tab
  const increaseBtn = document.getElementById('macrobeat-increase');
  const decreaseBtn = document.getElementById('macrobeat-decrease');

  const jumpToPitchRangeTab = () => {
    // Bring the secondary toolbar to Pitch > Range so the user can see the clef wheels move with zoom.
    const pitchTab = document.querySelector<HTMLButtonElement>('.tab-button[data-tab="pitch"]');
    const rangeTab = document.querySelector<HTMLButtonElement>('.pitch-tab-button[data-pitch-tab="range"]');
    pitchTab?.click();
    rangeTab?.click();
  };

  if (zoomInBtn) {zoomInBtn.addEventListener('click', () => {
    jumpToPitchRangeTab();
    store.emit('zoomIn', { source: 'button' });
    zoomInBtn.blur(); // Remove focus to prevent lingering blue highlight
  });}

  if (zoomOutBtn) {zoomOutBtn.addEventListener('click', () => {
    jumpToPitchRangeTab();
    store.emit('zoomOut', { source: 'button' });
    zoomOutBtn.blur(); // Remove focus to prevent lingering blue highlight
  });}

  if (increaseBtn) {increaseBtn.addEventListener('click', () => store.increaseMacrobeatCount());}
  if (decreaseBtn) {decreaseBtn.addEventListener('click', () => store.decreaseMacrobeatCount());}
}
