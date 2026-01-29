/**
 * Template Registry
 *
 * Central registry for lesson templates. Templates are registered at startup
 * and can be retrieved by ID or filtered by type.
 */

import type { LessonTemplate, LessonType, LessonCategory, DifficultyLevel, AnyLessonTemplate } from './types.js';

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
export function getTemplatesByDifficulty(difficulty: DifficultyLevel): AnyLessonTemplate[] {
  return Array.from(templates.values()).filter((t) => t.difficulty === difficulty);
}

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: LessonCategory): AnyLessonTemplate[] {
  return Array.from(templates.values()).filter((t) => t.category === category);
}

/**
 * Get templates grouped by category
 */
export function getTemplatesGroupedByCategory(): Map<LessonCategory, AnyLessonTemplate[]> {
  const grouped = new Map<LessonCategory, AnyLessonTemplate[]>();

  for (const template of templates.values()) {
    const category = template.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(template);
  }

  return grouped;
}

/**
 * Get all categories that have registered templates
 */
export function getAvailableCategories(): LessonCategory[] {
  const categories = new Set<LessonCategory>();
  for (const template of templates.values()) {
    categories.add(template.category);
  }
  return Array.from(categories);
}

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
export function getRegistryEntries(): RegistryEntry[] {
  return Array.from(templates.values()).map((template) => ({
    template,
    requiresSpeakingPitch: template.speakingPitchUsage !== 'none',
    difficultyLabel: getDifficultyLabel(template.difficulty),
  }));
}

/**
 * Get registry entries filtered by category
 */
export function getRegistryEntriesByCategory(category: LessonCategory): RegistryEntry[] {
  return getRegistryEntries().filter((entry) => entry.template.category === category);
}

/**
 * Get human-readable difficulty label
 */
function getDifficultyLabel(difficulty: DifficultyLevel): string {
  switch (difficulty) {
    case 1:
      return 'Intro';
    case 2:
      return 'Basic';
    case 3:
      return 'Advanced';
    default:
      return 'Unknown';
  }
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
