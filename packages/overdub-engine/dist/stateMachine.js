import { DEFAULT_ENGINE_CONFIG, createProject, createLayer, nowIso, hasCommittedTakes, } from './constants.js';
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function touchProject(state) {
    state.project.updatedAt = nowIso();
}
function transitionToIdleIfEmpty(state) {
    state.mode = hasCommittedTakes(state.project) ? 'overdubArmed' : 'idle';
}
function findLayer(state, layerId) {
    return state.project.layers.find((layer) => layer.id === layerId) ?? null;
}
function selectDefaultLayerId(state) {
    const lastLayer = state.project.layers[state.project.layers.length - 1];
    return lastLayer?.id ?? null;
}
function normalizePhrase(phrase) {
    return {
        tempoBpm: clamp(Math.round(phrase.tempoBpm), 20, 320),
        timeSignatureNumerator: clamp(Math.round(phrase.timeSignatureNumerator), 1, 12),
        timeSignatureDenominator: [1, 2, 4, 8, 16].includes(Math.round(phrase.timeSignatureDenominator))
            ? Math.round(phrase.timeSignatureDenominator)
            : 4,
        measures: clamp(Math.round(phrase.measures), 1, 128),
        countInBeats: clamp(Math.round(phrase.countInBeats), 0, 32),
        sampleRate: clamp(Math.round(phrase.sampleRate), 8_000, 96_000),
        channelCount: clamp(Math.round(phrase.channelCount), 1, 2),
    };
}
function trimLayerTakes(layer, maxTakesPerLayer) {
    if (layer.takes.length <= maxTakesPerLayer)
        return;
    layer.takes = layer.takes.slice(layer.takes.length - maxTakesPerLayer);
    const hasActive = layer.activeTakeId
        ? layer.takes.some((take) => take.id === layer.activeTakeId)
        : false;
    if (!hasActive) {
        layer.activeTakeId = layer.takes[layer.takes.length - 1]?.id ?? null;
    }
}
function sanitizeTake(take, layerId) {
    return {
        ...take,
        layerId,
        gain: clamp(take.gain, 0, 2),
        pan: clamp(take.pan, -1, 1),
        startOffsetMs: Math.round(take.startOffsetMs),
        pitchTrail: take.pitchTrail
            .filter((p) => Number.isFinite(p.offsetMs) && p.offsetMs >= 0 && Number.isFinite(p.midi))
            .map((p) => ({
            offsetMs: Math.max(0, Math.round(p.offsetMs)),
            midi: p.midi,
            clarity: clamp(p.clarity, 0, 1),
            frequency: p.frequency > 0 ? p.frequency : 0,
        })),
    };
}
function isModeOneOf(mode, valid) {
    return valid.includes(mode);
}
function createInitialState(config) {
    return {
        mode: 'idle',
        project: createProject(config),
        armedLayerId: null,
        recordingLayerId: null,
        pendingTake: null,
        playbackTimeMs: 0,
        lastEventAt: nowIso(),
        error: null,
    };
}
export function createOverdubEngine(partialConfig = {}) {
    let config = {
        ...DEFAULT_ENGINE_CONFIG,
        ...partialConfig,
        defaultPhrase: {
            ...DEFAULT_ENGINE_CONFIG.defaultPhrase,
            ...partialConfig.defaultPhrase,
        },
    };
    let state = createInitialState(config);
    function setError(message) {
        state.error = message;
        state.lastEventAt = nowIso();
    }
    function dispatch(event) {
        state.lastEventAt = nowIso();
        state.error = null;
        switch (event.type) {
            case 'NEW_PROJECT': {
                state.project = createProject(config, event.project);
                state.mode = 'idle';
                state.armedLayerId = null;
                state.recordingLayerId = null;
                state.pendingTake = null;
                state.playbackTimeMs = 0;
                return state;
            }
            case 'ARM': {
                if (!isModeOneOf(state.mode, ['idle', 'armed', 'overdubArmed', 'reviewing'])) {
                    setError(`Cannot ARM from mode "${state.mode}"`);
                    return state;
                }
                const layerId = event.layerId ?? selectDefaultLayerId(state);
                if (!layerId) {
                    setError('No layer available to arm');
                    return state;
                }
                if (!findLayer(state, layerId)) {
                    setError(`Layer "${layerId}" not found`);
                    return state;
                }
                state.armedLayerId = layerId;
                state.pendingTake = null;
                state.mode = hasCommittedTakes(state.project) ? 'overdubArmed' : 'armed';
                return state;
            }
            case 'START_COUNTIN': {
                if (!isModeOneOf(state.mode, ['armed', 'overdubArmed'])) {
                    setError(`Cannot START_COUNTIN from mode "${state.mode}"`);
                    return state;
                }
                if (!state.armedLayerId) {
                    setError('Cannot start count-in: no armed layer');
                    return state;
                }
                state.recordingLayerId = state.armedLayerId;
                state.mode = 'countIn';
                return state;
            }
            case 'START_REC': {
                if (state.mode !== 'countIn') {
                    setError(`Cannot START_REC from mode "${state.mode}"`);
                    return state;
                }
                state.mode = 'recording';
                return state;
            }
            case 'CANCEL_REC': {
                if (!isModeOneOf(state.mode, ['countIn', 'recording'])) {
                    setError(`Cannot CANCEL_REC from mode "${state.mode}"`);
                    return state;
                }
                const targetLayerId = state.recordingLayerId ?? state.armedLayerId ?? selectDefaultLayerId(state);
                state.pendingTake = null;
                state.recordingLayerId = null;
                state.armedLayerId = targetLayerId;
                state.mode = hasCommittedTakes(state.project) ? 'overdubArmed' : 'armed';
                return state;
            }
            case 'STOP_REC_HARD': {
                if (state.mode !== 'recording') {
                    setError(`Cannot STOP_REC_HARD from mode "${state.mode}"`);
                    return state;
                }
                if (!state.recordingLayerId) {
                    setError('Cannot finish recording: missing recording layer');
                    return state;
                }
                const layer = findLayer(state, state.recordingLayerId);
                if (!layer) {
                    setError(`Recording layer "${state.recordingLayerId}" not found`);
                    return state;
                }
                state.pendingTake = sanitizeTake(event.take, layer.id);
                state.mode = 'reviewing';
                return state;
            }
            case 'KEEP_TAKE': {
                if (state.mode !== 'reviewing' || !state.pendingTake) {
                    setError(`Cannot KEEP_TAKE from mode "${state.mode}" without pending take`);
                    return state;
                }
                const layer = findLayer(state, state.pendingTake.layerId);
                if (!layer) {
                    setError(`Layer "${state.pendingTake.layerId}" not found`);
                    return state;
                }
                layer.takes.push(state.pendingTake);
                layer.activeTakeId = state.pendingTake.id;
                trimLayerTakes(layer, state.project.maxTakesPerLayer);
                state.pendingTake = null;
                state.mode = 'overdubArmed';
                state.armedLayerId = layer.id;
                state.recordingLayerId = null;
                touchProject(state);
                return state;
            }
            case 'REDO_TAKE': {
                if (state.mode !== 'reviewing') {
                    setError(`Cannot REDO_TAKE from mode "${state.mode}"`);
                    return state;
                }
                const targetLayerId = state.recordingLayerId ?? state.pendingTake?.layerId ?? state.armedLayerId;
                state.pendingTake = null;
                state.mode = 'overdubArmed';
                state.armedLayerId = targetLayerId ?? selectDefaultLayerId(state);
                state.recordingLayerId = null;
                return state;
            }
            case 'UNDO_LAYER': {
                if (state.project.layers.length > 1) {
                    state.project.layers.pop();
                    state.armedLayerId = selectDefaultLayerId(state);
                }
                else {
                    const firstLayer = state.project.layers[0];
                    if (firstLayer) {
                        firstLayer.takes = [];
                        firstLayer.activeTakeId = null;
                    }
                    state.armedLayerId = firstLayer?.id ?? null;
                }
                state.pendingTake = null;
                state.recordingLayerId = null;
                transitionToIdleIfEmpty(state);
                touchProject(state);
                return state;
            }
            case 'ADD_LAYER': {
                if (state.project.layers.length >= state.project.maxLayers) {
                    setError(`Cannot add more than ${state.project.maxLayers} layers`);
                    return state;
                }
                const index = state.project.layers.length;
                const layer = createLayer(index, event.name);
                state.project.layers.push(layer);
                state.armedLayerId = layer.id;
                state.mode = 'overdubArmed';
                touchProject(state);
                return state;
            }
            case 'REMOVE_LAYER': {
                if (state.project.layers.length <= 1) {
                    setError('At least one layer must remain');
                    return state;
                }
                const previousLength = state.project.layers.length;
                state.project.layers = state.project.layers.filter((layer) => layer.id !== event.layerId);
                if (state.project.layers.length === previousLength) {
                    setError(`Layer "${event.layerId}" not found`);
                    return state;
                }
                if (state.armedLayerId === event.layerId) {
                    state.armedLayerId = selectDefaultLayerId(state);
                }
                if (state.recordingLayerId === event.layerId) {
                    state.recordingLayerId = null;
                }
                if (state.pendingTake?.layerId === event.layerId) {
                    state.pendingTake = null;
                }
                transitionToIdleIfEmpty(state);
                touchProject(state);
                return state;
            }
            case 'SET_LAYER_MUTED': {
                const layer = findLayer(state, event.layerId);
                if (!layer) {
                    setError(`Layer "${event.layerId}" not found`);
                    return state;
                }
                layer.muted = event.muted;
                touchProject(state);
                return state;
            }
            case 'SET_LAYER_SOLO': {
                const layer = findLayer(state, event.layerId);
                if (!layer) {
                    setError(`Layer "${event.layerId}" not found`);
                    return state;
                }
                layer.solo = event.solo;
                touchProject(state);
                return state;
            }
            case 'SET_LAYER_GAIN': {
                const layer = findLayer(state, event.layerId);
                if (!layer) {
                    setError(`Layer "${event.layerId}" not found`);
                    return state;
                }
                layer.gain = clamp(event.gain, 0, 2);
                touchProject(state);
                return state;
            }
            case 'SET_LAYER_PAN': {
                const layer = findLayer(state, event.layerId);
                if (!layer) {
                    setError(`Layer "${event.layerId}" not found`);
                    return state;
                }
                layer.pan = clamp(event.pan, -1, 1);
                touchProject(state);
                return state;
            }
            case 'SET_ACTIVE_TAKE': {
                const layer = findLayer(state, event.layerId);
                if (!layer) {
                    setError(`Layer "${event.layerId}" not found`);
                    return state;
                }
                const exists = layer.takes.some((take) => take.id === event.takeId);
                if (!exists) {
                    setError(`Take "${event.takeId}" not found in layer "${event.layerId}"`);
                    return state;
                }
                layer.activeTakeId = event.takeId;
                touchProject(state);
                return state;
            }
            case 'SET_PROJECT_TITLE': {
                state.project.title = event.title.trim() || state.project.title;
                touchProject(state);
                return state;
            }
            case 'SET_MONITORING_MODE': {
                const mode = event.monitoringMode;
                state.project.monitoringMode = mode;
                touchProject(state);
                return state;
            }
            case 'SET_CLICK_ENABLED': {
                state.project.clickEnabled = event.clickEnabled;
                touchProject(state);
                return state;
            }
            case 'SET_PHRASE_SETTINGS': {
                state.project.phrase = normalizePhrase({
                    ...state.project.phrase,
                    ...event.phrase,
                });
                touchProject(state);
                return state;
            }
            case 'SET_PENDING_TAKE_OFFSET': {
                if (!state.pendingTake) {
                    setError('No pending take to update');
                    return state;
                }
                state.pendingTake.startOffsetMs = Math.round(event.startOffsetMs);
                return state;
            }
            case 'START_PLAYBACK': {
                if (state.mode === 'recording' || state.mode === 'countIn') {
                    setError(`Cannot START_PLAYBACK from mode "${state.mode}"`);
                    return state;
                }
                state.mode = 'playing';
                return state;
            }
            case 'STOP_PLAYBACK': {
                if (state.mode !== 'playing' && state.mode !== 'exporting') {
                    setError(`Cannot STOP_PLAYBACK from mode "${state.mode}"`);
                    return state;
                }
                transitionToIdleIfEmpty(state);
                return state;
            }
            case 'SET_PLAYBACK_TIME': {
                state.playbackTimeMs = Math.max(0, Math.round(event.timeMs));
                return state;
            }
            case 'START_EXPORT': {
                if (state.mode === 'recording' || state.mode === 'countIn') {
                    setError(`Cannot START_EXPORT from mode "${state.mode}"`);
                    return state;
                }
                state.mode = 'exporting';
                return state;
            }
            case 'FINISH_EXPORT': {
                transitionToIdleIfEmpty(state);
                return state;
            }
            case 'SET_ERROR': {
                state.error = event.error;
                return state;
            }
            default: {
                setError('Unsupported event');
                return state;
            }
        }
    }
    function getState() {
        return state;
    }
    function reset(nextPartialConfig = {}) {
        config = {
            ...config,
            ...nextPartialConfig,
            defaultPhrase: {
                ...config.defaultPhrase,
                ...nextPartialConfig.defaultPhrase,
            },
        };
        state = createInitialState(config);
        return state;
    }
    return {
        getState,
        dispatch,
        reset,
    };
}
