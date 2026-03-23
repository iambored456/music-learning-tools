import '@mlt/boomwhacker-video-builder-ui/styles.css';
import { mountBoomwhackerVideoBuilder } from '@mlt/boomwhacker-video-builder-ui';

const app = document.getElementById('app');
if (app) {
  mountBoomwhackerVideoBuilder(app);
}
