import { assert, sinc } from "../utils/math.js";

export interface ResampleOptions {
  filterHalfLength?: number;
}

export function resampleSignal(
  input: ArrayLike<number>,
  sourceRate: number,
  targetRate: number,
  options: ResampleOptions = {},
): Float64Array {
  assert(sourceRate > 0, "sourceRate must be positive");
  assert(targetRate > 0, "targetRate must be positive");
  const ratio = targetRate / sourceRate;
  if (Math.abs(ratio - 1) < 1e-12) {
    return Float64Array.from(input);
  }

  const filterHalfLength = options.filterHalfLength ?? 32;
  const outputLength = Math.max(1, Math.ceil(input.length * ratio));
  const cutoff = Math.min(1, ratio);
  const output = new Float64Array(outputLength);

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const center = outputIndex / ratio;
    const left = Math.ceil(center - filterHalfLength);
    const right = Math.floor(center + filterHalfLength);
    let sum = 0;
    let normalizer = 0;
    for (let sampleIndex = left; sampleIndex <= right; sampleIndex += 1) {
      if (sampleIndex < 0 || sampleIndex >= input.length) {
        continue;
      }
      const distance = center - sampleIndex;
      const windowPosition = distance / filterHalfLength;
      const window = 0.5 + 0.5 * Math.cos(Math.PI * windowPosition);
      const kernel = cutoff * sinc(cutoff * distance) * window;
      sum += (input[sampleIndex] ?? 0) * kernel;
      normalizer += kernel;
    }
    output[outputIndex] = normalizer !== 0 ? sum / normalizer : 0;
  }

  return output;
}
