import { XMLParser } from 'fast-xml-parser';
import type {
  ImportOptions,
  ImportResult,
  ImportWarning,
  ImportWarningCode,
  RelativeDegree,
  RelativeEvent,
  RelativeExercise,
  RelativeStream,
} from './types.js';

type AnyObject = Record<string, unknown>;

type NormalizedOptions = {
  ppq: number;
  defaultTempoBpm?: number;
  assumeMajorIfModeMissing: boolean;
  allowModeOtherThanMajor: boolean;
  tupletSupport: 'triplets-only' | 'none' | 'basic';
};

type ParseContext = {
  partId?: string;
  measure?: string;
  voiceId?: string;
};

type InternalNoteEvent = {
  type: 'note';
  t: number;
  dur: number;
  midi: number;
  lyric?: string;
  slurStarts?: string[];
  slurStops?: string[];
};

type InternalRestEvent = {
  type: 'rest';
  t: number;
  dur: number;
};

type InternalEvent = InternalNoteEvent | InternalRestEvent;

type MutableStream = {
  streamId: string;
  partId: string;
  voiceId: string;
  name?: string;
  events: InternalEvent[];
  openTies: Map<string, InternalNoteEvent>;
  openTuplets: Set<string>;
};

type SlurState = {
  openByNumber: Map<string, string[]>;
  nextOccurrenceByNumber: Map<string, number>;
};

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const DEGREE_BASE_PCS: ReadonlyArray<{ deg: RelativeDegree; pc: number }> = [
  { deg: 1, pc: 0 },
  { deg: 2, pc: 2 },
  { deg: 3, pc: 4 },
  { deg: 4, pc: 5 },
  { deg: 5, pc: 7 },
  { deg: 6, pc: 9 },
  { deg: 7, pc: 11 },
];

const TONIC_REFERENCE_OCTAVE = 4;

