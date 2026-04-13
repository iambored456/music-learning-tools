export const TAU = Math.PI * 2;

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sumArray(values: ArrayLike<number>): number {
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index] ?? 0;
  }
  return sum;
}

export function meanArray(values: ArrayLike<number>): number {
  return values.length === 0 ? 0 : sumArray(values) / values.length;
}

export function maxArray(values: ArrayLike<number>): number {
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? Number.NEGATIVE_INFINITY;
    if (value > max) {
      max = value;
    }
  }
  return max;
}

export function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export function sinc(value: number): number {
  if (Math.abs(value) < 1e-12) {
    return 1;
  }
  const scaled = Math.PI * value;
  return Math.sin(scaled) / scaled;
}

export function matlabRound(value: number): number {
  return Math.round(value);
}

export function range(start: number, stopInclusive: number, step = 1): Float64Array {
  assert(step !== 0, "step must be non-zero");
  const values: number[] = [];
  if (step > 0) {
    for (let value = start; value <= stopInclusive + 1e-12; value += step) {
      values.push(value);
    }
  } else {
    for (let value = start; value >= stopInclusive - 1e-12; value += step) {
      values.push(value);
    }
  }
  return Float64Array.from(values);
}

export function nearestIndex(values: ArrayLike<number>, target: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < values.length; index += 1) {
    const distance = Math.abs((values[index] ?? 0) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

export function standardDeviation(values: ArrayLike<number>): number {
  if (values.length === 0) {
    return 0;
  }
  const mean = meanArray(values);
  let variance = 0;
  for (let index = 0; index < values.length; index += 1) {
    const delta = (values[index] ?? 0) - mean;
    variance += delta * delta;
  }
  return Math.sqrt(variance / values.length);
}

export function median(values: ArrayLike<number>): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = Array.from(values, (value) => value ?? 0).sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[midpoint - 1] ?? 0) + (sorted[midpoint] ?? 0)) / 2;
  }
  return sorted[midpoint] ?? 0;
}

export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}
