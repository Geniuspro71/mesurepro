/* MesurePro Service Worker — KILL-SWITCH.

   Le Service Worker de cache a été retiré : en phase de développement
   actif, sa stratégie cache-first masquait les déploiements (l'utilisateur
   continuait de voir une ancienne version après un nouveau build).

   Ce fichier ne sert plus qu'à NEUTRALISER tout SW résiduel : à sa première
   activation il purge tous les caches, se désinstalle lui-même, puis
   recharge les onglets ouverts pour qu'ils repartent sur du réseau frais.

   Le navigateur revérifie /sw.js à chaque navigation : un ancien SW de
   cache encore résident chez un utilisateur sera donc remplacé par
   ce kill-switch, qui se supprimera ensuite tout seul.
*/

self.addEventListener("install", function(){
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){ return caches.delete(k); }));
      })
      .then(function(){ return self.registration.unregister(); })
      .then(function(){ return self.clients.matchAll(); })
      .then(function(clients){
        clients.forEach(function(c){
          try { c.navigate(c.url); } catch (e) {}
        });
      })
  );
});

/* Aucun handler "fetch" — toutes les requêtes vont directement au réseau. */
