import {
  fullRowData,
  getInitialState,
  type AppState,
  type CanvasSpaceColumn,
  type MacrobeatBoundaryStyle,
  type MacrobeatGrouping,
  type ModulationMarker,
  type NoteShape,
  type PitchRange,
  type PlacedNote,
  type StoreInstance,
  type TimbreState,
  type TonicSign,
  type TonicSignGroups,
} from '@mlt/student-notation-engine';

type SerializedTimbreState = Omit<TimbreState, 'coeffs' | 'phases'> & {
  coeffs: number[];
  phases: number[];
};

type SerializedTimbresMap = Record<string, SerializedTimbreState>;
type SaveSixteenthStampPlacement = AppState['sixteenthStampPlacements'][number];

export interface StudentNotationSaveData {
  placedNotes: PlacedNote[];
  placedChords: AppState['placedChords'];
  tonicSignGroups: TonicSignGroups;
  sixteenthStampPlacements: AppState['sixteenthStampPlacements'];
  tripletStampPlacements: AppState['tripletStampPlacements'];
  sixteenthThreeStampPlacements: AppState['sixteenthThreeStampPlacements'];
  annotations: AppState['annotations'];
  macrobeatGroupings: MacrobeatGrouping[];
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  hasAnacrusis: boolean;
  baseMicrobeatPx: number;
  tempoModulationMarkers: ModulationMarker[];
  tempo: number;
  timbres: Record<string, TimbreState>;
  pitchRange: PitchRange;
  degreeDisplayMode: AppState['degreeDisplayMode'];
  showPitchLabels: boolean;
  showPitchOctaveLabels: boolean;
  showOctaveLabels: boolean;
  longNoteStyle: AppState['longNoteStyle'];
  playheadMode: AppState['playheadMode'];
  selectedNote: AppState['selectedNote'];
  activeChordIntervals: string[];
}

interface StudentNotationSaveFile {
  type: 'student-notation-score';
  version: 2;
  exportedAt: string;
  data: Omit<StudentNotationSaveData, 'timbres'> & {
    timbres: SerializedTimbresMap;
  };
}

export type ImportedStudentNotationData = {
  format: 'snapshot';
  data: StudentNotationSaveData;
};

const NOTE_SHAPES = new Set<NoteShape>(['circle', 'oval', 'diamond']);
const BOUNDARY_STYLES = new Set<MacrobeatBoundaryStyle>(['dashed', 'solid', 'anacrusis']);
const PLAYHEAD_MODES = new Set<AppState['playheadMode']>(['cursor', 'microbeat', 'macrobeat']);
const DEGREE_DISPLAY_MODES = new Set<AppState['degreeDisplayMode']>(['off', 'diatonic', 'modal']);
const LONG_NOTE_STYLES = new Set<AppState['longNoteStyle']>(['style1', 'style2']);

function generateDefaultBoundaryStyles(groupings: MacrobeatGrouping[]): MacrobeatBoundaryStyle[] {
  return groupings.slice(0, -1).map((_, index) => (((index + 1) % 4 === 0) ? 'solid' : 'dashed'));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureCircleNoteSpan(note: PlacedNote): void {
  if (note.isDrum || note.shape !== 'circle') {
    return;
  }
  const minimumEnd = note.startColumnIndex + 1;
  if (typeof note.endColumnIndex !== 'number' || note.endColumnIndex < minimumEnd) {
    note.endColumnIndex = minimumEnd as CanvasSpaceColumn;
  }
}

function clampRow(row: unknown): number {
  const parsed = typeof row === 'number' ? row : Number.parseInt(String(row ?? ''), 10);
  const maxRowIndex = Math.max(0, fullRowData.length - 1);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(maxRowIndex, Math.round(parsed)));
}

