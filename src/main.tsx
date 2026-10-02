import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/dm-sans/opsz.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import './styles/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initPwa } from './pwa';
import { sendPostcards } from './shelf/send';
import { MomentsProvider } from './ui/Moments';
import { ToastProvider } from './ui/Toasts';

void initPwa();

// Leave yesterday's postcard for Logbook on the shared shelf, now and whenever Health comes back to the front.
void sendPostcards();
document.addEventListener('visibilitychange', () => { if (!document.hidden) void sendPostcards(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <MomentsProvider>
        <App />
      </MomentsProvider>
    </ToastProvider>
  </StrictMode>,
);
