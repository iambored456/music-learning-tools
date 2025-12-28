/**
 * Proximity Graph
 *
 * Algorithm for finding point connections based on proximity threshold.
 */

import type { RenderablePoint } from './types.js';

/**
 * A connection between two points, represented as index pairs.
 */
export type Connection = [number, number];

/**
 * Find point pairs within the proximity threshold.
 * Uses Euclidean distance and limits connections per point.
 *
 * @param points - Array of renderable points
 * @param proximityThreshold - Maximum distance in pixels for connection
 * @param maxConnections - Maximum connections per point
 * @returns Array of [index1, index2] pairs to connect
 */
export function findConnections(
  points: RenderablePoint[],
  proximityThreshold: number,
  maxConnections: number
): Connection[] {
  const connections: Connection[] = [];

  for (let i = 0; i < points.length; i++) {
    let connectionCount = 0;

    for (
      let j = i + 1;
      j < points.length && connectionCount < maxConnections;
      j++
    ) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= proximityThreshold) {
        connections.push([i, j]);
        connectionCount++;
      }
    }
  }

  return connections;
}
