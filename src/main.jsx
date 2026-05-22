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

/* Service Worker DÉSACTIVÉ — en phase de développement actif, le cache SW
   masquait les déploiements (l'utilisateur voyait l'ancienne version).
   On désinstalle tout SW résiduel + on purge les caches à chaque chargement
   pour garantir que la dernière version est toujours servie. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(function(regs){ regs.forEach(function(r){ r.unregister(); }); })
    .catch(function(){});
}
if (window.caches && caches.keys) {
  caches.keys()
    .then(function(keys){ keys.forEach(function(k){ caches.delete(k); }); })
    .catch(function(){});
}
