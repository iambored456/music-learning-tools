import { ALL_LESSONS, hasTemplate, registerTemplate } from '@mlt/lesson-templates';

export function ensureLessonTemplatesRegistered(): void {
  for (const template of ALL_LESSONS) {
    if (!hasTemplate(template.id)) {
      registerTemplate(template);
    }
  }
}
