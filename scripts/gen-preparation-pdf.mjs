/* Génère un PDF récapitulatif de tout ce que Davide doit préparer
   pour passer MesurePro en vraie prod. Sortie : ~/Desktop/MesurePro-Preparation-Davide.pdf
   Lancer : `node scripts/gen-preparation-pdf.mjs`
*/
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const doc = new jsPDF({ unit: "mm", format: "a4" });
doc.setProperties({
  title: "MesurePro — Liste de préparation côté utilisateur",
  subject: "Ce que Davide doit préparer pour passer l'app en prod",
  author: "MesurePro",
  keywords: "preparation, Google Cloud, backend, branding, BLE, prod",
  creator: "MesurePro v2.7",
});

const NAVY = [10, 22, 36];
const CYAN = [0, 194, 255];
const GREEN = [0, 229, 160];
const ORANGE = [255, 140, 66];
const RED = [255, 71, 87];
const GREY = [96, 120, 152];
const DARK = [30, 45, 61];

let y = 18;
const M = 16;          /* marge gauche */
const W = 210 - M * 2; /* largeur utile */

function pageBreak(min = 30) {
  if (y > 297 - min) { doc.addPage(); y = 18; }
}
function title(text, opts = {}) {
  pageBreak(40);
  doc.setFontSize(opts.size || 18);
  doc.setTextColor(...(opts.color || NAVY));
  doc.setFont("helvetica", "bold");
  doc.text(text, M, y);
  y += (opts.size || 18) * 0.5 + 2;
  if (opts.divider !== false) {
    doc.setDrawColor(...CYAN);
    doc.setLineWidth(0.4);
    doc.line(M, y, M + W, y);
    y += 4;
  }
}
function sectionTitle(num, label, color = CYAN) {
  pageBreak(30);
  doc.setFontSize(13);
  doc.setTextColor(...color);
  doc.setFont("helvetica", "bold");
  doc.text(`${num}. ${label}`, M, y);
  y += 7;
}
function para(text, opts = {}) {
  pageBreak(20);
  doc.setFontSize(opts.size || 10);
  doc.setTextColor(...(opts.color || DARK));
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  const lines = doc.splitTextToSize(text, W);
  doc.text(lines, M, y);
  y += lines.length * (opts.size || 10) * 0.42 + (opts.gap || 2);
}
function bullet(text, opts = {}) {
  pageBreak(15);
  doc.setFontSize(opts.size || 9.5);
  doc.setTextColor(...(opts.color || DARK));
  doc.setFont("helvetica", "normal");
  const indent = (opts.level || 0) * 4 + 4;
  const lines = doc.splitTextToSize(text, W - indent - 4);
  doc.setTextColor(...CYAN);
  doc.text("•", M + indent - 4, y);
  doc.setTextColor(...(opts.color || DARK));
  doc.text(lines, M + indent, y);
  y += lines.length * 4 + 1;
}
function priorityBadge(label, color) {
  pageBreak(15);
  doc.setFillColor(...color);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.roundedRect(M, y - 4, doc.getTextWidth(label) + 6, 6, 1.5, 1.5, "F");
  doc.text(label, M + 3, y);
  y += 6;
}
function spacer(n = 4) { y += n; }

/* ===================== PAGE 1 — COUVERTURE ===================== */
doc.setFillColor(...NAVY);
doc.rect(0, 0, 210, 90, "F");

doc.setFillColor(...CYAN);
doc.roundedRect(M, 22, 16, 16, 2, 2, "F");
doc.setTextColor(0, 0, 0);
doc.setFontSize(20);
doc.setFont("helvetica", "bold");
doc.text("M", M + 5, 33);

doc.setTextColor(232, 237, 245);
doc.setFontSize(26);
doc.setFont("helvetica", "bold");
doc.text("MesurePro", M + 22, 30);
doc.setFontSize(11);
doc.setFont("helvetica", "normal");
doc.setTextColor(141, 175, 200);
doc.text("v2.7 — Application de mesure immobilière 3D", M + 22, 36);

doc.setFontSize(22);
doc.setTextColor(...CYAN);
doc.setFont("helvetica", "bold");
doc.text("Liste de préparation", M, 56);
doc.text("côté utilisateur", M, 65);

