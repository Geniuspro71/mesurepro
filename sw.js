/* MesurePro Service Worker — offline-first léger.
   Stratégies :
   - Assets statiques (.js, .css, .jpg, .png, .webp, .svg, .json) : cache-first.
     Les bundles JS Vite ont un hash dans leur nom → invalidation auto à
     chaque déploiement.
   - Navigation HTML : network-first (toujours le dernier index.html en
     ligne), fallback cache si offline.
   - Cross-origin (Photon, Nominatim, Google APIs) : pas touché par le SW.

   Le hash de bundle dans les noms de fichiers fait que les anciennes
   versions sont remplacées automatiquement — pas de purge manuelle à faire.
*/

const VERSION = "mesurepro-v2.7-3";
const RUNTIME_CACHE = VERSION + "-runtime";

self.addEventListener("install", function(event){
  /* Skip waiting → la nouvelle version prend le contrôle immédiatement */
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys
        .filter(function(k){ return k.startsWith("mesurepro-") && k !== RUNTIME_CACHE; })
        .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

function isAsset(url){
  return /\.(js|css|jpe?g|png|webp|svg|json|woff2?|ttf|otf|map)(\?|$)/i.test(url.pathname);
}

self.addEventListener("fetch", function(event){
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       /* APIs externes : passthrough */

  if (isAsset(url)) {
    /* Cache-first pour les assets — les hash Vite gèrent l'invalidation */
    event.respondWith(
      caches.match(req).then(function(cached){
        if (cached) return cached;
        return fetch(req).then(function(res){
          if (res && res.status === 200 && res.type === "basic") {
            var clone = res.clone();
            caches.open(RUNTIME_CACHE).then(function(c){ c.put(req, clone); });
          }
          return res;
        }).catch(function(){ return cached; });
      })
    );
    return;
  }

  /* Navigation HTML : network-first, fallback cache */
  event.respondWith(
    fetch(req).then(function(res){
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(RUNTIME_CACHE).then(function(c){ c.put(req, clone); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(c){
        return c || caches.match("/mesurepro/") || caches.match("/");
      });
    })
  );
});
