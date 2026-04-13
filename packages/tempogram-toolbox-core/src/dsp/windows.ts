import { assert } from "../utils/math.js";

export function hann(length: number): Float64Array {
  assert(length > 0, "window length must be positive");
  if (length === 1) {
    return Float64Array.of(1);
  }

  const window = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    window[index] = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (length - 1));
  }
  return window;
}