doc.setFontSize(11);
doc.setTextColor(232, 237, 245);
doc.setFont("helvetica", "normal");
doc.text("Tout ce que Davide doit préparer pour passer l'app en prod réelle.", M, 76);
doc.setFontSize(9);
doc.setTextColor(141, 175, 200);
doc.text("Pendant ce temps, Claude attaque en autonomie tout ce qui peut se faire sans cette info.", M, 82);

y = 105;
doc.setTextColor(...DARK);
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
doc.text("Date : 10 mai 2026  ·  Repo public : github.com/Geniuspro71/mesurepro  ·  Live : geniuspro71.github.io/mesurepro/", M, y);

y = 118;
title("Comment lire ce document", { size: 14, divider: true });
para("Chaque section décrit une chose à préparer de ton côté. À chaque section :");
bullet("Une étiquette de PRIORITÉ (Critique / Importante / Optionnelle).");
bullet("Une estimation du temps requis et du coût éventuel.");
bullet("La liste précise des actions à mener et des comptes à créer.");
bullet("Le LIVRABLE attendu (clé API, fichier, accès, validation…).");
spacer(2);
para("Une fois que tu as les livrables, tu les déposes dans Mac ~/Desktop/mesurepro-prep/ ou tu me les copies en chat — je les intègre.", { color: GREY, size: 9 });

/* ===================== SECTION 1 — GOOGLE CLOUD ===================== */
doc.addPage();
y = 18;
title("1. Google Cloud — Solar API + Geocoding API", { size: 16 });
priorityBadge("CRITIQUE pour saisie auto", RED);
spacer(2);
para("L'app intègre déjà l'appel à Google Solar API (Building Insights free tier) — il manque uniquement TA clé API. Sans elle, le bouton « 🛰️ Récupérer » de l'étape Remplir affichera un message d'erreur.", { size: 10 });
spacer(3);

sectionTitle("1.1", "Créer un projet Google Cloud Console");
bullet("Aller sur console.cloud.google.com");
bullet("Se connecter avec un compte Google (perso ou pro).");
bullet("Cliquer « Sélectionner un projet » → « Nouveau projet ».");
bullet("Nom : MesurePro (ou tout autre, peu importe).");
bullet("Organisation : laisser vide ou choisir ta société si tu en as une.");
bullet("Créer.");

sectionTitle("1.2", "Activer la facturation (obligatoire, MAIS gratuit en pratique)");
para("Google Solar API EXIGE qu'un compte de facturation soit lié au projet, MÊME pour le free tier. Tu ne paies rien tant que tu restes sous les seuils gratuits (~1000 calls/jour Solar, ~40 000/mois Geocoding). Tu peux mettre une alerte de budget à 0,01 € pour être sûr.", { size: 9.5 });
bullet("Dans Cloud Console : Menu ≡ → Facturation → Lier un compte de facturation.");
bullet("Créer un compte → CB requise (Google ne débite rien tant que tu restes en free tier).");
bullet("Configurer alerte budget : Menu ≡ → Facturation → Budgets et alertes → Créer un budget → 1 € / mois → notifier à 50 % et 100 %.");

sectionTitle("1.3", "Activer les APIs nécessaires");
bullet("Menu ≡ → APIs & Services → Bibliothèque.");
bullet("Rechercher « Solar API » → Activer.");
bullet("Rechercher « Geocoding API » → Activer.");
bullet("(Optionnel pour features futures) « Places API (New) » → Activer.");

sectionTitle("1.4", "Créer la clé API");
bullet("Menu ≡ → APIs & Services → Credentials → Créer des identifiants → Clé API.");
bullet("Copier la clé qui commence par AIzaSy… (45 caractères).");
bullet("Cliquer « Restreindre la clé » :");
bullet("  · Restriction d'application : référents HTTP → ajouter https://geniuspro71.github.io/mesurepro/* et http://localhost:3000/*", { level: 1 });
bullet("  · Restriction d'API : limiter à Solar API + Geocoding API uniquement.", { level: 1 });
bullet("Enregistrer.");

