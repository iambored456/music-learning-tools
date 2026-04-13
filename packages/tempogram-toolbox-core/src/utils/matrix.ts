import type { ComplexMatrix, RealMatrix } from "../types.js";

export function createRealMatrix(rows: number, cols: number, fillValue = 0): RealMatrix {
  const matrix: RealMatrix = [];
  for (let row = 0; row < rows; row += 1) {
    const values = new Float64Array(cols);
    if (fillValue !== 0) {
      values.fill(fillValue);
    }
    matrix.push(values);
  }
  return matrix;
}

export function createComplexMatrix(rows: number, cols: number): ComplexMatrix {
  return {
    real: createRealMatrix(rows, cols),
    imag: createRealMatrix(rows, cols),
  };
}

export function magnitudeMatrix(matrix: ComplexMatrix): RealMatrix {
  const rows = matrix.real.length;
  const cols = rows === 0 ? 0 : matrix.real[0]!.length;
  const output = createRealMatrix(rows, cols);
  for (let row = 0; row < rows; row += 1) {
    const realRow = matrix.real[row]!;
    const imagRow = matrix.imag[row]!;
    const outputRow = output[row]!;
    for (let col = 0; col < cols; col += 1) {
      outputRow[col] = Math.hypot(realRow[col]!, imagRow[col]!);
    }
  }
  return output;
}

export function maxValueInRealMatrix(matrix: RealMatrix): number {
  let maxValue = Number.NEGATIVE_INFINITY;
  for (const row of matrix) {
    for (let col = 0; col < row.length; col += 1) {
      const value = row[col]!;
      if (value > maxValue) {
        maxValue = value;
      }
    }
  }
  return maxValue;
}

export function sumRowsByColumn(matrix: RealMatrix): Float64Array {
  const cols = matrix.length === 0 ? 0 : matrix[0]!.length;
  const output = new Float64Array(cols);
  for (const row of matrix) {
    for (let col = 0; col < cols; col += 1) {
      output[col] = output[col]! + row[col]!;
    }
  }
  return output;
}

export function meanRowsByColumn(matrix: RealMatrix): Float64Array {
  if (matrix.length === 0) {
    return new Float64Array(0);
  }
  const output = sumRowsByColumn(matrix);
  const scale = 1 / matrix.length;
  for (let index = 0; index < output.length; index += 1) {
    output[index] = output[index]! * scale;
  }
  return output;
}

export function multiplyComplexMatrixInPlace(matrix: ComplexMatrix, scalar: number): ComplexMatrix {
  for (let row = 0; row < matrix.real.length; row += 1) {
    const realRow = matrix.real[row]!;
    const imagRow = matrix.imag[row]!;
    for (let col = 0; col < realRow.length; col += 1) {
      realRow[col] = realRow[col]! * scalar;
      imagRow[col] = imagRow[col]! * scalar;
    }
  }
  return matrix;
}
