export function correlateSame1D(signal: ArrayLike<number>, kernel: ArrayLike<number>): Float64Array {
  const output = new Float64Array(signal.length);
  const center = Math.floor(kernel.length / 2);
  for (let index = 0; index < signal.length; index += 1) {
    let sum = 0;
    for (let tap = 0; tap < kernel.length; tap += 1) {
      const sourceIndex = index + tap - center;
      if (sourceIndex >= 0 && sourceIndex < signal.length) {
        sum += (signal[sourceIndex] ?? 0) * (kernel[tap] ?? 0);
      }
    }
    output[index] = sum;
  }
  return output;
}

export function replicatePad1D(signal: ArrayLike<number>, padWidth: number): Float64Array {
  const padded = new Float64Array(signal.length + padWidth * 2);
  const leftValue = signal[0] ?? 0;
  const rightValue = signal[signal.length - 1] ?? 0;
  padded.fill(leftValue, 0, padWidth);
  for (let index = 0; index < signal.length; index += 1) {
    padded[padWidth + index] = signal[index] ?? 0;
  }
  padded.fill(rightValue, padWidth + signal.length);
  return padded;
}
