/**
 * Overdub PCM Recorder
 *
 * Captures mono PCM audio in an AudioWorklet using a deterministic time window.
 * This is intentionally PCM-first for precise placement and future analysis.
 */

export interface PcmCaptureResult {
  samples: Float32Array;
  sampleRate: number;
  channelCount: number;
  durationMs: number;
}

interface RecordWindowOptions {
  startAtContextTimeSec: number;
  durationMs: number;
}

const PROCESSOR_NAME = 'mlt-pcm-capture-processor';

const WORKLET_SOURCE = `
class MltPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.startFrame = null;
    this.endFrame = null;
    this.recording = false;
    this.totalSamples = 0;
    this.chunks = [];
    this.channelIndex = 0;
    this.port.onmessage = (event) => {
      const data = event && event.data ? event.data : {};
      if (data.type === 'start') {
        this.startFrame = Number.isFinite(data.startFrame) ? data.startFrame : null;
        this.endFrame = Number.isFinite(data.endFrame) ? data.endFrame : null;
        this.channelIndex = Number.isFinite(data.channelIndex) ? data.channelIndex : 0;
        this.recording = this.startFrame !== null && this.endFrame !== null && this.endFrame > this.startFrame;
        this.totalSamples = 0;
        this.chunks = [];
      } else if (data.type === 'reset') {
        this.recording = false;
        this.startFrame = null;
        this.endFrame = null;
        this.totalSamples = 0;
        this.chunks = [];
      }
    };
  }

  _pushSlice(channelData, startInBlock, endInBlock) {
    const len = endInBlock - startInBlock;
    if (len <= 0) return;
    const out = new Float32Array(len);
    out.set(channelData.subarray(startInBlock, endInBlock));
    this.chunks.push(out);
    this.totalSamples += len;
  }

  _flush() {
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.port.postMessage({ type: 'done', buffer: merged.buffer }, [merged.buffer]);
    this.recording = false;
    this.startFrame = null;
    this.endFrame = null;
    this.totalSamples = 0;
    this.chunks = [];
  }

  process(inputs) {
    if (!this.recording || this.startFrame === null || this.endFrame === null) {
      return true;
    }

    const input = inputs[0];
    const channelData = input && input.length > this.channelIndex ? input[this.channelIndex] : null;
    if (!channelData || channelData.length === 0) {
      if (currentFrame >= this.endFrame) {
        this._flush();
      }
      return true;
    }

    const frameStart = currentFrame;
    const frameEnd = frameStart + channelData.length;

    if (frameEnd <= this.startFrame) {
      return true;
    }

    const readStart = Math.max(this.startFrame, frameStart);
    const readEnd = Math.min(this.endFrame, frameEnd);
    if (readEnd > readStart) {
      this._pushSlice(channelData, readStart - frameStart, readEnd - frameStart);
    }

    if (frameEnd >= this.endFrame) {
      this._flush();
    }

    return true;
  }
}

registerProcessor('${PROCESSOR_NAME}', MltPcmCaptureProcessor);
`;

function getSafeMediaDevices(): MediaDevices {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    throw new Error('MediaDevices API is unavailable in this environment');
  }
  return navigator.mediaDevices;
}

export function resampleFloat32(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || input.length === 0) return input;
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    return input;
  }

  const ratio = fromRate / toRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = i * ratio;
    const indexFloor = Math.floor(sourceIndex);
    const indexCeil = Math.min(input.length - 1, indexFloor + 1);
    const frac = sourceIndex - indexFloor;
    const a = input[indexFloor] ?? 0;
    const b = input[indexCeil] ?? a;
    output[i] = a + (b - a) * frac;
  }

  return output;
}

