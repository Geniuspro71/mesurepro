import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { ErrorBoundary } from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

/* Service worker — uniquement en production (Vite gère son propre
   HMR/cache en dev, le SW interférerait). */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', function(){
    var swUrl = (import.meta.env.BASE_URL || '/') + 'sw.js';
    navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL || '/' })
      .catch(function(err){
        // eslint-disable-next-line no-console
        console.warn('SW registration échouée :', err);
      });
  });
}
