// js/bootstrap/rhythm/initRhythmUi.ts
import rhythmUI from '@components/canvas/macrobeatTools/rhythmUI.js';
import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
import sixteenthStampsToolbar from '@components/rhythm/stampToolbars/sixteenthStampsToolbar.js';
import tripletStampsToolbar from '@components/rhythm/stampToolbars/tripletStampsToolbar.js';
import logger from '@utils/logger.ts';

export default function initRhythmUi() {
  rhythmUI.init();
  void (rhythmPlaybackService.initialize?.() ?? rhythmPlaybackService.init?.());
  sixteenthStampsToolbar.init();
  tripletStampsToolbar.init();
  logger.initSuccess('RhythmUi');
}

