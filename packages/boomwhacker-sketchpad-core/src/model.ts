import {
  BLOCK_MICROBEAT_CAPACITIES,
  DEFAULT_ROW_WIDTH_MICROBEATS,
  HISTORY_MAX_SIZE,
  INITIAL_VISIBLE_ROWS,
  MAX_ROW_WIDTH_MICROBEATS,
  MAX_VISIBLE_ROWS,
  MICROBEAT_TEMPO_MAX,
  MICROBEAT_TEMPO_MIN,
  MIN_VISIBLE_ROWS,
} from './constants.js';
import { createHistorySnapshot, createInitialScoreData, createInitialState } from './defaults.js';
import { isValidOctave, isValidTonic } from './pitch.js';
import {
  BLOCK_TYPES,
  DRONE_OCTAVES,
  TONIC_VALUES,
  type ActiveTool,
  type BlockType,
  type DroneOctave,
  type HistorySnapshot,
  type MacrobeatBlock,
  type NoteData,
  type ScoreRow,
  type BoomwhackerSketchpadState,
  type TonicValue,
} from './types.js';
import { clamp, createUniqueId, deepClone, historyEquals } from './utils.js';
import { validateBlockPlacement } from './validation.js';

export type BoomwhackerSketchpadListener = (state: BoomwhackerSketchpadState) => void;

type UpdateOptions = {
  pushToHistory?: boolean;
  notify?: boolean;
};

export class BoomwhackerSketchpadModel {
  private state: BoomwhackerSketchpadState;

  private listeners = new Set<BoomwhackerSketchpadListener>();

  constructor(initial?: Partial<BoomwhackerSketchpadState>) {
    this.state = {
      ...createInitialState(),
      ...(initial ?? {}),
    };

    this.pushStateToHistory(false);
  }

  subscribe(listener: BoomwhackerSketchpadListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): BoomwhackerSketchpadState {
    return deepClone(this.state);
  }

  getScoreData(): ScoreRow[] {
    return deepClone(this.state.scoreData);
  }

  getActiveTool(): ActiveTool {
    return deepClone(this.state.activeTool);
  }

  getVisibleRowsCount(): number {
    return this.state.visibleRowsCount;
  }

  getMicrobeatTempo(): number {
    return this.state.microbeatTempo;
  }

  getMainPlaybackVoice(): OscillatorType {
    return this.state.mainPlaybackVoice;
  }

  getDroneVoice(): OscillatorType {
    return this.state.droneVoice;
  }

  getMainVolume(): number {
    return this.state.mainVolume;
  }

  getDroneVolume(): number {
    return this.state.droneVolume;
  }

  getFullRootNote(): string {
    return `${this.state.rootNoteTonic}${this.state.droneOctave}`;
  }

  getLastCanvasInteraction(): { rowIndex: number; microbeatIndex: number } {
    return deepClone(this.state.lastCanvasInteraction);
  }

  getBlockAt(rowIndex: number, microbeatIndex: number): MacrobeatBlock | null {
    if (rowIndex < 0 || rowIndex >= this.state.scoreData.length) return null;

    const row = this.state.scoreData[rowIndex];
    for (const block of row.blocks) {
      const start = block.position;
      const endExclusive = start + (BLOCK_MICROBEAT_CAPACITIES[block.type] ?? 0);
      if (microbeatIndex >= start && microbeatIndex < endExclusive) {
        return deepClone(block);
      }
    }

    return null;
  }

  canUndo(): boolean {
    return this.state.historyPointer > 0;
  }

  canRedo(): boolean {
    return this.state.historyPointer < this.state.history.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const newPointer = this.state.historyPointer - 1;
    const snapshot = this.state.history[newPointer];
    this.state.historyPointer = newPointer;
    this.applyHistoryState(snapshot);

    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    const newPointer = this.state.historyPointer + 1;
    const snapshot = this.state.history[newPointer];
    this.state.historyPointer = newPointer;
    this.applyHistoryState(snapshot);

    return true;
  }

  setRootNoteTonic(value: string, notify = true): void {
    if (!isValidTonic(value)) return;
    this.updateState({ rootNoteTonic: value }, { pushToHistory: true, notify });
  }

  setDroneOctave(value: number, notify = true): void {
    if (!isValidOctave(value)) return;
    this.updateState({ droneOctave: value as DroneOctave }, { pushToHistory: true, notify });
  }

  setMicrobeatTempo(value: number, notify = true): void {
    const clamped = clamp(value, MICROBEAT_TEMPO_MIN, MICROBEAT_TEMPO_MAX);
    this.updateState({ microbeatTempo: clamped }, { pushToHistory: false, notify });
  }

  setMainPlaybackVoice(value: OscillatorType, notify = true): void {
    this.updateState({ mainPlaybackVoice: value }, { pushToHistory: false, notify });
  }

