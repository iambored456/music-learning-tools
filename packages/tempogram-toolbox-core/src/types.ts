export type RealMatrix = Float64Array[];

export interface ComplexVector {
  real: Float64Array;
  imag: Float64Array;
}

export interface ComplexMatrix {
  real: RealMatrix;
  imag: RealMatrix;
}

export interface SpectrogramResult {
  spectrogram: RealMatrix | ComplexMatrix;
  featureRate: number;
  frequencies: Float64Array;
  times: Float64Array;
}

export interface NoveltyResult {
  noveltyCurve: Float64Array;
  featureRate: number;
  bandNoveltyCurves: RealMatrix;
}

export interface TempogramFourierResult {
  tempogram: ComplexMatrix;
  times: Float64Array;
  bpm: Float64Array;
}

export interface PLPResult {
  plpCurve: Float64Array;
  featureRate: number;
  dominantTempoCurve: Float64Array;
}

export interface DetectedBeat {
  timeSec: number;
  confidence: number;
}

export interface BeatDetectionProgress {
  stage: "novelty" | "tempogram" | "plp" | "peaks";
  progress: number;
}

export interface BeatDetectionResult {
  beats: DetectedBeat[];
  noveltyCurve: Float64Array;
  noveltyFeatureRate: number;
  plpCurve: Float64Array;
  plpFeatureRate: number;
  dominantTempoCurve: Float64Array;
  estimatedTempoBpm: number | null;
}
