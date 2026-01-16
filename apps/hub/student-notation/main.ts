import { mountStudentNotation } from '@mlt/student-notation-ui';

const logPrefix = '[Hub:StudentNotation]';
const shouldInitDebug = (): boolean => {
  if (typeof window === 'undefined') {return false;}
  const override = (window as Window & { __initDebug?: boolean }).__initDebug;
  if (override === true) {return true;}
  if (override === false) {return false;}
  return import.meta.env.DEV;
};
const log = (message: string, data?: unknown) => {
  if (!shouldInitDebug()) {return;}
  if (data === undefined) {
    console.log(`${logPrefix} ${message}`);
  } else {
    console.log(`${logPrefix} ${message}`, data);
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
