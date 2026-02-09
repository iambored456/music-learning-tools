export const DEFAULT_PHRASE_SETTINGS = {
    tempoBpm: 120,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    measures: 8,
    countInBeats: 4,
    sampleRate: 48_000,
    channelCount: 1,
};
export const DEFAULT_ENGINE_CONFIG = {
    maxLayers: 8,
    maxTakesPerLayer: 3,
    defaultPhrase: { ...DEFAULT_PHRASE_SETTINGS },
    defaultProjectTitle: 'Overdub Project',
    defaultMonitoringMode: 'layers-and-click',
    clickEnabled: true,
};
let idCounter = 0;
export function createId(prefix) {
    idCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}
export function nowIso() {
    return new Date().toISOString();
}
export function createLayer(index, name) {
    return {
        id: createId('layer'),
        name: name?.trim() || `Part ${index + 1}`,
        muted: false,
        solo: false,
        gain: 1,
        pan: 0,
        takes: [],
        activeTakeId: null,
    };
}
export function createProject(config, partial) {
    const createdAt = nowIso();
    const baseLayer = createLayer(0);
    const phrase = {
        ...config.defaultPhrase,
        ...partial?.phrase,
    };
    return {
        id: partial?.id ?? createId('project'),
        title: partial?.title?.trim() || config.defaultProjectTitle,
        createdAt: partial?.createdAt ?? createdAt,
        updatedAt: partial?.updatedAt ?? createdAt,
        phrase,
        maxLayers: partial?.maxLayers ?? config.maxLayers,
        maxTakesPerLayer: partial?.maxTakesPerLayer ?? config.maxTakesPerLayer,
        clickEnabled: partial?.clickEnabled ?? config.clickEnabled,
        monitoringMode: partial?.monitoringMode ?? config.defaultMonitoringMode,
        layers: partial?.layers && partial.layers.length > 0 ? partial.layers : [baseLayer],
    };
}
export function computePhraseDurationMs(phrase) {
    const beatMs = (60_000 / phrase.tempoBpm) * (4 / phrase.timeSignatureDenominator);
    return Math.round(phrase.measures * phrase.timeSignatureNumerator * beatMs);
}
export function hasCommittedTakes(project) {
    return project.layers.some((layer) => layer.takes.length > 0);
}
export function getActiveTakeIds(project) {
    const ids = new Set();
    for (const layer of project.layers) {
        if (!layer.activeTakeId)
            continue;
        ids.add(layer.activeTakeId);
    }
    return ids;
}