export function importMusicXML(xml: string, opts: ImportOptions = {}): ImportResult {
  const options = normalizeOptions(opts);
  const warnings: ImportWarning[] = [];

  if (!xml || !xml.trim()) {
    throw new Error('MusicXML import error: input XML is empty.');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    ignoreDeclaration: true,
  });

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`MusicXML import error: XML parsing failed: ${message}`);
  }

  const root = asObject(parsed);
  const scorePartwise = asObject(root?.['score-partwise']);
  if (!scorePartwise) {
    throw new Error('MusicXML import error: only <score-partwise> MusicXML is supported.');
  }

  const title = extractTitle(scorePartwise);
  const partNameById = extractPartNames(scorePartwise);
  const partNodes = asArray<unknown>(scorePartwise.part)
    .map(asObject)
    .filter((node): node is AnyObject => Boolean(node));
  if (partNodes.length === 0) {
    throw new Error('MusicXML import error: score has no <part> elements.');
  }

  let key: { fifths: number; mode: 'major' } | undefined;
  let meter: { beats: number; beatType: number } | undefined;
  let tempoBpm: number | undefined;

  const streams: RelativeStream[] = [];

  partNodes.forEach((partNode, partIndex) => {
    const partId = readText(partNode['@_id'])?.trim() || `P${partIndex + 1}`;
    const partName = partNameById.get(partId);
    const measures = asArray<unknown>(partNode.measure)
      .map(asObject)
      .filter((node): node is AnyObject => Boolean(node));

    const streamsByVoice = new Map<string, MutableStream>();
    const voiceTicks = new Map<string, number>();
    const slurState: SlurState = {
      openByNumber: new Map(),
      nextOccurrenceByNumber: new Map(),
    };

    let currentDivisions: number | undefined;
    let currentMeter: { beats: number; beatType: number } | undefined;
    let measureStartTick = 0;
    let staffIgnoredWarningIssued = false;

    measures.forEach((measureNode, measureIndex) => {
      const measure = readText(measureNode['@_number'])?.trim() || String(measureIndex + 1);
      const measureContext: ParseContext = { partId, measure };

      const attributesNodes = asArray<unknown>(measureNode.attributes)
        .map(asObject)
        .filter((node): node is AnyObject => Boolean(node));
      attributesNodes.forEach((attributesNode) => {
        if (attributesNode.divisions !== undefined) {
          currentDivisions = parseInteger(attributesNode.divisions, 'divisions', measureContext, {
            min: 1,
          });
        }

        const keyNode = asObject(attributesNode.key);
        if (keyNode) {
          const parsedKey = parseKeyNode(keyNode, options, warnings, measureContext);
          if (!key) {
            key = parsedKey;
          } else if (key.fifths !== parsedKey.fifths || key.mode !== parsedKey.mode) {
            warn(warnings, 'KEY_CHANGE_IGNORED', 'Key changes are ignored after the first key.', {
              partId,
              measure,
            });
          }
        }

        const timeNode = asObject(attributesNode.time);
        if (timeNode) {
          const parsedMeter = parseMeterNode(timeNode, measureContext);
          currentMeter = parsedMeter;
          if (!meter) {
            meter = parsedMeter;
          } else if (meter.beats !== parsedMeter.beats || meter.beatType !== parsedMeter.beatType) {
            warn(
              warnings,
              'METER_CHANGE_IGNORED',
              'Meter changes are ignored after the first time signature.',
              { partId, measure }
            );
          }
        }
      });

      const detectedTempo = extractTempoFromMeasure(measureNode, measureContext);
      if (detectedTempo !== undefined) {
        if (tempoBpm === undefined) {
          tempoBpm = detectedTempo;
        } else if (!isNearlyEqual(tempoBpm, detectedTempo, 1e-6)) {
          warn(
            warnings,
            'TEMPO_CHANGE_IGNORED',
            'Tempo changes are ignored after the first tempo marking.',
            { partId, measure }
          );
        }
      }

      for (const [voiceId, tick] of voiceTicks.entries()) {
        if (tick < measureStartTick) {
          voiceTicks.set(voiceId, measureStartTick);
        }
      }

      const noteNodes = asArray<unknown>(measureNode.note)
        .map(asObject)
        .filter((node): node is AnyObject => Boolean(node));

      noteNodes.forEach((noteNode, noteIndex) => {
        if (!currentDivisions) {
          fail(
            { partId, measure },
            'Missing <divisions> before first note with duration in this part.'
          );
        }

        const voiceId = readText(noteNode.voice)?.trim() || '1';
        const streamId = `${partId}:${voiceId}`;
        let stream = streamsByVoice.get(voiceId);
        if (!stream) {
          stream = {
            streamId,
            partId,
            voiceId,
            name: partName,
            events: [],
            openTies: new Map(),
            openTuplets: new Set(),
          };
          streamsByVoice.set(voiceId, stream);
        }

        const t = voiceTicks.get(voiceId) ?? measureStartTick;
        const dur = processNote({
          noteNode,
          stream,
          t,
          partId,
          measure,
          voiceId,
          noteIndex,
          divisions: currentDivisions,
          ppq: options.ppq,
          options,
          warnings,
          slurState,
          onStaffIgnored: () => {
            if (staffIgnoredWarningIssued) return;
            staffIgnoredWarningIssued = true;
            warn(
              warnings,
              'STAFF_IGNORED',
              'Staff numbers are ignored. Streams are keyed by (partId, voiceId).',
              { partId, measure, voiceId }
            );
          },
        });

        voiceTicks.set(voiceId, t + dur);
      });

      let measureEndTick = measureStartTick;
      for (const tick of voiceTicks.values()) {
        if (tick > measureEndTick) {
          measureEndTick = tick;
        }
      }

      if (measureEndTick === measureStartTick) {
        const measureTicks = getNominalMeasureTicks(currentMeter ?? meter, options.ppq);
        if (measureTicks > 0) {
          measureEndTick += measureTicks;
        }
      }

      measureStartTick = measureEndTick;
    });

    for (const stream of streamsByVoice.values()) {
      if (stream.events.length === 0) continue;
      stream.events.sort((a, b) => a.t - b.t);
      streams.push({
        streamId: stream.streamId,
        partId: stream.partId,
        voiceId: stream.voiceId,
        name: stream.name,
        events: stream.events.map((event) => internalEventToRelativeEvent(event, key?.fifths)),
      });
    }
  });

  if (!key) {
    fail({}, 'No <key><fifths>...</fifths></key> was found in score attributes.');
  }

  if (tempoBpm === undefined && options.defaultTempoBpm !== undefined) {
    tempoBpm = options.defaultTempoBpm;
  }

  streams.sort((a, b) => a.streamId.localeCompare(b.streamId));

  const exercise: RelativeExercise = {
    id: buildExerciseId(title),
    title,
    source: { format: 'musicxml' },
    ppq: options.ppq,
    key,
    streams,
  };

  if (meter) {
    exercise.meter = meter;
  }

  if (tempoBpm !== undefined) {
    exercise.tempoBpm = tempoBpm;
  }

  return {
    exercise,
    warnings,
  };
}

