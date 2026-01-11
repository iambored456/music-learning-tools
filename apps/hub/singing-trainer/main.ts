import '@mlt/singing-trainer-ui/styles.css';
import { mountSingingTrainer } from '@mlt/singing-trainer-ui';

const app = document.getElementById('app');
if (app) {
  mountSingingTrainer(app);
}
