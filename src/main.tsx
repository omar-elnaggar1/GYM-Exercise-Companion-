import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { maybeAutoStartTutorial, requestPersistentStorage } from './db/db';
import './styles.css';

// Install the service worker: this is what makes the app work offline.
// New versions download in the background and apply on next launch.
registerSW({ immediate: true });
void requestPersistentStorage();

// Very first launch: show the tutorial (it reloads the app into sample-data mode).
if (!maybeAutoStartTutorial()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
