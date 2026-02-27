<script lang="ts">
  import { onMount } from 'svelte';
  import { createSixteenthHexPath } from '@mlt/notation-glyphs';
  import { TempoControls } from '@mlt/tempo-controls-ui';
  import {
    COLOR_PALETTE,
    KEY_CODES,
    MICROBEAT_TEMPO_MAX,
    MICROBEAT_TEMPO_MIN,
    NOTE_BANK_DISPLAY_GROUPS,
    TONIC_OPTIONS,
    createSimpleNotationAudioEngine,
    createSimpleNotationModel,
    findNoteDefinitionById,
    getDiatonicNoteDetailsFromKeyboard,
    getPitchNameForDisplay,
    type NoteDefinition,
    type SimpleNotationState,
  } from '@mlt/simple-notation-core';

  type NoteShape = 'oval' | 'diamond' | 'circle';

  type SixteenthSlot = 0 | 1;

  type PlacedNote = {
    noteId: string;
    label: string;
    interval: number;
    color: string;
    shape: NoteShape;
  };

  type OvalCellContent = {
    shape: 'oval';
    notes: [PlacedNote];
  };

  type DiamondCellContent = {
    shape: 'diamond';
    notes: [PlacedNote | null, PlacedNote | null];
  };

  type CircleStartCellContent = {
    shape: 'circle';
    role: 'start';
    notes: [PlacedNote];
  };

  type CircleContinuationCellContent = {
    shape: 'circle';
    role: 'continuation';
    startCellIndex: number;
  };

  type GridCellContent = OvalCellContent | DiamondCellContent | CircleStartCellContent | CircleContinuationCellContent;

  type GridZone = 'pickup' | 'main';

  type GridRow = {
    id: string;
    cells: Array<GridCellContent | null>;
  };

  type PersistedCanvasCell =
    | { shape: 'oval'; noteId: string }
    | { shape: 'diamond'; noteIds: [string | null, string | null] }
    | { shape: 'circle'; role: 'start'; noteId: string }
    | { shape: 'circle'; role: 'continuation'; startCellIndex: number };

  type PersistedCanvasState = {
    version: 1;
    pickupBeats: number;
    rows: Array<Array<PersistedCanvasCell | null>>;
    pickupCells: Array<PersistedCanvasCell | null>;
  };

  type DragPayload = {
    source: 'bank' | 'cell';
    note: PlacedNote;
    zone?: GridZone;
    rowIndex?: number;
    cellIndex?: number;
    noteIndex?: number;
  };

  type GridCellRef = {
    zone: GridZone;
    rowIndex: number;
    cellIndex: number;
  };

  type GridDropTarget = GridCellRef & {
    sixteenthSlot: SixteenthSlot | null;
  };

  type KaraokeAnchor = {
    rowIndex: number;
    leftPercent: number;
  };

  type PlaybackHighlight = {
    zone: GridZone;
    rowIndex: number;
    startCellIndex: number;
    span: 1 | 2;
    pulseClass: 'playback-pulse-a' | 'playback-pulse-b';
  };

  type BankLatticeToken = {
    noteId: string;
    label: string;
    color: string;
    column: number;
  };

  type BankLatticeRows = {
    top: BankLatticeToken[];
    middle: BankLatticeToken[];
    bottom: BankLatticeToken[];
  };

  type ColorPaletteMode = 'oklch' | 'chromanotes';

  const CHROMANOTES_PALETTE: Record<string, string> = {
    '1': '#e20011',
    b2_s1: '#e32302',
    '2': '#ef6602',
    b3_s2: '#f5c202',
    '3': '#f8df01',
    '4': '#a7dd12',
    b5_s4: '#5ac757',
    '5': '#006e6d',
    b6_s5: '#0057b9',
    '6': '#262388',
    b7_s6: '#6e2771',
    '7': '#b9017a',
  };

  const model = createSimpleNotationModel();
  const audio = createSimpleNotationAudioEngine(model);

  const GRID_COLUMNS = 8;
  const INITIAL_ROWS = 4;
  const MICROBEATS_PER_BEAT = 2;
  const PICKUP_MAX_BEATS = 3;
  const CANVAS_PERSISTENCE_KEY = 'simple-notation-ui:canvas:v1';
  const CANVAS_PERSISTENCE_VERSION = 1;
  const KARAOKE_ARC_HEIGHT_MIN = 0;
  const KARAOKE_ARC_HEIGHT_MAX = 100;
  const KARAOKE_BALL_SIZE_MIN = 8;
  const KARAOKE_BALL_SIZE_MAX = 72;
  const LOW_SCALE_DEGREE_ONE_NOTE_ID = '1';
  const HIGH_SCALE_DEGREE_ONE_NOTE_ID = 'oct';
  const LOW_SCALE_DEGREE_ONE_LEGACY_LABEL = '1\u0332';
  const HIGH_SCALE_DEGREE_ONE_LEGACY_LABEL = '1\u0305';
  const BANK_LATTICE_TOKEN_SPAN = 24;
  const BANK_LATTICE_ACCIDENTAL_OFFSET = BANK_LATTICE_TOKEN_SPAN / 2;
  const BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT = 12;
  const BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE = 15; // 2.5 on the original 4-unit scale
  const BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL = 14; // ~2.33 on the original 4-unit scale
  const BANK_LATTICE_COLUMN_COUNT_CIRCLE = calculateBankLatticeColumnCount(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE);
  const BANK_LATTICE_COLUMN_COUNT_OVAL = calculateBankLatticeColumnCount(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL);
  const BANK_LATTICE_COLUMN_COUNT_DIAMOND = calculateBankLatticeColumnCount(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT);
  const PLAYBACK_HIGHLIGHT_DEBUG = false;
  const PLAYED_NOTE_MUTING_DEBUG = false;

  // Keep notebank sizing from Student Notation while allowing cell-placed sixteenths to fill slot height.
  const BANK_SIXTEENTH_HEX_PATH = createSixteenthHexPath(60, 60, 50, 110);
  // Keep placed sixteenths close to slot bounds while avoiding top/bottom stroke clipping.
  const PLACED_SIXTEENTH_HEX_PATH = createSixteenthHexPath(12.5, 50, 21, 96);
  const PLACED_SIXTEENTH_HEX_VIEWBOX = '0 0 25 100';

  const voiceOptions: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];

  let state: SimpleNotationState = model.getState();

  let audioReady = false;
  let audioStartPromise: Promise<boolean> | null = null;

  let isPlaying = false;
  let playbackIndex = 0;
  let playbackTimer: ReturnType<typeof setInterval> | null = null;
  let pendingPlaybackTimeouts = new Set<ReturnType<typeof setTimeout>>();
  let playbackCursor: GridCellRef | null = null;
  let karaokeBallRowIndex: number | null = null;
  let karaokeBallLeftPercent = 50;
  let karaokeBallArcOffsetPx = 0;
  let karaokeArcHeightPx = 64;
  let karaokeBallSizePx = 40;
  let karaokeAnchor: KaraokeAnchor | null = null;
  let karaokeAnimationFrame: number | null = null;
  let karaokeAnimationToken = 0;
  let trackRowElements: Array<HTMLElement | null> = [];
  let playbackHighlight: PlaybackHighlight | null = null;
  let playbackHighlightAnchor: KaraokeAnchor | null = null;
  let playbackPulseFlip = false;
  let playedCellIndexes = new Set<number>();

  let dragPayload: DragPayload | null = null;
  let dragOverCell: GridDropTarget | null = null;
  let keyboardHighlightedNoteId: string | null = null;
  let colorPaletteMode: ColorPaletteMode = 'oklch';
  let showAccidentals = false;

  let pickupBeats = 0;
  let pickupRow: GridRow = createEmptyRow('pickup');
  let gridRows: GridRow[] = Array.from({ length: INITIAL_ROWS }, () => createEmptyRow());
  let canvasPersistenceReady = false;

  let unsubscribeModel: (() => void) | null = null;

  let bankLatticeRowsCircle: BankLatticeRows = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE);
  let bankLatticeRowsOval: BankLatticeRows = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL);
  let bankLatticeRowsDiamond: BankLatticeRows = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT);

  $: {
    colorPaletteMode;
    bankLatticeRowsCircle = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE);
    bankLatticeRowsOval = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL);
    bankLatticeRowsDiamond = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT);
  }

  $: if (canvasPersistenceReady) {
    gridRows;
    pickupRow;
    pickupBeats;
    persistCanvasState();
  }

  onMount(() => {
    loadPersistedCanvasState();
    canvasPersistenceReady = true;

    unsubscribeModel = model.subscribe((nextState) => {
      const previousState = state;
      state = nextState;
      syncAudioWithState(nextState, previousState);
    });

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);

    return () => {
      stopPlayback();
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
      unsubscribeModel?.();
      audio.dispose();
    };
  });

  function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createEmptyRow(prefix = 'row'): GridRow {
    return {
      id: createId(prefix),
      cells: Array.from({ length: GRID_COLUMNS }, () => null),
    };
  }

  function pickupMicrobeatCount(): number {
    return pickupBeats * MICROBEATS_PER_BEAT;
  }

  function enforcePickupCellBoundaries(cells: Array<GridCellContent | null>, beats: number): void {
    const activeCells = beats * MICROBEATS_PER_BEAT;
    for (let index = activeCells; index < GRID_COLUMNS; index += 1) {
      cells[index] = null;
    }

    if (activeCells > 0) {
      const edgeCell = cells[activeCells - 1];
      if (edgeCell && edgeCell.shape === 'circle' && edgeCell.role === 'start') {
        cells[activeCells - 1] = null;
      }
    }
  }

  function setPickupBeats(nextBeats: number): void {
    const clamped = Math.max(0, Math.min(PICKUP_MAX_BEATS, Math.round(nextBeats)));
    if (clamped === pickupBeats) return;

    pickupBeats = clamped;

    updateGridData((_rows, pickupCells) => {
      enforcePickupCellBoundaries(pickupCells, clamped);
    });

    if (isPlaying) {
      stopPlayback();
    }
  }

  function colorFromColorId(colorId: string): string {
    const palette = colorPaletteMode === 'chromanotes' ? CHROMANOTES_PALETTE : (COLOR_PALETTE as Record<string, string>);
    return palette[colorId] ?? '#d9d9d9';
  }

  function noteDefinitionFromId(noteId: string): NoteDefinition | null {
    return findNoteDefinitionById(noteId);
  }

  function displayLabelFromText(label: string): string {
    if (label === HIGH_SCALE_DEGREE_ONE_LEGACY_LABEL) return '1';
    if (label === LOW_SCALE_DEGREE_ONE_LEGACY_LABEL) return '1';
    return label === '^1' ? '1' : label;
  }

  function rawLabelFromNoteId(noteId: string): string {
    if (noteId === 'oct') return '^1';
    if (noteId.startsWith('s')) return `♯${noteId.slice(1)}`;
    if (noteId.startsWith('b')) return `♭${noteId.slice(1)}`;
    return noteId;
  }

  function displayLabelFromId(noteId: string): string {
    return displayLabelFromText(rawLabelFromNoteId(noteId));
  }

  function scaleDegreeOneMarkerClass(noteId: string): string {
    if (noteId === HIGH_SCALE_DEGREE_ONE_NOTE_ID) return 'scale-degree-one-high';
    if (noteId === LOW_SCALE_DEGREE_ONE_NOTE_ID) return 'scale-degree-one-low';
    return '';
  }

  function noteColor(noteId: string): string {
    const note = noteDefinitionFromId(noteId);
    if (!note) return '#d9d9d9';
    return colorFromColorId(note.colorId);
  }

  function recolorCellNotes(cell: GridCellContent | null): void {
    if (!cell) return;

    if (cell.shape === 'oval') {
      cell.notes[0].color = noteColor(cell.notes[0].noteId);
      return;
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'start') {
        cell.notes[0].color = noteColor(cell.notes[0].noteId);
      }
      return;
    }

    for (const note of cell.notes) {
      if (!note) continue;
      note.color = noteColor(note.noteId);
    }
  }

  function applyPaletteToPlacedNotes(): void {
    updateGridData((rows, pickupCells) => {
      for (const row of rows) {
        for (const cell of row.cells) {
          recolorCellNotes(cell);
        }
      }

      for (const cell of pickupCells) {
        recolorCellNotes(cell);
      }
    });
  }

  function createBankLatticeToken(noteId: string, column: number): BankLatticeToken {
    return {
      noteId,
      label: displayLabelFromId(noteId),
      color: noteColor(noteId),
      column,
    };
  }

  function groupHasAccidentalSlot(group: (typeof NOTE_BANK_DISPLAY_GROUPS)[number]): boolean {
    return Boolean(group.sharp || group.flat);
  }

  function calculateBankLatticeColumnCount(compressMissingAccidentalColumns: boolean, compressedNoAccidentalAdvance: number): number {
    let naturalColumn = 0;
    let highestNaturalColumn = 0;

    for (const group of NOTE_BANK_DISPLAY_GROUPS) {
      highestNaturalColumn = Math.max(highestNaturalColumn, naturalColumn);
      const hasAccidentalSlot = groupHasAccidentalSlot(group);
      naturalColumn += hasAccidentalSlot || !compressMissingAccidentalColumns ? BANK_LATTICE_TOKEN_SPAN : compressedNoAccidentalAdvance;
    }

    return highestNaturalColumn + BANK_LATTICE_TOKEN_SPAN;
  }

  function bankTokenInlineStyle(token: BankLatticeToken): string {
    return `--token-color:${token.color}; grid-column:${token.column + 1} / span ${BANK_LATTICE_TOKEN_SPAN}; grid-row:1;`;
  }

  function buildBankLatticeRows(compressMissingAccidentalColumns: boolean, compressedNoAccidentalAdvance: number): BankLatticeRows {
    const top: BankLatticeToken[] = [];
    const middle: BankLatticeToken[] = [];
    const bottom: BankLatticeToken[] = [];

    let naturalColumn = 0;

    for (const group of NOTE_BANK_DISPLAY_GROUPS) {
      middle.push(createBankLatticeToken(group.natural, naturalColumn));

      const hasAccidentalSlot = groupHasAccidentalSlot(group);
      if (hasAccidentalSlot) {
        const accidentalColumn = naturalColumn + BANK_LATTICE_ACCIDENTAL_OFFSET;
        if (group.sharp) {
          top.push(createBankLatticeToken(group.sharp, accidentalColumn));
        }
        if (group.flat) {
          bottom.push(createBankLatticeToken(group.flat, accidentalColumn));
        }
      }

      naturalColumn += hasAccidentalSlot || !compressMissingAccidentalColumns ? BANK_LATTICE_TOKEN_SPAN : compressedNoAccidentalAdvance;
    }

    return { top, middle, bottom };
  }

  function notesEquivalent(a: string | null, b: string | null): boolean {
    if (!a || !b) return false;

    const noteA = noteDefinitionFromId(a);
    const noteB = noteDefinitionFromId(b);

    if (!noteA || !noteB) {
      return a === b;
    }

    return noteA.id === noteB.id || noteA.aliasId === noteB.id || noteB.aliasId === noteA.id;
  }

  function tokenIsHighlighted(noteId: string): boolean {
    return notesEquivalent(keyboardHighlightedNoteId, noteId);
  }

  function formatPitchWithAccidentals(pitch: string): string {
    return pitch.replace(/#/g, '♯').replace(/([A-G])b/g, '$1♭');
  }

  function notePitchTooltip(noteId: string): string {
    const interval = noteDefinitionFromId(noteId)?.interval ?? 0;
    const pitch = getPitchNameForDisplay(model.getFullRootNote(), interval);
    return pitch ? formatPitchWithAccidentals(pitch) : 'n/a';
  }

  function createPlacedNote(noteId: string, shape: NoteShape): PlacedNote | null {
    const note = noteDefinitionFromId(noteId);
    if (!note) return null;

    return {
      noteId,
      label: displayLabelFromId(noteId),
      interval: note.interval,
      color: colorFromColorId(note.colorId),
      shape,
    };
  }

  function clonePlacedNote(note: PlacedNote): PlacedNote {
    return {
      noteId: note.noteId,
      label: note.label,
      interval: note.interval,
      color: note.color,
      shape: note.shape,
    };
  }

  function cloneCellContent(cell: GridCellContent | null): GridCellContent | null {
    if (!cell) return null;

    if (cell.shape === 'oval') {
      return {
        shape: 'oval',
        notes: [clonePlacedNote(cell.notes[0])],
      };
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'start') {
        return {
          shape: 'circle',
          role: 'start',
          notes: [clonePlacedNote(cell.notes[0])],
        };
      }

      return {
        shape: 'circle',
        role: 'continuation',
        startCellIndex: cell.startCellIndex,
      };
    }

    return {
      shape: 'diamond',
      notes: [cell.notes[0] ? clonePlacedNote(cell.notes[0]) : null, cell.notes[1] ? clonePlacedNote(cell.notes[1]) : null],
    };
  }

  function serializeCellForPersistence(cell: GridCellContent | null): PersistedCanvasCell | null {
    if (!cell) return null;

    if (cell.shape === 'oval') {
      return cell.notes[0] ? { shape: 'oval', noteId: cell.notes[0].noteId } : null;
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'start') {
        return cell.notes[0] ? { shape: 'circle', role: 'start', noteId: cell.notes[0].noteId } : null;
      }

      return { shape: 'circle', role: 'continuation', startCellIndex: cell.startCellIndex };
    }

    const leftNoteId = cell.notes[0]?.noteId ?? null;
    const rightNoteId = cell.notes[1]?.noteId ?? null;
    if (!leftNoteId && !rightNoteId) return null;

    return {
      shape: 'diamond',
      noteIds: [leftNoteId, rightNoteId],
    };
  }

  function deserializePersistedCell(rawCell: unknown): GridCellContent | null {
    if (!rawCell || typeof rawCell !== 'object') return null;

    const cell = rawCell as Record<string, unknown>;
    const shape = cell.shape;
    if (shape === 'oval') {
      const noteId = cell.noteId;
      if (typeof noteId !== 'string') return null;
      const note = createPlacedNote(noteId, 'oval');
      return note ? { shape: 'oval', notes: [note] } : null;
    }

    if (shape === 'circle') {
      const role = cell.role;
      if (role === 'start') {
        const noteId = cell.noteId;
        if (typeof noteId !== 'string') return null;
        const note = createPlacedNote(noteId, 'circle');
        return note ? { shape: 'circle', role: 'start', notes: [note] } : null;
      }

      if (role === 'continuation') {
        const startCellIndex = Number(cell.startCellIndex);
        if (!Number.isFinite(startCellIndex)) return null;
        return {
          shape: 'circle',
          role: 'continuation',
          startCellIndex: Math.max(0, Math.floor(startCellIndex)),
        };
      }

      return null;
    }

    if (shape === 'diamond') {
      const rawNoteIds = cell.noteIds;
      if (!Array.isArray(rawNoteIds)) return null;

      const leftId = typeof rawNoteIds[0] === 'string' ? rawNoteIds[0] : null;
      const rightId = typeof rawNoteIds[1] === 'string' ? rawNoteIds[1] : null;
      const left = leftId ? createPlacedNote(leftId, 'diamond') : null;
      const right = rightId ? createPlacedNote(rightId, 'diamond') : null;

      if (!left && !right) return null;
      return { shape: 'diamond', notes: [left, right] };
    }

    return null;
  }

  function persistCanvasState(): void {
    if (typeof window === 'undefined') return;

    const persistedState: PersistedCanvasState = {
      version: 1,
      pickupBeats,
      rows: gridRows.map((row) => row.cells.map((cell) => serializeCellForPersistence(cell))),
      pickupCells: pickupRow.cells.map((cell) => serializeCellForPersistence(cell)),
    };

    try {
      window.localStorage.setItem(CANVAS_PERSISTENCE_KEY, JSON.stringify(persistedState));
    } catch (error) {
      console.warn('Simple Notation canvas persistence save failed.', error);
    }
  }

  function loadPersistedCanvasState(): void {
    if (typeof window === 'undefined') return;

    let parsed: unknown;
    try {
      const rawState = window.localStorage.getItem(CANVAS_PERSISTENCE_KEY);
      if (!rawState) return;
      parsed = JSON.parse(rawState);
    } catch (error) {
      console.warn('Simple Notation canvas persistence load failed.', error);
      return;
    }

    if (!parsed || typeof parsed !== 'object') return;
    const persisted = parsed as Record<string, unknown>;
    if (persisted.version !== CANVAS_PERSISTENCE_VERSION) return;

    const pickupValue = Number(persisted.pickupBeats);
    const nextPickupBeats =
      Number.isFinite(pickupValue) ? Math.max(0, Math.min(PICKUP_MAX_BEATS, Math.round(pickupValue))) : 0;

    const rowsInput = Array.isArray(persisted.rows) ? persisted.rows : [];
    const restoredRows = rowsInput
      .map((rawRow) => {
        if (!Array.isArray(rawRow)) return null;
        return {
          id: createId('row'),
          cells: Array.from({ length: GRID_COLUMNS }, (_, index) => deserializePersistedCell(rawRow[index] ?? null)),
        };
      })
      .filter((row): row is GridRow => row !== null);

    const pickupCellsInput = Array.isArray(persisted.pickupCells) ? persisted.pickupCells : [];
    const restoredPickupCells = Array.from({ length: GRID_COLUMNS }, (_, index) =>
      deserializePersistedCell(pickupCellsInput[index] ?? null),
    );
    enforcePickupCellBoundaries(restoredPickupCells, nextPickupBeats);

    pickupBeats = nextPickupBeats;
    gridRows = restoredRows.length > 0 ? restoredRows : Array.from({ length: INITIAL_ROWS }, () => createEmptyRow());
    pickupRow = {
      id: createId('pickup'),
      cells: restoredPickupCells,
    };
  }

  function createCellContentForNote(note: PlacedNote, slot: SixteenthSlot = 0): GridCellContent {
    if (note.shape === 'oval') {
      return {
        shape: 'oval',
        notes: [clonePlacedNote(note)],
      };
    }

    if (note.shape === 'circle') {
      return {
        shape: 'circle',
        role: 'start',
        notes: [clonePlacedNote(note)],
      };
    }

    const notes: [PlacedNote | null, PlacedNote | null] = [null, null];
    notes[slot] = clonePlacedNote(note);

    return {
      shape: 'diamond',
      notes,
    };
  }

  function resolvePreferredSixteenthSlot(cell: GridCellContent | null, preferredSlot: SixteenthSlot | null): SixteenthSlot {
    if (preferredSlot !== null) {
      return preferredSlot;
    }

    if (!cell || cell.shape !== 'diamond') {
      return 0;
    }

    if (!cell.notes[0]) return 0;
    if (!cell.notes[1]) return 1;
    return 1;
  }

  function getCellsForZone(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
  ): Array<GridCellContent | null> | null {
    if (zone === 'pickup') {
      return pickupCells;
    }

    return rows[rowIndex]?.cells ?? null;
  }

  function maxCellsForZone(zone: GridZone): number {
    return zone === 'pickup' ? pickupMicrobeatCount() : GRID_COLUMNS;
  }

  function clearCircleAtCell(cells: Array<GridCellContent | null>, cellIndex: number): void {
    const cell = cells[cellIndex];
    if (!cell || cell.shape !== 'circle') return;

    if (cell.role === 'start') {
      cells[cellIndex] = null;
      const continuationCell = cells[cellIndex + 1];
      if (continuationCell && continuationCell.shape === 'circle' && continuationCell.role === 'continuation' && continuationCell.startCellIndex === cellIndex) {
        cells[cellIndex + 1] = null;
      }
      return;
    }

    cells[cellIndex] = null;
    const startCellIndex = cell.startCellIndex;
    if (startCellIndex < 0 || startCellIndex >= cells.length) return;

    const startCell = cells[startCellIndex];
    if (startCell && startCell.shape === 'circle' && startCell.role === 'start') {
      cells[startCellIndex] = null;
    }
  }

  function placeNoteAtLocation(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    incoming: PlacedNote,
    preferredSlot: SixteenthSlot | null,
  ): void {
    const cells = getCellsForZone(rows, pickupCells, zone, rowIndex);
    if (!cells) return;

    const maxCells = maxCellsForZone(zone);
    if (cellIndex < 0 || cellIndex >= maxCells) return;

    if (incoming.shape === 'circle') {
      if (!isMacrobeatStartCell(cellIndex)) {
        return;
      }

      if (cellIndex + 1 >= maxCells) {
        return;
      }

      clearCircleAtCell(cells, cellIndex);
      clearCircleAtCell(cells, cellIndex + 1);

      cells[cellIndex] = {
        shape: 'circle',
        role: 'start',
        notes: [clonePlacedNote(incoming)],
      };
      cells[cellIndex + 1] = {
        shape: 'circle',
        role: 'continuation',
        startCellIndex: cellIndex,
      };
      return;
    }

    clearCircleAtCell(cells, cellIndex);

    const targetCell = cells[cellIndex] ?? null;
    const nextCell = placeNoteIntoCell(targetCell, incoming, preferredSlot);
    cells[cellIndex] = nextCell;
  }

  function placeNoteIntoCell(
    cell: GridCellContent | null,
    incoming: PlacedNote,
    preferredSlot: SixteenthSlot | null = null,
  ): GridCellContent {
    if (incoming.shape === 'oval') {
      return createCellContentForNote(incoming);
    }

    if (incoming.shape === 'circle') {
      return createCellContentForNote(incoming);
    }

    const slot = resolvePreferredSixteenthSlot(cell, preferredSlot);

    if (!cell || cell.shape !== 'diamond') {
      return createCellContentForNote(incoming, slot);
    }

    const nextNotes: [PlacedNote | null, PlacedNote | null] = [
      cell.notes[0] ? clonePlacedNote(cell.notes[0]) : null,
      cell.notes[1] ? clonePlacedNote(cell.notes[1]) : null,
    ];
    nextNotes[slot] = clonePlacedNote(incoming);

    return {
      shape: 'diamond',
      notes: nextNotes,
    };
  }

  function removeNoteFromCell(cell: GridCellContent | null, noteIndex: number | null = null): GridCellContent | null {
    if (!cell) return null;

    if (cell.shape === 'oval') {
      return null;
    }

    if (cell.shape === 'circle') {
      return null;
    }

    if (noteIndex !== 0 && noteIndex !== 1) {
      return null;
    }

    const nextNotes: [PlacedNote | null, PlacedNote | null] = [
      cell.notes[0] ? clonePlacedNote(cell.notes[0]) : null,
      cell.notes[1] ? clonePlacedNote(cell.notes[1]) : null,
    ];
    nextNotes[noteIndex] = null;

    if (!nextNotes[0] && !nextNotes[1]) {
      return null;
    }

    return {
      shape: 'diamond',
      notes: nextNotes,
    };
  }

  function getDraftCell(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): GridCellContent | null {
    if (zone === 'pickup') {
      return pickupCells[cellIndex] ?? null;
    }
    return rows[rowIndex]?.cells[cellIndex] ?? null;
  }

  function setDraftCell(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    nextCell: GridCellContent | null,
  ): void {
    if (zone === 'pickup') {
      pickupCells[cellIndex] = nextCell;
      return;
    }
    rows[rowIndex].cells[cellIndex] = nextCell;
  }

  function cellHasAnyNotes(cell: GridCellContent | null): boolean {
    if (!cell) return false;
    if (cell.shape === 'oval') return Boolean(cell.notes[0]);
    if (cell.shape === 'circle') {
      return cell.role === 'start' ? Boolean(cell.notes[0]) : true;
    }
    return Boolean(cell.notes[0] || cell.notes[1]);
  }

  function resolveSixteenthSlotFromEvent(event: DragEvent): SixteenthSlot {
    const currentTarget = event.currentTarget;
    if (currentTarget instanceof HTMLElement) {
      const rect = currentTarget.getBoundingClientRect();
      if (rect.width > 0) {
        return event.clientX >= rect.left + rect.width / 2 ? 1 : 0;
      }
    }

    return 0;
  }

  function isMacrobeatStartCell(cellIndex: number): boolean {
    return cellIndex % MICROBEATS_PER_BEAT === 0;
  }

  function removeDraggedSource(rows: GridRow[], pickupCells: Array<GridCellContent | null>, payload: DragPayload): void {
    if (payload.zone === undefined || payload.rowIndex === undefined || payload.cellIndex === undefined) return;

    const sourceZone = payload.zone;
    const sourceRowIndex = payload.rowIndex;
    const sourceCellIndex = payload.cellIndex;
    const sourceCells = getCellsForZone(rows, pickupCells, sourceZone, sourceRowIndex);
    if (!sourceCells) return;

    const sourceCell = sourceCells[sourceCellIndex] ?? null;
    if (!sourceCell) return;

    if (sourceCell.shape === 'oval') {
      setDraftCell(rows, pickupCells, sourceZone, sourceRowIndex, sourceCellIndex, null);
      return;
    }

    if (sourceCell.shape === 'circle') {
      clearCircleAtCell(sourceCells, sourceCellIndex);
      return;
    }

    const sourceNoteIndex = payload.noteIndex ?? 0;
    const nextCell = removeNoteFromCell(sourceCell, sourceNoteIndex);
    setDraftCell(rows, pickupCells, sourceZone, sourceRowIndex, sourceCellIndex, nextCell);
  }

  function placedNoteTitle(note: PlacedNote): string {
    return displayLabelFromText(note.label);
  }

  function updateGridData(mutator: (rows: GridRow[], pickupCells: Array<GridCellContent | null>) => void): void {
    const nextRows = gridRows.map((row) => ({
      id: row.id,
      cells: row.cells.map((cell) => cloneCellContent(cell)),
    }));
    const nextPickupCells = pickupRow.cells.map((cell) => cloneCellContent(cell));

    mutator(nextRows, nextPickupCells);
    gridRows = nextRows;
    pickupRow = {
      ...pickupRow,
      cells: nextPickupCells,
    };
  }

  function syncAudioWithState(nextState: SimpleNotationState, previousState: SimpleNotationState | null): void {
    if (!audioReady) return;

    audio.setTempo(nextState.microbeatTempo);
    audio.setMainVoiceType(nextState.mainPlaybackVoice);
    audio.setMainVolume(nextState.mainVolume);
    audio.setDroneVoiceType(nextState.droneVoice);
    audio.setDroneVolume(nextState.droneVolume);

    const rootChanged =
      !previousState ||
      previousState.rootNoteTonic !== nextState.rootNoteTonic ||
      previousState.droneOctave !== nextState.droneOctave;

    if (rootChanged) {
      audio.updateRootNoteFrequency();
    }

    if (!previousState || previousState.droneIsOn !== nextState.droneIsOn) {
      audio.toggleMainDrone(nextState.droneIsOn);
    }
  }

  async function ensureAudioReady(): Promise<boolean> {
    if (audioReady) {
      return true;
    }

    if (audioStartPromise) {
      return audioStartPromise;
    }

    audioStartPromise = (async () => {
      try {
        const started = await audio.start();
        audioReady = started;

        if (started) {
          syncAudioWithState(state, null);
        }

        return started;
      } catch (error) {
        audioReady = false;
        console.warn('Simple Notation audio initialization failed.', error);
        return false;
      } finally {
        audioStartPromise = null;
      }
    })();

    return audioStartPromise;
  }

  function handleRootTonicChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    model.setRootNoteTonic(target.value);
  }

  function handleColorPaletteModeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const nextMode = target.value as ColorPaletteMode;

    if (nextMode === colorPaletteMode) return;

    colorPaletteMode = nextMode;
    applyPaletteToPlacedNotes();

    if (dragPayload) {
      dragPayload = {
        ...dragPayload,
        note: {
          ...dragPayload.note,
          color: noteColor(dragPayload.note.noteId),
        },
      };
    }
  }

  function setMainVoice(event: Event): void {
    const target = event.target as HTMLSelectElement;
    model.setMainPlaybackVoice(target.value as OscillatorType);
  }

  function setMainVolume(event: Event): void {
    const target = event.target as HTMLInputElement;
    model.setMainVolume(Number(target.value) / 100);
  }

  function handleQuarterTempoChange(quarterTempo: number): void {
    model.setMicrobeatTempo(quarterTempo * 2);

    if (isPlaying) {
      restartPlaybackTimer();
    }
  }

  function addRow(): void {
    gridRows = [...gridRows, createEmptyRow()];
  }

  function removeRow(): void {
    if (gridRows.length <= 1) return;

    gridRows = gridRows.slice(0, -1);

    const totalCells = pickupMicrobeatCount() + gridRows.length * GRID_COLUMNS;
    if (playbackIndex >= totalCells) {
      stopPlayback();
    }
  }

  function clearGrid(): void {
    updateGridData((rows, pickupCells) => {
      for (const row of rows) {
        row.cells = row.cells.map(() => null);
      }
      for (let index = 0; index < pickupCells.length; index += 1) {
        pickupCells[index] = null;
      }
    });

    stopPlayback();
  }

  async function previewBankNote(noteId: string): Promise<void> {
    const ready = await ensureAudioReady();
    if (!ready) return;

    const note = noteDefinitionFromId(noteId);
    if (!note) return;

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), note.interval);
    if (!pitch) return;

    audio.playNoteNow(pitch);
  }

  function handleBankDragStart(event: DragEvent, noteId: string, shape: NoteShape): void {
    const note = createPlacedNote(noteId, shape);
    if (!note) return;

    dragPayload = {
      source: 'bank',
      note,
    };

    event.dataTransfer?.setData('text/plain', `${noteId}:${shape}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copyMove';
    }
  }

  function handleCellDragStart(
    event: DragEvent,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    note: PlacedNote,
    noteIndex: number | null = null,
  ): void {
    dragPayload = {
      source: 'cell',
      note: clonePlacedNote(note),
      zone,
      rowIndex,
      cellIndex,
      noteIndex: noteIndex ?? undefined,
    };

    event.dataTransfer?.setData('text/plain', `${note.noteId}:${note.shape}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleAnyDragEnd(): void {
    dragPayload = null;
    dragOverCell = null;
  }

  function handleCellDragOver(event: DragEvent, zone: GridZone, rowIndex: number, cellIndex: number): void {
    if (!dragPayload) return;

    if (dragPayload.note.shape === 'circle') {
      const maxCells = maxCellsForZone(zone);
      if (!isMacrobeatStartCell(cellIndex) || cellIndex + 1 >= maxCells) {
        dragOverCell = null;
        return;
      }
    }

    event.preventDefault();
    dragOverCell = {
      zone,
      rowIndex,
      cellIndex,
      sixteenthSlot: dragPayload.note.shape === 'diamond' ? resolveSixteenthSlotFromEvent(event) : null,
    };

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dragPayload.source === 'bank' ? 'copy' : 'move';
    }
  }

  function handleCellDrop(event: DragEvent, zone: GridZone, rowIndex: number, cellIndex: number): void {
    event.preventDefault();

    if (!dragPayload) {
      dragOverCell = null;
      return;
    }

    const activePayload = dragPayload;
    const targetSixteenthSlot: SixteenthSlot | null =
      activePayload.note.shape === 'diamond' ? resolveSixteenthSlotFromEvent(event) : null;
    const droppingIntoOriginCell =
      activePayload.source === 'cell' &&
      activePayload.zone === zone &&
      activePayload.rowIndex === rowIndex &&
      activePayload.cellIndex === cellIndex;

    if (droppingIntoOriginCell) {
      dragPayload = null;
      dragOverCell = null;
      return;
    }

    if (activePayload.note.shape === 'circle') {
      const maxCells = maxCellsForZone(zone);
      if (!isMacrobeatStartCell(cellIndex) || cellIndex + 1 >= maxCells) {
        dragPayload = null;
        dragOverCell = null;
        return;
      }
    }

    updateGridData((rows, pickupCells) => {
      const incoming = clonePlacedNote(activePayload.note);

      if (activePayload.source === 'cell') {
        removeDraggedSource(rows, pickupCells, activePayload);
      }

      placeNoteAtLocation(rows, pickupCells, zone, rowIndex, cellIndex, incoming, targetSixteenthSlot);
    });

    dragPayload = null;
    dragOverCell = null;
  }

  function removeCellNote(
    event: MouseEvent,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    noteIndex: number | null = null,
  ): void {
    event.preventDefault();

    updateGridData((rows, pickupCells) => {
      const cells = getCellsForZone(rows, pickupCells, zone, rowIndex);
      if (!cells) return;

      const currentCell = cells[cellIndex] ?? null;
      if (currentCell && currentCell.shape === 'circle') {
        clearCircleAtCell(cells, cellIndex);
        return;
      }

      const nextCell = removeNoteFromCell(currentCell, noteIndex);
      setDraftCell(rows, pickupCells, zone, rowIndex, cellIndex, nextCell);
    });
  }

  function handleKaraokeArcHeightInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;

    const nextValue = Math.round(Number(target.value));
    if (!Number.isFinite(nextValue)) return;

    karaokeArcHeightPx = Math.max(KARAOKE_ARC_HEIGHT_MIN, Math.min(KARAOKE_ARC_HEIGHT_MAX, nextValue));
  }

  function handleKaraokeBallSizeInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;

    const nextValue = Math.round(Number(target.value));
    if (!Number.isFinite(nextValue)) return;

    karaokeBallSizePx = Math.max(KARAOKE_BALL_SIZE_MIN, Math.min(KARAOKE_BALL_SIZE_MAX, nextValue));
  }

  function clearKaraokeAnimation(): void {
    karaokeAnimationToken += 1;
    if (karaokeAnimationFrame !== null) {
      cancelAnimationFrame(karaokeAnimationFrame);
      karaokeAnimationFrame = null;
    }

    karaokeBallArcOffsetPx = 0;
  }

  function setKaraokeBallToAnchor(anchor: KaraokeAnchor): void {
    karaokeBallRowIndex = anchor.rowIndex;
    karaokeBallLeftPercent = anchor.leftPercent;
    karaokeBallArcOffsetPx = 0;
  }

  function debugPlaybackHighlight(message: string, details?: Record<string, unknown>): void {
    if (!PLAYBACK_HIGHLIGHT_DEBUG) return;
    console.log(`[SimpleNotation][PlaybackHighlight] ${message}`, details ?? {});
  }

  function debugPlayedNoteMuting(message: string, details?: Record<string, unknown>): void {
    if (!PLAYED_NOTE_MUTING_DEBUG) return;
    console.log(`[SimpleNotation][PlayedNoteMuting] ${message}`, details ?? {});
  }

  function getTrackRowRect(rowIndex: number): DOMRect | null {
    return trackRowElements[rowIndex]?.getBoundingClientRect() ?? null;
  }

  function rowsAreOnSameVisualLine(rowA: number, rowB: number): boolean {
    const rectA = getTrackRowRect(rowA);
    const rectB = getTrackRowRect(rowB);
    if (!rectA || !rectB) return false;
    return Math.abs(rectA.top - rectB.top) < 2;
  }

  function mapAnchorLeftPercentIntoRowFrame(sourceRowIndex: number, targetAnchor: KaraokeAnchor): number | null {
    const sourceRect = getTrackRowRect(sourceRowIndex);
    const targetRect = getTrackRowRect(targetAnchor.rowIndex);
    if (!sourceRect || !targetRect || sourceRect.width <= 0) return null;

    const targetX = targetRect.left + (targetAnchor.leftPercent / 100) * targetRect.width;
    return ((targetX - sourceRect.left) / sourceRect.width) * 100;
  }

  function karaokeAnchorsEqual(a: KaraokeAnchor, b: KaraokeAnchor): boolean {
    return a.rowIndex === b.rowIndex && Math.abs(a.leftPercent - b.leftPercent) < 0.0001;
  }

  function karaokeRowLeftBoundaryPercent(rowIndex: number): number {
    const pickupColumns = pickupMicrobeatCount();
    if (pickupColumns <= 0 || rowIndex <= 0) return 0;
    return (pickupColumns / (pickupColumns + GRID_COLUMNS)) * 100;
  }

  function isCircleMacrobeatPair(cells: Array<GridCellContent | null>, startCellIndex: number): boolean {
    const leftCell = cells[startCellIndex] ?? null;
    const rightCell = cells[startCellIndex + 1] ?? null;

    if (!leftCell || !rightCell) return false;
    if (leftCell.shape !== 'circle' || leftCell.role !== 'start') return false;
    if (rightCell.shape !== 'circle' || rightCell.role !== 'continuation') return false;

    return rightCell.startCellIndex === startCellIndex;
  }

  function isEmptyMacrobeatPair(cells: Array<GridCellContent | null>, startCellIndex: number): boolean {
    const leftCell = cells[startCellIndex] ?? null;
    const rightCell = cells[startCellIndex + 1] ?? null;
    return !leftCell && !rightCell;
  }

  function shouldUseMacrobeatMidpoint(cells: Array<GridCellContent | null>, maxCells: number, cellIndex: number): boolean {
    const macrobeatStart = cellIndex - (cellIndex % MICROBEATS_PER_BEAT);
    if (macrobeatStart < 0 || macrobeatStart + 1 >= maxCells) return false;

    return isCircleMacrobeatPair(cells, macrobeatStart) || isEmptyMacrobeatPair(cells, macrobeatStart);
  }

  function resolveKaraokeAnchor(cursor: GridCellRef | null): KaraokeAnchor | null {
    if (!cursor) return null;

    const pickupColumns = pickupMicrobeatCount();
    const isPickupZone = cursor.zone === 'pickup';
    const rowIndex = isPickupZone ? 0 : cursor.rowIndex;
    const rowCells = isPickupZone ? pickupRow.cells : gridRows[cursor.rowIndex]?.cells;

    if (!rowCells) return null;

    const maxCells = isPickupZone ? pickupColumns : GRID_COLUMNS;
    if (cursor.cellIndex < 0 || cursor.cellIndex >= maxCells) return null;

    const macrobeatMidpoint = shouldUseMacrobeatMidpoint(rowCells, maxCells, cursor.cellIndex);
    const localColumn = macrobeatMidpoint
      ? cursor.cellIndex - (cursor.cellIndex % MICROBEATS_PER_BEAT) + 1
      : cursor.cellIndex + 0.5;

    const hasPickup = pickupColumns > 0;
    const totalColumns = hasPickup ? pickupColumns + GRID_COLUMNS : GRID_COLUMNS;
    const leadingColumns = !isPickupZone && hasPickup ? pickupColumns : 0;
    const leftPercent = ((leadingColumns + localColumn) / totalColumns) * 100;

    return { rowIndex, leftPercent };
  }

  function karaokeAnchorFromPlaybackIndex(index: number): KaraokeAnchor | null {
    const totalCells = totalPlaybackCells();
    if (index < 0 || index >= totalCells) return null;

    return resolveKaraokeAnchor(cellRefFromIndex(index));
  }

  function animateKaraokeBall(
    from: KaraokeAnchor,
    to: KaraokeAnchor,
    durationMs: number = playbackIntervalMs(),
  ): void {
    clearKaraokeAnimation();

    if (karaokeAnchorsEqual(from, to)) {
      setKaraokeBallToAnchor(to);
      return;
    }

    const motionDurationMs = Math.max(80, Math.floor(durationMs));
    const token = karaokeAnimationToken;
    const runArcSegment = (
      rowIndex: number,
      startLeft: number,
      endLeft: number,
      segmentDurationMs: number,
      arcPhase: 'full' | 'first-half' | 'second-half' = 'full',
      onComplete: (() => void) | null = null,
      arcHeightPx: number = karaokeArcHeightPx,
    ): void => {
      karaokeBallRowIndex = rowIndex;

      const segmentStartedAt = performance.now();
      const deltaLeft = endLeft - startLeft;
      const clampedSegmentMs = Math.max(24, Math.floor(segmentDurationMs));

      const step = (now: number): void => {
        if (token !== karaokeAnimationToken) return;

        const progress = Math.min(1, (now - segmentStartedAt) / clampedSegmentMs);
        karaokeBallLeftPercent = startLeft + deltaLeft * progress;

        if (arcPhase === 'first-half') {
          karaokeBallArcOffsetPx = -arcHeightPx * (2 * progress - progress * progress);
        } else if (arcPhase === 'second-half') {
          karaokeBallArcOffsetPx = -arcHeightPx * (1 - progress * progress);
        } else {
          karaokeBallArcOffsetPx = -4 * arcHeightPx * progress * (1 - progress);
        }

        if (progress >= 1) {
          karaokeBallLeftPercent = endLeft;
          karaokeBallArcOffsetPx = arcPhase === 'first-half' ? -arcHeightPx : 0;
          if (onComplete) {
            onComplete();
          } else {
            karaokeAnimationFrame = null;
          }
          return;
        }

        karaokeAnimationFrame = requestAnimationFrame(step);
      };

      karaokeAnimationFrame = requestAnimationFrame(step);
    };

    const runArcTransition = (
      transitionFrom: KaraokeAnchor,
      transitionTo: KaraokeAnchor,
      transitionDurationMs: number,
      arcHeightPx: number,
    ): void => {
      if (transitionFrom.rowIndex === transitionTo.rowIndex) {
        runArcSegment(transitionFrom.rowIndex, karaokeBallLeftPercent, transitionTo.leftPercent, transitionDurationMs, 'full', null, arcHeightPx);
        return;
      }

      if (rowsAreOnSameVisualLine(transitionFrom.rowIndex, transitionTo.rowIndex)) {
        const targetLeftInSourceFrame = mapAnchorLeftPercentIntoRowFrame(transitionFrom.rowIndex, transitionTo);
        if (targetLeftInSourceFrame !== null) {
          runArcSegment(transitionFrom.rowIndex, karaokeBallLeftPercent, targetLeftInSourceFrame, transitionDurationMs, 'full', () => {
            if (token !== karaokeAnimationToken) return;
            setKaraokeBallToAnchor(transitionTo);
            karaokeAnimationFrame = null;
          }, arcHeightPx);
          return;
        }
      }

      const toRowLeftBoundary = karaokeRowLeftBoundaryPercent(transitionTo.rowIndex);
      const outgoingDurationMs = Math.max(20, Math.floor(transitionDurationMs / 2));
      const incomingDurationMs = Math.max(20, transitionDurationMs - outgoingDurationMs);
      runArcSegment(transitionFrom.rowIndex, karaokeBallLeftPercent, 100, outgoingDurationMs, 'first-half', () => {
        if (token !== karaokeAnimationToken) return;
        karaokeBallRowIndex = transitionTo.rowIndex;
        karaokeBallLeftPercent = toRowLeftBoundary;
        karaokeBallArcOffsetPx = -arcHeightPx;
        runArcSegment(transitionTo.rowIndex, toRowLeftBoundary, transitionTo.leftPercent, incomingDurationMs, 'second-half', null, arcHeightPx);
      }, arcHeightPx);
    };

    runArcTransition(from, to, motionDurationMs, karaokeArcHeightPx);
  }

  function startKaraokeLeadIn(firstAnchor: KaraokeAnchor): number {
    const leadInMs = Math.max(40, Math.floor(playbackIntervalMs() / 2));
    const crestLeft = karaokeRowLeftBoundaryPercent(firstAnchor.rowIndex);

    clearKaraokeAnimation();
    karaokeBallRowIndex = firstAnchor.rowIndex;
    karaokeBallLeftPercent = crestLeft;
    karaokeBallArcOffsetPx = -karaokeArcHeightPx;

    const token = karaokeAnimationToken;
    const startedAt = performance.now();

    const step = (now: number): void => {
      if (token !== karaokeAnimationToken) return;

      const progress = Math.min(1, (now - startedAt) / leadInMs);
      karaokeBallLeftPercent = crestLeft + (firstAnchor.leftPercent - crestLeft) * progress;
      karaokeBallArcOffsetPx = -karaokeArcHeightPx * (1 - progress * progress);

      if (progress >= 1) {
        setKaraokeBallToAnchor(firstAnchor);
        karaokeAnchor = firstAnchor;
        karaokeAnimationFrame = null;
        return;
      }

      karaokeAnimationFrame = requestAnimationFrame(step);
    };

    karaokeAnimationFrame = requestAnimationFrame(step);
    return leadInMs;
  }

  function updateKaraokeAfterPlaybackStep(currentIndex: number, totalCells: number, currentCursor: GridCellRef): void {
    const currentAnchor = karaokeAnchorFromPlaybackIndex(currentIndex);
    if (!currentAnchor) {
      debugPlaybackHighlight('No current karaoke anchor from playback index.', { currentIndex, totalCells });
      clearKaraokeAnimation();
      karaokeBallRowIndex = null;
      karaokeBallLeftPercent = 50;
      karaokeAnchor = null;
      return;
    }

    clearKaraokeAnimation();
    setKaraokeBallToAnchor(currentAnchor);
    karaokeAnchor = currentAnchor;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalCells) {
      markPlayedCellsForCursor(currentCursor);
      return;
    }

    const nextAnchor = karaokeAnchorFromPlaybackIndex(nextIndex);
    if (!nextAnchor) {
      debugPlaybackHighlight('No next karaoke anchor from playback index.', { nextIndex, totalCells });
      return;
    }

    if (karaokeAnchorsEqual(currentAnchor, nextAnchor)) {
      debugPlaybackHighlight('Karaoke anchors equal; no arc animation needed.', { currentAnchor, nextAnchor });
      return;
    }

    markPlayedCellsForCursor(currentCursor);
    animateKaraokeBall(currentAnchor, nextAnchor, playbackIntervalMs());
    karaokeAnchor = nextAnchor;
  }

  function resolvePlaybackHighlightForCursor(cursor: GridCellRef): Omit<PlaybackHighlight, 'pulseClass'> | null {
    const isPickupZone = cursor.zone === 'pickup';
    const rowIndex = isPickupZone ? -1 : cursor.rowIndex;
    const rowCells = isPickupZone ? pickupRow.cells : gridRows[cursor.rowIndex]?.cells;
    if (!rowCells) return null;

    const maxCells = isPickupZone ? pickupMicrobeatCount() : GRID_COLUMNS;
    if (cursor.cellIndex < 0 || cursor.cellIndex >= maxCells) return null;

    const macrobeatStart = cursor.cellIndex - (cursor.cellIndex % MICROBEATS_PER_BEAT);
    const useMacrobeatSpan = shouldUseMacrobeatMidpoint(rowCells, maxCells, cursor.cellIndex);
    if (useMacrobeatSpan && macrobeatStart + 1 < maxCells) {
      return {
        zone: cursor.zone,
        rowIndex,
        startCellIndex: macrobeatStart,
        span: 2,
      };
    }

    return {
      zone: cursor.zone,
      rowIndex,
      startCellIndex: cursor.cellIndex,
      span: 1,
    };
  }

  function updatePlaybackHighlight(cursor: GridCellRef): void {
    const anchor = resolveKaraokeAnchor(cursor);
    if (!anchor) {
      debugPlaybackHighlight('Clearing highlight: no resolved anchor for cursor.', { cursor });
      playbackHighlight = null;
      playbackHighlightAnchor = null;
      return;
    }

    if (playbackHighlightAnchor && karaokeAnchorsEqual(playbackHighlightAnchor, anchor)) {
      debugPlaybackHighlight('Skipping highlight update: anchor unchanged.', { cursor, anchor });
      return;
    }

    const nextHighlight = resolvePlaybackHighlightForCursor(cursor);
    if (!nextHighlight) {
      debugPlaybackHighlight('Clearing highlight: failed to resolve highlight span.', { cursor, anchor });
      playbackHighlight = null;
      playbackHighlightAnchor = null;
      return;
    }

    playbackPulseFlip = !playbackPulseFlip;
    playbackHighlight = {
      ...nextHighlight,
      pulseClass: playbackPulseFlip ? 'playback-pulse-a' : 'playback-pulse-b',
    };
    playbackHighlightAnchor = anchor;
    debugPlaybackHighlight('Highlight updated.', { cursor, anchor, highlight: playbackHighlight });
  }

  function clearPlaybackTimer(): void {
    if (playbackTimer !== null) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
  }

  function clearPendingPlaybackTimeouts(): void {
    for (const timeoutId of pendingPlaybackTimeouts) {
      clearTimeout(timeoutId);
    }
    pendingPlaybackTimeouts.clear();
  }

  function queuePlaybackTimeout(callback: () => void, delayMs: number): void {
    const timeoutId = setTimeout(() => {
      pendingPlaybackTimeouts.delete(timeoutId);
      callback();
    }, delayMs);

    pendingPlaybackTimeouts.add(timeoutId);
  }

  function playbackIntervalMs(): number {
    return Math.max(70, Math.round(60_000 / state.microbeatTempo));
  }

  function playbackPulseDurationMs(): number {
    return Math.max(220, Math.min(760, Math.round(playbackIntervalMs() * 1.15)));
  }

  function totalPlaybackCells(): number {
    return pickupMicrobeatCount() + gridRows.length * GRID_COLUMNS;
  }

  function absolutePlaybackCellIndex(zone: GridZone, rowIndex: number, cellIndex: number): number | null {
    const pickupCells = pickupMicrobeatCount();

    if (zone === 'pickup') {
      if (cellIndex < 0 || cellIndex >= pickupCells) return null;
      return cellIndex;
    }

    if (rowIndex < 0 || rowIndex >= gridRows.length) return null;
    if (cellIndex < 0 || cellIndex >= GRID_COLUMNS) return null;
    return pickupCells + rowIndex * GRID_COLUMNS + cellIndex;
  }

  function markPlayedCellsForCursor(cursor: GridCellRef): void {
    const highlight = resolvePlaybackHighlightForCursor(cursor);
    if (!highlight) return;

    const nextPlayed = new Set(playedCellIndexes);
    for (let offset = 0; offset < highlight.span; offset += 1) {
      const absoluteIndex = absolutePlaybackCellIndex(highlight.zone, highlight.rowIndex, highlight.startCellIndex + offset);
      if (absoluteIndex === null) continue;
      nextPlayed.add(absoluteIndex);
    }

    playedCellIndexes = nextPlayed;
    debugPlayedNoteMuting('Marked cells as played.', {
      cursor,
      highlight,
      playedCount: playedCellIndexes.size,
    });
  }

  function isPlayedCell(playedIndexes: Set<number>, zone: GridZone, rowIndex: number, cellIndex: number): boolean {
    const absoluteIndex = absolutePlaybackCellIndex(zone, rowIndex, cellIndex);
    if (absoluteIndex === null) return false;
    return playedIndexes.has(absoluteIndex);
  }

  function cellRefFromIndex(index: number): GridCellRef {
    const pickupCells = pickupMicrobeatCount();
    if (index < pickupCells) {
      return {
        zone: 'pickup',
        rowIndex: -1,
        cellIndex: index,
      };
    }

    const mainIndex = index - pickupCells;
    return {
      zone: 'main',
      rowIndex: Math.floor(mainIndex / GRID_COLUMNS),
      cellIndex: mainIndex % GRID_COLUMNS,
    };
  }

  function playPlacedNote(note: PlacedNote): void {
    if (!audioReady) return;

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), note.interval);
    if (!pitch) return;

    audio.playNoteNow(pitch);
  }

  function playCellNote(cellRef: GridCellRef): boolean {
    const cell =
      cellRef.zone === 'pickup'
        ? pickupRow.cells[cellRef.cellIndex]
        : gridRows[cellRef.rowIndex]?.cells[cellRef.cellIndex];

    if (!cell || !cellHasAnyNotes(cell)) return false;

    if (cell.shape === 'oval') {
      playPlacedNote(cell.notes[0]);
      return false;
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'continuation') {
        return false;
      }

      playPlacedNote(cell.notes[0]);
      return false;
    }

    const [leftSixteenth, rightSixteenth] = cell.notes;
    if (!leftSixteenth && !rightSixteenth) {
      return false;
    }

    if (leftSixteenth) {
      playPlacedNote(leftSixteenth);
    }

    if (!rightSixteenth || !isPlaying) {
      return false;
    }

    queuePlaybackTimeout(() => {
      if (!isPlaying) return;
      playPlacedNote(rightSixteenth);
    }, Math.max(20, Math.floor(playbackIntervalMs() / 2)));

    return true;
  }

  function playbackStep(): void {
    const totalCells = totalPlaybackCells();
    if (totalCells <= 0) {
      debugPlaybackHighlight('Stopping playback: no cells available.');
      stopPlayback();
      return;
    }

    const currentIndex = playbackIndex % totalCells;
    const cursor = cellRefFromIndex(currentIndex);
    debugPlaybackHighlight('Playback step.', { currentIndex, totalCells, cursor });
    playbackCursor = cursor;
    updateKaraokeAfterPlaybackStep(currentIndex, totalCells, cursor);
    updatePlaybackHighlight(cursor);
    const hasSecondSixteenth = playCellNote(cursor);
    if (PLAYED_NOTE_MUTING_DEBUG && typeof window !== 'undefined' && typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        debugPlayedNoteMuting('DOM muted-note classes.', {
          playedCellCount: playedCellIndexes.size,
          mutedNoteCount: document.querySelectorAll('.placed-note.played-note-muted').length,
        });
      });
    }

    playbackIndex = currentIndex + 1;
    if (playbackIndex >= totalCells) {
      clearPlaybackTimer();

      if (hasSecondSixteenth) {
        queuePlaybackTimeout(() => {
          stopPlayback();
        }, Math.max(24, Math.floor(playbackIntervalMs() / 2) + 8));
      } else {
        stopPlayback();
      }
    }
  }

  function restartPlaybackTimer(): void {
    if (!isPlaying) return;

    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    playbackTimer = setInterval(playbackStep, playbackIntervalMs());
  }

  function startPlayback(): void {
    if (isPlaying) return;

    debugPlaybackHighlight('Starting playback.', { playbackIndex, totalCells: totalPlaybackCells() });
    isPlaying = true;
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    clearKaraokeAnimation();
    playbackHighlight = null;
    playbackHighlightAnchor = null;

    const totalCells = totalPlaybackCells();
    if (totalCells <= 0) {
      stopPlayback();
      return;
    }

    const currentIndex = playbackIndex % totalCells;
    const firstAnchor = karaokeAnchorFromPlaybackIndex(currentIndex);
    const leadInMs = firstAnchor ? startKaraokeLeadIn(firstAnchor) : 0;
    if (!firstAnchor) {
      karaokeBallRowIndex = null;
      karaokeBallLeftPercent = 50;
    }

    queuePlaybackTimeout(() => {
      if (!isPlaying) return;
      playbackStep();

      if (isPlaying) {
        playbackTimer = setInterval(playbackStep, playbackIntervalMs());
      }
    }, leadInMs);
  }

  function pausePlayback(): void {
    debugPlaybackHighlight('Pausing playback.', { playbackIndex, playbackHighlight, playbackHighlightAnchor });
    isPlaying = false;
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    clearKaraokeAnimation();
    playbackHighlight = null;
    playbackHighlightAnchor = null;
  }

  function stopPlayback(): void {
    debugPlaybackHighlight('Stopping playback.', { playbackIndex, playbackHighlight, playbackHighlightAnchor });
    isPlaying = false;
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    clearKaraokeAnimation();
    playbackIndex = 0;
    playbackCursor = null;
    karaokeBallRowIndex = null;
    karaokeBallLeftPercent = 50;
    karaokeAnchor = null;
    playbackHighlight = null;
    playbackHighlightAnchor = null;
    playedCellIndexes = new Set<number>();
  }

  async function togglePlayback(): Promise<void> {
    if (isPlaying) {
      pausePlayback();
      return;
    }

    const ready = await ensureAudioReady();
    if (!ready) return;

    startPlayback();
  }

  function isPlaybackCell(cursor: GridCellRef | null, rowIndex: number, cellIndex: number): boolean {
    return cursor?.zone === 'main' && cursor?.rowIndex === rowIndex && cursor?.cellIndex === cellIndex;
  }

  function isPlaybackPickupCell(cursor: GridCellRef | null, cellIndex: number): boolean {
    return cursor?.zone === 'pickup' && cursor?.cellIndex === cellIndex;
  }

  function playbackHighlightMatches(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    if (!highlight || highlight.zone !== zone) return false;
    if (zone === 'main' && highlight.rowIndex !== rowIndex) return false;

    const start = highlight.startCellIndex;
    return cellIndex >= start && cellIndex < start + highlight.span;
  }

  function isPlaybackHighlightCell(highlight: PlaybackHighlight | null, rowIndex: number, cellIndex: number): boolean {
    return playbackHighlightMatches(highlight, 'main', rowIndex, cellIndex);
  }

  function isPlaybackPickupHighlightCell(highlight: PlaybackHighlight | null, cellIndex: number): boolean {
    return playbackHighlightMatches(highlight, 'pickup', -1, cellIndex);
  }

  function isPlaybackHighlightSpanStart(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    return playbackHighlightMatches(highlight, zone, rowIndex, cellIndex) && highlight?.span === 2 && highlight.startCellIndex === cellIndex;
  }

  function isPlaybackHighlightSpanContinuation(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    return (
      playbackHighlightMatches(highlight, zone, rowIndex, cellIndex) &&
      highlight?.span === 2 &&
      highlight.startCellIndex + 1 === cellIndex
    );
  }

  function isPlaybackPulseClass(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    pulseClass: PlaybackHighlight['pulseClass'],
  ): boolean {
    return playbackHighlightMatches(highlight, zone, rowIndex, cellIndex) && highlight?.pulseClass === pulseClass;
  }

  function isDropTarget(rowIndex: number, cellIndex: number): boolean {
    return dragOverCell?.zone === 'main' && dragOverCell?.rowIndex === rowIndex && dragOverCell?.cellIndex === cellIndex;
  }

  function isPickupDropTarget(cellIndex: number): boolean {
    return dragOverCell?.zone === 'pickup' && dragOverCell?.cellIndex === cellIndex;
  }

  function isSixteenthSlotDropTarget(zone: GridZone, rowIndex: number, cellIndex: number, slotIndex: number): boolean {
    if (!dragPayload || dragPayload.note.shape !== 'diamond') return false;
    if (slotIndex !== 0 && slotIndex !== 1) return false;

    return (
      dragOverCell?.zone === zone &&
      dragOverCell?.rowIndex === rowIndex &&
      dragOverCell?.cellIndex === cellIndex &&
      dragOverCell?.sixteenthSlot === slotIndex
    );
  }

  function cellHasNote(rowIndex: number, cellIndex: number): boolean {
    return cellHasAnyNotes(gridRows[rowIndex]?.cells[cellIndex] ?? null);
  }

  function pickupCellHasNote(cellIndex: number): boolean {
    return cellHasAnyNotes(pickupRow.cells[cellIndex]);
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    if (target.isContentEditable) return true;

    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function handleGlobalKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && (event.code === KEY_CODES.KEY_Z || event.code === KEY_CODES.KEY_Y)) {
      return;
    }

    if (isEditableTarget(event.target)) return;

    if (event.code === KEY_CODES.KEY_P) {
      event.preventDefault();
      togglePlayback();
      return;
    }

    if (event.code === KEY_CODES.KEY_O) {
      event.preventDefault();
      stopPlayback();
      return;
    }

    const noteDetail = getDiatonicNoteDetailsFromKeyboard(event.code);
    if (!noteDetail || event.repeat) return;

    event.preventDefault();

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), noteDetail.interval);
    if (audioReady && pitch) {
      audio.playNoteNow(pitch);
    }

    keyboardHighlightedNoteId = noteDetail.originalId;
  }

  function handleGlobalKeyUp(event: KeyboardEvent): void {
    const noteDetail = getDiatonicNoteDetailsFromKeyboard(event.code);
    if (!noteDetail) return;

    keyboardHighlightedNoteId = null;
  }

