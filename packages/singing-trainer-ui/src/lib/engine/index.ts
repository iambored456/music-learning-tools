/**
 * Engine Module
 *
 * Integration layer between lesson-templates engine and singing-trainer-ui.
 */

export {
  createGridControllerAdapter,
  createAudioControllerAdapter,
  createUiControllerAdapter,
  createLessonContext,
  getCurrentOverlays,
  getCurrentInstruction,
  getActiveOverlays,
} from './controllerAdapters.js';
