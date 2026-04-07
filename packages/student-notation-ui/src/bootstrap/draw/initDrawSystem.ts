// js/bootstrap/draw/initDrawSystem.ts
import annotationService from '@services/annotationService.ts';
import drawToolsController from '@components/draw/drawToolsController.ts';
import logger from '@utils/logger.ts';
import { registerDrawToolsController } from '@services/runtimeGlobals.ts';

export function initDrawSystem() {
  // Initialize annotation service and drawing tools UI
  annotationService.initialize();
  drawToolsController.initialize();
  registerDrawToolsController(drawToolsController);
  logger.initSuccess('DrawSystem');

  return {
    dispose() {
      annotationService.dispose();
    }
  };
}