export class OverdubPcmRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private workletUrl: string | null = null;
  private workletLoaded = false;
  private cancelActiveCapture: (() => void) | null = null;

  get audioContext(): AudioContext | null {
    return this.context;
  }

  async ensureReady(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
    }
    if (this.context.state !== 'running') {
      await this.context.resume();
    }
    if (!this.stream) {
      const mediaDevices = getSafeMediaDevices();
      this.stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      });
    }

    await this.ensureGraph();
    return this.context;
  }

  async recordWindow(options: RecordWindowOptions): Promise<PcmCaptureResult> {
    if (!Number.isFinite(options.startAtContextTimeSec) || options.startAtContextTimeSec < 0) {
      throw new Error('Invalid startAtContextTimeSec');
    }
    if (!Number.isFinite(options.durationMs) || options.durationMs <= 0) {
      throw new Error('Invalid durationMs');
    }

    const context = await this.ensureReady();
    const workletNode = this.workletNode;
    if (!workletNode) {
      throw new Error('PCM recorder worklet is not initialized');
    }

    const sampleRate = context.sampleRate;
    const startFrame = Math.round(options.startAtContextTimeSec * sampleRate);
    const frameCount = Math.max(1, Math.round((options.durationMs / 1000) * sampleRate));
    const endFrame = startFrame + frameCount;

    if (this.cancelActiveCapture) {
      this.cancelActiveCapture();
      this.cancelActiveCapture = null;
    }

    return new Promise<PcmCaptureResult>((resolve, reject) => {
      let settled = false;
      const timeoutMs = Math.max(5_000, options.durationMs + 10_000);
      let captureTimeoutId = 0;
      let onMessage: ((event: MessageEvent) => void) | null = null;

      const cleanup = () => {
        window.clearTimeout(captureTimeoutId);
        if (onMessage) {
          workletNode.port.removeEventListener('message', onMessage);
        }
        if (this.cancelActiveCapture === onCancel) {
          this.cancelActiveCapture = null;
        }
      };

      const onCancel = () => {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          workletNode.port.postMessage({ type: 'reset' });
        } catch {
          // Ignore reset failures while cancelling.
        }
        reject(new Error('Capture cancelled'));
      };

      this.cancelActiveCapture = onCancel;

      captureTimeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Timed out waiting for PCM capture'));
      }, timeoutMs);

      onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; buffer?: ArrayBuffer };
        if (!data || data.type !== 'done' || !(data.buffer instanceof ArrayBuffer)) {
          return;
        }
        if (settled) return;
        settled = true;
        cleanup();

        const samples = new Float32Array(data.buffer);
        resolve({
          samples,
          sampleRate,
          channelCount: 1,
          durationMs: Math.round((samples.length / sampleRate) * 1000),
        });
      };

      workletNode.port.addEventListener('message', onMessage);
      workletNode.port.start();
      workletNode.port.postMessage({
        type: 'start',
        startFrame,
        endFrame,
        channelIndex: 0,
      });
    });
  }

  cancelCapture(): void {
    if (this.cancelActiveCapture) {
      this.cancelActiveCapture();
      this.cancelActiveCapture = null;
      return;
    }

    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ type: 'reset' });
      } catch {
        // Ignore reset failures.
      }
    }
  }

  async dispose(): Promise<void> {
    this.cancelCapture();

    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ type: 'reset' });
      } catch {
        // Ignore disposal errors.
      }
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.workletUrl) {
      URL.revokeObjectURL(this.workletUrl);
      this.workletUrl = null;
    }

    this.workletLoaded = false;
  }

  private async ensureGraph(): Promise<void> {
    const context = this.context;
    const stream = this.stream;
    if (!context || !stream) {
      throw new Error('Recorder context or media stream unavailable');
    }

    if (!this.workletLoaded) {
      if (!context.audioWorklet) {
        throw new Error('AudioWorklet is unavailable in this browser');
      }
      this.workletUrl = URL.createObjectURL(
        new Blob([WORKLET_SOURCE], { type: 'application/javascript' })
      );
      await context.audioWorklet.addModule(this.workletUrl);
      this.workletLoaded = true;
    }

    if (this.sourceNode && this.workletNode && this.silentGain) {
      return;
    }

    this.sourceNode = context.createMediaStreamSource(stream);
    this.workletNode = new AudioWorkletNode(context, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      channelCount: 1,
      channelCountMode: 'explicit',
    });

    this.silentGain = context.createGain();
    this.silentGain.gain.value = 0;

    // Keep node connected to an output path so process() continues to run.
    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.silentGain);
    this.silentGain.connect(context.destination);
  }
}