</script>

<main class="simple-notation" id="simple-notation-app" class:chromanotes-palette={colorPaletteMode === 'chromanotes'} style={`--playback-pulse-duration:${playbackPulseDurationMs()}ms;`}>
  <section class="panel controls-panel">
    <div class="controls-group tempo-group">
      <TempoControls
        quarterTempo={state.microbeatTempo / 2}
        minQuarter={MICROBEAT_TEMPO_MIN / 2}
        maxQuarter={MICROBEAT_TEMPO_MAX / 2}
        step={1}
        sliderOrientation="vertical"
        onchange={handleQuarterTempoChange}
      />
    </div>

    <div class="controls-group transport-group">
      <button type="button" class="transport-btn" on:click={togglePlayback} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {#if isPlaying}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" aria-hidden="true">
            <path fill="currentColor" d="M 152 104 L 144 106 L 143 108 L 141 108 L 133 114 L 130 120 L 128 130 L 128 382 L 132 396 L 140 404 L 147 406 L 149 408 L 164 408 L 165 406 L 168 406 L 178 401 L 180 398 L 184 397 L 207 381 L 224 372 L 229 367 L 240 362 L 242 359 L 249 356 L 254 351 L 267 345 L 269 342 L 286 333 L 293 327 L 304 322 L 306 319 L 316 314 L 322 309 L 326 308 L 331 303 L 335 302 L 344 295 L 354 290 L 356 287 L 367 282 L 378 271 L 381 265 L 382 250 L 377 239 L 367 230 L 363 229 L 343 215 L 325 205 L 318 199 L 309 195 L 308 193 L 301 190 L 287 180 L 283 179 L 281 176 L 274 173 L 268 168 L 259 164 L 257 161 L 246 156 L 244 153 L 237 150 L 232 145 L 221 140 L 217 136 L 210 133 L 201 126 L 197 125 L 195 122 L 183 116 L 177 111 L 164 105 Z"/>
          </svg>
        {/if}
      </button>
      <button type="button" class="transport-btn" on:click={stopPlayback} title="Stop" aria-label="Stop">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="3" ry="3" />
        </svg>
      </button>
    </div>

    <div class="controls-group playback-group">
      <div class="playback-select-control">
        <label for="root-tonic-select">Tonic Pitch</label>
        <select id="root-tonic-select" value={state.rootNoteTonic} on:change={handleRootTonicChange}>
          {#each TONIC_OPTIONS as tonic}
            <option value={tonic.value}>{tonic.label}</option>
          {/each}
        </select>
      </div>
      <div class="playback-select-control">
        <label for="color-palette-select">Palette</label>
        <select id="color-palette-select" value={colorPaletteMode} on:change={handleColorPaletteModeChange}>
          <option value="oklch">OKLCH</option>
          <option value="chromanotes">ChromaNotes</option>
        </select>
      </div>
      <div class="playback-select-control">
        <label>
          <input type="checkbox" bind:checked={showAccidentals} />
          Accidentals
        </label>
      </div>
    </div>

    <div class="controls-group voice-karaoke-group">
      <div class="voice-select-control">
        <label for="main-voice">Main Voice</label>
        <select id="main-voice" value={state.mainPlaybackVoice} on:change={setMainVoice}>
          {#each voiceOptions as voice}
            <option value={voice}>{voice}</option>
          {/each}
        </select>
      </div>

      <div class="toolbar-slider-control">
        <label for="main-volume">Volume</label>
        <input
          id="main-volume"
          type="range"
          min="0"
          max="100"
          step="1"
          value={state.mainVolume * 100}
          on:input={setMainVolume}
          title="Main volume"
        />
        <output class="value-readout" for="main-volume">{Math.round(state.mainVolume * 100)}%</output>
      </div>

      <div class="toolbar-slider-control">
        <label for="karaoke-arc-height">Arc</label>
        <input
          id="karaoke-arc-height"
          type="range"
          min={KARAOKE_ARC_HEIGHT_MIN}
          max={KARAOKE_ARC_HEIGHT_MAX}
          step="1"
          value={karaokeArcHeightPx}
          on:input={handleKaraokeArcHeightInput}
          title="Karaoke arc height"
        />
        <output class="value-readout" for="karaoke-arc-height">{karaokeArcHeightPx}px</output>
      </div>

      <div class="toolbar-slider-control">
        <label for="karaoke-ball-size">Ball</label>
        <input
          id="karaoke-ball-size"
          type="range"
          min={KARAOKE_BALL_SIZE_MIN}
          max={KARAOKE_BALL_SIZE_MAX}
          step="1"
          value={karaokeBallSizePx}
          on:input={handleKaraokeBallSizeInput}
          title="Karaoke ball size"
        />
        <output class="value-readout" for="karaoke-ball-size">{karaokeBallSizePx}px</output>
      </div>
    </div>

    <div class="controls-group pickup-karaoke-group">
      <div class="pickup-controls" role="group" aria-label="Anacrusis pickup beats">
        <span>Pickup Beats</span>
        {#each [0, 1, 2, 3] as beatCount}
          <button type="button" class:active={pickupBeats === beatCount} on:click={() => setPickupBeats(beatCount)}>
            {beatCount}
          </button>
        {/each}
      </div>

      <div class="canvas-actions toolbar-canvas-actions">
        <button type="button" on:click={addRow}>Add Row</button>
        <button type="button" on:click={removeRow} disabled={gridRows.length <= 1}>Remove Row</button>
        <button type="button" on:click={clearGrid}>Clear Canvas</button>
      </div>
    </div>
  </section>

  <section class="panel notebank-panel" class:playback-content-hidden={isPlaying}>
    <div class="bank-row-wrap">
      <span class="bank-row-corner-label">Quarters</span>
      <div class="bank-lattice circle-row" class:accidentals-hidden={!showAccidentals} style={`--lattice-columns:${BANK_LATTICE_COLUMN_COUNT_CIRCLE};`}>
        {#if showAccidentals}
        <div class="bank-lattice-row top">
          {#each bankLatticeRowsCircle.top as token (token.noteId)}
            <div
              class="bank-token-shell circle sharp-token"
              class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
              style={bankTokenInlineStyle(token)}
            >
              <svg class="token-glyph circle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                <ellipse cx="50" cy="50" rx="44" ry="44" />
              </svg>
              <button
                type="button"
                class="token-hitbox single sharp"
                draggable="true"
                title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                aria-label={`Add ${token.label} quarter sharp`}
                on:click={() => previewBankNote(token.noteId)}
                on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'circle')}
                on:dragend={handleAnyDragEnd}
              >
                <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
              </button>
            </div>
          {/each}
        </div>
        {/if}

        <div class="bank-lattice-row middle">
          {#each bankLatticeRowsCircle.middle as token (token.noteId)}
            <div
              class="bank-token-shell circle natural-token"
              class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
              style={bankTokenInlineStyle(token)}
            >
              <svg class="token-glyph circle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                <ellipse cx="50" cy="50" rx="44" ry="44" />
              </svg>
              <button
                type="button"
                class="token-hitbox single natural"
                draggable="true"
                title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                aria-label={`Add ${token.label} quarter`}
                on:click={() => previewBankNote(token.noteId)}
                on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'circle')}
                on:dragend={handleAnyDragEnd}
              >
                <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
              </button>
            </div>
          {/each}
        </div>

        {#if showAccidentals}
        <div class="bank-lattice-row bottom">
          {#each bankLatticeRowsCircle.bottom as token (token.noteId)}
            <div
              class="bank-token-shell circle flat-token"
              class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
              style={bankTokenInlineStyle(token)}
            >
              <svg class="token-glyph circle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                <ellipse cx="50" cy="50" rx="44" ry="44" />
              </svg>
              <button
                type="button"
                class="token-hitbox single flat"
                draggable="true"
                title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                aria-label={`Add ${token.label} quarter flat`}
                on:click={() => previewBankNote(token.noteId)}
                on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'circle')}
                on:dragend={handleAnyDragEnd}
              >
                <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
              </button>
            </div>
          {/each}
        </div>
        {/if}
      </div>
    </div>

    <div class="bank-row-pair">
      <div class="bank-row-wrap">
        <span class="bank-row-corner-label">Eighths</span>
        <div class="bank-lattice oval-row" class:accidentals-hidden={!showAccidentals} style={`--lattice-columns:${BANK_LATTICE_COLUMN_COUNT_OVAL};`}>
          {#if showAccidentals}
          <div class="bank-lattice-row top">
            {#each bankLatticeRowsOval.top as token (token.noteId)}
              <div
                class="bank-token-shell oval sharp-token"
                class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                style={bankTokenInlineStyle(token)}
              >
                <svg class="token-glyph oval" viewBox="0 0 100 160" aria-hidden="true" focusable="false">
                  <ellipse cx="50" cy="80" rx="44" ry="74" />
                </svg>
                <button
                  type="button"
                  class="token-hitbox single sharp"
                  draggable="true"
                  title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                  aria-label={`Add ${token.label} oval sharp`}
                  on:click={() => previewBankNote(token.noteId)}
                  on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'oval')}
                  on:dragend={handleAnyDragEnd}
                >
                  <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
                </button>
              </div>
            {/each}
          </div>
          {/if}

          <div class="bank-lattice-row middle">
            {#each bankLatticeRowsOval.middle as token (token.noteId)}
              <div
                class="bank-token-shell oval natural-token"
                class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                style={bankTokenInlineStyle(token)}
              >
                <svg class="token-glyph oval" viewBox="0 0 100 160" aria-hidden="true" focusable="false">
                  <ellipse cx="50" cy="80" rx="44" ry="74" />
                </svg>
                <button
                  type="button"
                  class="token-hitbox single natural"
                  draggable="true"
                  title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                  aria-label={`Add ${token.label} oval`}
                  on:click={() => previewBankNote(token.noteId)}
                  on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'oval')}
                  on:dragend={handleAnyDragEnd}
                >
                  <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
                </button>
              </div>
            {/each}
          </div>

          {#if showAccidentals}
          <div class="bank-lattice-row bottom">
            {#each bankLatticeRowsOval.bottom as token (token.noteId)}
              <div
                class="bank-token-shell oval flat-token"
                class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                style={bankTokenInlineStyle(token)}
              >
                <svg class="token-glyph oval" viewBox="0 0 100 160" aria-hidden="true" focusable="false">
                  <ellipse cx="50" cy="80" rx="44" ry="74" />
                </svg>
                <button
                  type="button"
                  class="token-hitbox single flat"
                  draggable="true"
                  title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                  aria-label={`Add ${token.label} oval flat`}
                  on:click={() => previewBankNote(token.noteId)}
                  on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'oval')}
                  on:dragend={handleAnyDragEnd}
                >
                  <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
                </button>
              </div>
            {/each}
          </div>
          {/if}
        </div>
      </div>

      <div class="bank-row-wrap">
        <span class="bank-row-corner-label">Sixteenths</span>
        <div class="bank-lattice diamond-row" class:accidentals-hidden={!showAccidentals} style={`--lattice-columns:${BANK_LATTICE_COLUMN_COUNT_DIAMOND};`}>
          {#if showAccidentals}
          <div class="bank-lattice-row top">
            {#each bankLatticeRowsDiamond.top as token (token.noteId)}
              <div
                class="bank-token-shell diamond sharp-token"
                class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                style={bankTokenInlineStyle(token)}
              >
                <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path d={BANK_SIXTEENTH_HEX_PATH} />
                </svg>
                <button
                  type="button"
                  class="token-hitbox single sharp"
                  draggable="true"
                  title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                  aria-label={`Add ${token.label} sixteenth sharp`}
                  on:click={() => previewBankNote(token.noteId)}
                  on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'diamond')}
                  on:dragend={handleAnyDragEnd}
                >
                  <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
                </button>
              </div>
            {/each}
          </div>
          {/if}

          <div class="bank-lattice-row middle">
            {#each bankLatticeRowsDiamond.middle as token (token.noteId)}
              <div
                class="bank-token-shell diamond natural-token"
                class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                style={bankTokenInlineStyle(token)}
              >
                <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path d={BANK_SIXTEENTH_HEX_PATH} />
                </svg>
                <button
                  type="button"
                  class="token-hitbox single natural"
                  draggable="true"
                  title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                  aria-label={`Add ${token.label} sixteenth`}
                  on:click={() => previewBankNote(token.noteId)}
                  on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'diamond')}
                  on:dragend={handleAnyDragEnd}
                >
                  <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
                </button>
              </div>
            {/each}
          </div>

          {#if showAccidentals}
          <div class="bank-lattice-row bottom">
            {#each bankLatticeRowsDiamond.bottom as token (token.noteId)}
              <div
                class="bank-token-shell diamond flat-token"
                class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                style={bankTokenInlineStyle(token)}
              >
                <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path d={BANK_SIXTEENTH_HEX_PATH} />
                </svg>
                <button
                  type="button"
                  class="token-hitbox single flat"
                  draggable="true"
                  title={`${token.label} (${notePitchTooltip(token.noteId)})`}
                  aria-label={`Add ${token.label} sixteenth flat`}
                  on:click={() => previewBankNote(token.noteId)}
                  on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'diamond')}
                  on:dragend={handleAnyDragEnd}
                >
                  <span class={scaleDegreeOneMarkerClass(token.noteId)}>{token.label}</span>
                </button>
              </div>
            {/each}
          </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <section class="panel canvas-panel">
    <div class="rows-grid" class:has-active-pickup={pickupBeats > 0} style={`--pickup-columns:${pickupMicrobeatCount()};`}>
      {#each gridRows as row, rowIndex (row.id)}
        <article class="track-row" bind:this={trackRowElements[rowIndex]}>
          {#if karaokeBallRowIndex === rowIndex}
            <div
              class="karaoke-ball"
              style={`--karaoke-ball-left:${karaokeBallLeftPercent}%; --karaoke-ball-y:${karaokeBallArcOffsetPx}px; --karaoke-ball-size-px:${karaokeBallSizePx}px;`}
              aria-hidden="true"
            ></div>
          {/if}
          <div
            class="track-row-grids"
            class:with-inline-pickup={rowIndex === 0 && pickupBeats > 0}
          >
            {#if rowIndex === 0 && pickupBeats > 0}
              <div class="track-grid pickup-grid inline-pickup-grid" role="group" aria-label="Pickup before first measure">
                {#each pickupRow.cells.slice(0, pickupMicrobeatCount()) as cell, cellIndex}
                  <div
                    class="macrobeat-cell"
                    class:has-note={pickupCellHasNote(cellIndex)}
                    class:circle-span-start={cell?.shape === 'circle' && cell.role === 'start'}
                    class:drop-target={isPickupDropTarget(cellIndex)}
                    class:playback-target={isPlaybackPickupCell(playbackCursor, cellIndex)}
                    class:playback-illuminated={isPlaybackPickupHighlightCell(playbackHighlight, cellIndex)}
                    class:playback-pulse-a={isPlaybackPulseClass(playbackHighlight, 'pickup', -1, cellIndex, 'playback-pulse-a')}
                    class:playback-pulse-b={isPlaybackPulseClass(playbackHighlight, 'pickup', -1, cellIndex, 'playback-pulse-b')}
                    class:playback-span-start={isPlaybackHighlightSpanStart(playbackHighlight, 'pickup', -1, cellIndex)}
                    class:playback-span-continuation={isPlaybackHighlightSpanContinuation(playbackHighlight, 'pickup', -1, cellIndex)}
                    class:two-based-divider={(cellIndex + 1) % 2 === 0 && cellIndex < pickupMicrobeatCount() - 1}
                    role="gridcell"
                    tabindex="-1"
                    aria-label={`Pickup macrobeat ${Math.floor(cellIndex / MICROBEATS_PER_BEAT) + 1}, microbeat ${(cellIndex % MICROBEATS_PER_BEAT) + 1}`}
                    on:dragover={(event) => handleCellDragOver(event, 'pickup', -1, cellIndex)}
                    on:drop={(event) => handleCellDrop(event, 'pickup', -1, cellIndex)}
                  >
                    {#if cell}
                      {#if cell.shape === 'oval' && cell.notes[0]}
                        <button
                          type="button"
                          class="placed-note oval"
                          class:played-note-muted={isPlayedCell(playedCellIndexes, 'pickup', -1, cellIndex)}
                          style={`--token-color:${cell.notes[0].color};`}
                          draggable="true"
                          title={placedNoteTitle(cell.notes[0])}
                          on:dragstart={(event) => handleCellDragStart(event, 'pickup', -1, cellIndex, cell.notes[0], 0)}
                          on:dragend={handleAnyDragEnd}
                          on:contextmenu={(event) => removeCellNote(event, 'pickup', -1, cellIndex, 0)}
                        >
                          <svg
                            class="token-glyph oval"
                            viewBox="0 0 100 160"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <ellipse cx="50" cy="80" rx="50" ry="80" />
                          </svg>
                          <span class="glyph-label">
                            <span class={scaleDegreeOneMarkerClass(cell.notes[0].noteId)}>{displayLabelFromText(cell.notes[0].label)}</span>
                          </span>
                        </button>
                      {:else if cell.shape === 'circle' && cell.role === 'start' && cell.notes[0]}
                        <button
                          type="button"
                          class="placed-note circle"
                          class:played-note-muted={isPlayedCell(playedCellIndexes, 'pickup', -1, cellIndex)}
                          style={`--token-color:${cell.notes[0].color};`}
                          draggable="true"
                          title={placedNoteTitle(cell.notes[0])}
                          on:dragstart={(event) => handleCellDragStart(event, 'pickup', -1, cellIndex, cell.notes[0], 0)}
                          on:dragend={handleAnyDragEnd}
                          on:contextmenu={(event) => removeCellNote(event, 'pickup', -1, cellIndex, 0)}
                        >
                          <svg
                            class="token-glyph circle"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <ellipse cx="50" cy="50" rx="50" ry="50" />
                          </svg>
                          <span class="glyph-label">
                            <span class={scaleDegreeOneMarkerClass(cell.notes[0].noteId)}>{displayLabelFromText(cell.notes[0].label)}</span>
                          </span>
                        </button>
                      {:else if cell.shape === 'diamond'}
                        <div class="placed-sixteenth-pair">
                          {#each cell.notes as diamondNote, slotIndex}
                            <div class="sixteenth-slot" class:slot-drop-target={isSixteenthSlotDropTarget('pickup', -1, cellIndex, slotIndex)}>
                              {#if diamondNote}
                                <button
                                  type="button"
                                  class={`placed-note diamond sixteenth ${cell.notes[0] && cell.notes[1] ? 'split' : 'single'}`}
                                  class:played-note-muted={isPlayedCell(playedCellIndexes, 'pickup', -1, cellIndex)}
                                  style={`--token-color:${diamondNote.color};`}
                                  draggable="true"
                                  title={placedNoteTitle(diamondNote)}
                                  on:dragstart={(event) => handleCellDragStart(event, 'pickup', -1, cellIndex, diamondNote, slotIndex)}
                                  on:dragend={handleAnyDragEnd}
                                  on:contextmenu={(event) => removeCellNote(event, 'pickup', -1, cellIndex, slotIndex)}
                                >
                                  <svg
                                    class="token-glyph diamond"
                                    viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    focusable="false"
                                  >
                                    <path d={PLACED_SIXTEENTH_HEX_PATH} />
                                  </svg>
                                  <span class="glyph-label">
                                    <span class={scaleDegreeOneMarkerClass(diamondNote.noteId)}>{displayLabelFromText(diamondNote.label)}</span>
                                  </span>
                                </button>
                              {:else}
                                <svg
                                  class="empty-sixteenth"
                                  viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                  preserveAspectRatio="none"
                                  aria-hidden="true"
                                  focusable="false"
                                >
                                  <path d={PLACED_SIXTEENTH_HEX_PATH} />
                                </svg>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      {/if}
                    {:else}
                      <svg
                        class="empty-oval"
                        viewBox="0 0 100 160"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <ellipse cx="50" cy="80" rx="50" ry="80" />
                      </svg>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            <div class="track-grid main-grid" class:with-inline-pickup={rowIndex === 0 && pickupBeats > 0} role="group" aria-label={`Row ${rowIndex + 1}`}>
            {#each row.cells as cell, cellIndex}
              <div
                class="macrobeat-cell"
                class:has-note={cellHasNote(rowIndex, cellIndex)}
                class:circle-span-start={cell?.shape === 'circle' && cell.role === 'start'}
                class:drop-target={isDropTarget(rowIndex, cellIndex)}
                class:playback-target={isPlaybackCell(playbackCursor, rowIndex, cellIndex)}
                class:playback-illuminated={isPlaybackHighlightCell(playbackHighlight, rowIndex, cellIndex)}
                class:playback-pulse-a={isPlaybackPulseClass(playbackHighlight, 'main', rowIndex, cellIndex, 'playback-pulse-a')}
                class:playback-pulse-b={isPlaybackPulseClass(playbackHighlight, 'main', rowIndex, cellIndex, 'playback-pulse-b')}
                class:playback-span-start={isPlaybackHighlightSpanStart(playbackHighlight, 'main', rowIndex, cellIndex)}
                class:playback-span-continuation={isPlaybackHighlightSpanContinuation(playbackHighlight, 'main', rowIndex, cellIndex)}
                class:two-based-divider={(cellIndex + 1) % 2 === 0 && cellIndex < GRID_COLUMNS - 1}
                role="gridcell"
                tabindex="-1"
                aria-label={`Row ${rowIndex + 1}, macrobeat ${Math.floor(cellIndex / MICROBEATS_PER_BEAT) + 1}, microbeat ${(cellIndex % MICROBEATS_PER_BEAT) + 1}`}
                on:dragover={(event) => handleCellDragOver(event, 'main', rowIndex, cellIndex)}
                on:drop={(event) => handleCellDrop(event, 'main', rowIndex, cellIndex)}
              >
                {#if cell}
                  {#if cell.shape === 'oval' && cell.notes[0]}
                    <button
                      type="button"
                      class="placed-note oval"
                      class:played-note-muted={isPlayedCell(playedCellIndexes, 'main', rowIndex, cellIndex)}
                      style={`--token-color:${cell.notes[0].color};`}
                      draggable="true"
                      title={placedNoteTitle(cell.notes[0])}
                      on:dragstart={(event) => handleCellDragStart(event, 'main', rowIndex, cellIndex, cell.notes[0], 0)}
                      on:dragend={handleAnyDragEnd}
                      on:contextmenu={(event) => removeCellNote(event, 'main', rowIndex, cellIndex, 0)}
                    >
                      <svg
                        class="token-glyph oval"
                        viewBox="0 0 100 160"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <ellipse cx="50" cy="80" rx="50" ry="80" />
                      </svg>
                      <span class="glyph-label">
                        <span class={scaleDegreeOneMarkerClass(cell.notes[0].noteId)}>{displayLabelFromText(cell.notes[0].label)}</span>
                      </span>
                    </button>
                  {:else if cell.shape === 'circle' && cell.role === 'start' && cell.notes[0]}
                    <button
                      type="button"
                      class="placed-note circle"
                      class:played-note-muted={isPlayedCell(playedCellIndexes, 'main', rowIndex, cellIndex)}
                      style={`--token-color:${cell.notes[0].color};`}
                      draggable="true"
                      title={placedNoteTitle(cell.notes[0])}
                      on:dragstart={(event) => handleCellDragStart(event, 'main', rowIndex, cellIndex, cell.notes[0], 0)}
                      on:dragend={handleAnyDragEnd}
                      on:contextmenu={(event) => removeCellNote(event, 'main', rowIndex, cellIndex, 0)}
                    >
                      <svg
                        class="token-glyph circle"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <ellipse cx="50" cy="50" rx="50" ry="50" />
                      </svg>
                      <span class="glyph-label">
                        <span class={scaleDegreeOneMarkerClass(cell.notes[0].noteId)}>{displayLabelFromText(cell.notes[0].label)}</span>
                      </span>
                    </button>
                  {:else if cell.shape === 'diamond'}
                    <div class="placed-sixteenth-pair">
                      {#each cell.notes as diamondNote, slotIndex}
                        <div class="sixteenth-slot" class:slot-drop-target={isSixteenthSlotDropTarget('main', rowIndex, cellIndex, slotIndex)}>
                          {#if diamondNote}
                            <button
                              type="button"
                              class={`placed-note diamond sixteenth ${cell.notes[0] && cell.notes[1] ? 'split' : 'single'}`}
                              class:played-note-muted={isPlayedCell(playedCellIndexes, 'main', rowIndex, cellIndex)}
                              style={`--token-color:${diamondNote.color};`}
                              draggable="true"
                              title={placedNoteTitle(diamondNote)}
                              on:dragstart={(event) => handleCellDragStart(event, 'main', rowIndex, cellIndex, diamondNote, slotIndex)}
                              on:dragend={handleAnyDragEnd}
                              on:contextmenu={(event) => removeCellNote(event, 'main', rowIndex, cellIndex, slotIndex)}
                            >
                              <svg
                                class="token-glyph diamond"
                                viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path d={PLACED_SIXTEENTH_HEX_PATH} />
                              </svg>
                              <span class="glyph-label">
                                <span class={scaleDegreeOneMarkerClass(diamondNote.noteId)}>{displayLabelFromText(diamondNote.label)}</span>
                              </span>
                            </button>
                          {:else}
                            <svg
                              class="empty-sixteenth"
                              viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                              preserveAspectRatio="none"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path d={PLACED_SIXTEENTH_HEX_PATH} />
                            </svg>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  <svg
                    class="empty-oval"
                    viewBox="0 0 100 160"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <ellipse cx="50" cy="80" rx="50" ry="80" />
                  </svg>
                {/if}
              </div>
            {/each}
            </div>
          </div>
        </article>
      {/each}
    </div>

  </section>
</main>