function normalizePlacedNote(note: Partial<PlacedNote>): PlacedNote | null {
  const row = clampRow(note.globalRow ?? note.row);
  const startColumnIndex = Number.parseInt(String(note.startColumnIndex ?? ''), 10);
  const endColumnIndex = Number.parseInt(String(note.endColumnIndex ?? note.startColumnIndex ?? ''), 10);
  const color = typeof note.color === 'string' ? note.color.trim() : '';
  const rawShape = typeof note.shape === 'string' ? note.shape : 'circle';
  const shape: NoteShape = NOTE_SHAPES.has(rawShape as NoteShape) ? rawShape as NoteShape : 'circle';

  if (!color || !Number.isFinite(startColumnIndex) || !Number.isFinite(endColumnIndex)) {
    return null;
  }

  const normalized: PlacedNote = {
    uuid: note.uuid ?? `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    row,
    globalRow: row,
    startColumnIndex: startColumnIndex as CanvasSpaceColumn,
    endColumnIndex: endColumnIndex as CanvasSpaceColumn,
    color,
    shape,
  };

  if (typeof note.enharmonicPreference === 'boolean') {
    normalized.enharmonicPreference = note.enharmonicPreference;
  }
  if (typeof note.tonicNumber === 'number' && Number.isFinite(note.tonicNumber)) {
    normalized.tonicNumber = note.tonicNumber;
  }
  if (typeof note.isDrum === 'boolean') {
    normalized.isDrum = note.isDrum;
  }
  if (note.drumTrack !== undefined) {
    normalized.drumTrack = note.drumTrack;
  }
  if (note.drumSubdivision === 'double' || note.drumSubdivision === 'secondOnly') {
    normalized.drumSubdivision = note.drumSubdivision;
  } else if (note.isDrum) {
    normalized.drumSubdivision = 'single';
  }

  ensureCircleNoteSpan(normalized);
  return normalized;
}

function normalizePlacedNotes(value: unknown): PlacedNote[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizePlacedNote((entry ?? {}) as Partial<PlacedNote>))
    .filter((entry): entry is PlacedNote => entry !== null);
}

function normalizeTonicSign(sign: TonicSign): TonicSign {
  const row = clampRow(sign.globalRow ?? sign.row);
  return {
    ...sign,
    row,
    globalRow: row,
  };
}

function normalizeTonicSignGroups(value: unknown): TonicSignGroups {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([groupId, group]) => {
        if (!Array.isArray(group)) {
          return null;
        }
        const normalizedGroup = group
          .filter((entry): entry is TonicSign => !!entry && typeof entry === 'object')
          .map((entry) => normalizeTonicSign(entry));
        return normalizedGroup.length > 0 ? [groupId, normalizedGroup] : null;
      })
      .filter((entry): entry is [string, TonicSign[]] => entry !== null)
  );
}

function getUniqueTonicStartColumns(tonicSignGroups: TonicSignGroups): number[] {
  const seen = new Set<string>();
  const columns: number[] = [];

  Object.values(tonicSignGroups).forEach((group) => {
    group.forEach((sign) => {
      const columnIndex = Number(sign.columnIndex);
      if (!Number.isFinite(columnIndex)) {
        return;
      }

      const key = sign.uuid
        ? `uuid:${sign.uuid}`
        : `column:${sign.preMacrobeatIndex ?? ''}:${columnIndex}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      columns.push(columnIndex);
    });
  });

  return columns.sort((a, b) => a - b);
}

function legacyCanvasColumnToTimeIndex(canvasColumn: number, tonicSignGroups: TonicSignGroups): number {
  const tonicStartsBeforeColumn = getUniqueTonicStartColumns(tonicSignGroups)
    .filter(columnIndex => columnIndex < canvasColumn).length;
  return canvasColumn - (tonicStartsBeforeColumn * 2);
}

function normalizeSixteenthStampPlacements(
  value: unknown,
  tonicSignGroups: TonicSignGroups,
  fallback: SaveSixteenthStampPlacement[]
): SaveSixteenthStampPlacement[] {
  if (!Array.isArray(value)) {
    return cloneJson(fallback);
  }

  return value
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => {
      const { startColumn, endColumn, ...rest } = entry;
      const currentStartTimeIndex = Number(entry.startTimeIndex);
      const legacyStartColumn = Number(startColumn);
      const startTimeIndex = Number.isFinite(currentStartTimeIndex)
        ? currentStartTimeIndex
        : (Number.isFinite(legacyStartColumn)
          ? legacyCanvasColumnToTimeIndex(legacyStartColumn, tonicSignGroups)
          : 0);

      void endColumn;
      return {
        ...cloneJson(rest),
        startTimeIndex
      } as SaveSixteenthStampPlacement;
    });
}

