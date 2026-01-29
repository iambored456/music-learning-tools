/**
 * Template Registry
 *
 * Central registry for lesson templates. Templates are registered at startup
 * and can be retrieved by ID or filtered by type.
 */
import type { LessonType, LessonCategory, DifficultyLevel, AnyLessonTemplate } from './types.js';
/**
 * Register a template in the registry
 * @throws Error if template with same ID already exists
 */
export declare function registerTemplate(template: AnyLessonTemplate): void;
/**
 * Register multiple templates at once
 */
export declare function registerTemplates(templateList: AnyLessonTemplate[]): void;
/**
 * Get a template by ID
 */
export declare function getTemplate(id: string): AnyLessonTemplate | undefined;
/**
 * Get a template by ID, throwing if not found
 * @throws Error if template not found
 */
export declare function getTemplateOrThrow(id: string): AnyLessonTemplate;
/**
 * Get all registered templates
 */
export declare function getAllTemplates(): AnyLessonTemplate[];
/**
 * Get templates filtered by type
 */
export declare function getTemplatesByType(type: LessonType): AnyLessonTemplate[];
/**
 * Get templates filtered by difficulty
 */
export declare function getTemplatesByDifficulty(difficulty: DifficultyLevel): AnyLessonTemplate[];
/**
 * Get templates filtered by category
 */
export declare function getTemplatesByCategory(category: LessonCategory): AnyLessonTemplate[];
/**
 * Get templates grouped by category
 */
export declare function getTemplatesGroupedByCategory(): Map<LessonCategory, AnyLessonTemplate[]>;
/**
 * Get all categories that have registered templates
 */
export declare function getAvailableCategories(): LessonCategory[];
/** Registry entry with template and derived metadata */
export interface RegistryEntry {
    template: AnyLessonTemplate;
    /** Whether the template requires speaking pitch calibration */
    requiresSpeakingPitch: boolean;
    /** Human-readable difficulty label */
    difficultyLabel: string;
}
/**
 * Get registry entries with derived metadata for the chooser UI
 */
export declare function getRegistryEntries(): RegistryEntry[];
/**
 * Get registry entries filtered by category
 */
export declare function getRegistryEntriesByCategory(category: LessonCategory): RegistryEntry[];
/**
 * Check if a template is registered
 */
export declare function hasTemplate(id: string): boolean;
/**
 * Unregister a template (mainly for testing)
 */
export declare function unregisterTemplate(id: string): boolean;
/**
 * Clear all templates (mainly for testing)
 */
export declare function clearRegistry(): void;
/**
 * Get the count of registered templates
 */
export declare function getTemplateCount(): number;
//# sourceMappingURL=registry.d.ts.map