function normalizeOptions(opts: ImportOptions): NormalizedOptions {
  const ppq = opts.ppq ?? 480;
  if (!Number.isInteger(ppq) || ppq <= 0) {
    throw new Error('MusicXML import error: option "ppq" must be a positive integer.');
  }

  if (opts.defaultTempoBpm !== undefined) {
    if (!Number.isFinite(opts.defaultTempoBpm) || opts.defaultTempoBpm <= 0) {
      throw new Error('MusicXML import error: option "defaultTempoBpm" must be > 0.');
    }
  }

  return {
    ppq,
    defaultTempoBpm: opts.defaultTempoBpm,
    assumeMajorIfModeMissing: opts.assumeMajorIfModeMissing ?? true,
    allowModeOtherThanMajor: opts.allowModeOtherThanMajor ?? false,
    tupletSupport: opts.tupletSupport ?? 'triplets-only',
  };
}

function processNote(args: {
  noteNode: AnyObject;
  stream: MutableStream;
  t: number;
  partId: string;
  measure: string;
  voiceId: string;
  noteIndex: number;
  divisions: number;
  ppq: number;
  options: NormalizedOptions;
  warnings: ImportWarning[];
  slurState: SlurState;
  onStaffIgnored: () => void;
}): number {
  const {
    noteNode,
    stream,
    t,
    partId,
    measure,
    voiceId,
    noteIndex,
    divisions,
    ppq,
    options,
    warnings,
    slurState,
    onStaffIgnored,
  } = args;
  const context: ParseContext = { partId, measure, voiceId };

  if (noteNode.staff !== undefined) {
    onStaffIgnored();
  }

  if (noteNode.chord !== undefined) {
    fail(
      context,
      `Chords are not supported (found <chord/> on note index ${noteIndex + 1} in measure).`
    );
  }

  if (noteNode.grace !== undefined) {
    fail(context, 'Grace notes are not supported.');
  }

  const durationRaw = noteNode.duration;
  if (durationRaw === undefined) {
    fail(context, 'Note is missing <duration>. Grace notes are not supported.');
  }
  const durationDivisions = parseInteger(durationRaw, 'duration', context, { min: 1 });

  updateTupletNestingState(noteNode, stream, warnings, context);
  const tupletRatio = getTupletRatio(noteNode, options, context);
  const durTicks = durationDivisionsToTicks(
    durationDivisions,
    divisions,
    ppq,
    tupletRatio,
    warnings,
    context
  );

  const { slurStarts, slurStops } = extractSlurMarkers(noteNode, slurState, warnings, context);
  const tieTypes = extractTieTypes(noteNode);
  const hasTieStart = tieTypes.has('start');
  const hasTieStop = tieTypes.has('stop');

  if (noteNode.rest !== undefined) {
    stream.events.push({
      type: 'rest',
      t,
      dur: durTicks,
    });
    return durTicks;
  }

  const midi = parsePitchToMidi(noteNode, context);
  const lyric = extractLyric(noteNode);
  const tieKey = String(midi);

  if (hasTieStop) {
    const existing = stream.openTies.get(tieKey);
    if (existing) {
      existing.dur += durTicks;
      if (lyric !== undefined) {
        if (existing.lyric === undefined) {
          existing.lyric = lyric;
        } else if (existing.lyric !== lyric) {
          warn(
            warnings,
            'UNSUPPORTED_NOTATION_IGNORED',
            'Ignored conflicting lyric on tied continuation note.',
            { partId, measure, voiceId }
          );
        }
      }
      mergeArrayProperty(existing, 'slurStarts', slurStarts);
      mergeArrayProperty(existing, 'slurStops', slurStops);
      if (!hasTieStart) {
        stream.openTies.delete(tieKey);
      }
      return durTicks;
    }

    warn(
      warnings,
      'TIE_STOP_WITHOUT_START',
      'Found tie stop with no active tie start; imported as a normal note.',
      { partId, measure, voiceId }
    );
  }

  const noteEvent: InternalNoteEvent = {
    type: 'note',
    t,
    dur: durTicks,
    midi,
  };

  if (lyric !== undefined) {
    noteEvent.lyric = lyric;
  }
  if (slurStarts.length > 0) {
    noteEvent.slurStarts = slurStarts;
  }
  if (slurStops.length > 0) {
    noteEvent.slurStops = slurStops;
  }

  stream.events.push(noteEvent);
  if (hasTieStart) {
    stream.openTies.set(tieKey, noteEvent);
  }

  return durTicks;
}

