# AGENTS.md — mesurepro

Consignes pour toutes les IA qui travaillent sur ce dépôt.

## Standard CI/CD de Davide (20/11/2026) — règles pour toutes les IA (Claude, Codex, Cursor, Gemini…)

Décision perpétuelle de Davide, valable pour ce dépôt comme pour tous ses projets. Texte en clair ici, pour qu'il
soit lisible sur GitHub, dans la CI et sur toute machine.

1. **GitHub est l'unique source de vérité.** Un seul clone local par projet, `origin` = ce dépôt GitHub. Aucun
   commit ne vit seulement sur un poste : toute branche de travail (`feat/*`, `fix/*`, `chore/*`) est poussée dès
   qu'elle existe.
2. **`main` est protégée.** Pas de push direct, pas de `--force`, pull request obligatoire, contrôles CI
   obligatoires au vert, règle appliquée aussi aux administrateurs. Chemin unique :
   branche → push → PR → CI verte → fusion dans `main` → mise en ligne.
3. **La CI de GitHub juge** (suite complète, tests, secrets). Localement, seul un `pre-commit` rapide (< 3 s :
   `gitleaks` sur l'index + vérification syntaxique) et un `post-commit` d'envoi automatique de la branche de
   travail sont admis. Interdits : marqueurs à minuteur (`.ai/preflight-ok`, `gate.success`), scripts de
   déploiement lancés depuis un poste, `core.hooksPath`, `--no-verify`.
4. **Workflows de PR** : `concurrency` qui n'annule que les runs de PR périmés ; cache des dépendances avec
   installation exacte (`npm ci`) ; `paths-ignore` seulement sur un workflow dont les contrôles ne sont pas
   obligatoires (sinon le filtre se fait dans le job).
5. **Production isolée.** Les secrets de serveur ne sont jamais au niveau du dépôt : ils vivent dans
   l'environnement GitHub `production`, restreint à `main`. La mise en ligne se fait uniquement par
   `workflow_dispatch` (clic humain) sur `main`, n'est jamais annulée en cours, vérifie `/api/health` et revient
   automatiquement au build précédent en cas d'échec. Aucun runner CI sur un serveur de production.
6. **Clôture de bout en bout.** Une tâche n'est terminée que si `git status` est propre, la PR est ouverte avec
   des contrôles CI verts et, si une production est active, la mise en ligne a été jouée et vérifiée (ou
   explicitement confirmée par Davide). Sinon le compte rendu dit « pas terminé » et nomme le point manquant.
7. **Interdits permanents** : `git push --force`, `--no-verify`, `|| true` ou `set +e` pour masquer une erreur,
   tests désactivés (`.skip`/`.only`) ou supprimés, lecture ou affichage d'un `.env`, d'une clé ou d'un secret.