sectionTitle("1.5", "LIVRABLE attendu", GREEN);
para("Une chaîne de caractères du type :", { bold: true });
doc.setFont("courier", "normal");
doc.setFontSize(10);
doc.setTextColor(...DARK);
doc.text("VITE_GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX", M, y);
doc.setFont("helvetica", "normal");
y += 7;
para("Coût : 0 €/mois tant que < 1000 calls Solar API/jour. Temps : 10-15 min.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 2 — BACKEND ===================== */
doc.addPage();
y = 18;
title("2. Backend + base de données + authentification", { size: 16 });
priorityBadge("CRITIQUE pour multi-device + vraie prod", RED);
spacer(2);
para("Actuellement TOUTES les données sont dans le localStorage du navigateur. Si tu changes d'appareil, tu perds tout. Pas de partage entre utilisateurs. Pas de backup. Pour une vraie app pro, il faut un backend.", { size: 10 });
spacer(3);

sectionTitle("2.1", "Choix de la stack backend (à décider)");
para("3 options pragmatiques, dans l'ordre de simplicité :", { bold: true });
bullet("Option A — Supabase (recommandé) : PostgreSQL + Auth + Storage hébergés. Free tier 500 MB DB + 1 GB storage + 50 000 utilisateurs/mois. Setup en 30 min, API REST + JS SDK clé en main.");
bullet("Option B — Firebase (Google) : Firestore + Auth + Storage. Free tier généreux, intégration directe Google. SDK JS solide.");
bullet("Option C — Backend custom (FastAPI / Node.js Express) hébergé sur Vercel/Render/Hetzner. Plus de contrôle mais plus de travail.");
spacer(2);
para("Recommandation : Supabase. Open-source, peu de vendor lock-in, free tier suffit pour démarrer.", { color: GREEN, bold: true, size: 9.5 });

sectionTitle("2.2", "Décisions à prendre");
bullet("Quel modèle d'authentification ? Email/mot de passe ? OAuth Google + Apple ? Magic link (passwordless) ?");
bullet("Combien d'utilisateurs en simultané attendus ? (< 100 → free tier OK partout, > 1000 → plan payant)");
bullet("Données à synchroniser : uniquement les projets ? Aussi les préférences ? Aussi les civilités custom ?");
bullet("Quotas par utilisateur : limite de projets ? limite de photos par projet ?");

sectionTitle("2.3", "LIVRABLE attendu", GREEN);
bullet("Confirmation de la stack choisie (Supabase / Firebase / custom).");
bullet("Si Supabase : URL du projet (xxxx.supabase.co) + anon key + service role key.");
bullet("Si Firebase : config JS (apiKey, authDomain, projectId…) + service account key.");
para("Coût : 0 €/mois sur free tier Supabase/Firebase pour < 50 k MAU. Temps de setup : 30-60 min.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 3 — DOMAINE + HÉBERGEMENT ===================== */
doc.addPage();
y = 18;
title("3. Domaine + hébergement de production", { size: 16 });
priorityBadge("IMPORTANTE pour image pro", ORANGE);
spacer(2);
para("L'app est actuellement servie sur geniuspro71.github.io/mesurepro/ — fonctionnel mais pas pro pour des clients payants. Un domaine propre + hébergement dédié est attendu.", { size: 10 });
spacer(3);

sectionTitle("3.1", "Domaine (à acheter)");
bullet("Choisir un nom : mesurepro.be / mesurepro.eu / mesurepro.app / mesurepro.com (.com est dispo ? à vérifier).");
bullet("Acheter chez Gandi.net / OVH / Cloudflare Registrar (10-15 €/an).");
bullet("Cloudflare Registrar = prix coûtant, recommandé.");

sectionTitle("3.2", "Hébergement frontend (recommandation : Vercel ou Netlify)");
bullet("Vercel : free tier 100 GB bandwidth/mois, intégration Vite native, déploiement à chaque push GitHub. Recommandé pour démarrer.");
bullet("Netlify : équivalent. Léger préférence Vercel pour les apps React/Vite.");
bullet("Cloudflare Pages : encore plus rapide, CDN mondial Cloudflare, free tier illimité.");
spacer(2);
para("À chaque push sur main → déploiement automatique → URL https://mesurepro.app live en 30 secondes.", { color: GREEN, size: 9 });

sectionTitle("3.3", "LIVRABLE attendu", GREEN);
bullet("Domaine acheté + accès au registrar (DNS à pointer vers l'hébergeur).");
bullet("Compte Vercel/Netlify/Cloudflare créé + repo MesurePro connecté.");
para("Coût : ~12 €/an (domaine) + 0 €/mois (hébergement free tier). Temps : 15-30 min.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 4 — BRANDING ===================== */
doc.addPage();
y = 18;
title("4. Identité visuelle + branding", { size: 16 });
priorityBadge("IMPORTANTE pour crédibilité commerciale", ORANGE);
spacer(2);
para("Actuellement le logo c'est juste la lettre M dans un carré cyan. Pour des clients qui paient un audit, il faut quelque chose de plus pro.", { size: 10 });
spacer(3);

sectionTitle("4.1", "Assets visuels à fournir");
bullet("Logo PRINCIPAL : SVG vectoriel + PNG 512×512 fond transparent.");
bullet("Logo MONOCHROME (1 couleur) : pour print noir/blanc.");
bullet("Favicon : ICO 32×32 + 16×16 (ou SVG).");
bullet("App icon iOS : PNG 1024×1024 fond opaque (pour PWA installable).");
bullet("App icon Android : PNG 512×512 fond opaque + mask circle.");
bullet("Open Graph image : PNG 1200×630 (pour partage social).");

sectionTitle("4.2", "Couleurs de marque (à valider ou modifier)");
para("Actuellement utilisées dans l'app :", { size: 9.5 });
bullet("Cyan accent : #00C2FF (CTA, focus, sélection)");
bullet("Vert succès : #00E5A0 (confirmations, états OK)");
bullet("Orange alerte : #FF8C42 (warnings)");
bullet("Rouge erreur : #FF4757 (suppression, critique)");
bullet("Bleu navy fond : #08111E (background)");
bullet("Surface cartes : #0F1C2E");
spacer(2);
para("Si tu veux des couleurs personnalisées, envoie-les en hex (#RRGGBB) — je les substitue partout.", { color: GREY, size: 9 });

sectionTitle("4.3", "Copywriting / ton de marque");
bullet("Tutoyer ou vouvoyer les utilisateurs dans l'app ?");
bullet("Tagline / accroche (apparaît sur la page d'accueil, le PDF, etc.) ?");
bullet("Pitch en 1 phrase : que fait MesurePro et pour qui ?");

sectionTitle("4.4", "LIVRABLE attendu", GREEN);
bullet("Logo SVG dans ~/Desktop/mesurepro-prep/logo.svg");
bullet("Couleurs validées ou nouvelle palette en hex.");
bullet("Tagline + pitch en 2 phrases.");
para("Coût : 0 € si tu fais toi-même, 100-500 € si tu confies à un freelance Fiverr/Upwork. Temps : variable.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 5 — LÉGAL / RGPD ===================== */
doc.addPage();
y = 18;
title("5. Légal, RGPD, conditions générales", { size: 16 });
priorityBadge("CRITIQUE en BE/UE dès le 1er utilisateur", RED);
spacer(2);
para("Dès qu'un utilisateur réel utilise l'app, le RGPD s'applique (collecte d'adresses, de photos chantier, de coordonnées clients…). Il faut au minimum une politique de confidentialité + des mentions légales.", { size: 10 });
spacer(3);

sectionTitle("5.1", "Documents légaux à rédiger (ou à faire rédiger)");
bullet("Mentions légales : raison sociale, BCE/SIRET, TVA intracommunautaire, adresse, contact, directeur de publication, hébergeur.");
bullet("Conditions Générales d'Utilisation (CGU) : ce que peut faire l'utilisateur, ce qui est interdit, responsabilité.");
bullet("Politique de confidentialité (RGPD) : quelles données collectées, à quoi elles servent, qui y accède, durée de conservation, droit d'accès et d'effacement.");
bullet("Politique cookies (si analytics activés).");
bullet("Conditions Générales de Vente (CGV) si l'app est payante / SaaS.");

sectionTitle("5.2", "Informations société à fournir");
bullet("Raison sociale exacte de la structure éditrice (SRL Davide ? société de Franck ?).");
bullet("Numéro BCE Belgique (XXX.XXX.XXX) ou SIRET France.");
bullet("Numéro TVA intracommunautaire (BE0XXXXXXXXX).");
bullet("Adresse du siège social.");
bullet("Email de contact pro (contact@mesurepro.be ou autre).");
bullet("Numéro de téléphone professionnel.");

sectionTitle("5.3", "RGPD — Données collectées par l'app");
para("À jour de v2.7, l'app collecte (localement, pas encore en backend) :", { size: 9.5 });
bullet("Adresse complète des chantiers (rue, n°, CP, ville)");
bullet("Identité des clients (civilité, nom, prénom)");
bullet("Photos chantier (uploadées, stockées comme blob URL local)");
bullet("Coordonnées du profil utilisateur (nom, rôle, ville, tel, email)");
bullet("Latitude/longitude si géolocalisation activée (Nominatim) — non persistée");
spacer(2);
para("Quand on passera au backend, ces données quitteront le navigateur → DPA Supabase/Firebase à valider, possiblement une déclaration CNIL/APD selon le pays.", { color: GREY, size: 9 });

sectionTitle("5.4", "LIVRABLE attendu", GREEN);
bullet("Mentions légales rédigées (1 page).");
bullet("Politique de confidentialité (2-3 pages).");
bullet("CGU si tu vises du B2B (ou simplifié si B2C).");
bullet("Coordonnées société complètes.");
para("Coût : 0 € en DIY avec un générateur (legalplace.fr / cnil.fr modèles), 200-1000 € chez un juriste spécialisé. Temps : 2-4 h.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 6 — MATÉRIEL LASER BLE ===================== */
doc.addPage();
y = 18;
title("6. Matériel de test — Lasers BLE", { size: 16 });
priorityBadge("IMPORTANTE pour valider une feature annoncée", ORANGE);
spacer(2);
para("L'app supporte Leica DISTO, Bosch GLM et Stanley TLM via Bluetooth, MAIS le code n'a jamais été testé sur un vrai appareil. Les UUIDs proviennent de documentation tierce. Sans matos physique, impossible de valider.", { size: 10 });
spacer(3);

sectionTitle("6.1", "Modèles recommandés pour le test");
bullet("Leica DISTO X3 (~280 €) : le plus répandu chez les pros, UUIDs bien documentés.");
bullet("Bosch GLM 50C (~120 €) : entry-level avec Bluetooth, bon rapport qualité/prix.");
bullet("Stanley TLM330 (~150 €) : UUIDs à valider (placeholders dans le code).");
spacer(2);
para("Minimum requis : 1 Leica DISTO (le plus probable de fonctionner). Idéal : 1 Leica + 1 Bosch pour tester les 2 drivers.", { color: GREEN, size: 9 });

sectionTitle("6.2", "Procédure de test (à faire avec moi en session 3)");
bullet("Appareil sur ON + mode pairing Bluetooth (long appui touche BT).");
bullet("Ouvrir l'app sur Chrome desktop → Modal Nouveau projet → étape 2 → bouton 📡 Connecter laser.");
bullet("Sélectionner le device dans la fenêtre pop-up Chrome.");
bullet("Cliquer dans un champ longueur → bordure devient verte → tirer le laser.");
bullet("La valeur en mètres doit apparaître automatiquement dans le champ.");
bullet("Si rien : ouvrir Console F12 → onglet Bluetooth → noter les UUIDs réels du device.");

sectionTitle("6.3", "LIVRABLE attendu (session 3)", GREEN);
bullet("1 Leica DISTO (ou équivalent) physiquement disponible le jour du test.");
bullet("Mac avec Chrome récent + Bluetooth activé.");
bullet("Console F12 ouverte pendant le test, pour capturer logs et UUIDs.");
para("Coût : 120-300 € pour 1 laser, réutilisable indéfiniment. Temps de test : 30-60 min en session.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 7 — EMAIL / NOTIFICATIONS ===================== */
doc.addPage();
y = 18;
title("7. Email transactionnel + notifications", { size: 16 });
priorityBadge("OPTIONNELLE pour MVP — IMPORTANTE pour SaaS", ORANGE);
spacer(2);
para("Dès que tu ajoutes l'authentification, tu auras besoin d'envoyer des emails (confirmation inscription, mot de passe oublié, rapport généré envoyé au client…).", { size: 10 });
spacer(3);

sectionTitle("7.1", "Provider à choisir");
bullet("Brevo (ex-Sendinblue) : 300 emails/jour gratuits. Le plus simple, interface FR, base en Europe (RGPD-friendly).");
bullet("SendGrid : 100 emails/jour gratuits. Plus pro, doc anglo.");
bullet("Mailgun : 5000 emails/mois pendant 3 mois, puis payant.");
bullet("Postmark : meilleur pour les emails transactionnels (très haut deliverability), 100 emails/mois gratuits.");
bullet("AWS SES : 62 000 emails/mois gratuits si tu héberges sur AWS, sinon payant. Setup plus technique.");
spacer(2);
para("Recommandation MVP : Brevo (free tier confortable + interface FR).", { color: GREEN, bold: true, size: 9 });

sectionTitle("7.2", "Templates à créer (côté provider)");
bullet("Email de bienvenue après inscription.");
bullet("Confirmation d'email (lien magique).");
bullet("Réinitialisation de mot de passe.");
bullet("Rapport généré → notification client.");
bullet("Récapitulatif mensuel projets (optionnel).");

sectionTitle("7.3", "LIVRABLE attendu", GREEN);
bullet("Compte Brevo (ou autre) créé.");
bullet("Domaine d'envoi vérifié (DNS SPF/DKIM/DMARC à configurer).");
bullet("API key fournie.");
bullet("Adresse expéditeur validée (par ex. noreply@mesurepro.be).");
para("Coût : 0 €/mois jusqu'à 300 emails/jour Brevo. Temps : 30-60 min (DNS records).", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 8 — PAIEMENT (si SaaS) ===================== */
doc.addPage();
y = 18;
title("8. Provider de paiement (si tu monétises)", { size: 16 });
priorityBadge("OPTIONNELLE pour MVP", ORANGE);
spacer(2);
para("Si l'app passe en SaaS payant (abonnement / paiement à l'usage), il te faut Stripe ou équivalent.", { size: 10 });
spacer(3);

sectionTitle("8.1", "Choix");
bullet("Stripe : référence mondiale, doc parfaite, intégration JS facile. Frais 1,4 % + 0,25 € par transaction EU.");
bullet("Mollie : européen, plus simple en BE/NL, paiements iDEAL/Bancontact natifs. ~1,8 % + 0,25 €.");
bullet("Paddle : Merchant of Record (gère TVA/factures EU/US automatiquement). Plus simple en B2B international.");

sectionTitle("8.2", "Décisions de modèle économique");
bullet("Free / Pro / Enterprise ?");
bullet("Par utilisateur ou par projet ?");
bullet("Limites free tier : X projets / Y photos / Z exports ?");
bullet("Prix mensuel et annuel (annuel souvent -15 %) ?");
bullet("Trial gratuit (14 / 30 jours) ?");

sectionTitle("8.3", "LIVRABLE attendu (si SaaS)", GREEN);
bullet("Compte Stripe/Mollie créé (KYC entreprise validé).");
bullet("Mode test : publishable key + secret key.");
bullet("Mode live : (à activer plus tard quand prêt).");
bullet("Plans tarifaires définis (créés dans le dashboard Stripe).");
para("Coût : 0 € pour le setup. Frais à la transaction. Temps : 1-2 h.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 9 — ANALYTICS / MONITORING ===================== */
doc.addPage();
y = 18;
title("9. Analytics et monitoring d'erreurs", { size: 16 });
priorityBadge("UTILE pour amélioration continue", GREEN);
spacer(2);
para("Sans monitoring, impossible de savoir où les utilisateurs butent, quels boutons ils cliquent, et quelles erreurs JS leur arrivent en prod.", { size: 10 });
spacer(3);

sectionTitle("9.1", "Analytics (privacy-friendly)");
bullet("Plausible : RGPD-friendly, pas de cookies, hébergé EU. 9 €/mois après 30 j d'essai. Recommandé.");
bullet("Umami : open source, à self-héberger (gratuit) ou cloud (9 $/mois).");
bullet("PostHog : open source, plus complet (sessions, funnels), free tier 1 M events/mois.");
bullet("Google Analytics 4 : gratuit mais cookies + bandeau RGPD obligatoire.");

sectionTitle("9.2", "Monitoring d'erreurs JS");
bullet("Sentry : référence, free tier 5000 erreurs/mois. Intégration Vite/React 5 min.");
bullet("Bugsnag : équivalent, free tier 7500 erreurs/mois.");
bullet("LogRocket : enregistre la session utilisateur (vidéo + console) jusqu'à l'erreur. Plus cher (> 99 $/mois).");

sectionTitle("9.3", "LIVRABLE attendu", GREEN);
bullet("Compte Plausible (ou autre) + tracking ID.");
bullet("Compte Sentry + DSN key.");
para("Coût : 0 €/mois sur Sentry free, 9 €/mois Plausible. Temps : 30 min.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 10 — DONNÉES EXISTANTES ===================== */
doc.addPage();
y = 18;
title("10. Données existantes à importer (si applicable)", { size: 16 });
priorityBadge("DÉPEND DE TOI", ORANGE);
spacer(2);
para("Si tu as déjà des clients, des projets papier ou un autre outil, ces données peuvent être importées.", { size: 10 });
spacer(3);

sectionTitle("10.1", "Formats possibles");
bullet("CSV / Excel : 1 ligne par projet, colonnes adresse / client / mesures.");
bullet("PDF rapports existants : si tu en as 20-50 vieux, je peux écrire un parseur OCR pour les ingérer.");
bullet("Photos vrac : à classer dans une structure /chantier_XXX/sud.jpg, /est.jpg, etc.");
bullet("Base de données existante : export SQL / JSON.");

sectionTitle("10.2", "LIVRABLE attendu");
bullet("Confirmation : aucune donnée existante (on part de zéro) OU fichier d'export à fournir.");
para("Temps : variable selon le volume.", { color: GREEN, bold: true, size: 9 });

/* ===================== SECTION 11 — APPAREILS DE TEST ===================== */
doc.addPage();
y = 18;
title("11. Appareils de test (pour vraie responsivité)", { size: 16 });
priorityBadge("IMPORTANTE pour validation mobile", ORANGE);
spacer(2);
para("La responsive a été codée mais jamais testée sur de vrais appareils. Pour valider, il faut tester sur au moins :", { size: 10 });
spacer(3);

bullet("iPhone (n'importe quel iPhone récent) : Safari portrait et landscape.");
bullet("Android : un téléphone Chrome (1 utilisateur sur 3 est Android).");
bullet("iPad portrait : pour les visites de chantier sur tablette.");
bullet("MacBook ou PC : Chrome ou Safari, écran > 1280 px.");
spacer(2);
para("Si tu as juste ton iPhone perso + ton Mac, c'est largement suffisant pour valider 80 % des cas.", { color: GREY, size: 9 });

/* ===================== SECTION 12 — TIMING + COÛTS RÉCAP ===================== */
doc.addPage();
y = 18;
title("12. Récap timing + coûts", { size: 16 });
spacer(2);

const recap = [
  ["#", "Sujet", "Priorité", "Temps", "Coût/an"],
  ["1", "Google Cloud + clé API Solar/Geocoding", "Critique", "15 min", "0 € (free tier)"],
  ["2", "Backend Supabase/Firebase + auth", "Critique", "1-2 h", "0 € (free tier)"],
  ["3", "Domaine + hébergement Vercel/Netlify", "Importante", "30 min", "12 €"],
  ["4", "Branding (logo + palette + pitch)", "Importante", "Variable", "0 à 500 €"],
  ["5", "Légal RGPD + CGU + mentions", "Critique", "2-4 h", "0 à 1000 €"],
  ["6", "Laser BLE physique (1 Leica DISTO)", "Importante", "Achat + 30 min test", "120-300 €"],
  ["7", "Email Brevo + DNS SPF/DKIM", "Optionnelle", "30-60 min", "0 € (free tier)"],
  ["8", "Stripe / Mollie (si SaaS)", "Optionnelle", "1-2 h", "0 € + frais transaction"],
  ["9", "Analytics + Sentry", "Utile", "30 min", "0 à 108 €"],
  ["10", "Données existantes à importer", "Dépend de toi", "Variable", "0 €"],
  ["11", "Devices de test (iPhone + Mac suffisent)", "Importante", "10 min", "0 €"],
];
autoTable(doc, {
  startY: y,
  head: [recap[0]],
  body: recap.slice(1),
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 9 },
  bodyStyles: { fontSize: 8.5, cellPadding: 2.3 },
  alternateRowStyles: { fillColor: [245, 247, 250] },
  margin: { left: M, right: M },
  columnStyles: {
    0: { cellWidth: 8, halign: "center" },
    1: { cellWidth: 70 },
    2: { cellWidth: 24, halign: "center", fontStyle: "bold" },
    3: { cellWidth: 25, halign: "center" },
    4: { cellWidth: 38, halign: "right" },
  },
});

y = doc.lastAutoTable.finalY + 10;
title("Total estimé pour partir en prod réelle", { size: 12, divider: false });
bullet("Coût minimum (gratuit partout sauf domaine + 1 laser) : ~135 €/an.", { color: GREEN });
bullet("Coût confortable (analytics + email pro + laser pro) : ~250 €/an + frais Stripe si SaaS.", { color: GREEN });
bullet("Temps total côté toi : 6 à 12 heures réparties sur quelques jours.", { color: ORANGE });
spacer(4);
para("Pendant que tu prépares ça, j'attaque en autonomie tout ce qui peut se faire sans cette info (refactor, tests, compression photos, code-splitting, signature canvas, photos dans rapports, light theme, PWA, error boundary, recherche dans Aide, JSON export, etc.). Je te tiendrai au courant quand j'aurai terminé.", { size: 9.5, color: GREY });

/* ===================== SECTION 13 — CONTACT ===================== */
doc.addPage();
y = 18;
title("13. Comment me transmettre les infos", { size: 16 });
spacer(3);

para("Tu peux me transmettre les clés API et fichiers de 3 façons :", { size: 10, bold: true });
bullet("Option A — Coller directement dans le chat ici. Je les insère dans .env du projet. (Le repo étant public, .env reste gitignored donc safe.)");
bullet("Option B — Créer un fichier ~/Desktop/mesurepro-prep/.env avec tes variables, je le lis directement.");
bullet("Option C — Envoyer par message privé (Signal / WhatsApp / Telegram) si tu préfères, je les retape ici.");
spacer(3);

para("Pour les assets (logo, photos…) :", { size: 10, bold: true });
bullet("Dépose-les dans ~/Desktop/mesurepro-prep/ — je les déplace dans /public/ automatiquement.");
spacer(3);

para("Pour les décisions de design (palette, pitch…) :", { size: 10, bold: true });
bullet("Réponds simplement dans le chat — pas besoin de fichier.");
spacer(8);

doc.setDrawColor(...CYAN);
doc.setLineWidth(0.4);
doc.line(M, y, M + W, y);
y += 6;
para("Document généré automatiquement par MesurePro — 10 mai 2026", { size: 8, color: GREY });
para("Repo : github.com/Geniuspro71/mesurepro  ·  Live : geniuspro71.github.io/mesurepro/", { size: 8, color: GREY });

/* ===================== SAVE ===================== */
const outPath = join(homedir(), "Desktop", "MesurePro-Preparation-Davide.pdf");
const arrayBuffer = doc.output("arraybuffer");
writeFileSync(outPath, Buffer.from(arrayBuffer));
console.log("PDF generated:", outPath);
console.log("Pages:", doc.getNumberOfPages());
console.log("Size:", (Buffer.from(arrayBuffer).length / 1024).toFixed(1), "KB");