function extractSlurMarkers(
  noteNode: AnyObject,
  slurState: SlurState,
  warnings: ImportWarning[],
  context: ParseContext
): { slurStarts: string[]; slurStops: string[] } {
  const slurStarts: string[] = [];
  const slurStops: string[] = [];

  const notationsNodes = asArray<unknown>(noteNode.notations)
    .map(asObject)
    .filter((node): node is AnyObject => Boolean(node));

  for (const notationsNode of notationsNodes) {
    const slurNodes = asArray<unknown>(notationsNode.slur)
      .map(asObject)
      .filter((node): node is AnyObject => Boolean(node));

    for (const slurNode of slurNodes) {
      const type = readText(slurNode['@_type'])?.toLowerCase();
      const slurNumber = readText(slurNode['@_number'])?.trim() || '1';
      if (type === 'start') {
        const occurrence = slurState.nextOccurrenceByNumber.get(slurNumber) ?? 1;
        slurState.nextOccurrenceByNumber.set(slurNumber, occurrence + 1);
        const phraseId = `${context.partId ?? 'part'}:slur:${slurNumber}:${occurrence}`;
        const stack = slurState.openByNumber.get(slurNumber) ?? [];
        stack.push(phraseId);
        slurState.openByNumber.set(slurNumber, stack);
        slurStarts.push(phraseId);
      } else if (type === 'stop') {
        const stack = slurState.openByNumber.get(slurNumber);
        const phraseId = stack?.pop();
        if (phraseId) {
          slurStops.push(phraseId);
        } else {
          warn(
            warnings,
            'SLUR_STOP_WITHOUT_START',
            'Found slur stop without matching slur start; marker ignored.',
            context
          );
        }
      } else if (type === 'continue') {
        continue;
      } else {
        warn(
          warnings,
          'UNSUPPORTED_NOTATION_IGNORED',
          `Ignored unsupported slur type "${type ?? 'unknown'}".`,
          context
        );
      }
    }
  }

  return { slurStarts, slurStops };
}

function updateTupletNestingState(
  noteNode: AnyObject,
  stream: MutableStream,
  warnings: ImportWarning[],
  context: ParseContext
): void {
  const notationsNodes = asArray<unknown>(noteNode.notations)
    .map(asObject)
    .filter((node): node is AnyObject => Boolean(node));

  for (const notationsNode of notationsNodes) {
    const tupletNodes = asArray<unknown>(notationsNode.tuplet)
      .map(asObject)
      .filter((node): node is AnyObject => Boolean(node));

    for (const tupletNode of tupletNodes) {
      const type = readText(tupletNode['@_type'])?.toLowerCase();
      const number = readText(tupletNode['@_number'])?.trim() || '1';
      if (type === 'start') {
        if (stream.openTuplets.size > 0 && !stream.openTuplets.has(number)) {
          fail(context, 'Nested tuplets are not supported.');
        }
        stream.openTuplets.add(number);
      } else if (type === 'stop') {
        const removed = stream.openTuplets.delete(number);
        if (!removed) {
          warn(
            warnings,
            'TUPLET_STOP_WITHOUT_START',
            'Found tuplet stop without matching start marker; marker ignored.',
            context
          );
        }
      } else if (type === 'continue') {
        continue;
      }
    }
  }
}

