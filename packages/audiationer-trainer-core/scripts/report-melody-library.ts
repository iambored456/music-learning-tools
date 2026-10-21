import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EARLY_MELODY_DEGREES, enumerateMelodies, melodyContour, melodySpan } from '../src/melodyLibrary.ts';
import { degreeLabel } from '../src/music.ts';

const directory = new URL('../reports/', import.meta.url);
const target = new URL('major-i-iii-melody-enumerations.md', directory);
const names = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const pitchName = (pitch: number) => `${names[pitch % 12]}${Math.floor(pitch / 12)}`;
const levels = ['Major I', 'Major II', 'Major III'];
const sections: string[] = [];
const summary: string[] = [];

for (const [index, degrees] of EARLY_MELODY_DEGREES.entries()) {
  for (const octaves of [[3, 4], [3, 4, 5]]) {
    const library = enumerateMelodies(degrees, octaves);
    const raw = (degrees.length * octaves.length) ** 3;
    const wide = library.filter(notes => melodySpan(notes) >= 12).length;
    summary.push(`| ${levels[index]} | ${degrees.map(d => names[d]).join(', ')} | ${octaves.length} | ${raw} | ${library.length} | ${raw - library.length} | ${wide} |`);
    sections.push(`## ${levels[index]} — ${octaves.length} octaves`, '',
      `Available pitches: ${octaves.flatMap(octave => degrees.map(degree => pitchName(octave * 12 + degree))).join(', ')}.`, '',
      `${library.length} accepted melodies: ${library.length - wide} with a span below 12 semitones, ${wide} with a span of 12 semitones or more.`, '',
      '| ID | Melody in C | Answer degrees | Offsets from C3 | Contour | Span (semitones) |',
      '| --- | --- | --- | --- | --- | ---: |');
    for (const [i, notes] of library.entries()) {
      sections.push(`| M${index + 1}-${octaves.length}O-${String(i + 1).padStart(4, '0')} | ${notes.map(pitchName).join(' → ')} | ${notes.map(pitch => degreeLabel(pitch % 12, '1')).join(' · ')} | ${notes.map(pitch => pitch - 36).join(', ')} | ${melodyContour(notes)} | ${melodySpan(notes)} |`);
    }
    sections.push('');
  }
}

const report = [
  '# Major I–III: complete three-note melody enumerations', '',
  'This document lists every accepted three-note pattern used by the multi-octave libraries for Major I, II and III. C is the reference tonic. The same relative patterns transpose into any key. Each row is an available question, not a promise of uniform sampling or a prescribed lesson order.', '',
  '## Rules and interpretation', '',
  '- Major I uses degrees 1 and 3; Major II uses 1, 3 and 5; Major III uses 1, 2, 3 and 5.',
  '- The two-octave range uses tonic registers 3–4; three octaves uses 3–5. Every note may use any enabled register.',
  '- Every ordered combination is included unless an adjacent leap exceeds 12 semitones. Repeated pitches, repeated degrees in different registers, and an overall span larger than 12 are allowed.',
  '- E4 → C4 → E3 is included in all six libraries: its adjacent movements are −4 and −8 semitones; its overall span is 12.',
  '- A melody such as C3 → C4 → C5 is permitted with three octaves: both adjacent leaps are 12, and the overall span is 24.',
  '- Offsets are semitones above C3. For another tonic, add the offsets to that tonic in register 3. Scientific note names can cross a C boundary when transposed; the selected registers are tonic-relative.',
  '- Ascending/descending contours permit repeated adjacent pitches; turning means both upward and downward movement; constant means all three pitches are identical.',
  '- For each key, selection alternates spans below 12 and spans of at least 12 while both have unused patterns. Within each span group, selection rotates available ascending, descending, turning and constant contour groups, then picks randomly within that group.',
  '- Exact pitched patterns do not repeat in the same key/range/length until all patterns have been used. If a preferred group is exhausted, another unused group supplies the question. Library exhaustion starts another cycle; indefinite Pocket history also resets at 1,000 patterns per context.',
  '- These same early vocabularies also use enumerated libraries at length 2 (not individually listed here). Other vocabularies and lengths 4–8 use constrained pitch generation with the same range, leap, span-alternation and no-repeat rules. Pocket length 1 is supported but cannot span registers within one question.',
  '- One-octave practice retains the existing degree generator in register 4. Its three-note possibilities are 8, 27 and 64 respectively; it does not use these multi-octave libraries.',
  '- Repeats and answer review retain each note’s original register. A review octave change transposes the whole melody. Results record per-note tonic registers; scoring still asks only for degree sequences.', '',
  '## Summary', '',
  '| Level | Notes | Registers | Unfiltered combinations | Accepted | Rejected (>12 adjacent leap) | Span ≥12 |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: |', ...summary, '',
  'The complete inventories below are sorted by first pitch, then second, then third. IDs are stable for these vocabularies and ordering. They are report labels, not persisted app identifiers.', '',
  ...sections,
  '## Reproduction', '',
  'Run from the repository root:', '',
  '```sh', 'pnpm exec tsx packages/audiationer-trainer-core/scripts/report-melody-library.ts', '```', '',
  'The report reads the same enumeration and classification functions used by the running question generator; it does not maintain a second list. Filtering and playback behavior are tested in `tests/melodyLibrary.test.ts`.', '',
].join('\n');
mkdirSync(directory, { recursive: true });
writeFileSync(target, report, 'utf8');
console.log(`Saved ${fileURLToPath(target)}`);
console.log(summary.join('\n'));
