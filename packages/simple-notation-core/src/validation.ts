import {
  BLOCK_MICROBEAT_CAPACITIES,
  MAX_ROW_WIDTH_MICROBEATS,
  MIN_MEASURE_MICROBEATS,
} from './constants.js';
import type { BlockType, MacrobeatBlock, BlockValidationInput } from './types.js';

function blockCapacity(type: BlockType): number {
  return BLOCK_MICROBEAT_CAPACITIES[type] ?? 0;
}

function findDirectlyPrecedingBlock(blocks: MacrobeatBlock[], microbeatPosition: number): MacrobeatBlock | null {
  for (const block of blocks) {
    if (block.position + blockCapacity(block.type) === microbeatPosition) {
      return block;
    }
  }

  return null;
}

function findCurrentMeasureStartPosition(
  blocks: MacrobeatBlock[],
  searchStartPosition: number,
  actualMaxRowWidth: number,
): number {
  let measureStart = 0;

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];

    if (block.position > searchStartPosition) {
      continue;
    }

    if (block.type.endsWith('S')) {
      measureStart = block.position;
      break;
    }

    if (block.type.endsWith('E')) {
      measureStart = block.position + blockCapacity(block.type);
      if (measureStart < actualMaxRowWidth) {
        measureStart += 1;
      }
      break;
    }
  }

  return measureStart;
}

function hasOverlap(blocks: MacrobeatBlock[], start: number, endInclusive: number): boolean {
  for (const block of blocks) {
    const existingStart = block.position;
    const existingEnd = existingStart + blockCapacity(block.type) - 1;

    if (Math.max(existingStart, start) <= Math.min(existingEnd, endInclusive)) {
      return true;
    }
  }

  return false;
}

function calculateMeasureLengthIfEnding(
  sortedBlocks: MacrobeatBlock[],
  directlyPrecedingBlock: MacrobeatBlock | null,
  currentMeasureStart: number,
  endingBlockType: BlockType,
): number {
  let measureLength = blockCapacity(endingBlockType);
  let cursor: MacrobeatBlock | null = directlyPrecedingBlock;

  while (cursor && cursor.position >= currentMeasureStart) {
    measureLength += blockCapacity(cursor.type);

    if (cursor.type.endsWith('S') && cursor.position === currentMeasureStart) {
      break;
    }

    const previousAdjacent = sortedBlocks
      .slice()
      .reverse()
      .find((candidate) => {
        if (candidate.position < currentMeasureStart) {
          return false;
        }

        return candidate.position + blockCapacity(candidate.type) === cursor!.position;
      });

    cursor = previousAdjacent ?? null;
  }

  return measureLength;
}

export function validateBlockPlacement(input: BlockValidationInput): boolean {
  const { rowBlocks, blockType, microbeatPosition, rowMaxMicrobeats } = input;
  const capacity = blockCapacity(blockType);

  if (!capacity) return false;
  if (microbeatPosition < 0) return false;

  const actualMaxRowWidth = Math.min(MAX_ROW_WIDTH_MICROBEATS, rowMaxMicrobeats);

  let blockEffectiveEnd = microbeatPosition + capacity;
  if (blockType.endsWith('E') && microbeatPosition + capacity < actualMaxRowWidth) {
    blockEffectiveEnd += 1;
  }

  if (blockEffectiveEnd > actualMaxRowWidth) {
    return false;
  }

  const newStart = microbeatPosition;
  const newEnd = newStart + capacity - 1;

  if (hasOverlap(rowBlocks, newStart, newEnd)) {
    return false;
  }

  const sortedBlocks = [...rowBlocks].sort((a, b) => a.position - b.position);
  const directlyPrecedingBlock = findDirectlyPrecedingBlock(sortedBlocks, microbeatPosition);

  const searchStart = directlyPrecedingBlock ? directlyPrecedingBlock.position : microbeatPosition;
  const currentMeasureStart = findCurrentMeasureStartPosition(sortedBlocks, searchStart, actualMaxRowWidth);

  if (microbeatPosition === currentMeasureStart) {
    if (!blockType.endsWith('S')) {
      return false;
    }
  } else {
    if (blockType.endsWith('S')) {
      return false;
    }

    if (!directlyPrecedingBlock) {
      return false;
    }

    if (directlyPrecedingBlock.type.endsWith('E')) {
      return false;
    }
  }

  if (blockType.endsWith('E')) {
    const measureLength = calculateMeasureLengthIfEnding(
      sortedBlocks,
      directlyPrecedingBlock,
      currentMeasureStart,
      blockType,
    );

    if (measureLength < MIN_MEASURE_MICROBEATS) {
      return false;
    }
  }

  return true;
}