function getTupletRatio(
  noteNode: AnyObject,
  options: NormalizedOptions,
  context: ParseContext
): { normalNotes: number; actualNotes: number } {
  const timeModificationNode = asObject(noteNode['time-modification']);
  if (!timeModificationNode) {
    return { normalNotes: 1, actualNotes: 1 };
  }

  if (options.tupletSupport === 'none') {
    fail(context, 'Tuplets are disabled by options (tupletSupport="none").');
  }

  const actualNotes = parseInteger(timeModificationNode['actual-notes'], 'actual-notes', context, {
    min: 1,
  });
  const normalNotes = parseInteger(timeModificationNode['normal-notes'], 'normal-notes', context, {
    min: 1,
  });

  if (options.tupletSupport === 'triplets-only' && !(actualNotes === 3 && normalNotes === 2)) {
    fail(
      context,
      `Unsupported tuplet ratio ${actualNotes}:${normalNotes} for tupletSupport="triplets-only".`
    );
  }

  return { normalNotes, actualNotes };
}

function durationDivisionsToTicks(
  durationDivisions: number,
  divisions: number,
  ppq: number,
  tupletRatio: { normalNotes: number; actualNotes: number },
  warnings: ImportWarning[],
  context: ParseContext
): number {
  const rawTicks =
    (durationDivisions * ppq * tupletRatio.normalNotes) / (divisions * tupletRatio.actualNotes);
  if (!Number.isFinite(rawTicks) || rawTicks <= 0) {
    fail(context, `Invalid computed duration in ticks (${rawTicks}).`);
  }

  const roundedTicks = Math.round(rawTicks);
  if (Math.abs(rawTicks - roundedTicks) > 1e-9) {
    warn(
      warnings,
      'DURATION_ROUNDED_TO_TICK',
      `Rounded non-integer tick duration ${rawTicks} to ${roundedTicks}.`,
      context
    );
  }

  if (roundedTicks <= 0) {
    fail(context, `Computed duration in ticks is non-positive (${roundedTicks}).`);
  }

  return roundedTicks;
}

function parsePitchToMidi(noteNode: AnyObject, context: ParseContext): number {
  const pitchNode = asObject(noteNode.pitch);
  if (!pitchNode) {
    fail(context, 'Non-rest note is missing <pitch>.');
  }

  const step = readText(pitchNode.step)?.toUpperCase();
  if (!step || !(step in STEP_TO_PC)) {
    fail(context, `Unsupported pitch step "${step ?? 'unknown'}".`);
  }

  let alter = 0;
  if (pitchNode.alter !== undefined) {
    const alterRaw = readText(pitchNode.alter);
    if (alterRaw === undefined) {
      fail(context, 'Invalid <alter> value.');
    }
    const parsedAlter = Number(alterRaw);
    if (!Number.isFinite(parsedAlter) || !Number.isInteger(parsedAlter)) {
      fail(context, `Microtonal alter "${alterRaw}" is not supported; alter must be an integer.`);
    }
    alter = parsedAlter;
  }

  const octave = parseInteger(pitchNode.octave, 'octave', context);
  return 12 * (octave + 1) + STEP_TO_PC[step] + alter;
}

function extractLyric(noteNode: AnyObject): string | undefined {
  const lyricNodes = asArray<unknown>(noteNode.lyric);
  for (const lyricNodeRaw of lyricNodes) {
    const lyricNode = asObject(lyricNodeRaw);
    if (!lyricNode) {
      const value = readText(lyricNodeRaw);
      if (value !== undefined && value.length > 0) return value;
      continue;
    }

    const textValue = readText(lyricNode.text);
    if (textValue !== undefined && textValue.length > 0) return textValue;
  }
  return undefined;
}

function extractTieTypes(noteNode: AnyObject): Set<'start' | 'stop'> {
  const tieTypes = new Set<'start' | 'stop'>();
  const directTieNodes = asArray<unknown>(noteNode.tie);
  for (const tieNodeRaw of directTieNodes) {
    const tieNode = asObject(tieNodeRaw);
    if (!tieNode) continue;
    const type = readText(tieNode['@_type'])?.toLowerCase();
    if (type === 'start' || type === 'stop') {
      tieTypes.add(type);
    }
  }

  const notationsNodes = asArray<unknown>(noteNode.notations)
    .map(asObject)
    .filter((node): node is AnyObject => Boolean(node));

  for (const notationsNode of notationsNodes) {
    const tiedNodes = asArray<unknown>(notationsNode.tied)
      .map(asObject)
      .filter((node): node is AnyObject => Boolean(node));
    for (const tiedNode of tiedNodes) {
      const type = readText(tiedNode['@_type'])?.toLowerCase();
      if (type === 'start' || type === 'stop') {
        tieTypes.add(type);
      }
    }
  }

  return tieTypes;
}

