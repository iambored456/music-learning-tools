import { mountStudentNotation } from '@mlt/student-notation-ui';

const logPrefix = '[Hub:StudentNotation]';
const t0 = performance.now();
const log = (message: string, data?: unknown) => {
  const elapsed = `+${(performance.now() - t0).toFixed(0)}ms`;
  if (data === undefined) {
    console.log(`${logPrefix} ${elapsed} ${message}`);
  } else {
    console.log(`${logPrefix} ${elapsed} ${message}`, data);
  }
};

log('entry');
window.addEventListener('error', (event) => {
  console.error(`${logPrefix} window error`, event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error(`${logPrefix} unhandled rejection`, event.reason);
});

const app = document.getElementById('app');
log('app container', { found: Boolean(app) });
if (app) {
  try {
    log('mountStudentNotation:start');
    mountStudentNotation(app);
    log('mountStudentNotation:done');
  } catch (error) {
    console.error(`${logPrefix} mountStudentNotation failed`, error);
  }
} else {
  console.error(`${logPrefix} #app not found`);
}
