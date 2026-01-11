export type BeltId = 'pitch' | 'degree' | 'intervals' | 'chromatic';
export type BeltOrientation = 'horizontal' | 'vertical';
export type CursorColor = 'red' | 'blue' | 'green' | 'yellow';
export type RingName = 'pitchClass' | 'degree' | 'chromatic' | 'highlightPosition';

export type LayoutOrder = {
  horizontal: string[];
  vertical: string[];
};

export interface DisplayLabels {
  chromaticLabels: string[];
  diatonicLabels: string[];
}

export interface MusicalResult {
  pitch: string;
  modeName: string;
  result: string;
  rootNoteIndex: number;
  modeDegreeIndex: number;
  modeKey: string | null;
}

export interface Preferences {
  darkMode: boolean;
  orientation: BeltOrientation;
  volume: number;
  tutorialCompleted: boolean;
  showAdvancedControls: boolean;
  beltOrder: BeltId[];
  cursorColor: CursorColor;
  cursorFill: boolean;
  layoutOrder?: LayoutOrder;
}
