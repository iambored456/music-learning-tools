/**
 * Referee
 *
 * Session orchestrator that wires together all rhythm-core components.
 * Manages the complete session lifecycle from chart loading to completion.
 *
 * The Referee:
 * - Never renders UI (separation of concerns)
 * - Owns the session state
 * - Routes pitch samples to the Judge
 * - Manages note activation/deactivation
 * - Coordinates with the gate for lesson modes
 */
import { DEFAULT_REFEREE_CONFIG, getLookaheadMs } from '../constants.js';
import { createConductor } from '../conductor/Conductor.js';
import { createScheduler } from '../scheduler/Scheduler.js';
import { createChartAdapter } from '../chart/ChartAdapter.js';
import { createBeatWindow } from '../beat/BeatWindow.js';
import { createJudge } from '../judge/Judge.js';
import { createPitchAccuracyGate } from '../gate/PitchAccuracyGate.js';
/**
 * Create a referee instance.
 */
export function createReferee(config = {}) {
    // Merge with defaults
    const fullConfig = {
        conductor: { ...DEFAULT_REFEREE_CONFIG.conductor, ...config.conductor },
        scheduler: { ...DEFAULT_REFEREE_CONFIG.scheduler, ...config.scheduler },
        chartAdapter: { ...DEFAULT_REFEREE_CONFIG.chartAdapter, ...config.chartAdapter },
        beatWindow: { ...DEFAULT_REFEREE_CONFIG.beatWindow, ...config.beatWindow },
        judge: { ...DEFAULT_REFEREE_CONFIG.judge, ...config.judge },
        gate: { ...DEFAULT_REFEREE_CONFIG.gate, ...config.gate },
    };
    // Create components
    const conductor = createConductor(fullConfig.conductor);
    const scheduler = createScheduler(fullConfig.scheduler);
    const chartAdapter = createChartAdapter(fullConfig.chartAdapter);
    const beatWindow = createBeatWindow(fullConfig.beatWindow);
    const judge = createJudge(fullConfig.judge);
    const gate = createPitchAccuracyGate(fullConfig.gate);
    // Session state
    let phase = 'idle';
    let chartData = null;
    // Note tracking
    const activeNoteIds = new Set();
    const passedNoteIds = new Set();
    // Subscribers
    const stateSubscribers = new Set();
    // Animation frame for main loop
    let animationFrameId = null;
    /**
     * Get the current session state.
     */
    function getSessionState() {
        const currentTimeMs = conductor.getCurrentTimeMs();
        const totalDurationMs = chartData?.totalDurationMs ?? 0;
        const elapsedTimeMs = currentTimeMs;
        // Get notes by category
        const allNotes = chartData?.notes ?? [];
        const activeNotes = [];
        const upcomingNotes = [];
        const passedNotes = [];
        for (const note of allNotes) {
            if (passedNoteIds.has(note.id)) {
                passedNotes.push(note);
            }
            else if (activeNoteIds.has(note.id)) {
                activeNotes.push(note);
            }
            else if (note.startTimeMs > currentTimeMs) {
                upcomingNotes.push(note);
            }
        }
        return {
            phase,
            currentTimeMs,
            elapsedTimeMs,
            totalDurationMs,
            activeNotes,
            upcomingNotes,
            passedNotes,
            completedJudgments: judge.getCompletedJudgments(),
            gateState: gate.getState(),
            isJudging: activeNoteIds.size > 0,
        };
    }
    /**
     * Notify state subscribers.
     */
    function notifyStateSubscribers() {
        const state = getSessionState();
        stateSubscribers.forEach(cb => {
            try {
                cb(state);
            }
            catch (error) {
                console.error('Referee: Error in state callback', error);
            }
        });
    }
    /**
     * Main tick function - called each animation frame.
     */
    function tick() {
        if (phase !== 'playing' && phase !== 'gated') {
            return;
        }
        const currentTimeMs = conductor.getCurrentTimeMs();
        // Process scheduler events
        scheduler.tick(currentTimeMs);
        // Process beat events
        beatWindow.tick(currentTimeMs);
        // Update note activation
        updateNoteActivation(currentTimeMs);
        // Check gate
        if (gate.isEnabled() && phase === 'playing') {
            const gateResult = gate.checkGate(currentTimeMs);
            if (gateResult.shouldPause) {
                phase = 'gated';
                conductor.pause();
                notifyStateSubscribers();
            }
        }
        else if (phase === 'gated') {
            const gateResult = gate.checkGate(currentTimeMs);
            if (gateResult.shouldResume) {
                phase = 'playing';
                conductor.resume();
                notifyStateSubscribers();
            }
        }
        // Check for session completion
        if (chartData && currentTimeMs >= chartData.totalDurationMs) {
            completeSession();
            return;
        }
        // Schedule next frame
        if (phase === 'playing' || phase === 'gated') {
            animationFrameId = requestAnimationFrame(tick);
        }
    }
    /**
     * Update which notes are active based on current time.
     */
    function updateNoteActivation(currentTimeMs) {
        if (!chartData)
            return;
        for (const note of chartData.notes) {
            const noteId = note.id;
            // Skip already passed notes
            if (passedNoteIds.has(noteId)) {
                continue;
            }
            const isInWindow = currentTimeMs >= note.startTimeMs && currentTimeMs <= note.endTimeMs;
            if (isInWindow && !activeNoteIds.has(noteId)) {
                // Note just became active
                activeNoteIds.add(noteId);
                judge.startJudgingNote(note);
            }
            else if (!isInWindow && activeNoteIds.has(noteId)) {
                // Note just ended
                activeNoteIds.delete(noteId);
                passedNoteIds.add(noteId);
                judge.stopJudgingNote(noteId);
            }
        }
    }
    /**
     * Complete the session.
     */
    function completeSession() {
        // Stop any remaining judgments
        for (const noteId of activeNoteIds) {
            judge.stopJudgingNote(noteId);
        }
        activeNoteIds.clear();
        phase = 'completed';
        conductor.stop();
        stopAnimationLoop();
        notifyStateSubscribers();
    }
    /**
     * Start the animation loop.
     */
    function startAnimationLoop() {
        if (animationFrameId === null) {
            animationFrameId = requestAnimationFrame(tick);
        }
    }
    /**
     * Stop the animation loop.
     */
    function stopAnimationLoop() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    // ============================================================================
    // Public API
    // ============================================================================
    /**
     * Load a chart from a snapshot.
     */
    async function loadChart(snapshot) {
        phase = 'loading';
        notifyStateSubscribers();
        try {
            // Load chart data
            chartData = chartAdapter.loadSnapshot(snapshot);
            // Update conductor tempo
            conductor.setTempo(chartData.tempo);
            // Update scheduler lookahead based on tempo
            scheduler.setLookahead(getLookaheadMs(chartData.tempo));
            // Set up beat window
            beatWindow.setBeats(chartData.beats);
            // Clear previous session state
            activeNoteIds.clear();
            passedNoteIds.clear();
            judge.clearJudgments();
            gate.reset();
            phase = 'ready';
            notifyStateSubscribers();
        }
        catch (error) {
            phase = 'idle';
            notifyStateSubscribers();
            throw error;
        }
    }
    /**
     * Start the session.
     */
    function start() {
        if (phase !== 'ready') {
            console.warn('Referee: Cannot start, not in ready phase');
            return;
        }
        phase = 'playing';
        conductor.start();
        beatWindow.reset();
        startAnimationLoop();
        notifyStateSubscribers();
    }
    /**
     * Stop the session and reset.
     */
    function stop() {
        stopAnimationLoop();
        conductor.stop();
        // Stop all active judgments
        for (const noteId of activeNoteIds) {
            judge.stopJudgingNote(noteId);
        }
        activeNoteIds.clear();
        passedNoteIds.clear();
        scheduler.clear();
        beatWindow.reset();
        gate.reset();
        phase = chartData ? 'ready' : 'idle';
        notifyStateSubscribers();
    }
    /**
     * Pause the session.
     */
    function pause() {
        if (phase !== 'playing') {
            return;
        }
        phase = 'paused';
        conductor.pause();
        stopAnimationLoop();
        notifyStateSubscribers();
    }
    /**
     * Resume from pause.
     */
    function resume() {
        if (phase !== 'paused') {
            return;
        }
        phase = 'playing';
        conductor.resume();
        startAnimationLoop();
        notifyStateSubscribers();
    }
    /**
     * Seek to a specific time.
     */
    function seek(timeMs) {
        conductor.seek(timeMs);
        // Reset note tracking for notes after seek position
        if (chartData) {
            activeNoteIds.clear();
            // Re-calculate passed notes
            passedNoteIds.clear();
            for (const note of chartData.notes) {
                if (note.endTimeMs <= timeMs) {
                    passedNoteIds.add(note.id);
                }
            }
        }
        notifyStateSubscribers();
    }
    /**
     * Get current phase.
     */
    function getPhase() {
        return phase;
    }
    /**
     * Handle a detected pitch sample.
     */
    function onPitchDetected(sample) {
        if (phase !== 'playing' && phase !== 'gated') {
            return;
        }
        // Add to judge
        judge.addPitchSample(sample);
        // Report accuracy to gate
        if (activeNoteIds.size > 0) {
            // Check if any active note is in tolerance
            let anyInTolerance = false;
            for (const noteId of activeNoteIds) {
                if (judge.isInTolerance(noteId)) {
                    anyInTolerance = true;
                    break;
                }
            }
            gate.reportAccuracy(anyInTolerance, sample.timeMs);
        }
    }
    /**
     * Subscribe to state changes.
     */
    function subscribeToState(callback) {
        stateSubscribers.add(callback);
        // Immediately notify with current state
        callback(getSessionState());
        return () => {
            stateSubscribers.delete(callback);
        };
    }
    /**
     * Subscribe to judgment completions.
     */
    function subscribeToJudgments(callback) {
        return judge.subscribeToJudgment(callback);
    }
    /**
     * Subscribe to beat events.
     */
    function subscribeToBeat(callback) {
        return beatWindow.subscribeToBeat(callback);
    }
    /**
     * Clean up resources.
     */
    function dispose() {
        stopAnimationLoop();
        conductor.dispose();
        scheduler.clear();
        judge.clearJudgments();
        stateSubscribers.clear();
    }
    return {
        // Lifecycle
        loadChart,
        start,
        stop,
        pause,
        resume,
        seek,
        // State
        get sessionState() {
            return getSessionState();
        },
        getPhase,
        // Components
        conductor,
        scheduler,
        chartAdapter,
        beatWindow,
        judge,
        gate,
        // Input
        onPitchDetected,
        // Subscriptions
        subscribeToState,
        subscribeToJudgments,
        subscribeToBeat,
        // Disposal
        dispose,
    };
}
