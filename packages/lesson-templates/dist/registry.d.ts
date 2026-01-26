/**
 * Template Registry
 *
 * Central registry for lesson templates. Templates are registered at startup
 * and can be retrieved by ID or filtered by type.
 */
import type { LessonType, AnyLessonTemplate } from './types.js';
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
export declare function getTemplatesByDifficulty(difficulty: 1 | 2 | 3): AnyLessonTemplate[];
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