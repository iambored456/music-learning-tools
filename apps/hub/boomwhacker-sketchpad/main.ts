import '@mlt/boomwhacker-sketchpad-ui/styles.css';
import { mountBoomwhackerSketchpad } from '@mlt/boomwhacker-sketchpad-ui';

const app = document.getElementById('app');
if (app) {
  mountBoomwhackerSketchpad(app);
}
