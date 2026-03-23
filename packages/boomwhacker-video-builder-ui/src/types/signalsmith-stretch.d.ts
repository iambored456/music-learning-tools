declare module 'signalsmith-stretch' {
  export interface SignalsmithStretchSchedule {
    active?: boolean;
    input?: number;
    output?: number;
    outputTime?: number;
    rate?: number;
    semitones?: number;
    tonalityHz?: number;
    formantSemitones?: number;
    formantCompensation?: boolean;
    formantBaseHz?: number;
    loopStart?: number;
    loopEnd?: number;
  }

  export interface SignalsmithStretchConfig {
    preset?: 'default' | 'cheaper';
    blockMs?: number | null;
    intervalMs?: number;
    splitComputation?: boolean;
  }

  export interface SignalsmithStretchNode extends AudioWorkletNode {
    inputTime: number;
    addBuffers(
      sampleBuffers: Float32Array[] | Float32Array[][],
      transfer?: Transferable[],
    ): Promise<number>;
    dropBuffers(toSeconds?: number): Promise<{ start: number; end: number }>;
    configure(config: SignalsmithStretchConfig): Promise<void>;
    latency(): Promise<number>;
    schedule(
      schedule: SignalsmithStretchSchedule,
      adjustPrevious?: boolean,
    ): Promise<SignalsmithStretchSchedule>;
    start(
      when?: number | SignalsmithStretchSchedule,
      offset?: number,
      duration?: number,
      rate?: number,
      semitones?: number,
    ): Promise<SignalsmithStretchSchedule>;
    stop(when?: number): Promise<SignalsmithStretchSchedule>;
    setUpdateInterval(
      seconds: number,
      callback?: (inputTime: number) => void,
    ): Promise<void>;
  }

  export default function createSignalsmithStretch(
    audioContext: BaseAudioContext,
    options?: AudioWorkletNodeOptions,
  ): Promise<SignalsmithStretchNode>;
}
