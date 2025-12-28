/**
 * @mlt/handoff - Navigation
 *
 * Utilities for navigating between apps in the same tab.
 */
import type { HandoffDirection } from './types.js';
/**
 * Get the relative URL for an app within the hub.
 */
export declare function getAppRoute(app: 'student-notation' | 'singing-trainer'): string;
/**
 * Navigate to an app in the same tab.
 *
 * @param app Target app
 * @param params Optional query parameters
 */
export declare function navigateToApp(app: 'student-notation' | 'singing-trainer', params?: Record<string, string>): void;
/**
 * Navigate to Singing Trainer with handoff indicator.
 *
 * @param handoffId The handoff ID for reference
 */
export declare function navigateToSingingTrainer(handoffId?: string): void;
/**
 * Navigate to Student Notation with handoff indicator.
 *
 * @param handoffId The handoff ID for reference
 */
export declare function navigateToStudentNotation(handoffId?: string): void;
/**
 * Check if the current page was loaded via handoff.
 *
 * @returns Handoff info or null
 */
export declare function checkForHandoff(): {
    direction: HandoffDirection;
    handoffId?: string;
} | null;
/**
 * Clear handoff query parameters from the URL without reloading.
 * Keeps the URL clean after processing the handoff.
 */
export declare function clearHandoffParams(): void;
//# sourceMappingURL=navigation.d.ts.map