"""Extract the labelled, monophonic Ladukhin lines into source data.

Usage: python scripts/import-ladukhin.py path/to/score.musicxml
Only score data is read; document text is never interpreted as instructions.
"""
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

score = ET.parse(sys.argv[1]).getroot()
expected = [*range(1, 13), *range(51, 63), *range(101, 113)]
parts = score.findall('part')
assert len(parts) == 1, 'Expected a single monophonic part'
rows = []
divisions = 1
meter = '2/4'
steps = dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)
for measure in parts[0].findall('measure'):
    assert not any(measure.findall(tag) for tag in ('backup', 'forward')), 'Unsupported polyphony'
    attributes = measure.find('attributes')
    if attributes is not None:
        divisions = int(attributes.findtext('divisions', str(divisions)))
        assert attributes.findtext('key/fifths', '0') == '0', 'Expected C major'
        time = attributes.find('time')
        if time is not None:
            meter = f"{time.findtext('beats')}/{time.findtext('beat-type')}"
    label = measure.findtext('direction/direction-type/rehearsal')
    if label:
        rows.append(dict(number=int(label), meter=meter, durationBeats=0, barlines=[], notes=[]))
    assert rows, 'Missing initial exercise label'
    row = rows[-1]
    row['barlines'].append(row['durationBeats'])
    for note in measure.findall('note'):
        assert note.find('chord') is None and note.find('tie') is None, 'Unsupported chord or tie'
        duration = int(note.findtext('duration')) / divisions
        pitch = note.find('pitch')
        midi = None if pitch is None else (int(pitch.findtext('octave')) + 1) * 12 + steps[pitch.findtext('step')] + int(pitch.findtext('alter', '0'))
        row['notes'].append(dict(beat=row['durationBeats'], durationBeats=duration, midi=midi))
        row['durationBeats'] += duration
assert [row['number'] for row in rows] == expected, 'Unexpected exercise labels'
output = Path(__file__).resolve().parents[1] / 'packages/singing-trainer-core/src/lib/constants/ladukhin.ts'
header = '''// Extracted from Ladukhin Elementary Solfege Course.musicxml by scripts/import-ladukhin.py.
// Durations and onsets are in quarter-note beats; null MIDI denotes a rest.
export interface SolfegeLine {
  number: number;
  meter: string;
  durationBeats: number;
  barlines: number[];
  notes: { beat: number; durationBeats: number; midi: number | null }[];
}
export const ladukhinLines: SolfegeLine[] = '''
output.write_text(header + '[\n' + ',\n'.join('  ' + json.dumps(row) for row in rows) + '\n];\n', encoding='utf-8')
print(f'Extracted {len(rows)} lines, {sum(len(r["notes"]) for r in rows)} notes/rests.')