  setDroneVoice(value: OscillatorType, notify = true): void {
    this.updateState({ droneVoice: value }, { pushToHistory: false, notify });
  }

  setDroneIsOn(value: boolean, notify = true): void {
    this.updateState({ droneIsOn: value }, { pushToHistory: false, notify });
  }

  setMainVolume(value: number, notify = true): void {
    this.updateState({ mainVolume: clamp(value, 0, 1) }, { pushToHistory: false, notify });
  }

  setDroneVolume(value: number, notify = true): void {
    this.updateState({ droneVolume: clamp(value, 0, 1) }, { pushToHistory: false, notify });
  }

  setActiveTool(tool: ActiveTool, notify = true): void {
    this.updateState({ activeTool: deepClone(tool) }, { pushToHistory: true, notify });
  }

  setLastCanvasInteraction(rowIndex: number, microbeatIndex: number, notify = false): void {
    this.updateState(
      {
        lastCanvasInteraction: {
          rowIndex,
          microbeatIndex,
        },
      },
      { pushToHistory: false, notify },
    );
  }

  setKeyboardFocusZone(zone: BoomwhackerSketchpadState['keyboardFocusZone'], notify = true): void {
    if (this.state.keyboardFocusZone === zone) return;
    this.updateState({ keyboardFocusZone: zone }, { pushToHistory: false, notify });
  }

  setVisibleRowsCount(value: number, notify = true): void {
    const clamped = clamp(value, MIN_VISIBLE_ROWS, MAX_VISIBLE_ROWS);
    this.updateState({ visibleRowsCount: clamped }, { pushToHistory: true, notify });
  }

  addRow(notify = true): void {
    if (this.state.visibleRowsCount >= MAX_VISIBLE_ROWS) return;
    this.setVisibleRowsCount(this.state.visibleRowsCount + 1, notify);
  }

  removeRow(notify = true): void {
    if (this.state.visibleRowsCount <= MIN_VISIBLE_ROWS) return;
    this.setVisibleRowsCount(this.state.visibleRowsCount - 1, notify);
  }

  getDisplayMicrobeatsForRow(): number {
    let maxContentMicrobeats = DEFAULT_ROW_WIDTH_MICROBEATS;

    for (let rowIndex = 0; rowIndex < this.state.visibleRowsCount; rowIndex += 1) {
      const row = this.state.scoreData[rowIndex];
      if (!row || row.blocks.length === 0) continue;

      const lastBlock = row.blocks.reduce((prev, current) => (prev.position > current.position ? prev : current));
      let rowMax = lastBlock.position + (BLOCK_MICROBEAT_CAPACITIES[lastBlock.type] ?? 0);

      if (lastBlock.type.endsWith('E') && rowMax < MAX_ROW_WIDTH_MICROBEATS) {
        rowMax += 1;
      }

      maxContentMicrobeats = Math.max(maxContentMicrobeats, rowMax);
    }

    return clamp(maxContentMicrobeats, 1, MAX_ROW_WIDTH_MICROBEATS);
  }

  validateBlockPlacementRules(rowIndex: number, blockType: BlockType, microbeatPosition: number, rowMaxMicrobeats: number): boolean {
    if (rowIndex < 0 || rowIndex >= this.state.scoreData.length) return false;

    const rowBlocks = this.state.scoreData[rowIndex]?.blocks ?? [];

    return validateBlockPlacement({
      rowBlocks,
      blockType,
      microbeatPosition,
      rowMaxMicrobeats,
    });
  }

  addBlockToRow(rowIndex: number, blockType: BlockType, microbeatPosition: number, rowMaxMicrobeats?: number): boolean {
    if (!this.state.scoreData[rowIndex]) return false;

    const displayLimit = rowMaxMicrobeats ?? this.getDisplayMicrobeatsForRow();
    const isValid = this.validateBlockPlacementRules(rowIndex, blockType, microbeatPosition, displayLimit);
    if (!isValid) return false;

    const scoreData = deepClone(this.state.scoreData);
    const newBlock: MacrobeatBlock = {
      id: createUniqueId('block'),
      type: blockType,
      position: microbeatPosition,
      notes: new Array(BLOCK_MICROBEAT_CAPACITIES[blockType]).fill(null),
    };

    scoreData[rowIndex].blocks.push(newBlock);
    scoreData[rowIndex].blocks.sort((a, b) => a.position - b.position);

    this.updateState({ scoreData }, { pushToHistory: true, notify: true });
    return true;
  }

  removeBlockFromRow(rowIndex: number, blockId: string): boolean {
    const scoreData = deepClone(this.state.scoreData);
    const row = scoreData[rowIndex];
    if (!row) return false;

    const initialLength = row.blocks.length;
    row.blocks = row.blocks.filter((block) => block.id !== blockId);

    if (row.blocks.length === initialLength) {
      return false;
    }

    this.updateState({ scoreData }, { pushToHistory: true, notify: true });
    return true;
  }

