import {
  ALL_LESSONS,
  type AnyLessonTemplate,
  type PitchMatchingTemplate,
} from '@mlt/lesson-templates';
import type { ComponentInventoryReport } from './componentInventory.js';

export interface LessonUsageEntry {
  lessonId: string;
  lessonName: string;
  lessonType: string;
  category: string;
  components: string[];
  notes: string[];
}

export interface LessonUsageGraphReport {
  generatedAtIso: string;
  lessons: LessonUsageEntry[];
}

function findComponentPath(
  report: ComponentInventoryReport,
  ...pathHints: string[]
): string | undefined {
  const loweredHints = pathHints.map((hint) => hint.toLowerCase());
  return report.components.find((item) => loweredHints.some((hint) => item.file.toLowerCase().includes(hint)))?.file;
}

function hasInstructionPhases(template: PitchMatchingTemplate): boolean {
  return template.pattern.phases.some((phase) => Boolean(phase.instructionMessage));
}

function buildNotes(template: AnyLessonTemplate): string[] {
  const notes: string[] = [];
  notes.push(`type=${template.type}`);
  notes.push(`difficulty=${template.difficulty}`);
  notes.push(`speakingPitchUsage=${template.speakingPitchUsage}`);
  if (template.type === 'pitch-matching') {
    notes.push(`loops=${template.config.numLoops}`);
    notes.push(`tempo=${template.config.tempo}`);
    if (hasInstructionPhases(template)) {
      notes.push('contains instructionMessage phases');
    }
  } else if (template.type === 'overdub') {
    notes.push(`voices=${template.config.voices.length}`);
    notes.push(`tempo=${template.config.tempo}`);
  }
  return notes;
}

export function generateLessonUsageGraphReport(
  componentInventory: ComponentInventoryReport,
): LessonUsageGraphReport {
  const singingCanvas = findComponentPath(componentInventory, 'SingingCanvas.svelte');
  const exerciseControls = findComponentPath(componentInventory, 'ExerciseControls.svelte');
  const exerciseChooser = findComponentPath(componentInventory, 'ExerciseChooserModal.svelte');
  const resultsModal = findComponentPath(componentInventory, 'ResultsModal.svelte');
  const overdubChooser = findComponentPath(componentInventory, 'OverdubExerciseChooserModal.svelte');
  const overdubControls = findComponentPath(componentInventory, 'OverdubControls.svelte');
  const avatarAdapter = findComponentPath(componentInventory, 'controllerAdapters.ts', 'avatar');

  const lessons: LessonUsageEntry[] = ALL_LESSONS.map((template) => {
    const components = new Set<string>();

    if (singingCanvas) components.add(singingCanvas);

    if (template.type === 'pitch-matching') {
      if (exerciseControls) components.add(exerciseControls);
      if (exerciseChooser) components.add(exerciseChooser);
      if (resultsModal) components.add(resultsModal);
      if (hasInstructionPhases(template) && avatarAdapter) {
        components.add(avatarAdapter);
      }
    }

    if (template.type === 'overdub') {
      if (overdubControls) components.add(overdubControls);
      if (overdubChooser) components.add(overdubChooser);
      if (resultsModal) components.add(resultsModal);
    }

    return {
      lessonId: template.id,
      lessonName: template.name,
      lessonType: template.type,
      category: template.category,
      components: [...components],
      notes: buildNotes(template),
    };
  });

  return {
    generatedAtIso: new Date().toISOString(),
    lessons,
  };
}

export function formatLessonUsageGraphMarkdown(report: LessonUsageGraphReport): string {
  const lines: string[] = [];
  lines.push('# Lesson Usage Graph');
  lines.push('');
  lines.push(`- Generated: ${report.generatedAtIso}`);
  lines.push(`- Lessons mapped: ${report.lessons.length}`);
  lines.push('');
  lines.push('| Lesson | Type | Category | Component Count |');
  lines.push('|---|---|---|---:|');

  for (const lesson of report.lessons) {
    lines.push(`| \`${lesson.lessonId}\` | ${lesson.lessonType} | ${lesson.category} | ${lesson.components.length} |`);
  }

  lines.push('');
  lines.push('## Per Lesson Details');
  lines.push('');

  for (const lesson of report.lessons) {
    lines.push(`### ${lesson.lessonName}`);
    lines.push('');
    lines.push(`- Lesson ID: \`${lesson.lessonId}\``);
    lines.push(`- Type: ${lesson.lessonType}`);
    lines.push(`- Category: ${lesson.category}`);
    lines.push(`- Notes: ${lesson.notes.join('; ')}`);
    if (lesson.components.length > 0) {
      lines.push(`- Components: ${lesson.components.map((component) => `\`${component}\``).join(', ')}`);
    } else {
      lines.push('- Components: none mapped');
    }
    lines.push('');
  }

  return lines.join('\n');
}