function normalizeMacrobeatGroupings(value: unknown, fallback: MacrobeatGrouping[]): MacrobeatGrouping[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [...fallback];
  }

  const normalized = value
    .map((entry) => Number.parseInt(String(entry ?? ''), 10))
    .filter((entry): entry is MacrobeatGrouping => entry === 2 || entry === 3);

  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeBoundaryStyles(
  value: unknown,
  groupings: MacrobeatGrouping[],
  fallback: MacrobeatBoundaryStyle[]
): MacrobeatBoundaryStyle[] {
  const expectedLength = Math.max(groupings.length - 1, 0);
  if (!Array.isArray(value)) {
    return expectedLength === fallback.length ? [...fallback] : generateDefaultBoundaryStyles(groupings);
  }

  const normalized = Array.from({ length: expectedLength }, (_, index) => {
    const candidate = value[index];
    return BOUNDARY_STYLES.has(candidate as MacrobeatBoundaryStyle)
      ? candidate as MacrobeatBoundaryStyle
      : (fallback[index] ?? generateDefaultBoundaryStyles(groupings)[index] ?? 'dashed');
  });

  return normalized;
}

function normalizeTempoModulationMarkers(value: unknown): ModulationMarker[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is ModulationMarker => !!entry && typeof entry === 'object')
    .map((entry, index) => {
      const marker = entry as Partial<ModulationMarker>;
      const parsedMeasureIndex = Number.parseInt(String(marker.measureIndex ?? ''), 10);
      const parsedRatio = Number(marker.ratio ?? 1);
      const parsedColumnIndex = marker.columnIndex === null || marker.columnIndex === undefined
        ? null
        : Number.parseInt(String(marker.columnIndex), 10);
      const parsedMacrobeatIndex = marker.macrobeatIndex === null || marker.macrobeatIndex === undefined
        ? null
        : Number.parseInt(String(marker.macrobeatIndex), 10);
      return {
        id: typeof marker.id === 'string' ? marker.id : `modulation-${index}`,
        measureIndex: Number.isFinite(parsedMeasureIndex) ? parsedMeasureIndex : 0,
        ratio: Number.isFinite(parsedRatio) ? parsedRatio : 1,
        active: marker.active !== false,
        xPosition: typeof marker.xPosition === 'number' ? marker.xPosition : null,
        columnIndex: Number.isFinite(parsedColumnIndex) ? parsedColumnIndex as CanvasSpaceColumn : null,
        macrobeatIndex: Number.isFinite(parsedMacrobeatIndex) ? parsedMacrobeatIndex : null,
        xCanvas: typeof marker.xCanvas === 'number' ? marker.xCanvas : undefined,
      };
    });
}

function normalizePitchRange(value: unknown, fallback: PitchRange): PitchRange {
  const maxIndex = Math.max(0, fullRowData.length - 1);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }

  const raw = value as Partial<PitchRange>;
  const topIndex = Math.max(0, Math.min(maxIndex, Number.parseInt(String(raw.topIndex ?? fallback.topIndex), 10)));
  const bottomIndex = Math.max(topIndex, Math.min(maxIndex, Number.parseInt(String(raw.bottomIndex ?? fallback.bottomIndex), 10)));
  return { topIndex, bottomIndex };
}

function serializeTimbres(timbres: Record<string, TimbreState>): SerializedTimbresMap {
  return Object.fromEntries(
    Object.entries(timbres).map(([color, timbre]) => [
      color,
      {
        ...cloneJson({
          ...timbre,
          coeffs: undefined,
          phases: undefined,
        }),
        coeffs: Array.from(timbre.coeffs ?? []),
        phases: Array.from(timbre.phases ?? []),
      },
    ])
  );
}

