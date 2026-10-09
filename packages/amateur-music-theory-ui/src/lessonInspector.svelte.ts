export type LessonCueAction = {
  id: string;
  title: string;
  detail: string;
};

export type LessonCue = {
  id: string;
  title: string;
  prompt: string;
  visual: string;
  audio: string;
  gesture: string;
  input: string;
  completion: string;
  timing: Record<string, number>;
  actions?: readonly LessonCueAction[];
};

export type CueStatus = 'ready' | 'running' | 'waiting' | 'completed' | 'cancelled' | 'failed';
export type LessonEventKind = 'cue' | 'speech' | 'avatar' | 'visual' | 'audio' | 'input' | 'playback' | 'error';
export type LessonEvent = {
  id: number;
  atMs: number;
  section: string;
  cue: string | null;
  kind: LessonEventKind;
  detail: string;
};

export const lessonInspectorKey = Symbol('amateur-music-theory-inspector');

export function createLessonInspector() {
  let sectionCode = $state('');
  let sectionTitle = $state('');
  let cues = $state<readonly LessonCue[]>([]);
  let currentCueId = $state<string | null>(null);
  let currentActionId = $state<string | null>(null);
  let statuses = $state<Record<string, CueStatus>>({});
  let events = $state<LessonEvent[]>([]);
  let paused = $state(false);
  let seek: ((id: string, actionId?: string) => void) | undefined;
  let eventId = 0;
  const started = performance.now();

  function record(kind: LessonEventKind, detail: string, cue = currentCueId, section = sectionCode): void {
    events = [...events.slice(-399), {
      id: ++eventId, atMs: Math.round(performance.now() - started),
      section, cue, kind, detail,
    }];
  }

  return {
    get sectionCode() { return sectionCode; },
    get sectionTitle() { return sectionTitle; },
    get cues() { return cues; },
    get currentCueId() { return currentCueId; },
    get currentActionId() { return currentActionId; },
    get statuses() { return statuses; },
    get events() { return events; },
    get paused() { return paused; },
    get canSeek() { return Boolean(seek); },
    record,
    setSection(code: string, title: string): void {
      if (code === sectionCode) return;
      sectionCode = code;
      sectionTitle = title;
      cues = [];
      currentCueId = null;
      currentActionId = null;
      statuses = {};
      seek = undefined;
      record('cue', `Section opened: ${title}`);
    },
    register(plan: readonly LessonCue[], jump: (id: string, actionId?: string) => void): () => void {
      cues = plan;
      seek = jump;
      return () => {
        if (seek === jump) {
          seek = undefined;
          cues = [];
        }
      };
    },
    enter(id: string): void {
      currentCueId = id;
      currentActionId = null;
      statuses = { ...statuses, [id]: 'running' };
      record('cue', 'Started');
    },
    action(id: string): void {
      currentActionId = id;
    },
    status(value: CueStatus): void {
      if (!currentCueId) return;
      statuses = { ...statuses, [currentCueId]: value };
      record('cue', value);
    },
    resetFrom(id: string): void {
      const index = cues.findIndex((cue) => cue.id === id);
      const next = { ...statuses };
      for (const cue of cues.slice(Math.max(0, index))) next[cue.id] = 'ready';
      statuses = next;
      record('playback', `Run from checkpoint: ${id}`, id);
    },
    jump(id: string, actionId?: string): void {
      const cue = cues.find((item) => item.id === id);
      if (cue && (!actionId || cue.actions?.some((action) => action.id === actionId))) seek?.(id, actionId);
    },
    setPaused(value: boolean): void {
      if (paused === value) return;
      paused = value;
      record('playback', value ? 'Paused' : 'Resumed');
    },
    report(): string {
      return JSON.stringify({
        section: sectionCode, title: sectionTitle, currentCue: currentCueId, currentAction: currentActionId,
        paused, plan: cues, statuses, events,
        note: 'Last 400 observed events; times are elapsed wall-clock milliseconds, including pauses.',
      }, null, 2);
    },
  };
}

export type LessonInspector = ReturnType<typeof createLessonInspector>;
