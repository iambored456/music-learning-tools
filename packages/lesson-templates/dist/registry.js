/**
 * Template Registry
 *
 * Central registry for lesson templates. Templates are registered at startup
 * and can be retrieved by ID or filtered by type.
 */
/** Internal template storage */
const templates = new Map();
/**
 * Register a template in the registry
 * @throws Error if template with same ID already exists
 */
export function registerTemplate(template) {
    if (templates.has(template.id)) {
        throw new Error(`Template with ID "${template.id}" already registered`);
    }
    templates.set(template.id, template);
}
/**
 * Register multiple templates at once
 */
export function registerTemplates(templateList) {
    for (const template of templateList) {
        registerTemplate(template);
    }
}
/**
 * Get a template by ID
 */
export function getTemplate(id) {
    return templates.get(id);
}
/**
 * Get a template by ID, throwing if not found
 * @throws Error if template not found
 */
export function getTemplateOrThrow(id) {
    const template = templates.get(id);
    if (!template) {
        throw new Error(`Template with ID "${id}" not found`);
    }
    return template;
}
/**
 * Get all registered templates
 */
export function getAllTemplates() {
    return Array.from(templates.values());
}
/**
 * Get templates filtered by type
 */
export function getTemplatesByType(type) {
    return Array.from(templates.values()).filter((t) => t.type === type);
}
/**
 * Get templates filtered by difficulty
 */
export function getTemplatesByDifficulty(difficulty) {
    return Array.from(templates.values()).filter((t) => t.difficulty === difficulty);
}
/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category) {
    return Array.from(templates.values()).filter((t) => t.category === category);
}
/**
 * Get templates grouped by category
 */
export function getTemplatesGroupedByCategory() {
    const grouped = new Map();
    for (const template of templates.values()) {
        const category = template.category;
        if (!grouped.has(category)) {
            grouped.set(category, []);
        }
        grouped.get(category).push(template);
    }
    return grouped;
}
/**
 * Get all categories that have registered templates
 */
export function getAvailableCategories() {
    const categories = new Set();
    for (const template of templates.values()) {
        categories.add(template.category);
    }
    return Array.from(categories);
}
/**
 * Get registry entries with derived metadata for the chooser UI
 */
export function getRegistryEntries() {
    return Array.from(templates.values()).map((template) => ({
        template,
        requiresSpeakingPitch: template.speakingPitchUsage !== 'none',
        difficultyLabel: getDifficultyLabel(template.difficulty),
    }));
}
/**
 * Get registry entries filtered by category
 */
export function getRegistryEntriesByCategory(category) {
    return getRegistryEntries().filter((entry) => entry.template.category === category);
}
/**
 * Get human-readable difficulty label
 */
function getDifficultyLabel(difficulty) {
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
export function hasTemplate(id) {
    return templates.has(id);
}
/**
 * Unregister a template (mainly for testing)
 */
export function unregisterTemplate(id) {
    return templates.delete(id);
}
/**
 * Clear all templates (mainly for testing)
 */
export function clearRegistry() {
    templates.clear();
}
/**
 * Get the count of registered templates
 */
export function getTemplateCount() {
    return templates.size;
}
