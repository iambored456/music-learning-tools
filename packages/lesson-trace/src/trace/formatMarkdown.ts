import type { LessonTraceDocument, TraceEvent } from './types.js';

function formatTime(atMs: number): string {
  return `${(atMs / 1000).toFixed(3)}s`;
}

function formatReasonCodes(reasonCodes: string[] | undefined): string {
  if (!reasonCodes || reasonCodes.length === 0) {
    return '';
  }
  return ` (${reasonCodes.join(', ')})`;
}

function describeEvent(event: TraceEvent): string {
  switch (event.type) {
    case 'lessonLoaded':
      return `Lesson loaded: \`${event.lessonId}\` variant=\`${event.variantId}\` scenario=\`${event.scenarioId}\``;
    case 'segmentStart':
      return `Segment start [${event.segmentIndex}]: ${event.segmentName ?? event.segmentId}`;
    case 'avatarSay':
      return `Avatar says: "${event.text}"`;
    case 'highwayShow':
      return 'Note highway visible';
    case 'highwayHide':
      return 'Note highway hidden';
    case 'phaseEnter':
      return `Phase enter: ${event.phase} (loop ${event.loopIndex + 1}, phase ${event.phaseIndex + 1}${event.phaseLabel ? `, label=${event.phaseLabel}` : ''}${event.targetMode ? `, target=${event.targetMode}` : ''})`;
    case 'referenceTone':
      return `Reference tone ${event.state}${event.note ? ` (${event.note})` : ''}`;
    case 'drone':
      return `Drone ${event.state}${event.tonic ? ` (${event.tonic})` : ''}`;
    case 'waitForInput':
      return `Wait-for-input ${event.state}`;
    case 'inputMetrics':
      return `Input metrics: input=${event.inputIndex + 1}, attempt=${event.attempt}, voicedMs=${event.voicedMs}, coverage=${event.coveragePct}%, withinWindow=${event.withinWindow}`;
    case 'highwayNoteJudged':
      return `Highway note ${event.status}: input=${event.inputIndex + 1}${event.noteLabel ? `, label=${event.noteLabel}` : ''}${formatReasonCodes(event.reasonCodes)}`;
    case 'evaluation':
      return `Evaluation ${event.result}: input=${event.inputIndex + 1}, attempt=${event.attempt}${formatReasonCodes(event.reasonCodes)}`;
    case 'loopAdvance':
      return `Loop advance -> ${event.newLoopIndex + 1}`;
    case 'lessonComplete':
      return `Lesson complete: pass=${event.passCount}, fail=${event.failCount}, totalInputs=${event.totalInputs}`;
  }
  const exhaustiveCheck: never = event;
  return String(exhaustiveCheck);
}

export function formatTraceMarkdown(trace: LessonTraceDocument): string {
  const lines: string[] = [];

  lines.push(`# Execution Transcript: ${trace.lessonName}`);
  lines.push('');
  lines.push(`- Lesson ID: \`${trace.lessonId}\``);
  lines.push(`- Variant: \`${trace.variantId}\`${trace.variantName ? ` (${trace.variantName})` : ''}`);
  lines.push(`- Type: \`${trace.lessonType}\``);
  lines.push(`- Scenario: \`${trace.scenarioId}\``);
  lines.push(`- Duration: ${trace.summary.durationMs} ms`);
  lines.push(`- Evaluations: pass=${trace.summary.evaluations.pass}, fail=${trace.summary.evaluations.fail}`);
  lines.push(`- Generated: ${trace.generatedAtIso}`);
  lines.push('');
  lines.push('## Timeline');
  lines.push('');

  for (const event of trace.events) {
    lines.push(`- [${formatTime(event.atMs)}] ${describeEvent(event)}`);
  }

  lines.push('');
  lines.push('## Settings');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(trace.settings, null, 2));
  lines.push('```');

  return lines.join('\n');
}