function parseKeyNode(
  keyNode: AnyObject,
  options: NormalizedOptions,
  warnings: ImportWarning[],
  context: ParseContext
): { fifths: number; mode: 'major' } {
  const fifths = parseInteger(keyNode.fifths, 'fifths', context);
  const modeRaw = readText(keyNode.mode)?.toLowerCase();

  if (!modeRaw) {
    if (options.assumeMajorIfModeMissing) {
      return { fifths, mode: 'major' };
    }
    fail(context, 'Mode is missing in key signature and assumeMajorIfModeMissing is false.');
  }

  if (modeRaw === 'major' || modeRaw === 'ionian') {
    return { fifths, mode: 'major' };
  }

  if (!options.allowModeOtherThanMajor) {
    fail(
      context,
      `Unsupported key mode "${modeRaw}". Only major/ionian is accepted unless allowModeOtherThanMajor is true.`
    );
  }

  warn(
    warnings,
    'MODE_COERCED_TO_MAJOR',
    `Mode "${modeRaw}" is being coerced to major for this importer.`,
    context
  );
  return { fifths, mode: 'major' };
}

function parseMeterNode(
  timeNode: AnyObject,
  context: ParseContext
): { beats: number; beatType: number } {
  const beatsText = readText(timeNode.beats);
  if (!beatsText) {
    fail(context, 'Time signature is missing <beats>.');
  }
  if (!/^\d+$/.test(beatsText)) {
    fail(context, `Unsupported compound <beats> value "${beatsText}". Use simple integer beats.`);
  }
  const beats = Number(beatsText);
  const beatType = parseInteger(timeNode['beat-type'], 'beat-type', context, { min: 1 });
  if (beats <= 0) {
    fail(context, `Invalid beats value ${beats}.`);
  }
  return { beats, beatType };
}

function extractTempoFromMeasure(measureNode: AnyObject, context: ParseContext): number | undefined {
  const directionNodes = asArray<unknown>(measureNode.direction)
    .map(asObject)
    .filter((node): node is AnyObject => Boolean(node));

  for (const directionNode of directionNodes) {
    const soundNodes = asArray<unknown>(directionNode.sound)
      .map(asObject)
      .filter((node): node is AnyObject => Boolean(node));

    for (const soundNode of soundNodes) {
      const tempoRaw = readText(soundNode['@_tempo']);
      if (!tempoRaw) continue;
      const tempo = Number(tempoRaw);
      if (!Number.isFinite(tempo) || tempo <= 0) {
        fail(context, `Invalid tempo value "${tempoRaw}".`);
      }
      return tempo;
    }
  }

  return undefined;
}

function internalEventToRelativeEvent(event: InternalEvent, fifths: number | undefined): RelativeEvent {
  if (event.type === 'rest') {
    return {
      type: 'rest',
      t: event.t,
      dur: event.dur,
    };
  }

  if (fifths === undefined) {
    throw new Error('MusicXML import error: key signature is required before converting note pitch.');
  }

  const tonicPc = fifthsToTonicPc(fifths);
  const { deg, alt, oct } = midiToRelative(event.midi, tonicPc);

  const noteEvent: RelativeEvent = {
    type: 'note',
    t: event.t,
    dur: event.dur,
    deg,
    alt,
    oct,
  };

  if (event.lyric !== undefined) {
    noteEvent.lyric = event.lyric;
  }
  if (event.slurStarts && event.slurStarts.length > 0) {
    noteEvent.slurStarts = [...event.slurStarts];
  }
  if (event.slurStops && event.slurStops.length > 0) {
    noteEvent.slurStops = [...event.slurStops];
  }

  return noteEvent;
}

