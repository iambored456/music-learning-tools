import { pick } from './music.ts';

/** Pitches are semitones above the tonic in register 0 (octave * 12 + degree). */
export const MAX_MELODY_LEAP = 12;
export const EARLY_MELODY_DEGREES = [[0, 4], [0, 4, 7], [0, 2, 4, 7]] as const;
export type MelodyContour = 'ascending' | 'descending' | 'turning' | 'constant';
const contours: MelodyContour[] = ['ascending', 'descending', 'turning', 'constant'];

export const melodySpan = (notes: readonly number[]) => Math.max(...notes) - Math.min(...notes);
export function melodyContour(notes: readonly number[]): MelodyContour {
  const differences = notes.slice(1).map((note, i) => note - notes[i]);
  const up = differences.some(d => d > 0), down = differences.some(d => d < 0);
  return up && down ? 'turning' : up ? 'ascending' : down ? 'descending' : 'constant';
}
function pitchPool(degrees: readonly number[], octaves: readonly number[]): number[] {
  return octaves.flatMap(octave => degrees.map(degree => octave * 12 + degree)).sort((a, b) => a - b);
}

/** Exhaustive short libraries only; never enumerate the exponentially larger long melodies. */
export function enumerateMelodies(degrees: readonly number[], octaves: readonly number[], length = 3): number[][] {
  if (!Number.isInteger(length) || length < 1 || length > 3) throw new Error('Libraries support one to three notes.');
  const pool = pitchPool(degrees, octaves), result: number[][] = [];
  function visit(notes: number[]) {
    if (notes.length === length) { result.push(notes); return; }
    for (const pitch of pool) {
      if (!notes.length || Math.abs(pitch - notes[notes.length - 1]) <= MAX_MELODY_LEAP) visit([...notes, pitch]);
    }
  }
  visit([]);
  return result;
}

const libraries = new Map<string, readonly (readonly number[])[]>();
function earlyLibrary(degrees: readonly number[], octaves: readonly number[], length: number) {
  if (length > 3 || !EARLY_MELODY_DEGREES.some(level => level.join(',') === degrees.join(','))) return null;
  const key = `${degrees}/${octaves}/${length}`;
  if (!libraries.has(key)) libraries.set(key, enumerateMelodies(degrees, octaves, length));
  return libraries.get(key)!;
}

interface SelectionHistory {
  used: Set<string>;
  count: number;
  contour: [number, number];
}

/** One instance per session. Replays never consume another pattern. */
export class MelodySampler {
  private history = new Map<string, SelectionHistory>();

  next(degrees: readonly number[], octaves: readonly number[], length: number, tonic: number, random: () => number): number[] {
    const key = `${degrees}/${octaves}/${length}/${tonic}`;
    let history = this.history.get(key);
    if (!history) {
      history = { used: new Set(), count: 0, contour: [0, 0] };
      this.history.set(key, history);
    }
    // Bound the history for indefinite Pocket sessions; scored sessions have at most 100 questions.
    if (history.used.size >= 1000) history.used.clear();
    const pool = pitchPool(degrees, octaves);
    const library = earlyLibrary(degrees, octaves, length);
    const preferWide = length > 1 && octaves.length > 1 && history.count % 2 === 0;
    const select = (wide: boolean): number[] | null => {
      if (library) {
        const available = library.filter(notes => (melodySpan(notes) >= 12) === wide && !history!.used.has(notes.join(',')));
        const band = wide ? 1 : 0;
        for (let offset = 0; offset < contours.length; offset++) {
          const index = (history!.contour[band] + offset) % contours.length;
          const candidates = available.filter(notes => melodyContour(notes) === contours[index]);
          if (candidates.length) {
            history!.contour[band] = index + 1;
            return [...pick(candidates, random)];
          }
        }
        return null;
      }
      // Explore pitches in a weighted random order, stopping at the first unused valid path.
      // Backtracking also works with a constant injected RNG and when a small pool is exhausted.
      const visit = (notes: number[]): number[] | null => {
        if (notes.length === length) return (melodySpan(notes) >= 12) === wide && !history!.used.has(notes.join(',')) ? notes : null;
        const previous = notes.at(-1);
        const allowed = pool.filter(pitch => (previous === undefined || Math.abs(pitch - previous) <= MAX_MELODY_LEAP)
          && (wide || melodySpan([...notes, pitch]) < 12));
        const nearby = allowed.filter(pitch => previous !== undefined && pitch !== previous && Math.abs(pitch - previous) <= 4);
        if (!allowed.length) return null;
        const first = pick(nearby.length && random() < 0.7 ? nearby : allowed, random);
        const rest = allowed.filter(pitch => pitch !== first);
        // Shuffle remaining branches so failed/used paths do not bias the fallback toward low notes.
        for (let i = rest.length - 1; i > 0; i--) {
          const chosen = pick(Array.from({ length: i + 1 }, (_, index) => index), random);
          [rest[i], rest[chosen]] = [rest[chosen], rest[i]];
        }
        for (const pitch of [first, ...rest]) {
          const found = visit([...notes, pitch]);
          if (found) return found;
        }
        return null;
      };
      return visit([]);
    };
    let notes = select(preferWide) ?? select(!preferWide);
    if (!notes) {
      history.used.clear(); // All possible patterns for this key/range/length have been heard.
      notes = select(preferWide) ?? select(!preferWide);
    }
    if (!notes) throw new Error('Select at least one pitch to practise.');
    history.used.add(notes.join(','));
    history.count++;
    return notes;
  }
}