function restoreSerializedTimbre(
  color: string,
  value: unknown,
  fallback: TimbreState
): TimbreState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ...cloneJson(fallback),
      coeffs: new Float32Array(fallback.coeffs),
      phases: new Float32Array(fallback.phases),
    };
  }

  const raw = value as Partial<SerializedTimbreState>;
  const coeffsSource = Array.isArray(raw.coeffs)
    ? raw.coeffs
    : Object.values(raw.coeffs ?? {});
  const phasesSource = Array.isArray(raw.phases)
    ? raw.phases
    : Object.values(raw.phases ?? {});

  return {
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : fallback.name,
    adsr: {
      attack: typeof raw.adsr?.attack === 'number' ? raw.adsr.attack : fallback.adsr.attack,
      decay: typeof raw.adsr?.decay === 'number' ? raw.adsr.decay : fallback.adsr.decay,
      sustain: typeof raw.adsr?.sustain === 'number' ? raw.adsr.sustain : fallback.adsr.sustain,
      release: typeof raw.adsr?.release === 'number' ? raw.adsr.release : fallback.adsr.release,
    },
    coeffs: new Float32Array(coeffsSource.map((entry) => Number(entry ?? 0))),
    phases: new Float32Array(phasesSource.map((entry) => Number(entry ?? 0))),
    activePresetName: typeof raw.activePresetName === 'string' || raw.activePresetName === null
      ? raw.activePresetName
      : fallback.activePresetName,
    gain: typeof raw.gain === 'number' ? raw.gain : fallback.gain,
    filter: {
      enabled: typeof raw.filter?.enabled === 'boolean' ? raw.filter.enabled : fallback.filter.enabled,
      blend: typeof raw.filter?.blend === 'number' ? raw.filter.blend : fallback.filter.blend,
      cutoff: typeof raw.filter?.cutoff === 'number' ? raw.filter.cutoff : fallback.filter.cutoff,
      resonance: typeof raw.filter?.resonance === 'number' ? raw.filter.resonance : fallback.filter.resonance,
      type: typeof raw.filter?.type === 'string' ? raw.filter.type : fallback.filter.type,
      mix: typeof raw.filter?.mix === 'number' ? raw.filter.mix : fallback.filter.mix,
    },
    vibrato: {
      speed: typeof raw.vibrato?.speed === 'number' ? raw.vibrato.speed : fallback.vibrato.speed,
      span: typeof raw.vibrato?.span === 'number' ? raw.vibrato.span : fallback.vibrato.span,
    },
    tremelo: {
      speed: typeof raw.tremelo?.speed === 'number' ? raw.tremelo.speed : fallback.tremelo.speed,
      span: typeof raw.tremelo?.span === 'number' ? raw.tremelo.span : fallback.tremelo.span,
    },
  };
}

function normalizeTimbres(value: unknown, fallback: Record<string, TimbreState>): Record<string, TimbreState> {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const normalized = Object.fromEntries(
    Object.entries(fallback).map(([color, timbre]) => [
      color,
      restoreSerializedTimbre(color, source[color], timbre),
    ])
  );

  for (const [color, timbre] of Object.entries(source)) {
    if (!(color in normalized)) {
      normalized[color] = restoreSerializedTimbre(color, timbre, Object.values(fallback)[0] ?? getInitialState().timbres['#4a90e2']);
    }
  }

  return normalized;
}

function buildSaveData(state: AppState): StudentNotationSaveData {
  return {
    placedNotes: cloneJson(state.placedNotes),
    placedChords: cloneJson(state.placedChords),
    tonicSignGroups: cloneJson(state.tonicSignGroups),
    sixteenthStampPlacements: cloneJson(state.sixteenthStampPlacements),
    tripletStampPlacements: cloneJson(state.tripletStampPlacements),
    sixteenthThreeStampPlacements: cloneJson(state.sixteenthThreeStampPlacements),
    annotations: cloneJson(state.annotations),
    macrobeatGroupings: [...state.macrobeatGroupings],
    macrobeatBoundaryStyles: [...state.macrobeatBoundaryStyles],
    hasAnacrusis: state.hasAnacrusis,
    baseMicrobeatPx: state.baseMicrobeatPx,
    tempoModulationMarkers: cloneJson(state.tempoModulationMarkers),
    tempo: state.tempo,
    timbres: Object.fromEntries(
      Object.entries(state.timbres).map(([color, timbre]) => [
        color,
        {
          ...cloneJson({
            ...timbre,
            coeffs: undefined,
            phases: undefined,
          }),
          coeffs: new Float32Array(timbre.coeffs),
          phases: new Float32Array(timbre.phases),
        },
      ])
    ),
    pitchRange: { ...state.pitchRange },
    degreeDisplayMode: state.degreeDisplayMode,
    showPitchLabels: state.showPitchLabels,
    showPitchOctaveLabels: state.showPitchOctaveLabels,
    showOctaveLabels: state.showOctaveLabels,
    longNoteStyle: state.longNoteStyle,
    playheadMode: state.playheadMode,
    selectedNote: cloneJson(state.selectedNote),
    activeChordIntervals: [...state.activeChordIntervals],
  };
}

