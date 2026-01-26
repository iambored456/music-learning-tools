/**
 * Template Registry
 *
 * Central registry for lesson templates. Templates are registered at startup
 * and can be retrieved by ID or filtered by type.
 */

import type { LessonTemplate, LessonType, AnyLessonTemplate } from './types.js';

/** Internal template storage */
const templates = new Map<string, AnyLessonTemplate>();

/**
 * Register a template in the registry
 * @throws Error if template with same ID already exists
 */
export function registerTemplate(template: AnyLessonTemplate): void {
  if (templates.has(template.id)) {
    throw new Error(`Template with ID "${template.id}" already registered`);
  }
  templates.set(template.id, template);
}

/**
 * Register multiple templates at once
 */
export function registerTemplates(templateList: AnyLessonTemplate[]): void {
  for (const template of templateList) {
    registerTemplate(template);
  }
}

/**
 * Get a template by ID
 */
export function getTemplate(id: string): AnyLessonTemplate | undefined {
  return templates.get(id);
}

/**
 * Get a template by ID, throwing if not found
 * @throws Error if template not found
 */
export function getTemplateOrThrow(id: string): AnyLessonTemplate {
  const template = templates.get(id);
  if (!template) {
    throw new Error(`Template with ID "${id}" not found`);
  }
  return template;
}

/**
 * Get all registered templates
 */
export function getAllTemplates(): AnyLessonTemplate[] {
  return Array.from(templates.values());
}

/**
 * Get templates filtered by type
 */
export function getTemplatesByType(type: LessonType): AnyLessonTemplate[] {
  return Array.from(templates.values()).filter((t) => t.type === type);
}

/**
 * Get templates filtered by difficulty
 */
export function getTemplatesByDifficulty(difficulty: 1 | 2 | 3): AnyLessonTemplate[] {
  return Array.from(templates.values()).filter((t) => t.difficulty === difficulty);
}

/**
 * Check if a template is registered
 */
export function hasTemplate(id: string): boolean {
  return templates.has(id);
}

/**
 * Unregister a template (mainly for testing)
 */
export function unregisterTemplate(id: string): boolean {
  return templates.delete(id);
}

/**
 * Clear all templates (mainly for testing)
 */
export function clearRegistry(): void {
  templates.clear();
}

/**
 * Get the count of registered templates
 */
export function getTemplateCount(): number {
  return templates.size;
}
