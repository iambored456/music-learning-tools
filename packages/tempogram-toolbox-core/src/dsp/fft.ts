import type { ComplexVector } from "../types.js";
import { TAU, assert, isPowerOfTwo } from "../utils/math.js";

function bitReverse(value: number, bits: number): number {
  let reversed = 0;
  for (let bit = 0; bit < bits; bit += 1) {
    reversed = (reversed << 1) | (value & 1);
    value >>= 1;
  }
  return reversed;
}

export function fft(realInput: ArrayLike<number>, imagInput?: ArrayLike<number>): ComplexVector {
  const size = realInput.length;
  assert(size > 0, "FFT input must be non-empty");
  const real = Float64Array.from(realInput);
  const imag = imagInput ? Float64Array.from(imagInput) : new Float64Array(size);

  if (!isPowerOfTwo(size)) {
    return dft(real, imag);
  }

  const bits = Math.log2(size);
  for (let index = 0; index < size; index += 1) {
    const reversed = bitReverse(index, bits);
    if (reversed > index) {
      const realValue = real[index]!;
      const imagValue = imag[index]!;
      real[index] = real[reversed]!;
      imag[index] = imag[reversed]!;
      real[reversed] = realValue;
      imag[reversed] = imagValue;
    }
  }

  for (let blockSize = 2; blockSize <= size; blockSize <<= 1) {
    const halfBlock = blockSize >> 1;
    for (let blockStart = 0; blockStart < size; blockStart += blockSize) {
      for (let offset = 0; offset < halfBlock; offset += 1) {
        const angle = (-TAU * offset) / blockSize;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const evenIndex = blockStart + offset;
        const oddIndex = evenIndex + halfBlock;

        const oddReal = real[oddIndex]!;
        const oddImag = imag[oddIndex]!;
        const twiddledReal = cosine * oddReal - sine * oddImag;
        const twiddledImag = sine * oddReal + cosine * oddImag;

        const evenReal = real[evenIndex]!;
        const evenImag = imag[evenIndex]!;
        real[evenIndex] = evenReal + twiddledReal;
        imag[evenIndex] = evenImag + twiddledImag;
        real[oddIndex] = evenReal - twiddledReal;
        imag[oddIndex] = evenImag - twiddledImag;
      }
    }
  }

  return { real, imag };
}

function dft(realInput: ArrayLike<number>, imagInput: ArrayLike<number>): ComplexVector {
  const size = realInput.length;
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  for (let k = 0; k < size; k += 1) {
    let sumReal = 0;
    let sumImag = 0;
    for (let n = 0; n < size; n += 1) {
      const angle = (-TAU * k * n) / size;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const inputReal = realInput[n] ?? 0;
      const inputImag = imagInput[n] ?? 0;
      sumReal += inputReal * cosine - inputImag * sine;
      sumImag += inputReal * sine + inputImag * cosine;
    }
    real[k] = sumReal;
    imag[k] = sumImag;
  }
  return { real, imag };
}