  placeNoteInBlock(rowIndex: number, blockId: string, microbeatSlotIndex: number, noteData: NoteData): boolean {
    const scoreData = deepClone(this.state.scoreData);
    const row = scoreData[rowIndex];
    if (!row) return false;

    const block = row.blocks.find((item) => item.id === blockId);
    if (!block) return false;
    if (microbeatSlotIndex < 0 || microbeatSlotIndex >= block.notes.length) return false;

    if (historyEquals(block.notes[microbeatSlotIndex], noteData)) {
      return false;
    }

    block.notes[microbeatSlotIndex] = deepClone(noteData);
    this.updateState({ scoreData }, { pushToHistory: true, notify: true });

    return true;
  }

  removeNoteFromBlock(rowIndex: number, blockId: string, microbeatSlotIndex: number): boolean {
    const scoreData = deepClone(this.state.scoreData);
    const row = scoreData[rowIndex];
    if (!row) return false;

    const block = row.blocks.find((item) => item.id === blockId);
    if (!block) return false;
    if (microbeatSlotIndex < 0 || microbeatSlotIndex >= block.notes.length) return false;
    if (block.notes[microbeatSlotIndex] === null) return false;

    block.notes[microbeatSlotIndex] = null;
    this.updateState({ scoreData }, { pushToHistory: true, notify: true });

    return true;
  }

  clearAllNotes(): void {
    const scoreData = deepClone(this.state.scoreData);
    let changed = false;

    for (const row of scoreData) {
      for (const block of row.blocks) {
        for (let index = 0; index < block.notes.length; index += 1) {
          if (block.notes[index] !== null) {
            block.notes[index] = null;
            changed = true;
          }
        }
      }
    }

    if (!changed) return;

    this.updateState({ scoreData }, { pushToHistory: true, notify: true });
  }

  clearCanvas(): void {
    const scoreData = createInitialScoreData();
    this.updateState({ scoreData }, { pushToHistory: true, notify: true });
  }

  initialize(): void {
    this.state = createInitialState();
    this.pushStateToHistory(false);
    this.notify();
  }

  private updateState(patch: Partial<BoomwhackerSketchpadState>, options: UpdateOptions = {}): void {
    const { pushToHistory = true, notify = true } = options;

    const previousSnapshot = pushToHistory ? createHistorySnapshot(this.state) : null;

    this.state = {
      ...this.state,
      ...deepClone(patch),
    };

    if (pushToHistory && previousSnapshot) {
      const currentSnapshot = createHistorySnapshot(this.state);
      if (!historyEquals(previousSnapshot, currentSnapshot)) {
        this.pushStateToHistory(notify);
        return;
      }
    }

    if (notify) {
      this.notify();
    }
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private pushStateToHistory(notify = true): void {
    const snapshot = createHistorySnapshot(this.state);

    const currentHistory = this.state.history;
    const pointer = this.state.historyPointer;

    if (pointer >= 0 && pointer < currentHistory.length) {
      const currentSnapshot = currentHistory[pointer];
      if (currentSnapshot && historyEquals(currentSnapshot, snapshot)) {
        if (notify) this.notify();
        return;
      }
    }

    if (pointer < currentHistory.length - 1) {
      this.state.history = currentHistory.slice(0, pointer + 1);
    }

    this.state.history.push(snapshot);
    this.state.historyPointer = this.state.history.length - 1;

    if (this.state.history.length > HISTORY_MAX_SIZE) {
      this.state.history.shift();
      this.state.historyPointer -= 1;
    }

    if (notify) {
      this.notify();
    }
  }

  private applyHistoryState(historyState: HistorySnapshot): void {
    this.state = {
      ...this.state,
      ...deepClone(historyState),
      history: this.state.history,
      historyPointer: this.state.historyPointer,
      mainPlaybackVoice: this.state.mainPlaybackVoice,
      droneVoice: this.state.droneVoice,
      droneIsOn: this.state.droneIsOn,
      mainVolume: this.state.mainVolume,
      droneVolume: this.state.droneVolume,
      microbeatTempo: this.state.microbeatTempo,
      keyboardFocusZone: this.state.keyboardFocusZone,
      lastCanvasInteraction: this.state.lastCanvasInteraction,
    };

    this.notify();
  }
}

export function createBoomwhackerSketchpadModel(initial?: Partial<BoomwhackerSketchpadState>): BoomwhackerSketchpadModel {
  return new BoomwhackerSketchpadModel(initial);
}

export function createDefaultBoomwhackerSketchpadModel(): BoomwhackerSketchpadModel {
  return new BoomwhackerSketchpadModel();
}

export const MODEL_SANITY = {
  BLOCK_TYPES,
  TONIC_VALUES,
  DRONE_OCTAVES,
  INITIAL_VISIBLE_ROWS,
  MIN_VISIBLE_ROWS,
  MAX_VISIBLE_ROWS,
};
