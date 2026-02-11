import { importMusicXML } from './importMusicXML.js';

function singlePartScore(measuresXml: string, partId = 'P1', partName = 'Voice'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Fixture Song</work-title></work>
  <part-list>
    <score-part id="${partId}">
      <part-name>${partName}</part-name>
    </score-part>
  </part-list>
  <part id="${partId}">
    ${measuresXml}
  </part>
</score-partwise>`;
}

describe('importMusicXML', () => {
  it('imports single part / single voice / no tuplets', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
        </attributes>
        <direction><sound tempo="100"/></direction>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
        <note>
          <pitch><step>D</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
        <note>
          <rest/>
          <duration>2</duration>
          <voice>1</voice>
        </note>
      </measure>
    `);

    const result = importMusicXML(xml);
    expect(result.warnings).toHaveLength(0);
    expect(result.exercise.key).toEqual({ fifths: 0, mode: 'major' });
    expect(result.exercise.meter).toEqual({ beats: 4, beatType: 4 });
    expect(result.exercise.tempoBpm).toBe(100);

    expect(result.exercise.streams).toHaveLength(1);
    expect(result.exercise.streams[0].streamId).toBe('P1:1');
    expect(result.exercise.streams[0].events).toEqual([
      { type: 'note', t: 0, dur: 480, deg: 1, alt: 0, oct: 0 },
      { type: 'note', t: 480, dur: 480, deg: 2, alt: 0, oct: 0 },
      { type: 'rest', t: 960, dur: 480 },
    ]);
  });

  it('imports single part with two voices into two streams', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
        <note>
          <pitch><step>G</step><octave>3</octave></pitch>
          <duration>4</duration>
          <voice>2</voice>
        </note>
        <note>
          <pitch><step>D</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
      </measure>
    `);

    const result = importMusicXML(xml);
    const stream1 = result.exercise.streams.find((stream) => stream.streamId === 'P1:1');
    const stream2 = result.exercise.streams.find((stream) => stream.streamId === 'P1:2');
    expect(stream1).toBeDefined();
    expect(stream2).toBeDefined();

    expect(stream1!.events).toEqual([
      { type: 'note', t: 0, dur: 480, deg: 1, alt: 0, oct: 0 },
      { type: 'note', t: 480, dur: 480, deg: 2, alt: 0, oct: 0 },
    ]);

    expect(stream2!.events).toEqual([{ type: 'note', t: 0, dur: 960, deg: 5, alt: 0, oct: -1 }]);
  });

  it('ignores staff while using voice for stream identity', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <staff>1</staff>
        </note>
        <note>
          <pitch><step>D</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <staff>2</staff>
        </note>
      </measure>
    `);

    const result = importMusicXML(xml);
    expect(result.exercise.streams).toHaveLength(1);
    expect(result.exercise.streams[0].streamId).toBe('P1:1');
    expect(result.exercise.streams[0].events).toHaveLength(2);
    expect(result.warnings.some((warning) => warning.code === 'STAFF_IGNORED')).toBe(true);
  });

  it('supports triplets from <time-modification>', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>6</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>3</duration>
          <voice>1</voice>
          <time-modification>
            <actual-notes>3</actual-notes>
            <normal-notes>2</normal-notes>
          </time-modification>
        </note>
        <note>
          <pitch><step>D</step><octave>4</octave></pitch>
          <duration>3</duration>
          <voice>1</voice>
          <time-modification>
            <actual-notes>3</actual-notes>
            <normal-notes>2</normal-notes>
          </time-modification>
        </note>
        <note>
          <pitch><step>E</step><octave>4</octave></pitch>
          <duration>3</duration>
          <voice>1</voice>
          <time-modification>
            <actual-notes>3</actual-notes>
            <normal-notes>2</normal-notes>
          </time-modification>
        </note>
      </measure>
    `);

    const result = importMusicXML(xml);
    expect(result.exercise.streams[0].events).toEqual([
      { type: 'note', t: 0, dur: 160, deg: 1, alt: 0, oct: 0 },
      { type: 'note', t: 160, dur: 160, deg: 2, alt: 0, oct: 0 },
      { type: 'note', t: 320, dur: 160, deg: 3, alt: 0, oct: 0 },
    ]);
  });

  it('attaches slur start and stop phrase ids to notes', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <notations><slur type="start" number="7"/></notations>
        </note>
        <note>
          <pitch><step>D</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <notations><slur type="stop" number="7"/></notations>
        </note>
      </measure>
    `);

    const result = importMusicXML(xml);
    const events = result.exercise.streams[0].events;
    expect(events[0]).toEqual({
      type: 'note',
      t: 0,
      dur: 480,
      deg: 1,
      alt: 0,
      oct: 0,
      slurStarts: ['P1:slur:7:1'],
    });
    expect(events[1]).toEqual({
      type: 'note',
      t: 480,
      dur: 480,
      deg: 2,
      alt: 0,
      oct: 0,
      slurStops: ['P1:slur:7:1'],
    });
  });

  it('imports lyrics on notes', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <lyric><text>la</text></lyric>
        </note>
        <note>
          <pitch><step>D</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <lyric><text>di</text></lyric>
        </note>
      </measure>
    `);

    const result = importMusicXML(xml);
    expect(result.exercise.streams[0].events).toEqual([
      { type: 'note', t: 0, dur: 480, deg: 1, alt: 0, oct: 0, lyric: 'la' },
      { type: 'note', t: 480, dur: 480, deg: 2, alt: 0, oct: 0, lyric: 'di' },
    ]);
  });

  it('merges tied notes into one sustained event', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <tie type="start"/>
        </note>
      </measure>
      <measure number="2">
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
          <tie type="stop"/>
        </note>
      </measure>
    `);

    const result = importMusicXML(xml);
    expect(result.exercise.streams[0].events).toEqual([
      { type: 'note', t: 0, dur: 960, deg: 1, alt: 0, oct: 0 },
    ]);
  });

  it('throws on unsupported chords', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
        <note>
          <chord/>
          <pitch><step>E</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
      </measure>
    `);

    expect(() => importMusicXML(xml)).toThrow(/Chords are not supported/i);
  });

  it('throws on grace notes', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
        </attributes>
        <note>
          <grace/>
          <pitch><step>C</step><octave>4</octave></pitch>
          <voice>1</voice>
        </note>
      </measure>
    `);

    expect(() => importMusicXML(xml)).toThrow(/Grace notes are not supported/i);
  });

  it('throws on non-integer alter values', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>major</mode></key>
        </attributes>
        <note>
          <pitch><step>C</step><alter>0.5</alter><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
      </measure>
    `);

    expect(() => importMusicXML(xml)).toThrow(/Microtonal alter/i);
  });

  it('throws on non-major mode by default, and can coerce with option', () => {
    const xml = singlePartScore(`
      <measure number="1">
        <attributes>
          <divisions>2</divisions>
          <key><fifths>0</fifths><mode>minor</mode></key>
        </attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>2</duration>
          <voice>1</voice>
        </note>
      </measure>
    `);

    expect(() => importMusicXML(xml)).toThrow(/Unsupported key mode/i);

    const coerced = importMusicXML(xml, { allowModeOtherThanMajor: true });
    expect(coerced.exercise.key.mode).toBe('major');
    expect(coerced.warnings.some((warning) => warning.code === 'MODE_COERCED_TO_MAJOR')).toBe(true);
  });
});
