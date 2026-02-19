import { mountStudentNotation } from '@mlt/student-notation-ui';
declare global {
  interface Window {
    __studentNotationMounted?: boolean;
  }
}

const app = document.getElementById('app');
if (app && !window.__studentNotationMounted) {
  window.__studentNotationMounted = true;
  mountStudentNotation(app);
}
