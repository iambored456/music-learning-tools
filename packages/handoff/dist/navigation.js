/**
 * @mlt/handoff - Navigation
 *
 * Utilities for navigating between apps in the same tab.
 */
// ============================================================================
// App Routes
// ============================================================================
/**
 * Get the relative URL for an app within the hub.
 */
export function getAppRoute(app) {
    switch (app) {
        case 'student-notation':
            return '/student-notation/';
        case 'singing-trainer':
            return '/singing-trainer/';
        default:
            throw new Error(`Unknown app: ${app}`);
    }
}
/**
 * Navigate to an app in the same tab.
 *
 * @param app Target app
 * @param params Optional query parameters
 */
export function navigateToApp(app, params) {
    let url = getAppRoute(app);
    // Add query params if provided
    if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }
    // Navigate in same tab
    window.location.href = url;
}
/**
 * Navigate to Singing Trainer with handoff indicator.
 *
 * @param handoffId The handoff ID for reference
 */
export function navigateToSingingTrainer(handoffId) {
    const params = {};
    if (handoffId) {
        params.handoff = handoffId;
    }
    // Add source indicator
    params.from = 'student-notation';
    navigateToApp('singing-trainer', params);
}
/**
 * Navigate to Student Notation with handoff indicator.
 *
 * @param handoffId The handoff ID for reference
 */
export function navigateToStudentNotation(handoffId) {
    const params = {};
    if (handoffId) {
        params.handoff = handoffId;
    }
    // Add source indicator
    params.from = 'singing-trainer';
    navigateToApp('student-notation', params);
}
/**
 * Check if the current page was loaded via handoff.
 *
 * @returns Handoff info or null
 */
export function checkForHandoff() {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const handoffId = params.get('handoff') ?? undefined;
    if (from === 'student-notation') {
        return {
            direction: 'student-notation-to-singing-trainer',
            handoffId,
        };
    }
    if (from === 'singing-trainer') {
        return {
            direction: 'singing-trainer-to-student-notation',
            handoffId,
        };
    }
    return null;
}
/**
 * Clear handoff query parameters from the URL without reloading.
 * Keeps the URL clean after processing the handoff.
 */
export function clearHandoffParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete('handoff');
    url.searchParams.delete('from');
    // Update URL without reload
    window.history.replaceState({}, '', url.toString());
}