function normalizeSaveData(value: unknown): StudentNotationSaveData {
  const initialState = getInitialState();
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<StudentNotationSaveData> & { timbres?: SerializedTimbresMap }
    : {};

  const macrobeatGroupings = normalizeMacrobeatGroupings(raw.macrobeatGroupings, initialState.macrobeatGroupings);
  const macrobeatBoundaryStyles = normalizeBoundaryStyles(
    raw.macrobeatBoundaryStyles,
    macrobeatGroupings,
    initialState.macrobeatBoundaryStyles
  );
  const tonicSignGroups = normalizeTonicSignGroups(raw.tonicSignGroups);
  const timbres = normalizeTimbres(raw.timbres, initialState.timbres);
  const selectedNoteShape = raw.selectedNote?.shape;
  const selectedNoteColor = raw.selectedNote?.color;
  const selectedNote = {
    shape: NOTE_SHAPES.has(selectedNoteShape as NoteShape)
      ? selectedNoteShape as NoteShape
      : initialState.selectedNote.shape,
    color: typeof selectedNoteColor === 'string' && selectedNoteColor in timbres
      ? selectedNoteColor
      : initialState.selectedNote.color,
  };
  const showPitchLabels = typeof raw.showPitchLabels === 'boolean'
    ? raw.showPitchLabels
    : initialState.showPitchLabels;
  const degreeDisplayMode = DEGREE_DISPLAY_MODES.has(raw.degreeDisplayMode as AppState['degreeDisplayMode'])
    ? raw.degreeDisplayMode as AppState['degreeDisplayMode']
    : initialState.degreeDisplayMode;

  return {
    placedNotes: normalizePlacedNotes(raw.placedNotes),
    placedChords: Array.isArray(raw.placedChords) ? cloneJson(raw.placedChords) : cloneJson(initialState.placedChords),
    tonicSignGroups,
    sixteenthStampPlacements: normalizeSixteenthStampPlacements(
      raw.sixteenthStampPlacements,
      tonicSignGroups,
      initialState.sixteenthStampPlacements
    ),
    tripletStampPlacements: Array.isArray(raw.tripletStampPlacements)
      ? cloneJson(raw.tripletStampPlacements)
      : cloneJson(initialState.tripletStampPlacements),
    sixteenthThreeStampPlacements: Array.isArray(raw.sixteenthThreeStampPlacements)
      ? cloneJson(raw.sixteenthThreeStampPlacements)
      : cloneJson(initialState.sixteenthThreeStampPlacements),
    annotations: Array.isArray(raw.annotations) ? cloneJson(raw.annotations) : cloneJson(initialState.annotations),
    macrobeatGroupings,
    macrobeatBoundaryStyles,
    hasAnacrusis: typeof raw.hasAnacrusis === 'boolean' ? raw.hasAnacrusis : initialState.hasAnacrusis,
    baseMicrobeatPx: typeof raw.baseMicrobeatPx === 'number' ? raw.baseMicrobeatPx : initialState.baseMicrobeatPx,
    tempoModulationMarkers: normalizeTempoModulationMarkers(raw.tempoModulationMarkers),
    tempo: typeof raw.tempo === 'number' && Number.isFinite(raw.tempo) ? raw.tempo : initialState.tempo,
    timbres,
    pitchRange: normalizePitchRange(raw.pitchRange, initialState.pitchRange),
    degreeDisplayMode: showPitchLabels ? 'off' : degreeDisplayMode,
    showPitchLabels,
    showPitchOctaveLabels: typeof raw.showPitchOctaveLabels === 'boolean'
      ? raw.showPitchOctaveLabels
      : initialState.showPitchOctaveLabels,
    showOctaveLabels: typeof raw.showOctaveLabels === 'boolean'
      ? raw.showOctaveLabels
      : initialState.showOctaveLabels,
    longNoteStyle: LONG_NOTE_STYLES.has(raw.longNoteStyle as AppState['longNoteStyle'])
      ? raw.longNoteStyle as AppState['longNoteStyle']
      : initialState.longNoteStyle,
    playheadMode: PLAYHEAD_MODES.has(raw.playheadMode as AppState['playheadMode'])
      ? raw.playheadMode as AppState['playheadMode']
      : initialState.playheadMode,
    selectedNote,
    activeChordIntervals: Array.isArray(raw.activeChordIntervals)
      ? raw.activeChordIntervals.filter((entry): entry is string => typeof entry === 'string')
      : [...initialState.activeChordIntervals],
  };
}

export function generateStudentNotationFilename(): string {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = now.getDate();
  return `SN-score-${month}${day}.json`;
}

