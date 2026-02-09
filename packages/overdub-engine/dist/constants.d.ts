import type { OverdubEngineConfig, OverdubLayer, OverdubProject, PhraseSettings } from './types.js';
export declare const DEFAULT_PHRASE_SETTINGS: PhraseSettings;
export declare const DEFAULT_ENGINE_CONFIG: OverdubEngineConfig;
export declare function createId(prefix: string): string;
export declare function nowIso(): string;
export declare function createLayer(index: number, name?: string): OverdubLayer;
export declare function createProject(config: OverdubEngineConfig, partial?: Partial<OverdubProject>): OverdubProject;
export declare function computePhraseDurationMs(phrase: PhraseSettings): number;
export declare function hasCommittedTakes(project: OverdubProject): boolean;
export declare function getActiveTakeIds(project: OverdubProject): Set<string>;
//# sourceMappingURL=constants.d.ts.map