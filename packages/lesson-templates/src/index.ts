/**
 * @mlt/lesson-templates
 *
 * Lesson and exercise templates for Music Learning Tools.
 * Provides a template system for defining exercises that can adapt
 * to the user's calibrated speaking pitch.
 */

// Types
export type {
  SpeakingPitchUsage,
  LessonType,
  DifficultyLevel,
  LessonCategory,
  LessonTemplate,
  PitchMatchingConfig,
  LoopPhaseType,
  LoopPhaseTargetMode,
  LoopPhase,
  ExercisePattern,
  TemplateVariation,
  PitchMatchingTemplate,
  TemplateContext,
  ResolvedConfig,
  AnyLessonTemplate,
  // Settings schema types
  SettingFieldType,
  SettingField,
  LessonSettingsSchema,
  // Step types
  LessonStepType,
  LessonStep,
  LessonStepper,
  InstructionStepConfig,
  InstructionAvatarExpression,
  ConfigureStepConfig,
  ListenStepConfig,
  InputStepConfig,
  FeedbackStepConfig,
  CompleteStepConfig,
  LessonStepConfig,
} from './types.js';

// Registry
export {
  registerTemplate,
  registerTemplates,
  getTemplate,
  getTemplateOrThrow,
  getAllTemplates,
  getTemplatesByType,
  getTemplatesByDifficulty,
  getTemplatesByCategory,
  getTemplatesGroupedByCategory,
  getAvailableCategories,
  getRegistryEntries,
  getRegistryEntriesByCategory,
  hasTemplate,
  unregisterTemplate,
  clearRegistry,
  getTemplateCount,
  type RegistryEntry,
} from './registry.js';

// Engine module
export {
  createLessonEngine,
  getLessonEngine,
  resetGlobalEngine,
  createStepper,
  LinearStepper,
  type LessonEngine,
  type LessonEngineState,
  type LessonEngineEvent,
  type LessonEngineListener,
  type LessonContext,
  type GridController,
  type GridOverlay,
  type GridLabelMode,
  type AudioController,
  type UiController,
  type UiOverlay,
  // Avatar types
  type AvatarExpression,
  type AvatarSpeakOptions,
} from './engine/index.js';

// Pitch mapping utilities
export {
  resolveConfig,
  applyAsTonic,
  applyAsFloorNote,
  applyCustomOffset,
  applyVariation,
} from './utils/pitchMapping.js';

// Validator utilities
export {
  validateTemplate,
  calculateLoopDurationMicrobeats,
  calculateLoopDurationMs,
  type ValidationResult,
} from './utils/validator.js';

// Presets
export {
  STANDARD_4_PHASE_PATTERN,
  QUICK_RESPONSE_PATTERN,
  EXTENDED_HOLD_PATTERN,
  BASIC_PITCH_MATCHING,
  QUICK_PITCH_MATCHING,
  SUSTAINED_PITCH_MATCHING,
  CENTERED_RANGE_MATCHING,
  PITCH_MATCHING_PRESETS,
  registerAllPresets,
  getAllPresets,
} from './presets/index.js';

// Lessons
export {
  ANCHORED_PITCH_MATCHING,
  FOUNDATIONS_1_MERGED,
  ALL_LESSONS,
} from './lessons/index.js';