export function serializeStudentNotationScoreFile(state: AppState): string {
  const data = buildSaveData(state);
  const file: StudentNotationSaveFile = {
    type: 'student-notation-score',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      ...data,
      timbres: serializeTimbres(data.timbres),
    },
  };

  return JSON.stringify(file, null, 2);
}

export function parseImportedStudentNotationData(content: string): ImportedStudentNotationData {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Imported file was empty.');
  }

  if (!trimmed.startsWith('{')) {
    throw new Error('Student Notation imports now require a JSON score file.');
  }

  const parsed = JSON.parse(trimmed) as Partial<StudentNotationSaveFile>;
  if (parsed.type !== 'student-notation-score') {
    throw new Error('Unsupported Student Notation JSON file.');
  }
  return {
    format: 'snapshot',
    data: normalizeSaveData(parsed.data),
  };
}

export function applyImportedStudentNotationData(
  store: StoreInstance,
  imported: ImportedStudentNotationData
): void {
  const oldSelectedNote = { ...store.state.selectedNote };
  const initialState = getInitialState();
  const { data } = imported;

  store.state.placedNotes = cloneJson(data.placedNotes);
  store.state.placedChords = cloneJson(data.placedChords);
  store.state.tonicSignGroups = cloneJson(data.tonicSignGroups);
  store.state.sixteenthStampPlacements = cloneJson(data.sixteenthStampPlacements);
  store.state.tripletStampPlacements = cloneJson(data.tripletStampPlacements);
  store.state.sixteenthThreeStampPlacements = cloneJson(data.sixteenthThreeStampPlacements);
  store.state.annotations = cloneJson(data.annotations);
  store.state.lassoSelection = cloneJson(initialState.lassoSelection);
  store.state.fullRowData = [...fullRowData];
  store.state.pitchRange = { ...data.pitchRange };
  store.state.macrobeatGroupings = [...data.macrobeatGroupings];
  store.state.macrobeatBoundaryStyles = [...data.macrobeatBoundaryStyles];
  store.state.hasAnacrusis = data.hasAnacrusis;
  store.state.baseMicrobeatPx = data.baseMicrobeatPx;
  store.state.tempoModulationMarkers = cloneJson(data.tempoModulationMarkers);
  store.state.selectedModulationRatio = null;
  store.state.timbres = normalizeTimbres(serializeTimbres(data.timbres), initialState.timbres);
  store.state.activeChordIntervals = [...data.activeChordIntervals];
  store.state.selectedNote = { ...data.selectedNote };
  store.state.tempo = data.tempo;
  store.state.degreeDisplayMode = data.degreeDisplayMode;
  store.state.showPitchLabels = data.showPitchLabels;
  store.state.showPitchOctaveLabels = data.showPitchOctaveLabels;
  store.state.showOctaveLabels = data.showOctaveLabels;
  store.state.longNoteStyle = data.longNoteStyle;
  store.state.playheadMode = data.playheadMode;
  store.state.isPlaying = false;
  store.state.isPaused = false;
  store.state.isLooping = false;

  store.emit('playbackStateChanged', { isPlaying: false, isPaused: false });
  store.emit('loopingChanged', false);
  store.emit('tempoChanged', store.state.tempo);
  store.emit('noteChanged', { newNote: store.state.selectedNote, oldNote: oldSelectedNote });
  store.emit('activeChordIntervalsChanged', store.state.activeChordIntervals);
  store.emit('pitchRangeChanged', store.state.pitchRange);
  store.emit('layoutConfigChanged');
  store.emit('degreeDisplayModeChanged', store.state.degreeDisplayMode);
  store.emit('pitchLabelsChanged', store.state.showPitchLabels);
  store.emit('pitchOctaveLabelsChanged', store.state.showPitchOctaveLabels);
  store.emit('octaveLabelsChanged', store.state.showOctaveLabels);
  store.emit('longNoteStyleChanged', store.state.longNoteStyle);
  store.emit('playheadModeChanged', store.state.playheadMode);
  store.emit('notesChanged');
  store.emit('sixteenthStampPlacementsChanged');
  store.emit('tripletStampPlacementsChanged');
  store.emit('sixteenthThreeStampPlacementsChanged');
  store.emit('tempoModulationMarkersChanged');
  store.emit('rhythmStructureChanged');
  Object.keys(store.state.timbres).forEach((color) => store.emit('timbreChanged', color));
  store.emit('annotationsChanged');
  store.recordState();
}
