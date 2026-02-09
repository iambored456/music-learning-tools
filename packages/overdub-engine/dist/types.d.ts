/**
 * @mlt/overdub-engine types
 *
 * This package is intentionally headless. It models overdub projects,
 * state-machine transitions, and timeline math without UI or Web Audio
 * dependencies.
 */
export type OverdubMode = 'idle' | 'armed' | 'countIn' | 'recording' | 'reviewing' | 'overdubArmed' | 'playing' | 'exporting';
export type MonitoringMode = 'layers-and-click' | 'layers-only' | 'none';
export interface PhraseSettings {
    tempoBpm: number;
    timeSignatureNumerator: number;
    timeSignatureDenominator: number;
    measures: number;
    countInBeats: number;
    sampleRate: number;
    channelCount: number;
}
export interface OverdubPitchTrailPoint {
    offsetMs: number;
    midi: number;
    clarity: number;
    frequency: number;
}
export interface OverdubTake {
    id: string;
    layerId: string;
    createdAt: string;
    durationMs: number;
    startOffsetMs: number;
    sampleRate: number;
    channelCount: number;
    audioBlobId: string | null;
    gain: number;
    pan: number;
    pitchTrail: OverdubPitchTrailPoint[];
}
export interface OverdubLayer {
    id: string;
    name: string;
    muted: boolean;
    solo: boolean;
    gain: number;
    pan: number;
    takes: OverdubTake[];
    activeTakeId: string | null;
}
export interface OverdubProject {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    phrase: PhraseSettings;
    maxLayers: number;
    maxTakesPerLayer: number;
    clickEnabled: boolean;
    monitoringMode: MonitoringMode;
    layers: OverdubLayer[];
}
export interface OverdubEngineState {
    mode: OverdubMode;
    project: OverdubProject;
    armedLayerId: string | null;
    recordingLayerId: string | null;
    pendingTake: OverdubTake | null;
    playbackTimeMs: number;
    lastEventAt: string;
    error: string | null;
}
export interface OverdubEngineConfig {
    maxLayers: number;
    maxTakesPerLayer: number;
    defaultPhrase: PhraseSettings;
    defaultProjectTitle: string;
    defaultMonitoringMode: MonitoringMode;
    clickEnabled: boolean;
}
export type OverdubEngineEvent = {
    type: 'NEW_PROJECT';
    project?: Partial<OverdubProject>;
} | {
    type: 'ARM';
    layerId?: string;
} | {
    type: 'START_COUNTIN';
} | {
    type: 'START_REC';
} | {
    type: 'CANCEL_REC';
} | {
    type: 'STOP_REC_HARD';
    take: OverdubTake;
} | {
    type: 'KEEP_TAKE';
} | {
    type: 'REDO_TAKE';
} | {
    type: 'UNDO_LAYER';
} | {
    type: 'ADD_LAYER';
    name?: string;
} | {
    type: 'REMOVE_LAYER';
    layerId: string;
} | {
    type: 'SET_LAYER_MUTED';
    layerId: string;
    muted: boolean;
} | {
    type: 'SET_LAYER_SOLO';
    layerId: string;
    solo: boolean;
} | {
    type: 'SET_LAYER_GAIN';
    layerId: string;
    gain: number;
} | {
    type: 'SET_LAYER_PAN';
    layerId: string;
    pan: number;
} | {
    type: 'SET_ACTIVE_TAKE';
    layerId: string;
    takeId: string;
} | {
    type: 'SET_PROJECT_TITLE';
    title: string;
} | {
    type: 'SET_MONITORING_MODE';
    monitoringMode: MonitoringMode;
} | {
    type: 'SET_CLICK_ENABLED';
    clickEnabled: boolean;
} | {
    type: 'SET_PHRASE_SETTINGS';
    phrase: Partial<PhraseSettings>;
} | {
    type: 'SET_PENDING_TAKE_OFFSET';
    startOffsetMs: number;
} | {
    type: 'START_PLAYBACK';
} | {
    type: 'STOP_PLAYBACK';
} | {
    type: 'SET_PLAYBACK_TIME';
    timeMs: number;
} | {
    type: 'START_EXPORT';
} | {
    type: 'FINISH_EXPORT';
} | {
    type: 'SET_ERROR';
    error: string | null;
};
export interface OverdubEngine {
    getState(): Readonly<OverdubEngineState>;
    dispatch(event: OverdubEngineEvent): Readonly<OverdubEngineState>;
    reset(config?: Partial<OverdubEngineConfig>): Readonly<OverdubEngineState>;
}
//# sourceMappingURL=types.d.ts.map