function midiToRelative(midi: number, tonicPc: number): { deg: RelativeDegree; alt: number; oct: number } {
  const tonicMidi = 12 * (TONIC_REFERENCE_OCTAVE + 1) + tonicPc;
  const delta = midi - tonicMidi;
  const oct = Math.floor(delta / 12);
  const pc = mod(delta, 12);

  let bestDegree: RelativeDegree = 1;
  let bestAlt = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const { deg, pc: basePc } of DEGREE_BASE_PCS) {
    const normalizedAlt = normalizeAlt(pc - basePc);
    const distance = Math.abs(normalizedAlt);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDegree = deg;
      bestAlt = normalizedAlt;
      continue;
    }
    if (distance === bestDistance) {
      if (normalizedAlt > bestAlt) {
        bestDegree = deg;
        bestAlt = normalizedAlt;
      } else if (normalizedAlt === bestAlt && deg < bestDegree) {
        bestDegree = deg;
      }
    }
  }

  return {
    deg: bestDegree,
    alt: bestAlt,
    oct,
  };
}

function fifthsToTonicPc(fifths: number): number {
  return mod(fifths * 7, 12);
}

function getNominalMeasureTicks(
  meter: { beats: number; beatType: number } | undefined,
  ppq: number
): number {
  if (!meter) return 0;
  return Math.round((meter.beats * ppq * 4) / meter.beatType);
}

function extractTitle(scorePartwise: AnyObject): string | undefined {
  const workNode = asObject(scorePartwise.work);
  const workTitle = readText(workNode?.['work-title']);
  if (workTitle && workTitle.length > 0) {
    return workTitle;
  }

  const movementTitle = readText(scorePartwise['movement-title']);
  if (movementTitle && movementTitle.length > 0) {
    return movementTitle;
  }

  return undefined;
}

function extractPartNames(scorePartwise: AnyObject): Map<string, string> {
  const map = new Map<string, string>();
  const partList = asObject(scorePartwise['part-list']);
  if (!partList) return map;

  const scorePartNodes = asArray<unknown>(partList['score-part'])
    .map(asObject)
    .filter((node): node is AnyObject => Boolean(node));

  for (const scorePart of scorePartNodes) {
    const id = readText(scorePart['@_id'])?.trim();
    const name = readText(scorePart['part-name'])?.trim();
    if (!id || !name) continue;
    map.set(id, name);
  }

  return map;
}

function buildExerciseId(title: string | undefined): string {
  if (!title) {
    return 'musicxml:imported';
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    return 'musicxml:imported';
  }
  return `musicxml:${slug}`;
}

function parseInteger(
  value: unknown,
  fieldName: string,
  context: ParseContext,
  bounds?: { min?: number }
): number {
  const text = readText(value);
  if (!text) {
    fail(context, `Missing integer value for "${fieldName}".`);
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    fail(context, `Expected integer for "${fieldName}", got "${text}".`);
  }
  if (bounds?.min !== undefined && parsed < bounds.min) {
    fail(context, `Expected "${fieldName}" >= ${bounds.min}, got ${parsed}.`);
  }
  return parsed;
}

function warn(
  warnings: ImportWarning[],
  code: ImportWarningCode,
  message: string,
  context: ParseContext
): void {
  warnings.push({
    code,
    message,
    partId: context.partId,
    measure: context.measure,
    voiceId: context.voiceId,
  });
}

function fail(context: ParseContext, message: string): never {
  const scope: string[] = [];
  if (context.partId) scope.push(`part ${context.partId}`);
  if (context.measure) scope.push(`measure ${context.measure}`);
  if (context.voiceId) scope.push(`voice ${context.voiceId}`);
  const scopeLabel = scope.length > 0 ? ` (${scope.join(', ')})` : '';
  throw new Error(`MusicXML import error${scopeLabel}: ${message}`);
}

function asObject(value: unknown): AnyObject | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as AnyObject;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const obj = asObject(value);
  if (!obj) return undefined;
  const textNode = obj['#text'];
  if (typeof textNode === 'string') return textNode;
  if (typeof textNode === 'number' || typeof textNode === 'boolean') return String(textNode);
  return undefined;
}

function isNearlyEqual(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon;
}

function normalizeAlt(alt: number): number {
  let normalized = alt;
  while (normalized > 6) normalized -= 12;
  while (normalized < -6) normalized += 12;
  return normalized;
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function mergeArrayProperty(
  event: InternalNoteEvent,
  key: 'slurStarts' | 'slurStops',
  values: string[]
): void {
  if (values.length === 0) return;
  if (!event[key]) {
    event[key] = [];
  }
  const target = event[key] as string[];
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}
