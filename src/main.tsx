import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
      console.error('Impossible d’activer le mode installable F.A.N.A :', error);
    });
  };

  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker, { once: true });
}
