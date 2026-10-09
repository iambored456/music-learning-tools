/** Questions never gate input on narration. Submit before evaluating an answer.
 * The validity callback also prevents deferred speech starting after submission.
 */
export function createLessonQuestion(cancelSpeech: () => void, onAwaitingAnswer: (waiting: boolean) => void = () => {}) {
  let generation = 0;
  let speaking = false;
  return {
    async start(speak: (isOpen: () => boolean) => Promise<void>, unlock: () => void): Promise<void> {
      const current = ++generation;
      speaking = true;
      onAwaitingAnswer(false);
      unlock();
      try {
        await speak(() => current === generation);
        if (current === generation) onAwaitingAnswer(true);
      }
      finally { if (current === generation) speaking = false; }
    },
    /** Resume an already-narrated question, such as after retry feedback. */
    wait(): void {
      generation += 1;
      if (speaking) cancelSpeech();
      speaking = false;
      onAwaitingAnswer(true);
    },
    submit(): void {
      generation += 1;
      onAwaitingAnswer(false);
      if (speaking) cancelSpeech();
      speaking = false;
    },
  };
}
