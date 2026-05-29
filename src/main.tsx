import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebase } from './lib/firebase';

(async () => {
  try {
    await initFirebase();
  } catch (error) {
    console.error('Firebase initialization failed', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
