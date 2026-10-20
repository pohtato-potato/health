import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/dm-sans/opsz.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import './styles/app.css';
import './styles/tokens.css';
import './styles/components.css';
import './styles/access.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initPwa } from './pwa';
import { sendPostcards } from './shelf/send';
import { MomentsProvider } from './ui/Moments';
import { ToastProvider } from './ui/Toasts';
import { ConfirmHost } from './ui/Confirm';
import { db } from './db/db';
import { migrateToV2 } from './db/migrate';
import { resolveForecasts } from './db/forecasts';
import { logUsage } from './db/usage';
import { carryStatus } from './db/actions';
import { dayKey } from './domain/dates';

void initPwa();

// Bring 1.x data up to v2 once; safe to run on every start.
void migrateToV2(db);
void resolveForecasts();
void carryStatus(dayKey());
void logUsage('open');

// Leave yesterday's postcard for Logbook on the shared shelf, now and whenever Health comes back to the front.
void sendPostcards();
document.addEventListener('visibilitychange', () => { if (!document.hidden) void sendPostcards(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <MomentsProvider>
        <App />
        <ConfirmHost />
      </MomentsProvider>
    </ToastProvider>
  </StrictMode>,
);
