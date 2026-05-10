import { useState, useEffect, useRef, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const C = {
  bg:"#08111E", surf:"#0F1C2E", card:"#152135", border:"#1C3050",
  acc:"#00C2FF", accL:"rgba(0,194,255,0.13)",
  grn:"#00E5A0", grnL:"rgba(0,229,160,0.11)",
  org:"#FF8C42", red:"#FF4757",
  txt:"#E8EDF5", mut:"#607898", dim:"#2E4A6A",
};

const EMPTY_MEAS = { walls:"", roof:"", perim:"", h:"", foot:"", win:"", doors:"" };

/* Demo photos: real Unsplash images, downloaded into /public/photos/
   so they load same-origin (no CORS dance). When applied as a material
   on the 3D building they go straight through THREE.TextureLoader
   without the WebGLRenderer choking on cross-origin pixels. */
function unsplash(id) {
  return "/photos/" + id + ".jpg";
}

/* Demo photos: every entry is a *real* facade photo (visually inspected),
   tagged with its orientation so TabPlans can pair it with the matching
   architectural elevation drawing automatically. */
var DEMO_PHOTOS_PARIS = [
  { name:"Façade Sud (rue)",     facade:"sud",   url: unsplash("1572120360610-d971b9d7767c") },
  { name:"Façade Nord (jardin)", facade:"nord",  url: unsplash("1568605114967-8130f3a36994") },
  { name:"Façade Est",           facade:"est",   url: unsplash("1564013799919-ab600027ffc6") },
  { name:"Façade Ouest",         facade:"ouest", url: unsplash("1494526585095-c41746248156") },
];

var DEMO_PHOTOS_LYON = [
  { name:"Façade Sud (entrée)",  facade:"sud",   url: unsplash("1605276374104-dee2a0ed3cd6") },
  { name:"Vue 3/4 (jardin)",     facade:"vue",   url: unsplash("1580587771525-78b9dba3b914") },
];

/* Demo: a real Haussmannian apartment building (5 stories, mansard roof) */
var DEMO_PHOTOS_HAUSSMANN = [
  { name:"Façade Sud (rue)",         facade:"sud",   url: unsplash("1551038247-3d9af20df552") },
  { name:"Façade Nord (cour)",       facade:"nord",  url: unsplash("1571055107559-3e67626fa8be") },
  { name:"Façade Est (mitoyen)",     facade:"est",   url: unsplash("1518780664697-55e3ad937233") },
];

const PROJS = [
  { id:1, addr:"142 Rue de la Paix", city:"Paris 75001", status:"done",
    date:"2 mai 2026", area:284, floors:2, roof:"Pignon", shape:"L",
    client:"M. Laurent Bernard",
    meas:{ walls:"412.6", roof:"186.4", perim:"68.2", h:"7.4", foot:"142.3", win:"12", doors:"3" },
    rooms:[
      {n:"Mur Nord", a:"94.2", l:"16.4 m", h:"5.7 m", t:"w"},
      {n:"Mur Sud",  a:"94.2", l:"16.4 m", h:"5.7 m", t:"w"},
      {n:"Mur Est",  a:"78.4", l:"13.8 m", h:"5.7 m", t:"w"},
      {n:"Mur Ouest",a:"78.4", l:"13.8 m", h:"5.7 m", t:"w"},
      {n:"Toit",     a:"186.4",l:"---",    h:"---",    t:"r"},
    ],
    photos: DEMO_PHOTOS_PARIS },
  { id:2, addr:"88 Avenue Victor Hugo", city:"Lyon 69006", status:"done",
    date:"28 avr. 2026", area:196, floors:1, roof:"4 pans", shape:"S",
    client:"Mme. Isabelle Moreau",
    meas:{ walls:"298.1", roof:"124.8", perim:"56.4", h:"4.8", foot:"196.0", win:"8", doors:"2" },
    rooms:[
      {n:"Mur Nord",  a:"72.4", l:"14.8 m", h:"4.8 m", t:"w"},
      {n:"Mur Sud",   a:"72.4", l:"14.8 m", h:"4.8 m", t:"w"},
      {n:"Mur Est",   a:"64.2", l:"13.4 m", h:"4.8 m", t:"w"},
      {n:"Mur Ouest", a:"64.2", l:"13.4 m", h:"4.8 m", t:"w"},
      {n:"Toiture",   a:"124.8",l:"---",    h:"---",    t:"r"},
    ],
    photos: DEMO_PHOTOS_LYON },
  { id:3, addr:"23 Boulevard Carnot", city:"Bordeaux 33000", status:"processing",
    date:"6 mai 2026", area:320, floors:3, roof:"Terrasse", shape:"M",
    meas:{...EMPTY_MEAS}, rooms:[] },
  { id:4, addr:"7 Impasse des Tilleuls", city:"Nantes 44000", status:"draft",
    date:"7 mai 2026", area:0, floors:0, roof:"--", shape:"F",
    meas:{...EMPTY_MEAS}, rooms:[] },
  /* Demo: full Haussmannian apartment building */
  { id:5, addr:"15 Boulevard Haussmann", city:"Paris 75009", status:"done",
    date:"3 mai 2026", area:780, floors:5, roof:"Mansart", shape:"M",
    client:"SCI Haussmann Patrimoine",
    meas:{ walls:"1240", roof:"360", perim:"112", h:"18.5", foot:"640", win:"42", doors:"4" },
    rooms:[
      {n:"Mur Sud (rue)",        a:"347", l:"32 m", h:"18.5 m", t:"w"},
      {n:"Mur Nord (cour)",      a:"347", l:"32 m", h:"18.5 m", t:"w"},
      {n:"Mur Est (mitoyen)",    a:"260", l:"20 m", h:"18.5 m", t:"w"},
      {n:"Mur Ouest (mitoyen)",  a:"260", l:"20 m", h:"18.5 m", t:"w"},
      {n:"Toiture mansardee",    a:"360", l:"---",  h:"---",    t:"r"},
    ],
    photos: DEMO_PHOTOS_HAUSSMANN },
];

const MATS = [
  {id:"wood",  lbl:"Bardage Bois",     col:"#C68642", price:45,  fill:"url(#mat-wood)"},
  {id:"stone", lbl:"Pierre Naturelle", col:"#9E8E7E", price:120, fill:"url(#mat-stone)"},
  {id:"brick", lbl:"Brique Rouge",     col:"#C04A2B", price:85,  fill:"url(#mat-brick)"},
  {id:"white", lbl:"Enduit Blanc",     col:"#E8E4DC", price:35,  fill:"url(#mat-white)"},
  {id:"grey",  lbl:"Beton Cire",       col:"#7A8899", price:55,  fill:"url(#mat-grey)"},
  {id:"slate", lbl:"Clin Gris",        col:"#4A5568", price:62,  fill:"url(#mat-slate)"},
];

/* ---- Material SVG patterns (procedural textures) ----
   Defined as a <defs> block to be embedded inside each SVG that
   wants to fill="url(#mat-XXX)". For uploaded photos, pass them
   as `photos` and they'll be exposed as url(#mat-photo-{id}). */
function MatDefs({ photos }) {
  return (
    <defs>
      {/* Wood: horizontal lap siding with shadow lines (US clapboard) */}
      <pattern id="mat-wood" patternUnits="userSpaceOnUse" width="60" height="14">
        <rect width="60" height="14" fill="#C68642"/>
        {/* Plank gradient (top lighter, bottom darker for relief) */}
        <rect width="60" height="14" fill="url(#mat-wood-grad)"/>
        {/* Cast shadow line at bottom of each plank */}
        <rect x="0" y="12" width="60" height="2" fill="#5a3a1a" opacity="0.85"/>
        <rect x="0" y="11" width="60" height="1" fill="#3a2410" opacity="0.5"/>
        {/* Subtle horizontal grain */}
        <line x1="0" y1="3" x2="60" y2="3.2" stroke="#a86c34" strokeWidth="0.25" opacity="0.5"/>
        <line x1="0" y1="7" x2="60" y2="6.8" stroke="#a86c34" strokeWidth="0.25" opacity="0.4"/>
        {/* Knots */}
        <ellipse cx="14" cy="6" rx="1.4" ry="0.5" fill="#8a5828" opacity="0.55"/>
        <ellipse cx="42" cy="9" rx="1.6" ry="0.5" fill="#8a5828" opacity="0.55"/>
      </pattern>
      <linearGradient id="mat-wood-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="#dba463" stopOpacity="0.55"/>
        <stop offset="100%" stopColor="#8a5828" stopOpacity="0.35"/>
      </linearGradient>

      {/* Stone: rich irregular ashlar masonry with cast shadow */}
      <pattern id="mat-stone" patternUnits="userSpaceOnUse" width="50" height="34">
        <rect width="50" height="34" fill="#9E8E7E"/>
        <path d="M 0 0  L 22 0  L 26 5  L 24 16 L 0 16  Z"  fill="#aa9886" stroke="#5e564b" strokeWidth="0.6"/>
        <path d="M 26 5 L 50 0  L 50 16 L 24 16 Z"          fill="#92816e" stroke="#5e564b" strokeWidth="0.6"/>
        <path d="M 0 16 L 16 16 L 20 26 L 14 34 L 0 34 Z"   fill="#98876f" stroke="#5e564b" strokeWidth="0.6"/>
        <path d="M 16 16 L 36 16 L 38 26 L 30 34 L 14 34 L 20 26 Z" fill="#a89683" stroke="#5e564b" strokeWidth="0.6"/>
        <path d="M 36 16 L 50 16 L 50 34 L 30 34 L 38 26 Z" fill="#8d7c6a" stroke="#5e564b" strokeWidth="0.6"/>
        {/* Texture noise inside each stone */}
        <circle cx="8"  cy="6"  r="0.4" fill="#5e564b" opacity="0.5"/>
        <circle cx="18" cy="11" r="0.3" fill="#5e564b" opacity="0.4"/>
        <circle cx="34" cy="9"  r="0.4" fill="#5e564b" opacity="0.5"/>
        <circle cx="42" cy="4"  r="0.3" fill="#5e564b" opacity="0.4"/>
        <circle cx="6"  cy="22" r="0.5" fill="#5e564b" opacity="0.5"/>
        <circle cx="22" cy="28" r="0.4" fill="#5e564b" opacity="0.45"/>
        <circle cx="40" cy="20" r="0.4" fill="#5e564b" opacity="0.5"/>
        {/* Cast shadow under each top edge */}
        <line x1="0"  y1="0.6"  x2="22" y2="0.6"  stroke="#5e564b" strokeWidth="0.4" opacity="0.4"/>
        <line x1="26" y1="5.4"  x2="50" y2="0.6"  stroke="#5e564b" strokeWidth="0.4" opacity="0.4"/>
        <line x1="0"  y1="16.6" x2="50" y2="16.6" stroke="#5e564b" strokeWidth="0.4" opacity="0.5"/>
      </pattern>

      {/* Brick: 5-shade variation, deep mortar, cast shadow under each course */}
      <pattern id="mat-brick" patternUnits="userSpaceOnUse" width="48" height="20">
        <rect width="48" height="20" fill="#c4ad88"/>
        {/* Row 1 */}
        <rect x="0.7"  y="0.7"  width="14.6" height="8.6" fill="#a0381f"/>
        <rect x="16.7" y="0.7"  width="14.6" height="8.6" fill="#b14528"/>
        <rect x="32.7" y="0.7"  width="14.6" height="8.6" fill="#933020"/>
        {/* Row 2 (staggered, half-brick offset) */}
        <rect x="0.7"  y="10.7" width="6.6"  height="8.6" fill="#a0381f"/>
        <rect x="8.7"  y="10.7" width="14.6" height="8.6" fill="#b14528"/>
        <rect x="24.7" y="10.7" width="14.6" height="8.6" fill="#a8401f"/>
        <rect x="40.7" y="10.7" width="6.6"  height="8.6" fill="#933020"/>
        {/* Highlight on top edge of each brick (sun lit) */}
        <rect x="0.7"  y="0.7"  width="14.6" height="1.2" fill="#d05f3e" opacity="0.55"/>
        <rect x="16.7" y="0.7"  width="14.6" height="1.2" fill="#d05f3e" opacity="0.55"/>
        <rect x="32.7" y="0.7"  width="14.6" height="1.2" fill="#d05f3e" opacity="0.55"/>
        <rect x="0.7"  y="10.7" width="6.6"  height="1.2" fill="#d05f3e" opacity="0.55"/>
        <rect x="8.7"  y="10.7" width="14.6" height="1.2" fill="#d05f3e" opacity="0.55"/>
        <rect x="24.7" y="10.7" width="14.6" height="1.2" fill="#d05f3e" opacity="0.55"/>
        <rect x="40.7" y="10.7" width="6.6"  height="1.2" fill="#d05f3e" opacity="0.55"/>
        {/* Shadow on bottom edge */}
        <rect x="0.7"  y="8.1"  width="46.6" height="1.2" fill="#3a1208" opacity="0.45"/>
        <rect x="0.7"  y="18.1" width="46.6" height="1.2" fill="#3a1208" opacity="0.45"/>
      </pattern>

      {/* White stucco: rich granular finish with subtle shadows */}
      <pattern id="mat-white" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#E8E4DC"/>
        <circle cx="1.5" cy="1.8" r="0.5" fill="#bcb6a7" opacity="0.55"/>
        <circle cx="6"   cy="2.2" r="0.4" fill="#bcb6a7" opacity="0.5"/>
        <circle cx="3.5" cy="5"   r="0.55" fill="#a8a294" opacity="0.55"/>
        <circle cx="8"   cy="5.5" r="0.45" fill="#bcb6a7" opacity="0.45"/>
        <circle cx="2"   cy="8"   r="0.4" fill="#a8a294" opacity="0.55"/>
        <circle cx="6.5" cy="8.5" r="0.5" fill="#bcb6a7" opacity="0.55"/>
        <circle cx="9.2" cy="0.8" r="0.3" fill="#cdc6b7" opacity="0.5"/>
        <circle cx="0.5" cy="6.5" r="0.3" fill="#cdc6b7" opacity="0.45"/>
      </pattern>

      {/* Grey concrete: poured slabs with control joints */}
      <pattern id="mat-grey" patternUnits="userSpaceOnUse" width="40" height="40">
        <rect width="40" height="40" fill="#7A8899"/>
        {/* Aggregate dots */}
        <circle cx="4"  cy="6"  r="0.45" fill="#5e6c7a" opacity="0.7"/>
        <circle cx="11" cy="13" r="0.4"  fill="#5e6c7a" opacity="0.65"/>
        <circle cx="20" cy="9"  r="0.55" fill="#5e6c7a" opacity="0.7"/>
        <circle cx="28" cy="20" r="0.4"  fill="#5e6c7a" opacity="0.65"/>
        <circle cx="34" cy="6"  r="0.5"  fill="#5e6c7a" opacity="0.7"/>
        <circle cx="6"  cy="24" r="0.5"  fill="#5e6c7a" opacity="0.65"/>
        <circle cx="14" cy="32" r="0.45" fill="#5e6c7a" opacity="0.65"/>
        <circle cx="24" cy="34" r="0.4"  fill="#5e6c7a" opacity="0.65"/>
        <circle cx="32" cy="28" r="0.55" fill="#5e6c7a" opacity="0.7"/>
        {/* Control joint */}
        <line x1="0"  y1="20" x2="40" y2="20" stroke="#3a4452" strokeWidth="0.6" opacity="0.6"/>
        <line x1="20" y1="0"  x2="20" y2="40" stroke="#3a4452" strokeWidth="0.6" opacity="0.55"/>
      </pattern>

      {/* Slate: overlapping shingles with cast shadow under each row */}
      <pattern id="mat-slate" patternUnits="userSpaceOnUse" width="22" height="14">
        <rect width="22" height="14" fill="#4A5568"/>
        {/* Top row of shingles */}
        <path d="M 0 0  L 11 0  L 11 8 L 0 8  Z"  fill="#3f4a5a" stroke="#2a323e" strokeWidth="0.3"/>
        <path d="M 11 0 L 22 0  L 22 8 L 11 8 Z"  fill="#475164" stroke="#2a323e" strokeWidth="0.3"/>
        {/* Bottom row staggered */}
        <path d="M -5.5 8  L 5.5 8  L 5.5 14 L -5.5 14 Z" fill="#414b5a" stroke="#2a323e" strokeWidth="0.3"/>
        <path d="M 5.5 8   L 16.5 8 L 16.5 14 L 5.5 14 Z" fill="#3f4a5a" stroke="#2a323e" strokeWidth="0.3"/>
        <path d="M 16.5 8  L 27.5 8 L 27.5 14 L 16.5 14 Z" fill="#475164" stroke="#2a323e" strokeWidth="0.3"/>
        {/* Highlight at the top of each shingle (slight gloss) */}
        <line x1="0" y1="0.5"  x2="22" y2="0.5"  stroke="#5a677c" strokeWidth="0.4" opacity="0.5"/>
        <line x1="0" y1="8.5"  x2="22" y2="8.5"  stroke="#5a677c" strokeWidth="0.4" opacity="0.5"/>
        {/* Shadow under each row */}
        <line x1="0" y1="7.7"  x2="22" y2="7.7"  stroke="#1a1f28" strokeWidth="0.5" opacity="0.7"/>
        <line x1="0" y1="13.7" x2="22" y2="13.7" stroke="#1a1f28" strokeWidth="0.5" opacity="0.7"/>
      </pattern>
      {/* Photo-based custom material patterns */}
      {(photos || []).map(function(p, i) {
        return (
          <pattern key={p.id || ("photo-"+i)} id={"mat-photo-"+(p.id || i)}
            patternUnits="userSpaceOnUse" width="80" height="80">
            <image href={p.url} width="80" height="80" preserveAspectRatio="xMidYMid slice"/>
          </pattern>
        );
      })}
    </defs>
  );
}

const RPTS = [
  { id:"R1", kind:"meas", status:"sent", ref:"RPT-2026-001",
    title:"Rapport de Mesures Complet", updated:"2 mai 2026",
    co:{nom:"MesurePro SAS",adr:"12 Rue Beaubourg 75004",tel:"01 42 71 00 00",email:"contact@mesurepro.fr"},
    cl:{nom:"M. Laurent Bernard",adr:"142 Rue de la Paix 75001",tel:"06 12 34 56 78",email:"l.bernard@email.fr"},
    tech:"Antoine Roussel", techDate:"2 mai 2026",
    notes:"Batiment en bon etat. Legeres fissures mur Nord au 1er etage. Aucune infiltration visible.",
    data:{"Surface murs":"412.6 m2","Surface toit":"186.4 m2","Perimetre":"68.2 m","Hauteur":"7.4 m","Emprise sol":"142.3 m2","Fenetres":"12","Portes":"3"},
    rows:[
      {n:"Mur Nord", s:"94.2 m2", l:"16.4 m", h:"5.7 m", m:"Enduit"},
      {n:"Mur Sud",  s:"94.2 m2", l:"16.4 m", h:"5.7 m", m:"Enduit"},
      {n:"Mur Est",  s:"78.4 m2", l:"13.8 m", h:"5.7 m", m:"Pierre"},
      {n:"Mur Ouest",s:"78.4 m2", l:"13.8 m", h:"5.7 m", m:"Pierre"},
      {n:"Toit",     s:"186.4 m2",l:"---",    h:"---",   m:"Tuile"},
    ]},
  { id:"R2", kind:"devis", status:"draft", ref:"DEV-2026-047",
    title:"Devis Commercial Detaille", updated:"29 avr. 2026",
    validity:"30 jours",
    co:{nom:"MesurePro SAS",adr:"12 Rue Beaubourg 75004",tel:"01 42 71 00 00",email:"contact@mesurepro.fr"},
    cl:{nom:"Mme. Isabelle Moreau",adr:"88 Av. Victor Hugo 69006",tel:"06 98 76 54 32",email:"i.moreau@email.fr"},
    lines:[
      {d:"Revetement mural Enduit blanc", q:"298.1",u:"m2", pu:"35.00", t:"10433.50"},
      {d:"Toiture Tuile 4 pans",          q:"124.8",u:"m2", pu:"95.00", t:"11856.00"},
      {d:"Refection joints",              q:"1",    u:"fft",pu:"1800.00",t:"1800.00"},
      {d:"Main oeuvre revetement",        q:"298.1",u:"m2", pu:"28.00", t:"8346.80"},
      {d:"Main oeuvre toiture",           q:"124.8",u:"m2", pu:"45.00", t:"5616.00"},
      {d:"Frais de chantier",             q:"1",    u:"fft",pu:"650.00", t:"650.00"},
    ],
    discount:"5", acompte:"30",
    payTerms:"Acompte 30% a la commande, solde a reception.",
    notes:"Delai 3 semaines. Garantie decennale incluse. TVA 20%.",
  },
  { id:"R3", kind:"insp", status:"review", ref:"INS-2026-012",
    title:"Rapport Inspection Technique", updated:"6 mai 2026",
    co:{nom:"MesurePro SAS",adr:"12 Rue Beaubourg 75004",tel:"01 42 71 00 00",email:"contact@mesurepro.fr"},
    cl:{nom:"SCI Carnot",adr:"23 Bd Carnot 33000",tel:"05 56 00 11 22",email:"gestion@sci-carnot.fr"},
    tech:"Nadia Fontaine", techDate:"6 mai 2026",
    checks:[
      {z:"Facade",       it:"Fissures en facade",             s:"warn",note:"Microfissures horizontales RDC"},
      {z:"Facade",       it:"Etat de l enduit",               s:"ok",  note:"Bon etat general"},
      {z:"Facade",       it:"Alignement menuiseries",         s:"ok",  note:"Conforme"},
      {z:"Toiture",      it:"Etat tuiles ardoises",           s:"crit",note:"Plusieurs tuiles cassees urgent"},
      {z:"Toiture",      it:"Evacuation eaux pluviales",      s:"warn",note:"Gouttiere obstruee cote Est"},
      {z:"Toiture",      it:"Etancheite faitiere",            s:"ok",  note:"RAS"},
      {z:"Murs porteurs",it:"Humidite remontees capillaires", s:"warn",note:"Traces humidite pied mur Nord"},
      {z:"Murs porteurs",it:"Integrite structurelle",         s:"ok",  note:"Aucun desordre visible"},
      {z:"Ouvertures",   it:"Etancheite fenetres",            s:"ok",  note:"Joints en bon etat"},
      {z:"Ouvertures",   it:"Etat des volets",                s:"warn",note:"3 volets a repeindre cote Sud"},
    ],
    reco:"1. Remplacer tuiles endommagees en urgence\n2. Deboucher gouttieres cote Est\n3. Traiter remontees capillaires mur Nord\n4. Reprendre enduit fissure facade RDC",
  },
  { id:"R4", kind:"prop", status:"draft", ref:"PRO-2026-003",
    title:"Proposition Commerciale et Contrat", updated:"7 mai 2026",
    version:"v1.2",
    co:{nom:"MesurePro SAS",adr:"12 Rue Beaubourg 75004",tel:"01 42 71 00 00",email:"contact@mesurepro.fr"},
    cl:{nom:"Groupement Immobilier IdF",adr:"8 Place de la Bourse 75002",tel:"01 55 00 44 33",email:"acquisitions@giif.fr"},
    intro:"MesurePro SAS propose une solution complete de mesure et estimation pour votre portefeuille immobilier. Notre technologie transforme de simples photos en modeles 3D precis en moins de 10 minutes.",
    projs:[
      {n:"142 Rue de la Paix Paris",  s:"412.6 m2",b:"38 500 EUR",d:"3 semaines",p:"Haute"},
      {n:"88 Av. Victor Hugo Lyon",   s:"298.1 m2",b:"28 900 EUR",d:"2 semaines",p:"Moyenne"},
    ],
    gantt:[
      {t:"Audit relevés",    s:1,dur:2,col:"#00C2FF"},
      {t:"Modelisation 3D",  s:2,dur:3,col:"#00E5A0"},
      {t:"Chiffrage devis",  s:4,dur:2,col:"#FF8C42"},
      {t:"Travaux Paris",    s:5,dur:3,col:"#a855f7"},
      {t:"Travaux Lyon",     s:7,dur:2,col:"#a855f7"},
      {t:"Reception cloture",s:9,dur:1,col:"#00E5A0"},
    ],
    cgu:"Tout devis accepte engage le client. Prix fermes 30 jours. MesurePro est assuree en RC professionnelle et decennale.",
    sigCl:"", sigPro:"7 mai 2026",
  },
];

/* ---- utilities ---- */
const sh = (hex, p) => {
  const n = parseInt(hex.replace("#",""),16);
  const cl = v => Math.min(255,Math.max(0,v));
  return "rgb("+cl((n>>16)+p)+","+cl(((n>>8)&255)+p)+","+cl((n&255)+p)+")";
};
const W = 210; /* sidebar width */

function slug(s) {
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase() || "export";
}

function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function csvEscape(v) {
  var s = String(v == null ? "" : v);
  if (s.indexOf('"') !== -1 || s.indexOf(";") !== -1 || s.indexOf("\n") !== -1) {
    return '"' + s.replace(/"/g,'""') + '"';
  }
  return s;
}

function exportCsv(rows, filename) {
  var content = "﻿" + rows.map(function(r){ return r.map(csvEscape).join(";"); }).join("\n");
  downloadBlob(new Blob([content], {type:"text/csv;charset=utf-8"}), filename);
}

function exportProjectPdf(project) {
  var doc = new jsPDF();
  var m = project.meas || {};
  doc.setFontSize(18); doc.setTextColor(0); doc.text("MesurePro - Rapport mesures", 14, 18);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(project.addr || "", 14, 26);
  doc.text(project.city || "", 14, 31);
  doc.setTextColor(0);
  autoTable(doc, {
    startY: 38,
    head: [["Mesure","Valeur","Unite"]],
    body: [
      ["Surface murs", m.walls||"-", "m2"],
      ["Surface toit", m.roof||"-", "m2"],
      ["Perimetre",    m.perim||"-","m"],
      ["Hauteur",      m.h||"-",    "m"],
      ["Emprise sol",  m.foot||"-", "m2"],
      ["Fenetres",     m.win||"-",  ""],
      ["Portes",       m.doors||"-",""],
    ],
    headStyles: {fillColor: [21,33,53]},
  });
  if (project.rooms && project.rooms.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Facade","Surface","Long.","Haut.","Type"]],
      body: project.rooms.map(function(r){ return [r.n||"",r.a||"",r.l||"",r.h||"",r.t==="r"?"Toit":"Mur"]; }),
      headStyles: {fillColor: [21,33,53]},
    });
  }
  doc.save("mesurepro-" + slug(project.addr) + ".pdf");
}

function exportProjectCsv(project) {
  var m = project.meas || {};
  var rows = [
    ["Champ","Valeur"],
    ["Adresse", project.addr||""],
    ["Ville", project.city||""],
    ["Surface murs (m2)", m.walls||""],
    ["Surface toit (m2)", m.roof||""],
    ["Perimetre (m)", m.perim||""],
    ["Hauteur (m)", m.h||""],
    ["Emprise sol (m2)", m.foot||""],
    ["Fenetres", m.win||""],
    ["Portes", m.doors||""],
    [],
    ["Facades:"],
    ["Nom","Surface (m2)","Longueur","Hauteur","Type"],
  ];
  (project.rooms||[]).forEach(function(r){
    rows.push([r.n||"",r.a||"",r.l||"",r.h||"",r.t==="r"?"Toit":"Mur"]);
  });
  exportCsv(rows, "mesurepro-" + slug(project.addr) + ".csv");
}

function exportProjectXlsx(project) { exportProjectCsv(project); }

function exportReportPdf(r) {
  var doc = new jsPDF();
  doc.setFontSize(16); doc.text(r.title||"Rapport", 14, 18);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text("Reference: " + (r.ref||""), 14, 26);
  if (r.updated) doc.text("Mise a jour: " + r.updated, 14, 31);
  doc.setTextColor(0);
  var y = 38;
  if (r.co || r.cl) {
    autoTable(doc, {
      startY: y,
      head: [["Entreprise", r.co ? (r.co.nom||"") : "", "Client", r.cl ? (r.cl.nom||"") : ""]],
      body: [
        ["Adresse", r.co?(r.co.adr||""):"", "Adresse", r.cl?(r.cl.adr||""):""],
        ["Tel",     r.co?(r.co.tel||""):"", "Tel",     r.cl?(r.cl.tel||""):""],
        ["Email",   r.co?(r.co.email||""):"","Email",  r.cl?(r.cl.email||""):""],
      ],
      headStyles: {fillColor: [21,33,53]},
      styles: {fontSize: 9},
    });
    y = doc.lastAutoTable.finalY + 8;
  }
  if (r.kind === "meas") {
    if (r.data) {
      autoTable(doc, {
        startY: y,
        head: [["Mesure","Valeur"]],
        body: Object.keys(r.data).map(function(k){ return [k, r.data[k]]; }),
        headStyles: {fillColor: [21,33,53]},
      });
      y = doc.lastAutoTable.finalY + 8;
    }
    if (r.rows) {
      autoTable(doc, {
        startY: y,
        head: [["Facade","Surface","Long.","Haut.","Materiau"]],
        body: r.rows.map(function(row){ return [row.n,row.s,row.l,row.h,row.m]; }),
        headStyles: {fillColor: [21,33,53]},
      });
      y = doc.lastAutoTable.finalY + 8;
    }
    if (r.notes) {
      doc.setFontSize(10);
      var notes = doc.splitTextToSize("Notes: " + r.notes, 180);
      doc.text(notes, 14, y);
    }
  }
  if (r.kind === "devis") {
    if (r.lines) {
      autoTable(doc, {
        startY: y,
        head: [["Description","Qte","Unite","P.U. EUR","Total EUR"]],
        body: r.lines.map(function(l){ return [l.d,l.q,l.u,l.pu,l.t]; }),
        headStyles: {fillColor: [21,33,53]},
      });
      y = doc.lastAutoTable.finalY + 6;
    }
    var sub = (r.lines||[]).reduce(function(a,l){ return a + parseFloat(l.t||0); }, 0);
    var disc = parseFloat(r.discount||0);
    var ad = sub*(1-disc/100), tva = ad*0.2, tot = ad+tva;
    autoTable(doc, {
      startY: y,
      body: [
        ["Sous-total HT", sub.toFixed(2)+" EUR"],
        ["Remise "+disc+"%", "-"+(sub*disc/100).toFixed(2)+" EUR"],
        ["TVA 20%", tva.toFixed(2)+" EUR"],
        ["TOTAL TTC", tot.toFixed(2)+" EUR"],
      ],
      styles: {fontSize: 11, fontStyle: "bold"},
      columnStyles: {1: {halign: "right"}},
    });
  }
  if (r.kind === "insp" && r.checks) {
    var STAT = {ok:"Conforme",warn:"Surveiller",crit:"Critique"};
    autoTable(doc, {
      startY: y,
      head: [["Zone","Item","Statut","Note"]],
      body: r.checks.map(function(c){ return [c.z,c.it,STAT[c.s]||c.s,c.note||""]; }),
      headStyles: {fillColor: [21,33,53]},
      styles: {fontSize: 9},
    });
    y = doc.lastAutoTable.finalY + 8;
    if (r.reco) {
      doc.setFontSize(11); doc.text("Recommandations:", 14, y);
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(r.reco, 180), 14, y + 6);
    }
  }
  if (r.kind === "prop") {
    if (r.intro) {
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(r.intro, 180), 14, y);
      y += 24;
    }
    if (r.projs) {
      autoTable(doc, {
        startY: y,
        head: [["Projet","Surface","Budget","Delai","Priorite"]],
        body: r.projs.map(function(p){ return [p.n,p.s,p.b,p.d,p.p]; }),
        headStyles: {fillColor: [21,33,53]},
      });
    }
  }
  doc.save("mesurepro-" + slug(r.ref || r.title) + ".pdf");
}

const BM = {
  done:      {lbl:"Termine",     col:"#00E5A0", bg:"rgba(0,229,160,0.12)"},
  sent:      {lbl:"Envoye",      col:"#00E5A0", bg:"rgba(0,229,160,0.12)"},
  processing:{lbl:"En cours",    col:"#FF8C42", bg:"rgba(255,140,66,0.12)"},
  review:    {lbl:"En revision", col:"#00C2FF", bg:"rgba(0,194,255,0.13)"},
  draft:     {lbl:"Brouillon",   col:"#607898", bg:"rgba(96,120,152,0.14)"},
};

function Badge({ s }) {
  const b = BM[s] || BM.draft;
  return (
    <span style={{fontSize:10,fontWeight:700,color:b.col,background:b.bg,
      padding:"3px 9px",borderRadius:20,textTransform:"uppercase",whiteSpace:"nowrap"}}>
      {b.lbl}
    </span>
  );
}

function Btn({ onClick, children, primary, sm, style:ex }) {
  const bg = primary ? "#00C2FF" : "#152135";
  const col = primary ? "#000" : "#E8EDF5";
  return (
    <button type="button" onClick={onClick} style={{
      display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5,
      background:bg, color:col,
      border:primary ? "none" : "1px solid #1C3050",
      borderRadius:7, cursor:"pointer",
      padding:sm ? "4px 11px" : "8px 16px",
      fontSize:sm ? 11 : 13, fontWeight:primary ? 800 : 500,
      lineHeight:1.2, outline:"none", flexShrink:0,
      ...ex
    }}>{children}</button>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,
      background:"#00E5A0",color:"#000",fontWeight:700,fontSize:13,
      padding:"10px 20px",borderRadius:8,pointerEvents:"none"}}>
      OK {msg}
    </div>
  );
}

/* ---- EF: click-to-edit, confirm with OK button, no onBlur ---- */
function EF({ val, onSave, multi, style:ex }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(val == null ? "" : val));
  useEffect(() => { if (!editing) setV(String(val == null ? "" : val)); }, [val]);

  const commit = () => { onSave(v); setEditing(false); };
  const cancel = () => { setV(String(val == null ? "" : val)); setEditing(false); };

  if (editing) {
    const inp = {
      fontFamily:"inherit",fontSize:"inherit",fontWeight:"inherit",
      color:"#E8EDF5",background:"#152135",
      border:"2px solid #00C2FF",borderRadius:5,
      padding:"3px 8px",outline:"none",boxSizing:"border-box",...ex,
    };
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:4,width:"100%"}}>
        {multi
          ? <textarea value={v} onChange={e => setV(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === "Escape") cancel(); }}
              style={{...inp,resize:"vertical",minHeight:60,lineHeight:1.5,width:"100%"}}/>
          : <input value={v} onChange={e => setV(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
              style={{...inp,minWidth:50,flex:1}}/>
        }
        <button type="button" onClick={commit}
          style={{background:"#00C2FF",color:"#000",border:"none",borderRadius:4,
            padding:"2px 8px",fontSize:12,fontWeight:800,cursor:"pointer",flexShrink:0}}>
          OK
        </button>
        <button type="button" onClick={cancel}
          style={{background:"#152135",color:"#607898",border:"1px solid #1C3050",
            borderRadius:4,padding:"2px 7px",fontSize:11,cursor:"pointer",flexShrink:0}}>
          X
        </button>
      </span>
    );
  }
  const display = (val !== null && val !== undefined && String(val).trim() !== "") ? String(val) : null;
  return (
    <span onClick={() => { setV(String(val == null ? "" : val)); setEditing(true); }}
      title="Cliquer pour modifier"
      style={{cursor:"pointer",borderBottom:"1px dashed #2E4A6A",display:"inline-block",minWidth:20,...ex}}>
      {display || <span style={{color:"#2E4A6A",fontStyle:"italic"}}>---</span>}
    </span>
  );
}

/* ---- House SVG (4 shapes) ---- */
function House({ shape, mat, matCol, small, photos }) {
  /* Wall fill: prefer pattern (mat.fill) > color (mat.col / matCol fallback) */
  const colFallback = (mat && mat.col) || matCol || "#BFB09A";
  const wc = (mat && mat.fill) || colFallback;
  const wcDark = (mat && mat.fill) || sh(colFallback, -15);
  const rc = "#2E1E10";
  const win = "#7BBCE8";
  const dr = "#6B4226";
  const sc = small ? 0.5 : 1;
  const W2 = 320 * sc;
  const H2 = 200 * sc;
  if (shape === "S") {
    return (
      <svg width={W2} height={H2} viewBox="0 0 320 200">
        <MatDefs photos={photos}/>
        <rect x="25" y="85" width="270" height="115" fill={wc} rx="2"/>
        <polygon points="25,86 160,16 295,86" fill={rc}/>
        <rect x="55"  y="108" width="54" height="44" fill={win} rx="3" opacity="0.88"/>
        <line x1="55"  x2="109" y1="130" y2="130" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <line x1="82"  x2="82"  y1="108" y2="152" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <rect x="215" y="108" width="54" height="44" fill={win} rx="3" opacity="0.88"/>
        <line x1="215" x2="269" y1="130" y2="130" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <line x1="242" x2="242" y1="108" y2="152" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <rect x="128" y="138" width="64" height="62" fill={dr} rx="2"/>
        <circle cx="184" cy="172" r="3" fill="#DAA520"/>
        <rect x="205"  y="32"  width="22" height="30" fill={rc}/>
      </svg>
    );
  }
  if (shape === "M") {
    return (
      <svg width={W2} height={H2} viewBox="0 0 320 200">
        <MatDefs photos={photos}/>
        <rect x="10" y="72" width="300" height="118" fill={wc} rx="4"/>
        <rect x="8"  y="63" width="304" height="13"  fill={rc} rx="2"/>
        <rect x="20" y="90" width="68"  height="50"  fill={win} rx="4" opacity="0.9"/>
        <line x1="54"  x2="54"  y1="90" y2="140" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <line x1="20"  x2="88"  y1="115" y2="115" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <rect x="108" y="90" width="68"  height="50"  fill={win} rx="4" opacity="0.9"/>
        <line x1="142" x2="142" y1="90" y2="140" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <line x1="108" x2="176" y1="115" y2="115" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <rect x="196" y="90" width="98"  height="50"  fill={win} rx="4" opacity="0.9"/>
        <line x1="245" x2="245" y1="90" y2="140" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <line x1="196" x2="294" y1="115" y2="115" stroke="#fff" strokeWidth="0.8" opacity="0.4"/>
        <rect x="125" y="150" width="55" height="40" fill={dr} rx="3"/>
        <rect x="62"  y="26"  width="196" height="8"  fill={rc} rx="2"/>
      </svg>
    );
  }
  if (shape === "F") {
    return (
      <svg width={W2} height={H2} viewBox="0 0 320 200">
        <MatDefs photos={photos}/>
        <rect x="10" y="92" width="300" height="98" fill={wc} rx="2"/>
        <polygon points="10,93 160,25 310,93" fill={rc}/>
        <rect x="22"  y="110" width="58" height="46" fill={win} rx="2" opacity="0.85"/>
        <line x1="51"  x2="51"  y1="110" y2="156" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <line x1="22"  x2="80"  y1="133" y2="133" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <rect x="98"  y="110" width="50" height="44" fill={win} rx="2" opacity="0.85"/>
        <line x1="123" x2="123" y1="110" y2="154" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <line x1="98"  x2="148" y1="132" y2="132" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <rect x="172" y="110" width="50" height="44" fill={win} rx="2" opacity="0.85"/>
        <line x1="197" x2="197" y1="110" y2="154" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <line x1="172" x2="222" y1="132" y2="132" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <rect x="240" y="110" width="58" height="46" fill={win} rx="2" opacity="0.85"/>
        <line x1="269" x2="269" y1="110" y2="156" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <line x1="240" x2="298" y1="133" y2="133" stroke="#fff" strokeWidth="0.7" opacity="0.38"/>
        <rect x="133" y="148" width="54" height="42" fill={dr} rx="2"/>
        <circle cx="178" cy="172" r="2.5" fill="#DAA520"/>
      </svg>
    );
  }
  return (
    <svg width={W2} height={H2} viewBox="0 0 320 200">
      <MatDefs photos={photos}/>
      <rect x="18"  y="98"  width="194" height="92" fill={wc}/>
      <rect x="212" y="118" width="88"  height="72" fill={wcDark} rx="1"/>
      <polygon points="8,99 122,35 214,99" fill={rc}/>
      <polygon points="208,119 255,84 308,119" fill={rc}/>
      <rect x="36"  y="117" width="52" height="41" fill={win} rx="3" opacity="0.88"/>
      <line x1="62"  x2="62"  y1="117" y2="158" stroke="#fff" strokeWidth="0.8" opacity="0.42"/>
      <line x1="36"  x2="88"  y1="138" y2="138" stroke="#fff" strokeWidth="0.8" opacity="0.42"/>
      <rect x="103" y="117" width="52" height="41" fill={win} rx="3" opacity="0.88"/>
      <line x1="129" x2="129" y1="117" y2="158" stroke="#fff" strokeWidth="0.8" opacity="0.42"/>
      <line x1="103" x2="155" y1="138" y2="138" stroke="#fff" strokeWidth="0.8" opacity="0.42"/>
      <rect x="221" y="136" width="46" height="36" fill={win} rx="3" opacity="0.88"/>
      <line x1="244" x2="244" y1="136" y2="172" stroke="#fff" strokeWidth="0.8" opacity="0.42"/>
      <rect x="160" y="146" width="42" height="44" fill={dr} rx="2"/>
      <circle cx="195" cy="170" r="2.5" fill="#DAA520"/>
      <rect x="86"  y="44"  width="20" height="28" fill={sh(rc,-8)}/>
    </svg>
  );
}

/* ---- Iso 3D model (SVG, no canvas) ---- */
/* ---- Building3D: walls + roof + foundation as Three.js meshes ---- */
/* ---- Canvas 2D pattern drawers (procedural texture maps)
   Designed for high-res tiles (1024 px). Each function paints a
   tileable albedo. The matching draw*Bump function paints a greyscale
   bump map encoding relief depth (white = peak, black = valley/joint).
   meshStandardMaterial uses both: map (color) + bumpMap (depth). */

/* Tiny seedable PRNG for deterministic noise */
function seededRand(seed) {
  var s = seed | 0;
  return function() {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

/* --- BRICK --- */
function drawBrickTex(ctx, W, H) {
  var brickW = W / 6, brickH = H / 18, mortar = 2.2;
  /* Mortar background with subtle variation */
  ctx.fillStyle = "#b8a37e"; ctx.fillRect(0, 0, W, H);
  var rng = seededRand(42);
  /* Mortar speckle */
  for (var i = 0; i < 800; i++) {
    var rx = rng() * W, ry = rng() * H;
    ctx.fillStyle = "rgba(" + (160 + Math.floor(rng()*40)) + "," + (140 + Math.floor(rng()*30)) + "," + (110 + Math.floor(rng()*30)) + ",0.6)";
    ctx.fillRect(rx, ry, 1.5, 1.5);
  }
  var palette = [
    {r:160,g: 56,b: 31},  /* dark red */
    {r:177,g: 69,b: 40},  /* mid red */
    {r:147,g: 48,b: 32},  /* very dark */
    {r:168,g: 64,b: 31},  /* warm */
    {r:179,g: 74,b: 44},  /* lighter warm */
    {r:140,g: 50,b: 35},  /* aubergine */
    {r:185,g: 88,b: 60},  /* salmon-y aged */
  ];
  for (var row = 0; row < 18; row++) {
    var off = (row % 2) ? brickW * 0.5 : 0;
    for (var col = -1; col <= 6; col++) {
      var bx = col * brickW + off + mortar;
      var by = row * brickH + mortar;
      var bw = brickW - mortar * 2;
      var bh = brickH - mortar * 2;
      if (bx + bw < 0 || bx > W) continue;
      var p = palette[Math.floor(rng() * palette.length)];
      /* Per-brick subtle hue + value variation */
      var dR = (rng() - 0.5) * 24, dG = (rng() - 0.5) * 18, dB = (rng() - 0.5) * 14;
      var br = Math.max(0, Math.min(255, p.r + dR));
      var bg = Math.max(0, Math.min(255, p.g + dG));
      var bb = Math.max(0, Math.min(255, p.b + dB));
      var grad = ctx.createLinearGradient(bx, by, bx, by + bh);
      grad.addColorStop(0,    "rgb("+Math.min(255,br+22)+","+Math.min(255,bg+18)+","+Math.min(255,bb+15)+")");
      grad.addColorStop(0.5,  "rgb("+br+","+bg+","+bb+")");
      grad.addColorStop(1,    "rgb("+Math.max(0,br-30)+","+Math.max(0,bg-22)+","+Math.max(0,bb-18)+")");
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, bw, bh);
      /* Texture noise inside the brick (microvariations) */
      for (var s = 0; s < 14; s++) {
        var nx = bx + rng() * bw, ny = by + rng() * bh;
        ctx.fillStyle = "rgba(0,0,0," + (0.04 + rng() * 0.10) + ")";
        ctx.fillRect(nx, ny, 1, 1);
      }
      /* Edge cast shadow inside mortar joint (left + bottom) */
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(bx, by + bh - 1.5, bw, 1.5);
      ctx.fillRect(bx, by, 1.2, bh);
      /* Edge highlight (top + right edge of brick) */
      ctx.fillStyle = "rgba(255,210,180,0.40)";
      ctx.fillRect(bx, by, bw, 1);
      ctx.fillRect(bx + bw - 0.8, by, 0.8, bh);
      /* Random stains on a few bricks (efflorescence / weathering) */
      if (rng() < 0.12) {
        ctx.fillStyle = "rgba(255,255,255,0.20)";
        ctx.beginPath();
        ctx.ellipse(bx + bw * (0.3 + rng() * 0.4), by + bh * (0.3 + rng() * 0.4),
                    bw * 0.25, bh * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rng() < 0.06) {
        ctx.fillStyle = "rgba(70,90,40,0.32)"; /* moss tint */
        ctx.beginPath();
        ctx.ellipse(bx + bw * 0.2, by + bh * 0.85, bw * 0.35, bh * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
function drawBrickBump(ctx, W, H) {
  /* Black mortar joints, white bricks (with slight slope highlight) */
  var brickW = W / 6, brickH = H / 18, mortar = 2.2;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  for (var row = 0; row < 18; row++) {
    var off = (row % 2) ? brickW * 0.5 : 0;
    for (var col = -1; col <= 6; col++) {
      var bx = col * brickW + off + mortar;
      var by = row * brickH + mortar;
      var bw = brickW - mortar * 2;
      var bh = brickH - mortar * 2;
      if (bx + bw < 0 || bx > W) continue;
      var grad = ctx.createLinearGradient(bx, by, bx, by + bh);
      grad.addColorStop(0,   "#fff");
      grad.addColorStop(0.7, "#cccccc");
      grad.addColorStop(1,   "#888");
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, bw, bh);
    }
  }
}

/* --- WOOD (horizontal lap siding) --- */
function drawWoodTex(ctx, W, H) {
  var planks = 14;
  var planeH = H / planks;
  var rng = seededRand(7);
  ctx.fillStyle = "#8a5828"; ctx.fillRect(0, 0, W, H);
  for (var i = 0; i < planks; i++) {
    var y = i * planeH;
    /* Per-plank base hue/value variation */
    var dR = (rng() - 0.5) * 22, dG = (rng() - 0.5) * 16, dB = (rng() - 0.5) * 12;
    var br = Math.max(0, Math.min(255, 198 + dR));
    var bg = Math.max(0, Math.min(255, 134 + dG));
    var bb = Math.max(0, Math.min(255,  66 + dB));
    var grad = ctx.createLinearGradient(0, y, 0, y + planeH);
    grad.addColorStop(0,    "rgb("+Math.min(255,br+34)+","+Math.min(255,bg+24)+","+Math.min(255,bb+18)+")");
    grad.addColorStop(0.5,  "rgb("+br+","+bg+","+bb+")");
    grad.addColorStop(0.95, "rgb("+Math.max(0,br-46)+","+Math.max(0,bg-32)+","+Math.max(0,bb-22)+")");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, planeH);
    /* Wood grain — long horizontal streaks */
    for (var g = 0; g < 28; g++) {
      var gy = y + rng() * planeH;
      ctx.strokeStyle = "rgba(58,38,18," + (0.10 + rng() * 0.15) + ")";
      ctx.lineWidth = 0.5 + rng();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(W*0.3, gy + (rng()-0.5)*1.5, W*0.7, gy + (rng()-0.5)*1.5, W, gy + (rng()-0.5)*1.5);
      ctx.stroke();
    }
    /* Cast shadow at the bottom of each plank (siding overlap) */
    ctx.fillStyle = "rgba(30,18,8,0.85)"; ctx.fillRect(0, y + planeH - 3, W, 3);
    ctx.fillStyle = "rgba(80,50,24,0.5)"; ctx.fillRect(0, y + planeH - 5, W, 2);
    /* Knots (random positions per plank) */
    if (rng() < 0.4) {
      var kx = rng() * W, ky = y + planeH * (0.3 + rng() * 0.4);
      ctx.fillStyle = "rgba(58,30,12,0.65)";
      ctx.beginPath(); ctx.ellipse(kx, ky, 7 + rng()*5, 3 + rng()*2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(110,68,30,0.55)";
      ctx.beginPath(); ctx.ellipse(kx, ky, 4 + rng()*3, 2, 0, 0, Math.PI*2); ctx.fill();
    }
    /* Vertical butt joint occasionally */
    if (rng() < 0.5) {
      var jx = rng() * W;
      ctx.strokeStyle = "rgba(20,12,4,0.7)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(jx, y + 1); ctx.lineTo(jx, y + planeH - 3); ctx.stroke();
    }
  }
}
function drawWoodBump(ctx, W, H) {
  var planks = 14, planeH = H / planks;
  ctx.fillStyle = "#cccccc"; ctx.fillRect(0, 0, W, H);
  for (var i = 0; i < planks; i++) {
    var y = i * planeH;
    var grad = ctx.createLinearGradient(0, y, 0, y + planeH);
    grad.addColorStop(0,    "#dddddd");
    grad.addColorStop(0.85, "#aaaaaa");
    grad.addColorStop(1,    "#000000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, planeH);
  }
}

/* --- STONE (rubble masonry) --- */
function drawStoneTex(ctx, W, H) {
  ctx.fillStyle = "#5e564b"; ctx.fillRect(0, 0, W, H); /* mortar */
  var rng = seededRand(99);
  /* Lay out irregular stones by rows of varying heights */
  var y = 0;
  while (y < H) {
    var rowH = H * (0.10 + rng() * 0.10);
    var x = 0;
    while (x < W) {
      var stoneW = W * (0.08 + rng() * 0.18);
      var stoneH = rowH * (0.85 + rng() * 0.15);
      var sx = x + 2, sy = y + 2;
      var sw = Math.min(stoneW - 4, W - sx - 2);
      var sh = stoneH - 4;
      if (sw < 4 || sh < 4) { x += stoneW; continue; }
      /* Pick a stone shade family */
      var shade = 110 + Math.floor(rng() * 60); /* 110-170 grey */
      var warm  = Math.floor(rng() * 25);
      var br = Math.min(255, shade + warm + 8);
      var bg = Math.min(255, shade + warm * 0.6);
      var bb = Math.min(255, shade);
      /* Polygonal stone (slightly irregular) */
      ctx.beginPath();
      ctx.moveTo(sx + rng()*3,        sy + rng()*3);
      ctx.lineTo(sx + sw - rng()*3,   sy + rng()*3);
      ctx.lineTo(sx + sw - rng()*3,   sy + sh - rng()*3);
      ctx.lineTo(sx + rng()*3,        sy + sh - rng()*3);
      ctx.closePath();
      var grad = ctx.createRadialGradient(sx + sw/2, sy + sh/2, 1, sx + sw/2, sy + sh/2, Math.max(sw, sh));
      grad.addColorStop(0,    "rgb("+Math.min(255,br+20)+","+Math.min(255,bg+18)+","+Math.min(255,bb+15)+")");
      grad.addColorStop(0.7,  "rgb("+br+","+bg+","+bb+")");
      grad.addColorStop(1,    "rgb("+Math.max(0,br-40)+","+Math.max(0,bg-32)+","+Math.max(0,bb-25)+")");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(35,30,22,0.8)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      /* Speckle texture inside */
      for (var n = 0; n < 18; n++) {
        var nx = sx + rng() * sw, ny = sy + rng() * sh;
        ctx.fillStyle = "rgba(0,0,0," + (0.06 + rng() * 0.18) + ")";
        ctx.fillRect(nx, ny, 1, 1);
      }
      /* Random small crack */
      if (rng() < 0.25) {
        ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(sx + rng()*sw, sy + rng()*sh);
        ctx.lineTo(sx + rng()*sw, sy + rng()*sh);
        ctx.stroke();
      }
      x += stoneW;
    }
    y += rowH;
  }
}
function drawStoneBump(ctx, W, H) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  var rng = seededRand(99);
  var y = 0;
  while (y < H) {
    var rowH = H * (0.10 + rng() * 0.10);
    var x = 0;
    while (x < W) {
      var stoneW = W * (0.08 + rng() * 0.18);
      var stoneH = rowH * (0.85 + rng() * 0.15);
      var sx = x + 2, sy = y + 2;
      var sw = Math.min(stoneW - 4, W - sx - 2);
      var sh = stoneH - 4;
      if (sw < 4 || sh < 4) { x += stoneW; continue; }
      ctx.beginPath();
      ctx.moveTo(sx + rng()*3,        sy + rng()*3);
      ctx.lineTo(sx + sw - rng()*3,   sy + rng()*3);
      ctx.lineTo(sx + sw - rng()*3,   sy + sh - rng()*3);
      ctx.lineTo(sx + rng()*3,        sy + sh - rng()*3);
      ctx.closePath();
      var rad = ctx.createRadialGradient(sx + sw/2, sy + sh/2, 1, sx + sw/2, sy + sh/2, Math.max(sw, sh));
      rad.addColorStop(0,   "#fff");
      rad.addColorStop(0.6, "#cccccc");
      rad.addColorStop(1,   "#666");
      ctx.fillStyle = rad;
      ctx.fill();
      x += stoneW;
    }
    y += rowH;
  }
}

/* --- SLATE (overlapping shingles) --- */
function drawSlateTex(ctx, W, H) {
  ctx.fillStyle = "#2c333d"; ctx.fillRect(0, 0, W, H);
  var rng = seededRand(31);
  var rows = 8;
  var rowH = H / rows;
  var tileW = W / 11;
  for (var row = 0; row < rows; row++) {
    var off = (row % 2) ? tileW * 0.5 : 0;
    var y = row * rowH;
    for (var col = -1; col <= 11; col++) {
      var x = col * tileW + off;
      /* Per-tile hue variation */
      var v = 65 + Math.floor(rng() * 35); /* 65-100 grey */
      var b1 = "rgb(" + (v+15) + "," + (v+22) + "," + (v+30) + ")";
      var b2 = "rgb(" + v + "," + (v+5) + "," + (v+15) + ")";
      var b3 = "rgb(" + Math.max(0,v-30) + "," + Math.max(0,v-25) + "," + Math.max(0,v-15) + ")";
      var grad = ctx.createLinearGradient(0, y, 0, y + rowH);
      grad.addColorStop(0,    b1);
      grad.addColorStop(0.55, b2);
      grad.addColorStop(1,    b3);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, tileW, rowH);
      /* Subtle vertical edge lines between adjacent shingles */
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x + tileW, y); ctx.lineTo(x + tileW, y + rowH); ctx.stroke();
      /* Texture noise on the slate */
      for (var n = 0; n < 8; n++) {
        ctx.fillStyle = "rgba(0,0,0," + (0.06 + rng() * 0.10) + ")";
        ctx.fillRect(x + rng() * tileW, y + rng() * rowH, 1, 1);
      }
    }
    /* Hard cast shadow at the bottom of each row (where the shingles overlap) */
    var shGrad = ctx.createLinearGradient(0, y + rowH - 5, 0, y + rowH);
    shGrad.addColorStop(0, "rgba(0,0,0,0)");
    shGrad.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = shGrad;
    ctx.fillRect(0, y + rowH - 5, W, 5);
  }
}
function drawSlateBump(ctx, W, H) {
  var rows = 8, rowH = H / rows;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  for (var row = 0; row < rows; row++) {
    var y = row * rowH;
    var grad = ctx.createLinearGradient(0, y, 0, y + rowH);
    grad.addColorStop(0,   "#cccccc");
    grad.addColorStop(0.7, "#777");
    grad.addColorStop(1,   "#000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, rowH);
  }
}

/* --- WHITE STUCCO --- */
function drawWhiteTex(ctx, W, H) {
  ctx.fillStyle = "#E8E4DC"; ctx.fillRect(0, 0, W, H);
  var rng = seededRand(5);
  /* Subtle large-scale vignette / patches */
  for (var i = 0; i < 12; i++) {
    var px = rng() * W, py = rng() * H;
    var r = 60 + rng() * 80;
    var grad = ctx.createRadialGradient(px, py, 1, px, py, r);
    grad.addColorStop(0, "rgba(232,228,220," + (0.3 + rng() * 0.3) + ")");
    grad.addColorStop(1, "rgba(220,214,200,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
  }
  /* Granular finish */
  for (var i2 = 0; i2 < 1400; i2++) {
    var rx = rng() * W, ry = rng() * H;
    var v = 160 + Math.floor(rng() * 50);
    ctx.fillStyle = "rgba(" + v + "," + (v - 6) + "," + (v - 18) + "," + (0.35 + rng() * 0.25) + ")";
    ctx.fillRect(rx, ry, 1.4, 1.4);
  }
  /* A few darker stains (weathering) */
  for (var i3 = 0; i3 < 5; i3++) {
    ctx.fillStyle = "rgba(170,160,140,0.18)";
    ctx.beginPath();
    ctx.ellipse(rng() * W, rng() * H, 30 + rng() * 25, 8 + rng() * 12, rng() * Math.PI, 0, Math.PI*2);
    ctx.fill();
  }
}
function drawWhiteBump(ctx, W, H) {
  var rng = seededRand(5);
  ctx.fillStyle = "#888"; ctx.fillRect(0, 0, W, H);
  for (var i = 0; i < 5000; i++) {
    var rx = rng() * W, ry = rng() * H;
    ctx.fillStyle = "rgb(" + Math.floor(140 + rng() * 100) + "," + Math.floor(140 + rng() * 100) + "," + Math.floor(140 + rng() * 100) + ")";
    ctx.fillRect(rx, ry, 1.2, 1.2);
  }
}

/* --- GREY CONCRETE --- */
function drawGreyTex(ctx, W, H) {
  ctx.fillStyle = "#7A8899"; ctx.fillRect(0, 0, W, H);
  var rng = seededRand(17);
  /* Larger aggregate dots */
  for (var i = 0; i < 200; i++) {
    var rx = rng() * W, ry = rng() * H;
    var r = 0.8 + rng() * 1.6;
    ctx.fillStyle = "rgba(94,108,122,0.7)";
    ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI*2); ctx.fill();
  }
  /* Fine speckle */
  for (var i2 = 0; i2 < 1500; i2++) {
    ctx.fillStyle = "rgba(58,68,82," + (0.2 + rng() * 0.4) + ")";
    ctx.fillRect(rng() * W, rng() * H, 0.7, 0.7);
  }
  /* Control joints */
  ctx.strokeStyle = "rgba(40,48,58,0.8)"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
  /* Edge highlight inside the joints */
  ctx.strokeStyle = "rgba(180,190,205,0.35)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, H/2 + 1.5); ctx.lineTo(W, H/2 + 1.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2 + 1.5, 0); ctx.lineTo(W/2 + 1.5, H); ctx.stroke();
  /* Water stains */
  for (var s = 0; s < 4; s++) {
    ctx.fillStyle = "rgba(50,60,72,0.15)";
    ctx.beginPath();
    ctx.ellipse(rng() * W, rng() * H, 25 + rng() * 30, 10 + rng() * 15, rng() * Math.PI, 0, Math.PI*2);
    ctx.fill();
  }
}
function drawGreyBump(ctx, W, H) {
  ctx.fillStyle = "#aaa"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
}

var TEX_DRAWERS = {
  brick: { color: drawBrickTex, bump: drawBrickBump },
  wood:  { color: drawWoodTex,  bump: drawWoodBump  },
  stone: { color: drawStoneTex, bump: drawStoneBump },
  slate: { color: drawSlateTex, bump: drawSlateBump },
  white: { color: drawWhiteTex, bump: drawWhiteBump },
  grey:  { color: drawGreyTex,  bump: drawGreyBump  },
};

/* Helper: draw a pattern into a freshly-allocated canvas (Canvas2D fallback) */
function makeCanvas(W, H, drawer) {
  var c = document.createElement("canvas");
  c.width = W; c.height = H;
  drawer(c.getContext("2d"), W, H);
  return c;
}

var TEX_RES = 1024;

/* ---- High-quality PBR textures (CC0, sourced from Polyhaven)
   Bundled in /public/textures/ for zero-latency, CORS-clean loading.
   Each material has a diffuse map + a displacement map (used as
   bumpMap for relief without geometry cost). Falls back to the
   Canvas2D drawers if the bundled file is missing. */
var POLYHAVEN_BASE = "/textures/";
var POLYHAVEN_SLUGS = {
  brick: "red_brick_03",
  wood:  "wood_planks",
  stone: "cobblestone_05",
  slate: "roof_07",            /* used on the roof regardless of wall material */
  white: "painted_plaster_wall",
  grey:  "painted_concrete",
};

function polyhavenUrl(slug, kind) {
  return POLYHAVEN_BASE + slug + "_" + kind + ".jpg";
}

/* Build a Three.js Texture for a given material:
   - photoUrl provided -> load that photo (custom photo material from
     a project upload or a demo Unsplash URL).
   - matId provided    -> load the Polyhaven PBR texture pair (diff + disp).
   - on load error     -> fall back to the Canvas2D drawers.
   Returns {map, bumpMap}. */
function useMatTexture(matId, photoUrl, repeat) {
  return useMemo(function() {
    var loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    var map, bumpMap = null;

    function applyFilters(t) {
      if (!t) return;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (repeat) t.repeat.set(repeat[0], repeat[1]);
      t.anisotropy = 16;
      t.needsUpdate = true;
    }
    function fallbackDrawers() {
      var drawers = TEX_DRAWERS[matId] || TEX_DRAWERS.white;
      var fbMap = new THREE.CanvasTexture(makeCanvas(TEX_RES, TEX_RES, drawers.color));
      var fbBump = new THREE.CanvasTexture(makeCanvas(TEX_RES, TEX_RES, drawers.bump));
      applyFilters(fbMap); applyFilters(fbBump);
      if (THREE.SRGBColorSpace) fbMap.colorSpace = THREE.SRGBColorSpace;
      return { map: fbMap, bumpMap: fbBump };
    }

    if (photoUrl) {
      map = loader.load(
        photoUrl,
        function(){ applyFilters(map); },
        undefined,
        function(){ console.warn("Photo texture failed:", photoUrl); }
      );
    } else {
      var slug = POLYHAVEN_SLUGS[matId] || POLYHAVEN_SLUGS.white;
      var diff = polyhavenUrl(slug, "diff");
      var disp = polyhavenUrl(slug, "disp");
      var loaded = false;
      map = loader.load(
        diff,
        function(){ loaded = true; applyFilters(map); },
        undefined,
        function() {
          /* Polyhaven CDN unreachable -> swap to Canvas2D drawer fallback */
          console.warn("Polyhaven texture failed for", slug, "-> using procedural fallback");
          var fb = fallbackDrawers();
          map.image = fb.map.image; map.needsUpdate = true;
          if (bumpMap && fb.bumpMap) { bumpMap.image = fb.bumpMap.image; bumpMap.needsUpdate = true; }
        }
      );
      bumpMap = loader.load(disp, function(){ applyFilters(bumpMap); });
    }
    applyFilters(map);
    applyFilters(bumpMap);
    if (THREE.SRGBColorSpace) map.colorSpace = THREE.SRGBColorSpace;
    return { map: map, bumpMap: bumpMap };
  }, [matId, photoUrl, repeat && repeat[0], repeat && repeat[1]]);
}

/* ---- Window grid generator (face-local coords)
   x: relative to wall center, y: from wall bottom */
function windowsForFace(width, height, fl, hasDoor) {
  var cols = fl <= 2 ? 4 : 5;
  var winW = width * 0.13;
  var winH = (height / fl) * 0.55;
  var pad  = (width - winW * cols) / (cols + 1);
  var positions = [];
  for (var f = 0; f < fl; f++) {
    var cy = (height / fl) * (f + 0.5);
    for (var c = 0; c < cols; c++) {
      if (hasDoor && f === 0 && c === Math.floor(cols/2)) continue;
      var cx = pad + c * (winW + pad) + winW/2 - width/2;
      positions.push({ x: cx, y: cy, w: winW, h: winH });
    }
  }
  var doorRect = null;
  if (hasDoor) {
    var dCol = Math.floor(cols/2);
    var dx = pad + dCol * (winW + pad) + winW/2 - width/2;
    var dW = winW * 1.25;
    var dH = (height / fl) * 0.85;
    doorRect = { x: dx, y: dH/2 + 0.05, w: dW, h: dH };
  }
  return { positions: positions, doorRect: doorRect };
}

/* Render windows + door + sills on one facade. The parent <group>
   transforms it to the right wall in world coordinates. */
function FacadeFeatures({ side, realW, realD, realH, fl }) {
  var faceW = (side === "south" || side === "north") ? realW : realD;
  var hasDoor = (side === "south");
  var feat = useMemo(function(){ return windowsForFace(faceW, realH, fl, hasDoor); },
                     [faceW, realH, fl, hasDoor]);

  var groupProps;
  /* Each facade local +Z points outward */
  if (side === "south") {
    groupProps = { position: [0, 0, realD/2 + 0.005] };
  } else if (side === "east") {
    groupProps = { position: [realW/2 + 0.005, 0, 0], rotation: [0, Math.PI/2, 0] };
  } else if (side === "north") {
    groupProps = { position: [0, 0, -realD/2 - 0.005], rotation: [0, Math.PI, 0] };
  } else {
    groupProps = { position: [-realW/2 - 0.005, 0, 0], rotation: [0, -Math.PI/2, 0] };
  }

  return (
    <group {...groupProps}>
      {feat.positions.map(function(p, i) {
        return (
          <group key={i} position={[p.x, p.y, 0]}>
            {/* Window frame */}
            <mesh castShadow>
              <planeGeometry args={[p.w + 0.06, p.h + 0.06]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </mesh>
            {/* Glass with slight reflection */}
            <mesh position={[0, 0, 0.005]}>
              <planeGeometry args={[p.w, p.h]} />
              <meshStandardMaterial
                color="#5588ad" roughness={0.05} metalness={0.7}
                envMapIntensity={1}/>
            </mesh>
            {/* Cross mullions */}
            <mesh position={[0, 0, 0.012]}>
              <boxGeometry args={[p.w, 0.02, 0.005]} />
              <meshStandardMaterial color="#ffffff"/>
            </mesh>
            <mesh position={[0, 0, 0.012]}>
              <boxGeometry args={[0.02, p.h, 0.005]} />
              <meshStandardMaterial color="#ffffff"/>
            </mesh>
            {/* Sill: thin protruding ledge under the window */}
            <mesh position={[0, -p.h/2 - 0.025, 0.04]} castShadow>
              <boxGeometry args={[p.w + 0.18, 0.05, 0.08]} />
              <meshStandardMaterial color="#d8d4c8" roughness={0.85}/>
            </mesh>
          </group>
        );
      })}
      {feat.doorRect && (
        <group position={[feat.doorRect.x, feat.doorRect.y, 0]}>
          <mesh position={[0, 0, 0.012]} castShadow>
            <planeGeometry args={[feat.doorRect.w, feat.doorRect.h]} />
            <meshStandardMaterial color="#5a3825" roughness={0.85}/>
          </mesh>
          {/* Panels (subtle indents drawn as slightly darker rects) */}
          <mesh position={[-feat.doorRect.w*0.22, feat.doorRect.h*0.2, 0.013]}>
            <planeGeometry args={[feat.doorRect.w*0.35, feat.doorRect.h*0.3]} />
            <meshStandardMaterial color="#3a2614" roughness={0.9}/>
          </mesh>
          <mesh position={[ feat.doorRect.w*0.22, feat.doorRect.h*0.2, 0.013]}>
            <planeGeometry args={[feat.doorRect.w*0.35, feat.doorRect.h*0.3]} />
            <meshStandardMaterial color="#3a2614" roughness={0.9}/>
          </mesh>
          {/* Brass handle */}
          <mesh position={[feat.doorRect.w*0.35, 0, 0.04]} castShadow>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#DAA520" metalness={0.85} roughness={0.25}/>
          </mesh>
        </group>
      )}
    </group>
  );
}

function Building3D({ realW, realD, realH, fl, mat, roofType, photos }) {
  var matColor = (mat && mat.col) || "#BFB09A";
  var matId = mat && mat.id;
  var photoUrl = mat && mat.photo && mat.photo.url;
  var roofColor = "#5a3825";

  /* Wall texture: tiles every ~2.5 m horizontally + every ~3 m vertically */
  var wallRepeatH = Math.max(1, Math.round(realW / 2.5));
  var wallRepeatV = Math.max(1, Math.round(realH / 3));
  var wallTex = useMatTexture(matId || "white", photoUrl, [wallRepeatH, wallRepeatV]);
  var sideRepeatH = Math.max(1, Math.round(realD / 2.5));
  var sideTex = useMatTexture(matId || "white", photoUrl, [sideRepeatH, wallRepeatV]);
  /* Slate roof texture (always slate regardless of wall material) */
  var roofTex = useMatTexture("slate", null, [Math.max(2, Math.round(realW / 2)), 2]);

  var rt = (roofType || "").toLowerCase();
  var isFlat    = rt.indexOf("terras") !== -1;
  var isMansart = rt.indexOf("mans") !== -1;
  var is4pans   = rt.indexOf("4 pans") !== -1 || rt.indexOf("4pans") !== -1;
  var roofH = isFlat ? 0.3 : (isMansart ? realH * 0.45 : Math.min(realW, realD) * 0.5);

  /* Gable (Pignon) extruded triangle, ridge runs along Z */
  var gableShape = useMemo(function() {
    var s = new THREE.Shape();
    s.moveTo(-realW/2 - 0.3, 0);
    s.lineTo(realW/2 + 0.3, 0);
    s.lineTo(0, roofH);
    s.lineTo(-realW/2 - 0.3, 0);
    return s;
  }, [realW, roofH]);

  /* 4-pans hipped roof: BufferGeometry with 4 sloped faces meeting at a ridge */
  var hippedGeom = useMemo(function() {
    if (!is4pans) return null;
    var hw = realW/2 + 0.3, hd = realD/2 + 0.3, h = roofH;
    var rw = realW * 0.15, rd = 0; /* ridge halfwidth + halfdepth (line, not point) */
    /* 4 base corners + 2 ridge endpoints */
    var v = [
      [-hw, 0, -hd], [ hw, 0, -hd], [ hw, 0,  hd], [-hw, 0,  hd],
      [-rw, h,  0], [ rw, h,  0],
    ];
    var f = [
      [0,1,5],[0,5,4],   /* north slope */
      [1,2,5],            /* east slope */
      [2,3,4],[2,4,5],    /* south slope */
      [3,0,4],            /* west slope */
    ];
    var positions = new Float32Array(f.length * 3 * 3);
    var k = 0;
    f.forEach(function(face){
      face.forEach(function(idx){
        positions[k++] = v[idx][0]; positions[k++] = v[idx][1]; positions[k++] = v[idx][2];
      });
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [realW, realD, roofH, is4pans]);

  /* Mansard double-pitch */
  var mansardLowerShape = useMemo(function() {
    if (!isMansart) return null;
    var s = new THREE.Shape();
    var hw = realW/2 + 0.3, h2 = roofH * 0.55;
    s.moveTo(-hw, 0);
    s.lineTo( hw, 0);
    s.lineTo( hw - 0.5, h2);
    s.lineTo(-hw + 0.5, h2);
    s.lineTo(-hw, 0);
    return s;
  }, [realW, roofH, isMansart]);
  var mansardUpperShape = useMemo(function() {
    if (!isMansart) return null;
    var s = new THREE.Shape();
    var hw = realW/2 + 0.3 - 0.5, top = roofH;
    s.moveTo(-hw, 0);
    s.lineTo( hw, 0);
    s.lineTo( hw * 0.3, top - roofH * 0.55);
    s.lineTo(-hw * 0.3, top - roofH * 0.55);
    s.lineTo(-hw, 0);
    return s;
  }, [realW, roofH, isMansart]);

  return (
    <group>
      {/* Walls solid box with per-face textures (BoxGeometry face order:
          +X, -X, +Y, -Y, +Z, -Z = east, west, top, bottom, south, north) */}
      <mesh castShadow receiveShadow position={[0, realH/2, 0]}>
        <boxGeometry args={[realW, realH, realD]} />
        <meshStandardMaterial attach="material-0" map={sideTex.map} bumpMap={sideTex.bumpMap} bumpScale={0.06} color="#fff" roughness={0.86} metalness={0.04}/>
        <meshStandardMaterial attach="material-1" map={sideTex.map} bumpMap={sideTex.bumpMap} bumpScale={0.06} color="#fff" roughness={0.86} metalness={0.04}/>
        <meshStandardMaterial attach="material-2" color={matColor} roughness={1}/>
        <meshStandardMaterial attach="material-3" color="#5a564a" roughness={1}/>
        <meshStandardMaterial attach="material-4" map={wallTex.map} bumpMap={wallTex.bumpMap} bumpScale={0.06} color="#fff" roughness={0.86} metalness={0.04}/>
        <meshStandardMaterial attach="material-5" map={wallTex.map} bumpMap={wallTex.bumpMap} bumpScale={0.06} color="#fff" roughness={0.86} metalness={0.04}/>
      </mesh>

      {/* Windows + door on each of the 4 facades */}
      <FacadeFeatures side="south" realW={realW} realD={realD} realH={realH} fl={fl}/>
      <FacadeFeatures side="east"  realW={realW} realD={realD} realH={realH} fl={fl}/>
      <FacadeFeatures side="north" realW={realW} realD={realD} realH={realH} fl={fl}/>
      <FacadeFeatures side="west"  realW={realW} realD={realD} realH={realH} fl={fl}/>

      {/* Gutter: thin metallic band wrapping the wall top, just below the roof */}
      <mesh position={[0, realH - 0.05, 0]} receiveShadow>
        <boxGeometry args={[realW + 0.36, 0.18, realD + 0.36]} />
        <meshStandardMaterial color="#9aa3ad" roughness={0.5} metalness={0.55}/>
      </mesh>

      {/* Inter-floor lines as thin dark bands */}
      {(function(){
        var bands = [];
        for (var i = 1; i < fl; i++) {
          var y = (realH / fl) * i;
          bands.push(
            <mesh key={"fl-s-"+i} position={[0, y, realD/2 + 0.005]}>
              <boxGeometry args={[realW + 0.04, 0.05, 0.01]} />
              <meshStandardMaterial color="#3a2614" roughness={1}/>
            </mesh>,
            <mesh key={"fl-n-"+i} position={[0, y, -realD/2 - 0.005]}>
              <boxGeometry args={[realW + 0.04, 0.05, 0.01]} />
              <meshStandardMaterial color="#3a2614" roughness={1}/>
            </mesh>,
            <mesh key={"fl-e-"+i} position={[realW/2 + 0.005, y, 0]}>
              <boxGeometry args={[0.01, 0.05, realD + 0.04]} />
              <meshStandardMaterial color="#3a2614" roughness={1}/>
            </mesh>,
            <mesh key={"fl-w-"+i} position={[-realW/2 - 0.005, y, 0]}>
              <boxGeometry args={[0.01, 0.05, realD + 0.04]} />
              <meshStandardMaterial color="#3a2614" roughness={1}/>
            </mesh>
          );
        }
        return bands;
      })()}

      {/* Foundation strip (concrete grey at base) */}
      <mesh receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[realW + 0.08, 0.36, realD + 0.08]} />
        <meshStandardMaterial color="#5a564a" roughness={0.95} />
      </mesh>

      {/* Roof */}
      {isFlat && (
        <mesh castShadow receiveShadow position={[0, realH + 0.15, 0]}>
          <boxGeometry args={[realW + 0.6, 0.3, realD + 0.6]} />
          <meshStandardMaterial map={roofTex.map} bumpMap={roofTex.bumpMap} bumpScale={0.10} color="#fff" roughness={0.85} />
        </mesh>
      )}
      {!isFlat && !isMansart && !is4pans && (
        <mesh castShadow receiveShadow position={[0, realH, -realD/2 - 0.3]}>
          <extrudeGeometry args={[gableShape, {depth: realD + 0.6, bevelEnabled: false}]} />
          <meshStandardMaterial map={roofTex.map} bumpMap={roofTex.bumpMap} bumpScale={0.10} color="#fff" roughness={0.85} />
        </mesh>
      )}
      {is4pans && hippedGeom && (
        <mesh castShadow receiveShadow position={[0, realH, 0]} geometry={hippedGeom}>
          <meshStandardMaterial map={roofTex.map} bumpMap={roofTex.bumpMap} bumpScale={0.10} color="#fff" roughness={0.85} side={THREE.DoubleSide}/>
        </mesh>
      )}
      {isMansart && mansardLowerShape && mansardUpperShape && (
        <group position={[0, realH, 0]}>
          <mesh castShadow receiveShadow position={[0, 0, -realD/2 - 0.3]}>
            <extrudeGeometry args={[mansardLowerShape, {depth: realD + 0.6, bevelEnabled: false}]} />
            <meshStandardMaterial map={roofTex.map} bumpMap={roofTex.bumpMap} bumpScale={0.10} color="#fff" roughness={0.85} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, roofH * 0.55, -realD/2 + 0.5]}>
            <extrudeGeometry args={[mansardUpperShape, {depth: realD - 0.4, bevelEnabled: false}]} />
            <meshStandardMaterial map={roofTex.map} bumpMap={roofTex.bumpMap} bumpScale={0.10} color="#fff" roughness={0.85} />
          </mesh>
        </group>
      )}

      {/* Ridge cap line (small dark band at the gable apex) */}
      {!isFlat && !is4pans && (
        <mesh position={[0, realH + roofH + 0.02, 0]}>
          <boxGeometry args={[0.15, 0.08, realD + 0.7]} />
          <meshStandardMaterial color="#1a0f08" roughness={1}/>
        </mesh>
      )}
    </group>
  );
}

/* ---- IsoModel: WebGL 3D scene via React Three Fiber ----
   Replaces the previous SVG iso projection. Real shadows, lights,
   orbit controls, autorotate. Texture overlays (patterns from MatDefs)
   and architectural details (windows, door, gutters, sills) come in a
   follow-up commit — this commit lays the scene infrastructure. */
function IsoModel({ matCol, mat, photos, floors, meas, rooms, roof }) {
  var [auto, setAuto] = useState(false);

  var fl = Math.max(1, Math.min(8, parseInt(floors) || 2));
  var m  = meas || {};
  var realH = parseFloat(m.h) || (3.5 * fl);
  var realFoot = parseFloat(m.foot) || 142;
  var ratio = 1.6;
  var realW = Math.sqrt(realFoot * ratio);
  var realD = Math.sqrt(realFoot / ratio);

  /* Camera distance proportional to building size so a Haussmann fits as well as a pavillon */
  var camDist = Math.max(realW, realD, realH) * 1.7;

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
      <div style={{flex:1, minHeight:240, position:"relative"}}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{position:[camDist*1.05, camDist*0.65, camDist*1.05], fov: 35}}
          style={{width:"100%", height:"100%", display:"block"}}>
          <color attach="background" args={["#dce3ec"]}/>
          <fog attach="fog" args={["#dce3ec", camDist*1.7, camDist*4.5]}/>

          <ambientLight intensity={0.55}/>
          <hemisphereLight args={["#dce3ec", "#a8a594", 0.45]}/>
          <directionalLight
            position={[realW*1.4, realH*2.6, realD*1.5]}
            intensity={1.05}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={0.5}
            shadow-camera-far={camDist * 4}
            shadow-camera-left={-realW*1.8}
            shadow-camera-right={realW*1.8}
            shadow-camera-top={realH*2.5}
            shadow-camera-bottom={-realH/2}
            shadow-bias={-0.0008}
          />

          <Building3D
            realW={realW} realD={realD} realH={realH}
            fl={fl} mat={mat} roofType={roof}
          />

          {/* HDR environment for realistic reflections on glass + metal.
              "park" preset is heaviest, "apartment" is lighter and gives
              warmer indoor-light feel suited to architectural viz. */}
          <Environment preset="apartment" background={false}/>

          {/* Soft contact shadow under the building. resolution 512
              keeps it cheap (the directional shadow map already does the
              heavy lifting). */}
          <ContactShadows
            position={[0, 0.001, 0]}
            opacity={0.45}
            scale={Math.max(realW, realD) * 3.5}
            blur={1.6}
            far={realH * 1.1}
            resolution={512}
            frames={1}
          />

          {/* Ground plane */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
            <circleGeometry args={[Math.max(realW, realD) * 4, 48]}/>
            <meshStandardMaterial color="#a8a594" roughness={0.95}/>
          </mesh>

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={camDist * 0.7}
            maxDistance={camDist * 3.5}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI/2 - 0.08}
            target={[0, realH/2, 0]}
            autoRotate={auto}
            autoRotateSpeed={0.6}
          />
        </Canvas>
      </div>

      {/* Controls bar */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
        borderTop:"1px solid #1C3050", background:"#0A1422", flexShrink:0,
      }}>
        <button type="button"
          onClick={function(){ setAuto(function(a){ return !a; }); }}
          title={auto ? "Pause rotation" : "Lecture rotation"}
          style={{
            background: auto ? "#FF8C42" : "#152135",
            border: auto ? "none" : "1px solid #1C3050",
            color: auto ? "#000" : "#E8EDF5",
            borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:700,
            cursor:"pointer", outline:"none", flexShrink:0,
          }}>
          {auto ? "⏸ Pause" : "▶ Lecture"}
        </button>
        <div style={{flex:1, fontSize:11, color:"#607898", textAlign:"center"}}>
          Glissez pour tourner — molette pour zoomer
        </div>
        <div style={{fontSize:10, color:"#2E4A6A", fontFamily:"monospace"}}>
          {realW.toFixed(1)} × {realD.toFixed(1)} × {realH.toFixed(1)} m
        </div>
      </div>
    </div>
  );
}


/* ---- Architectural elevation drawing (one facade, 2D, pro look) ----
   Inspired by CAD facade plans: white background, thin black strokes,
   tile pattern on roof, vertical dimension lines on both sides with
   altimetric levels, ground line (TN), property limits in orange,
   centered italic label at the bottom. */

function Elevation({ project, facadeId, label, downloadFileName }) {
  var meas = project.meas || {};
  var fl = Math.max(1, parseInt(project.floors) || 2);

  /* Real dimensions in meters depending on which facade we draw */
  var realFoot = parseFloat(meas.foot) || 142;
  var realH    = parseFloat(meas.h)    || 7.4;
  var ratio = 1.6;
  var dimW = Math.sqrt(realFoot * ratio); /* facade width Sud/Nord */
  var dimD = Math.sqrt(realFoot / ratio); /* facade width Est/Ouest */
  /* Override with the actual rooms.l value when available */
  function parseM(s) {
    if (s == null) return null;
    var v = parseFloat(String(s).replace(/[^\d.,-]/g,"").replace(",","."));
    return isFinite(v) && v > 0 ? v : null;
  }
  function findFacadeLen(needle) {
    var r = (project.rooms||[]).find(function(x){
      if (!x || x.t === "r") return false;
      return (x.n||"").toLowerCase().indexOf(needle) !== -1;
    });
    return r ? parseM(r.l) : null;
  }
  var realW;
  if (facadeId === "sud" || facadeId === "nord") {
    realW = findFacadeLen(facadeId) || findFacadeLen(facadeId === "sud" ? "nord" : "sud") || dimW;
  } else {
    realW = findFacadeLen(facadeId) || findFacadeLen(facadeId === "est" ? "ouest" : "est") || dimD;
  }

  /* Layout: viewBox 800x600, building drawn 100/520 horizontally, 90/470 vertically. */
  var VB_W = 800, VB_H = 600;
  var maxBldgW = 540, maxBldgH = 320;
  var scaleX = maxBldgW / realW;
  var scaleY = maxBldgH / realH;
  var scale  = Math.min(scaleX, scaleY);
  var bw = realW * scale;
  var bh = realH * scale;
  var roofType = (project.roof || "").toLowerCase();
  var isPignon = roofType.indexOf("pignon") !== -1 || facadeId === "est" || facadeId === "ouest";
  var isFlat   = roofType.indexOf("terras") !== -1;
  var isMansart= roofType.indexOf("mans") !== -1;
  var roofH = isFlat ? 6 : (isMansart ? Math.min(70, bh*0.35) : (isPignon ? Math.min(95, bw*0.32) : Math.min(70, bw*0.18)));

  /* Building origin: centered, ground at y=GROUND_Y */
  var GROUND_Y = 470;
  var bx = (VB_W - bw) / 2;
  var by = GROUND_Y - bh;
  var roofTopY = by - roofH;

  /* Levels in meters (relative to ±0.00 = ground) */
  var floorH = realH / fl;
  var levels = [];
  for (var i = 0; i <= fl; i++) {
    levels.push({ m: i * floorH, label: i === 0 ? "±0.00" : "+" + (i*floorH).toFixed(2) });
  }
  var ridgeM = realH + (isFlat ? 0 : (isMansart ? realH * 0.25 : realH * 0.45));
  if (!isFlat) levels.push({ m: ridgeM, label: "+" + ridgeM.toFixed(2), ridge:true });

  /* Convert meters above ground to SVG y */
  function mToY(m) { return GROUND_Y - m * scale; }

  /* Door: only on south facade. Sliding bay door on south too if available */
  var hasDoor = (facadeId === "sud");

  /* Window grid */
  var cols = (facadeId === "est" || facadeId === "ouest") ? Math.max(2, Math.floor(realW/3.5))
                                                          : Math.max(3, Math.floor(realW/3.5));
  cols = Math.min(cols, 6);
  var winW = bw * 0.13;
  var winH = (bh / fl) * 0.55;
  var pad  = (bw - winW * cols) / (cols + 1);

  /* Tile pattern id unique per facade so the SVG can be reused inline */
  var tileId = "tile-" + (facadeId || "x");
  var hatchId = "hatch-" + (facadeId || "x");

  /* Cote helpers — vertical dimension lines on a side */
  function VertCote({ x, y1, y2, value, side }) {
    /* tick lines + arrows + text rotated -90 */
    var tickLen = 5;
    var sx = side === "left" ? -1 : 1;
    return (
      <g stroke="#222" strokeWidth="0.6" fill="none">
        <line x1={x} y1={y1} x2={x} y2={y2}/>
        <line x1={x - tickLen} y1={y1} x2={x + tickLen} y2={y1}/>
        <line x1={x - tickLen} y1={y2} x2={x + tickLen} y2={y2}/>
        <polygon points={x+","+y1+" "+(x-3*sx)+","+(y1+5)+" "+(x+3*sx)+","+(y1+5)} fill="#222"/>
        <polygon points={x+","+y2+" "+(x-3*sx)+","+(y2-5)+" "+(x+3*sx)+","+(y2-5)} fill="#222"/>
        <text x={x + (sx*7)} y={(y1+y2)/2} fill="#222" fontSize="11"
          fontFamily="Helvetica, Arial, sans-serif" fontStyle="italic"
          textAnchor={side === "left" ? "end" : "start"}
          dominantBaseline="middle"
          transform={"rotate(-90," + (x + sx*7) + "," + ((y1+y2)/2) + ")"}>
          {value.toFixed(2)}
        </text>
      </g>
    );
  }

  /* Tile path used by the roof */
  var tilePath = "M 0 12 Q 5 4 10 12 Q 15 4 20 12";

  return (
    <svg viewBox={"0 0 " + VB_W + " " + VB_H}
      width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{display:"block", background:"#fff"}}>
      <defs>
        {/* Roof tile pattern */}
        <pattern id={tileId} patternUnits="userSpaceOnUse" width="20" height="12">
          <rect width="20" height="12" fill="#fff"/>
          <path d={tilePath} fill="none" stroke="#3a2614" strokeWidth="0.7"/>
          <path d="M 0 12 L 20 12" stroke="#3a2614" strokeWidth="0.6"/>
        </pattern>
        {/* Ground hatch (TN) */}
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="0" y1="8" x2="8" y2="0" stroke="#444" strokeWidth="0.5"/>
        </pattern>
      </defs>

      {/* Property limit lines (orange dashed verticals) + label */}
      <line x1={70} y1={70} x2={70} y2={GROUND_Y+10}
        stroke="#E89B2A" strokeWidth="0.8" strokeDasharray="6,3"/>
      <line x1={VB_W-70} y1={70} x2={VB_W-70} y2={GROUND_Y+10}
        stroke="#E89B2A" strokeWidth="0.8" strokeDasharray="6,3"/>
      <text x={70} y={62} fill="#E89B2A" fontSize="10"
        fontFamily="Helvetica, Arial, sans-serif" fontStyle="italic"
        textAnchor="middle" transform={"rotate(-90,70,62)"}>Limite propriete</text>
      <text x={VB_W-70} y={62} fill="#E89B2A" fontSize="10"
        fontFamily="Helvetica, Arial, sans-serif" fontStyle="italic"
        textAnchor="middle" transform={"rotate(-90," + (VB_W-70) + ",62)"}>Limite propriete</text>

      {/* Ground line (TN) */}
      <line x1={40} y1={GROUND_Y} x2={VB_W-40} y2={GROUND_Y}
        stroke="#222" strokeWidth="1.2"/>
      <rect x={40} y={GROUND_Y} width={VB_W-80} height={14} fill={"url(#" + hatchId + ")"} opacity="0.55"/>
      <text x={VB_W-46} y={GROUND_Y+11} fill="#222" fontSize="10"
        fontFamily="Helvetica, Arial, sans-serif" textAnchor="end">TN ±0.00</text>

      {/* Building wall */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill="#fff" stroke="#222" strokeWidth="1"/>

      {/* Roof */}
      {isFlat && (
        <g>
          <rect x={bx-3} y={by-roofH} width={bw+6} height={roofH}
            fill={"url(#" + tileId + ")"} stroke="#222" strokeWidth="0.8"/>
          <rect x={bx-3} y={by-roofH-2} width={bw+6} height={3} fill="#3a2614"/>
        </g>
      )}
      {!isFlat && isPignon && (
        <g>
          <polygon points={
            (bx-4) + "," + by + " " +
            (bx + bw/2) + "," + roofTopY + " " +
            (bx + bw + 4) + "," + by
          } fill={"url(#" + tileId + ")"} stroke="#222" strokeWidth="1"/>
          {/* Faîtière */}
          <polyline points={
            (bx-4) + "," + (by+1) + " " +
            (bx + bw/2) + "," + (roofTopY+1) + " " +
            (bx + bw + 4) + "," + (by+1)
          } fill="none" stroke="#3a2614" strokeWidth="2.5"/>
          {/* Egout */}
          <line x1={bx-4} y1={by} x2={bx+bw+4} y2={by} stroke="#3a2614" strokeWidth="1.5"/>
        </g>
      )}
      {!isFlat && !isPignon && !isMansart && (
        <g>
          <polygon points={
            (bx-4) + "," + by + " " +
            (bx + bw*0.18) + "," + roofTopY + " " +
            (bx + bw*0.82) + "," + roofTopY + " " +
            (bx + bw + 4) + "," + by
          } fill={"url(#" + tileId + ")"} stroke="#222" strokeWidth="1"/>
          <line x1={bx + bw*0.18} y1={roofTopY} x2={bx + bw*0.82} y2={roofTopY}
            stroke="#3a2614" strokeWidth="2.5"/>
          <line x1={bx-4} y1={by} x2={bx+bw+4} y2={by} stroke="#3a2614" strokeWidth="1.5"/>
        </g>
      )}
      {!isFlat && isMansart && (
        <g>
          <polygon points={
            (bx-4) + "," + by + " " +
            (bx + bw*0.10) + "," + (by - roofH*0.55) + " " +
            (bx + bw*0.90) + "," + (by - roofH*0.55) + " " +
            (bx + bw + 4) + "," + by
          } fill={"url(#" + tileId + ")"} stroke="#222" strokeWidth="1"/>
          <polygon points={
            (bx + bw*0.10) + "," + (by - roofH*0.55) + " " +
            (bx + bw*0.30) + "," + roofTopY + " " +
            (bx + bw*0.70) + "," + roofTopY + " " +
            (bx + bw*0.90) + "," + (by - roofH*0.55)
          } fill="#fff" stroke="#222" strokeWidth="1"/>
          <line x1={bx-4} y1={by} x2={bx+bw+4} y2={by} stroke="#3a2614" strokeWidth="1.5"/>
        </g>
      )}

      {/* Floor lines (subtle, inside the wall) */}
      {(function(){
        var lines = [];
        for (var f = 1; f < fl; f++) {
          var y = by + (bh / fl) * f;
          lines.push(<line key={"flline"+f} x1={bx+2} y1={y} x2={bx+bw-2} y2={y}
            stroke="#222" strokeWidth="0.3" strokeDasharray="3,3" opacity="0.45"/>);
        }
        return lines;
      })()}

      {/* Windows grid */}
      {(function(){
        var els = [];
        for (var f = 0; f < fl; f++) {
          var fy = by + bh - (bh/fl)*(f+1);
          var winY = fy + (bh/fl - winH)/2;
          for (var c = 0; c < cols; c++) {
            if (hasDoor && f === 0 && c === Math.floor(cols/2)) continue;
            var x = bx + pad + c * (winW + pad);
            els.push(
              <g key={"w-"+f+"-"+c}>
                <rect x={x} y={winY} width={winW} height={winH}
                  fill="#fff" stroke="#222" strokeWidth="0.9"/>
                <rect x={x+2} y={winY+2} width={winW-4} height={winH-4}
                  fill="#fff" stroke="#222" strokeWidth="0.5"/>
                <line x1={x+winW/2} y1={winY+2} x2={x+winW/2} y2={winY+winH-2}
                  stroke="#222" strokeWidth="0.5"/>
                <line x1={x+2} y1={winY+winH/2} x2={x+winW-2} y2={winY+winH/2}
                  stroke="#222" strokeWidth="0.5"/>
                {/* allege */}
                <line x1={x-1} y1={winY+winH+1.5} x2={x+winW+1} y2={winY+winH+1.5}
                  stroke="#222" strokeWidth="0.7"/>
              </g>
            );
          }
        }
        return els;
      })()}

      {/* Door (south only) */}
      {hasDoor && (function(){
        var dCol = Math.floor(cols/2);
        var x = bx + pad + dCol * (winW + pad);
        var dW = winW * 1.1, dH = (bh/fl) * 0.78;
        var dx = x + (winW - dW)/2;
        var dy = GROUND_Y - dH;
        return (
          <g>
            <rect x={dx} y={dy} width={dW} height={dH}
              fill="#fff" stroke="#222" strokeWidth="1.1"/>
            <rect x={dx+2} y={dy+2} width={dW-4} height={dH-4}
              fill="#fff" stroke="#222" strokeWidth="0.5"/>
            {/* Panel split */}
            <line x1={dx+dW/2} y1={dy+5} x2={dx+dW/2} y2={dy+dH-5}
              stroke="#222" strokeWidth="0.4"/>
            <rect x={dx+5} y={dy+8} width={dW/2-7} height={dH/3} fill="none" stroke="#222" strokeWidth="0.4"/>
            <rect x={dx+dW/2+2} y={dy+8} width={dW/2-7} height={dH/3} fill="none" stroke="#222" strokeWidth="0.4"/>
            {/* Handle */}
            <circle cx={dx+dW/2-3} cy={dy+dH*0.55} r="1" fill="#222"/>
            <circle cx={dx+dW/2+3} cy={dy+dH*0.55} r="1" fill="#222"/>
          </g>
        );
      })()}

      {/* Vertical dimensions on the LEFT side: per-floor + total */}
      {(function(){
        var coteX = bx - 24;
        var lines = [];
        /* per-floor cotes */
        for (var i = 0; i < levels.length-1; i++) {
          var lv = levels[i], lvNext = levels[i+1];
          var y1 = mToY(lvNext.m), y2 = mToY(lv.m);
          var dist = lvNext.m - lv.m;
          lines.push(
            <VertCote key={"L"+i} x={coteX} y1={y1} y2={y2} value={dist} side="left"/>
          );
        }
        /* total cote on the very left */
        lines.push(
          <VertCote key="Ltot" x={coteX-26} y1={roofTopY} y2={GROUND_Y} value={ridgeM} side="left"/>
        );
        return lines;
      })()}

      {/* Vertical dimensions on the RIGHT side */}
      {(function(){
        var coteX = bx + bw + 24;
        var lines = [];
        for (var i = 0; i < levels.length-1; i++) {
          var lv = levels[i], lvNext = levels[i+1];
          var y1 = mToY(lvNext.m), y2 = mToY(lv.m);
          var dist = lvNext.m - lv.m;
          lines.push(
            <VertCote key={"R"+i} x={coteX} y1={y1} y2={y2} value={dist} side="right"/>
          );
        }
        lines.push(
          <VertCote key="Rtot" x={coteX+26} y1={roofTopY} y2={GROUND_Y} value={ridgeM} side="right"/>
        );
        return lines;
      })()}

      {/* Altimetric level circles */}
      {levels.map(function(lv, i) {
        var ly = mToY(lv.m);
        var cx2 = bx + bw + 8;
        return (
          <g key={"alt"+i}>
            <line x1={bx+bw} y1={ly} x2={cx2-5} y2={ly} stroke="#222" strokeWidth="0.4" opacity="0.6"/>
            <circle cx={cx2} cy={ly} r="6" fill="#fff" stroke="#222" strokeWidth="0.6"/>
            <line x1={cx2-3} y1={ly} x2={cx2+3} y2={ly} stroke="#222" strokeWidth="0.4"/>
            <line x1={cx2} y1={ly-3} x2={cx2} y2={ly+3} stroke="#222" strokeWidth="0.4"/>
            <text x={cx2+11} y={ly+3} fontSize="9.5" fill="#222"
              fontFamily="Helvetica, Arial, sans-serif">
              {lv.label}
            </text>
          </g>
        );
      })}

      {/* Horizontal dimension chain along the bottom: per-bay sub-cotes
          + total facade width below them. Ticks rise from the ground line
          to the cote line (extension lines), arrows point inward. */}
      {(function(){
        var subY  = GROUND_Y + 38;
        var totY  = GROUND_Y + 60;
        var arrowL = 4;

        /* Build x-stops: left edge, then for each window/door, then right edge */
        var stops = [bx];
        for (var c = 0; c < cols; c++) {
          var x = bx + pad + c * (winW + pad);
          stops.push(x);
          if (hasDoor && c === Math.floor(cols/2)) {
            /* the door uses dW slightly wider than winW (1.1x), keep the same x for left edge */
            stops.push(x + winW * 1.1);
          } else {
            stops.push(x + winW);
          }
        }
        stops.push(bx + bw);

        function arrow(x, y, dir) {
          /* dir = 1 right-pointing, -1 left-pointing */
          var dx = arrowL * dir;
          return x + "," + y + " " + (x + dx) + "," + (y - 3) + " " + (x + dx) + "," + (y + 3);
        }

        function drawCote(x1, x2, y, value) {
          var cx = (x1 + x2) / 2;
          return (
            <g key={"hc-"+x1+"-"+x2}>
              <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} stroke="#222" strokeWidth="0.55"/>
              <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} stroke="#222" strokeWidth="0.55"/>
              <line x1={x1} y1={y} x2={x2} y2={y}     stroke="#222" strokeWidth="0.55"/>
              <polygon points={arrow(x1, y, 1)}  fill="#222"/>
              <polygon points={arrow(x2, y, -1)} fill="#222"/>
              <text x={cx} y={y - 4} textAnchor="middle"
                fill="#222" fontSize="10.5" fontStyle="italic"
                fontFamily="Helvetica, Arial, sans-serif">
                {value.toFixed(2)}
              </text>
            </g>
          );
        }

        /* Extension lines from ground to the lower cote line */
        var ext = [];
        ext.push(<line key="ex-l" x1={bx} y1={GROUND_Y+14} x2={bx} y2={totY+5} stroke="#222" strokeWidth="0.35" opacity="0.7"/>);
        ext.push(<line key="ex-r" x1={bx+bw} y1={GROUND_Y+14} x2={bx+bw} y2={totY+5} stroke="#222" strokeWidth="0.35" opacity="0.7"/>);

        /* Per-bay sub-cotes: only show if facade width is generous enough to keep numbers readable */
        var subEls = [];
        if (bw > 280 && stops.length <= 14) {
          for (var i = 0; i < stops.length - 1; i++) {
            var x1 = stops[i], x2 = stops[i+1];
            var distM = (x2 - x1) / scale;
            if (distM < 0.05) continue;
            subEls.push(drawCote(x1, x2, subY, distM));
            /* small extension tick from ground to subY for inner stops */
            if (i > 0) {
              ext.push(<line key={"exi-"+i} x1={x1} y1={GROUND_Y+14} x2={x1} y2={subY+5}
                stroke="#222" strokeWidth="0.3" opacity="0.55"/>);
            }
          }
        }

        return (
          <g>
            {ext}
            {subEls}
            {drawCote(bx, bx+bw, totY, realW)}
          </g>
        );
      })()}

      {/* Caption */}
      <text x={VB_W/2} y={VB_H - 12} textAnchor="middle"
        fill="#222" fontSize="17" fontStyle="italic"
        fontFamily="Georgia, 'Times New Roman', serif">
        - {label} -
      </text>
    </svg>
  );
}

/* ---- Sidebar ---- */
function Sidebar({ view, setView }) {
  var items = [
    {id:"dash",    icon:"H", lbl:"Projets"},
    {id:"reports", icon:"D", lbl:"Rapports"},
    {id:"settings",icon:"S", lbl:"Parametres"},
  ];
  return (
    <div data-noprint="1" style={{position:"fixed",top:0,left:0,width:W,height:"100vh",
      background:"#0F1C2E",borderRight:"1px solid #1C3050",
      display:"flex",flexDirection:"column",zIndex:100}}>
      <div style={{padding:"18px 16px 14px",borderBottom:"1px solid #1C3050"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:"#00C2FF",borderRadius:8,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:16,fontWeight:900,color:"#000"}}>M</div>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"#E8EDF5"}}>MesurePro</div>
            <div style={{fontSize:10,color:"#607898"}}>v2.5</div>
          </div>
        </div>
      </div>
      <div style={{flex:1,padding:"8px 0"}}>
        {items.map(function(item) {
          var active = view === item.id || (view === "project" && item.id === "dash");
          return (
            <button type="button" key={item.id} onClick={() => setView(item.id)} style={{
              display:"flex",alignItems:"center",gap:12,
              width:"100%",padding:"12px 16px",
              background:active ? "rgba(0,194,255,0.13)" : "transparent",
              border:"none",
              borderLeft:"3px solid " + (active ? "#00C2FF" : "transparent"),
              color:active ? "#E8EDF5" : "#607898",
              fontSize:13,fontWeight:active ? 700 : 400,
              cursor:"pointer",textAlign:"left",outline:"none",
            }}>
              <span style={{fontSize:14,fontFamily:"monospace",fontWeight:700}}>{item.icon}</span>
              {item.lbl}
            </button>
          );
        })}
      </div>
      <div style={{padding:"13px 16px",borderTop:"1px solid #1C3050",
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:"#00C2FF",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:13,fontWeight:900,color:"#000",flexShrink:0}}>J</div>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"#E8EDF5"}}>Jean Dupont</div>
          <div style={{fontSize:10,color:"#607898"}}>Pro</div>
        </div>
      </div>
    </div>
  );
}

/* ---- Dashboard ---- */
function Dashboard({ projects, reports, onOpen, onNew, onOpenReports }) {
  var [q, setQ] = useState("");
  var [statusFilter, setStatusFilter] = useState("all");
  var ql = q.toLowerCase().trim();
  var list = projects.filter(function(p) {
    var hay = ((p.addr||"")+" "+(p.city||"")+" "+(p.client||"")).toLowerCase();
    if (ql && hay.indexOf(ql) === -1) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });
  var matchedReports = (reports||[]).filter(function(r) {
    if (!ql) return false;
    var hay = ((r.title||"")+" "+(r.ref||"")+" "+(r.cl?r.cl.nom||"":"")+" "+(r.cl?r.cl.adr||"":"")).toLowerCase();
    return hay.indexOf(ql) !== -1;
  });
  var STATUS_FILTERS = [
    {id:"all",        lbl:"Tous"},
    {id:"done",       lbl:"Termines"},
    {id:"processing", lbl:"En cours"},
    {id:"draft",      lbl:"Brouillons"},
  ];
  return (
    <div style={{padding:"26px 28px",overflowY:"auto",height:"100%",boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:"#E8EDF5"}}>Mes Projets</div>
          <div style={{color:"#607898",fontSize:12,marginTop:3}}>
            {projects.length} proprietes{ql ? " - " + list.length + " resultat(s)" : ""}
          </div>
        </div>
        <Btn onClick={onNew} primary={true}>+ Nouveau projet</Btn>
      </div>
      <div style={{position:"relative",marginBottom:12}}>
        <input value={q} onChange={function(e){setQ(e.target.value);}}
          placeholder="Rechercher dans projets ET rapports (adresse, ville, client, ref)..."
          style={{width:"100%",boxSizing:"border-box",background:"#0F1C2E",
            border:"1px solid #1C3050",borderRadius:8,color:"#E8EDF5",
            fontSize:13,padding:"9px 12px",outline:"none"}}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {STATUS_FILTERS.map(function(sf) {
          var active = statusFilter === sf.id;
          return (
            <button type="button" key={sf.id} onClick={function(){setStatusFilter(sf.id);}}
              style={{background:active ? "#00C2FF" : "#152135",
                color:active ? "#000" : "#607898",
                border:"1px solid " + (active ? "#00C2FF" : "#1C3050"),
                borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:active?700:500,
                cursor:"pointer",outline:"none"}}>{sf.lbl}</button>
          );
        })}
      </div>
      {ql && matchedReports.length > 0 && (
        <div style={{background:"rgba(0,194,255,0.06)",border:"1px solid #00C2FF",
          borderRadius:10,padding:"10px 14px",marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#00C2FF",marginBottom:7,
            textTransform:"uppercase",letterSpacing:"0.06em"}}>
            {matchedReports.length} rapport(s) correspondant(s)
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {matchedReports.map(function(r) {
              return (
                <button type="button" key={r.id} onClick={function(){ onOpenReports && onOpenReports(); }}
                  style={{background:"#152135",border:"1px solid #1C3050",
                    color:"#E8EDF5",borderRadius:6,padding:"5px 10px",fontSize:11,
                    cursor:"pointer",outline:"none",display:"inline-flex",alignItems:"center",gap:6}}>
                  <span style={{color:"#607898",fontFamily:"monospace",fontSize:10}}>{r.ref}</span>
                  <span>{r.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:22}}>
        {[
          {lbl:"Projets",   val:projects.length,                                    col:"#00C2FF"},
          {lbl:"Mesures",   val:projects.filter(function(p){return p.status==="done";}).length, col:"#00E5A0"},
          {lbl:"En cours",  val:projects.filter(function(p){return p.status==="processing";}).length, col:"#FF8C42"},
          {lbl:"Surface",   val:projects.reduce(function(a,p){return a+(Number(p.area)||0);},0)+" m2", col:"#607898"},
        ].map(function(s,i) {
          return (
            <div key={i} style={{background:"#0F1C2E",border:"1px solid #1C3050",
              borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:18,fontWeight:900,color:s.col,fontFamily:"monospace"}}>{s.val}</div>
              <div style={{fontSize:10,color:"#607898",textTransform:"uppercase"}}>{s.lbl}</div>
            </div>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>
        {list.map(function(p) {
          return (
            <div key={p.id}
              onClick={p.status !== "processing" ? function(){onOpen(p);} : undefined}
              style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
                overflow:"hidden",cursor:p.status==="processing" ? "default" : "pointer",
                transition:"border-color .2s,transform .2s"}}
              onMouseEnter={function(e){
                if(p.status!=="processing"){e.currentTarget.style.borderColor="#00C2FF";e.currentTarget.style.transform="translateY(-2px)";}
              }}
              onMouseLeave={function(e){e.currentTarget.style.borderColor="#1C3050";e.currentTarget.style.transform="none";}}>
              <div style={{background:"#060D18",height:140,display:"flex",alignItems:"center",
                justifyContent:"center",position:"relative",overflow:"hidden"}}>
                <House shape={p.shape} small={true}/>
                {p.status === "processing" && (
                  <div style={{position:"absolute",inset:0,background:"rgba(6,13,24,0.76)",
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
                    <div style={{width:32,height:32,borderRadius:"50%",
                      border:"3px solid #1C3050",borderTopColor:"#FF8C42",
                      animation:"spin 1s linear infinite"}}/>
                    <span style={{color:"#FF8C42",fontSize:11,fontWeight:700}}>Traitement...</span>
                  </div>
                )}
                {p.status === "draft" && (
                  <div style={{position:"absolute",inset:0,background:"rgba(6,13,24,0.78)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:36}}>+</span>
                  </div>
                )}
                {p.photos && p.photos.length > 0 && (
                  <div style={{position:"absolute",bottom:6,left:6,
                    background:"rgba(0,0,0,0.7)",border:"1px solid #00C2FF",
                    borderRadius:14,padding:"2px 8px",fontSize:10,fontWeight:700,
                    color:"#00C2FF",display:"inline-flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:11}}>📷</span>{p.photos.length}
                  </div>
                )}
              </div>
              <div style={{padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#E8EDF5"}}>{p.addr}</div>
                    <div style={{fontSize:11,color:"#607898",marginTop:2}}>{p.city}</div>
                  </div>
                  <Badge s={p.status}/>
                </div>
                {p.status === "done" && (
                  <div style={{display:"flex",gap:12,marginTop:9,paddingTop:9,borderTop:"1px solid #1C3050"}}>
                    {[["Surface",p.area+" m2"],["Niveaux",p.floors],["Toit",p.roof]].map(function(pair) {
                      return (
                        <div key={pair[0]} style={{fontSize:10,color:"#607898"}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#E8EDF5",fontFamily:"monospace"}}>{pair[1]}</div>
                          {pair[0]}
                        </div>
                      );
                    })}
                    <div style={{marginLeft:"auto",fontSize:10,color:"#2E4A6A",alignSelf:"flex-end"}}>{p.date}</div>
                  </div>
                )}
                {p.status === "draft" && (
                  <div style={{fontSize:11,color:"#607898",marginTop:6}}>
                    {p.photos && p.photos.length > 0 ? p.photos.length + " photo(s) - prete a saisir" : "Photos a capturer"}
                  </div>
                )}
                {p.status === "processing" && (
                  <div style={{fontSize:11,color:"#FF8C42",marginTop:6}}>Analyse en cours</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- ProjectDetail ---- */
var PTABS = [
  {id:"photos",lbl:"Photos"},
  {id:"model", lbl:"Modele 3D"},
  {id:"plans", lbl:"Plans"},
  {id:"meas",  lbl:"Mesures"},
  {id:"design",lbl:"Design"},
  {id:"devis", lbl:"Devis"},
];

function ProjectDetail({ project, onBack, onUpdate }) {
  var [tab, setTab]   = useState("model");
  var [mat, setMat]   = useState(null);
  var [toast, setToast] = useState("");
  return (
    <div>
      {toast && <Toast msg={toast} onDone={function(){setToast("");}}/>}
      <div data-noprint="1" style={{position:"sticky",top:0,zIndex:10,height:50,background:"#0F1C2E",
        borderBottom:"1px solid #1C3050",
        display:"flex",alignItems:"center",gap:12,padding:"0 20px"}}>
        <Btn sm={true} onClick={onBack}>Retour</Btn>
        <div style={{flex:1}}>
          <span style={{fontSize:14,fontWeight:700,color:"#E8EDF5"}}>{project.addr}</span>
          <span style={{fontSize:11,color:"#607898",marginLeft:8}}>{project.city}</span>
        </div>
        <Badge s={project.status}/>
        {project.status === "draft" && (
          <Btn sm={true} primary={true} onClick={function(){
            var m = project.meas || {};
            var area = parseFloat(m.foot) || parseFloat(m.walls) || 0;
            onUpdate({status:"done", area:Math.round(area)});
            setToast("Projet marque comme termine");
          }}>Terminer</Btn>
        )}
        <Btn sm={true} onClick={function(){exportProjectPdf(project); setToast("PDF telecharge");}}>PDF</Btn>
        <Btn sm={true} onClick={function(){exportProjectXlsx(project); setToast("Excel telecharge");}}>Excel</Btn>
      </div>
      <div data-noprint="1" style={{position:"sticky",top:50,zIndex:9,height:42,background:"#0F1C2E",
        borderBottom:"1px solid #1C3050",
        display:"flex",alignItems:"flex-end",paddingLeft:20}}>
        {PTABS.map(function(t) {
          var active = tab === t.id;
          return (
            <button type="button" key={t.id} onClick={function(){setTab(t.id);}} style={{
              height:"100%",padding:"0 16px",background:"none",border:"none",
              borderBottom:"2px solid "+(active ? "#00C2FF" : "transparent"),
              color:active ? "#00C2FF" : "#607898",
              fontSize:12,fontWeight:active ? 700 : 400,
              cursor:"pointer",outline:"none",
              display:"flex",alignItems:"center",whiteSpace:"nowrap",
            }}>{t.lbl}</button>
          );
        })}
      </div>
      <div style={{minHeight:"calc(100vh - 92px)"}}>
        {tab === "photos" && <TabPhotos project={project} onUpdate={onUpdate}/>}
        {tab === "model"  && <TabModel  project={project} mat={mat} setMat={setMat} onUpdate={onUpdate}/>}
        {tab === "plans"  && <TabPlans  project={project} setToast={setToast}/>}
        {tab === "meas"   && <TabMeas   project={project} onUpdate={onUpdate}/>}
        {tab === "design" && <TabDesign project={project} mat={mat} setMat={setMat}/>}
        {tab === "devis"  && <TabDevis  project={project} mat={mat} setToast={setToast}/>}
      </div>
    </div>
  );
}

function TabPhotos({ project, onUpdate }) {
  var photos = project.photos || [];
  var [zoom, setZoom] = useState(null);
  var [drag, setDrag] = useState(false);
  var inpRef = useRef();
  function addFiles(fileList) {
    var arr = Array.prototype.slice.call(fileList).filter(function(f){
      return f.type && f.type.indexOf("image/") === 0;
    });
    if (arr.length === 0) return;
    var next = arr.map(function(f) {
      return { name: f.name, size: f.size, url: URL.createObjectURL(f) };
    });
    onUpdate({ photos: photos.concat(next) });
  }
  function removeAt(i) {
    var p = photos[i];
    if (p && p.url) { try { URL.revokeObjectURL(p.url); } catch(e){} }
    onUpdate({ photos: photos.filter(function(_, j){ return j !== i; }) });
  }
  function onDragOver(e) { e.preventDefault(); e.stopPropagation(); setDrag(true); }
  function onDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDrag(false); }
  function onDrop(e) {
    e.preventDefault(); e.stopPropagation();
    setDrag(false);
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{padding:"22px 24px",overflowY:"auto",height:"calc(100vh - 92px)",boxSizing:"border-box",
        position:"relative",
        background: drag ? "rgba(0,194,255,0.08)" : "transparent",
        outline: drag ? "2px dashed #00C2FF" : "none",
        outlineOffset: drag ? "-12px" : "0",
        transition:"background 0.15s, outline 0.15s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:"#E8EDF5"}}>Photos du projet</div>
          <div style={{fontSize:11,color:"#607898",marginTop:3}}>{photos.length} fichier(s)</div>
        </div>
        <Btn primary={true} onClick={function(){ inpRef.current.click(); }}>+ Ajouter</Btn>
        <input ref={inpRef} type="file" multiple accept="image/*" style={{display:"none"}}
          onChange={function(e){ addFiles(e.target.files); e.target.value=""; }}/>
      </div>
      {photos.length === 0 && (
        <div onClick={function(){ inpRef.current.click(); }}
          style={{border:"2px dashed #1C3050",borderRadius:12,padding:"50px 20px",
            textAlign:"center",cursor:"pointer",background:"rgba(0,194,255,0.04)"}}>
          <div style={{fontSize:42,marginBottom:8,color:"#607898"}}>+</div>
          <div style={{fontSize:14,color:"#E8EDF5",fontWeight:600}}>Glisser des photos ou cliquer</div>
          <div style={{fontSize:11,color:"#607898",marginTop:5}}>JPG, PNG, WEBP - aucune limite</div>
        </div>
      )}
      {photos.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          {photos.map(function(p, i) {
            var FACADE_COLORS = {sud:"#FF8C42",nord:"#00C2FF",est:"#00E5A0",ouest:"#A78BFA",vue:"#9aa3ad"};
            var FACADE_LABELS = {sud:"SUD",nord:"NORD",est:"EST",ouest:"OUEST",vue:"VUE"};
            return (
              <div key={i} style={{position:"relative",aspectRatio:"4/3",
                borderRadius:8,overflow:"hidden",border:"1px solid #1C3050",
                cursor:"pointer",background:"#060D18"}}
                onClick={function(){ setZoom(p); }}>
                <img src={p.url} alt={p.name}
                  style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                {p.facade && (
                  <div style={{position:"absolute",top:5,left:5,
                    background:FACADE_COLORS[p.facade]||"#9aa3ad",color:"#000",
                    fontSize:10,fontWeight:900,padding:"3px 8px",
                    borderRadius:4,letterSpacing:"0.06em",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}}>
                    {FACADE_LABELS[p.facade]||p.facade.toUpperCase()}
                  </div>
                )}
                <button type="button"
                  onClick={function(e){ e.stopPropagation(); removeAt(i); }}
                  style={{position:"absolute",top:5,right:5,
                    background:"rgba(255,71,87,0.92)",color:"#fff",
                    border:"none",borderRadius:4,width:22,height:22,
                    fontSize:12,fontWeight:900,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
                <div style={{position:"absolute",bottom:0,left:0,right:0,
                  background:"rgba(0,0,0,0.7)",padding:"4px 8px",
                  fontSize:10,color:"#E8EDF5",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
              </div>
            );
          })}
        </div>
      )}
      {zoom && (
        <div onClick={function(){ setZoom(null); }}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out",
            padding:30,boxSizing:"border-box"}}>
          <img src={zoom.url} alt={zoom.name}
            style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
        </div>
      )}
    </div>
  );
}

/* ---- TabPlans: 4 architectural elevations (Sud / Est / Nord / Ouest) ---- */
var FACADES = [
  { id:"sud",   label:"FACADE SUD" },
  { id:"est",   label:"FACADE EST" },
  { id:"nord",  label:"FACADE NORD" },
  { id:"ouest", label:"FACADE OUEST" },
];

function TabPlans({ project, setToast }) {
  var [zoom, setZoom] = useState(null);

  function exportAllPlansPdf() {
    /* Render each facade SVG to a dataURL via canvas, place 2 per A4 page. */
    var doc = new jsPDF({orientation:"landscape", unit:"mm", format:"a4"});
    /* A4 landscape: 297 x 210 mm. Place 2 plans per page (top + bottom). */
    var nodes = document.querySelectorAll('[data-elevation-svg]');
    if (nodes.length === 0) {
      setToast && setToast("Aucun plan a exporter");
      return;
    }
    var done = 0;
    function rasterize(svgEl, cb) {
      var svgClone = svgEl.cloneNode(true);
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      var serialized = new XMLSerializer().serializeToString(svgClone);
      var blob = new Blob([serialized], {type:"image/svg+xml;charset=utf-8"});
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement("canvas");
        canvas.width = 1600; canvas.height = 1200;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        cb(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = function(){ URL.revokeObjectURL(url); cb(null); };
      img.src = url;
    }
    var pngs = [];
    function next(i) {
      if (i >= nodes.length) {
        var slot = 0;
        pngs.forEach(function(png, k) {
          if (!png) return;
          if (slot === 2) { doc.addPage(); slot = 0; }
          var y = slot === 0 ? 8 : 110;
          doc.addImage(png, "JPEG", 18, y, 261, 96, undefined, "FAST");
          slot++;
        });
        var addr = (project.addr || "plans").toLowerCase().replace(/[^a-z0-9]+/g,"-");
        doc.save("mesurepro-plans-" + addr + ".pdf");
        setToast && setToast("PDF des plans telecharge");
        return;
      }
      rasterize(nodes[i], function(png) {
        pngs[i] = png;
        next(i+1);
      });
    }
    next(0);
  }

  return (
    <div style={{padding:"22px 24px",overflowY:"auto",height:"calc(100vh - 92px)",boxSizing:"border-box",background:"#F0EFEA"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:"#1a1a1a"}}>Plans d'elevations</div>
          <div style={{fontSize:11,color:"#666",marginTop:3}}>
            {project.addr} - 4 facades cotees, niveau ±0.00 = TN, limites propriete en orange
          </div>
        </div>
        <Btn primary={true} onClick={exportAllPlansPdf}>Telecharger PDF</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
        {FACADES.map(function(f) {
          /* Find a project photo tagged for this facade. The user can
             override by uploading their own photo with facade=<id>. */
          var matchingPhoto = (project.photos || []).find(function(p){
            return p && p.facade === f.id;
          });
          return (
            <div key={f.id}
              style={{background:"#fff",border:"1px solid #d6d2c7",borderRadius:6,
                boxShadow:"0 1px 3px rgba(0,0,0,0.08)",
                overflow:"hidden",display:"flex",flexDirection:"column"}}>
              {/* Drawing */}
              <div onClick={function(){setZoom(f);}}
                data-elevation-svg
                style={{aspectRatio:"4/3",background:"#fff",cursor:"zoom-in"}}>
                <Elevation project={project} facadeId={f.id} label={f.label}/>
              </div>
              {/* Photo of the actual facade (if available) */}
              {matchingPhoto ? (
                <div style={{borderTop:"1px solid #e0dcd0",
                  display:"flex",alignItems:"stretch",background:"#f7f5f0"}}>
                  <img src={matchingPhoto.url} alt={matchingPhoto.name}
                    style={{width:120,height:90,objectFit:"cover",flexShrink:0,
                      borderRight:"1px solid #e0dcd0"}}/>
                  <div style={{flex:1,padding:"8px 12px",
                    display:"flex",flexDirection:"column",justifyContent:"center"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#444",letterSpacing:"0.04em"}}>
                      📷 {matchingPhoto.name}
                    </div>
                    <div style={{fontSize:10,color:"#888",marginTop:2}}>
                      Photo terrain - facade {f.id}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{borderTop:"1px solid #e0dcd0",
                  padding:"10px 14px",fontSize:10,color:"#aaa",
                  background:"#fafaf6",fontStyle:"italic"}}>
                  Aucune photo associee a cette facade
                </div>
              )}
            </div>
          );
        })}
      </div>
      {zoom && (
        <div onClick={function(){setZoom(null);}}
          style={{position:"fixed",inset:0,background:"rgba(20,20,20,0.92)",zIndex:300,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out",
            padding:30,boxSizing:"border-box"}}>
          <div onClick={function(e){e.stopPropagation();}}
            style={{background:"#fff",borderRadius:6,padding:0,
              maxWidth:"95%",maxHeight:"95%",width:"min(1400px,95%)",
              boxShadow:"0 30px 80px rgba(0,0,0,0.6)",
              display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"10px 18px",borderBottom:"1px solid #e0e0e0",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:800,color:"#1a1a1a"}}>{zoom.label} - {project.addr}</div>
              <button type="button" onClick={function(){setZoom(null);}}
                style={{background:"transparent",border:"1px solid #ccc",
                  color:"#666",borderRadius:5,padding:"4px 11px",
                  fontSize:12,cursor:"pointer",outline:"none"}}>Fermer</button>
            </div>
            <div style={{flex:1,padding:14,background:"#fff",minHeight:0,
              display:"flex",gap:14,alignItems:"stretch"}}>
              {/* Plan d'elevation */}
              <div style={{flex:1.2,minWidth:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:"100%",aspectRatio:"4/3",maxHeight:"75vh"}}>
                  <Elevation project={project} facadeId={zoom.id} label={zoom.label}/>
                </div>
              </div>
              {/* Photo associee */}
              {(function(){
                var photo = (project.photos || []).find(function(p){
                  return p && p.facade === zoom.id;
                });
                if (!photo) {
                  return (
                    <div style={{flex:0.8,minWidth:0,background:"#fafaf6",
                      borderRadius:6,border:"1px dashed #d6d2c7",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      padding:14,textAlign:"center"}}>
                      <div>
                        <div style={{fontSize:34,marginBottom:6}}>📷</div>
                        <div style={{fontSize:12,color:"#888",fontStyle:"italic"}}>
                          Aucune photo<br/>pour cette facade
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div style={{flex:0.8,minWidth:0,
                    display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{flex:1,minHeight:0,
                      borderRadius:4,overflow:"hidden",background:"#000"}}>
                      <img src={photo.url} alt={photo.name}
                        style={{width:"100%",height:"100%",objectFit:"contain"}}/>
                    </div>
                    <div style={{padding:"6px 10px",background:"#f7f5f0",
                      borderRadius:4,fontSize:11,color:"#444"}}>
                      📷 {photo.name}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabModel({ project, mat, setMat, onUpdate }) {
  var m = project.meas || {};
  var fl = parseInt(project.floors) || 2;
  var realH = parseFloat(m.h) || 7.4;
  var realFoot = parseFloat(m.foot) || 142;

  function setFloors(n) {
    onUpdate && onUpdate({floors: n});
  }
  function setMeas(key, val) {
    var next = Object.assign({}, m, {[key]: String(val)});
    /* When the user moves dimensional sliders we also recompute the
       derivable surfaces so the building visual + measurements stay
       consistent. The user can still override any field manually in
       the Mesures tab afterwards. */
    if (key === "h" || key === "foot") {
      var h = parseFloat(key === "h"    ? val : m.h)    || realH;
      var f = parseFloat(key === "foot" ? val : m.foot) || realFoot;
      var ratio = 1.6;
      var w = Math.sqrt(f * ratio);
      var d = Math.sqrt(f / ratio);
      var perim = 2 * (w + d);
      var walls = perim * h;
      next.perim = perim.toFixed(1);
      next.walls = walls.toFixed(1);
      if (!m.roof || m.roof === "") next.roof = (f * 1.3).toFixed(1);
    }
    onUpdate && onUpdate({meas: next});
  }
  return (
    <div style={{display:"flex",height:"calc(100vh - 92px)"}}>
      <div style={{flex:1,padding:18,display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{background:"#060D18",borderRadius:10,border:"1px solid #1C3050",
          flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <IsoModel mat={mat} photos={project.photos} floors={fl} meas={project.meas} rooms={project.rooms} roof={project.roof}/>
        </div>
        <div style={{fontSize:11,color:"#607898",marginTop:8,textAlign:"center"}}>
          Glissez sur le modele pour le faire pivoter
        </div>
      </div>
      <div style={{width:240,borderLeft:"1px solid #1C3050",overflowY:"auto",
        padding:"16px 14px",flexShrink:0}}>

        {/* Edit sliders — always visible if onUpdate is provided */}
        {onUpdate && (
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,fontWeight:700,color:"#00C2FF",textTransform:"uppercase",
              letterSpacing:"0.08em",marginBottom:10}}>Edition rapide</div>

            <div style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#607898",marginBottom:4}}>
                <span>Etages</span>
                <span style={{color:"#E8EDF5",fontFamily:"monospace",fontWeight:700}}>{fl}</span>
              </div>
              <input type="range" min="1" max="5" step="1" value={fl}
                onChange={function(e){ setFloors(parseInt(e.target.value)); }}
                style={{width:"100%",accentColor:"#00C2FF",cursor:"pointer"}}/>
            </div>

            <div style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#607898",marginBottom:4}}>
                <span>Hauteur</span>
                <span style={{color:"#E8EDF5",fontFamily:"monospace",fontWeight:700}}>{(parseFloat(m.h) || realH).toFixed(1)} m</span>
              </div>
              <input type="range" min="3" max="20" step="0.1" value={parseFloat(m.h) || realH}
                onChange={function(e){ setMeas("h", e.target.value); }}
                style={{width:"100%",accentColor:"#00E5A0",cursor:"pointer"}}/>
            </div>

            <div style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#607898",marginBottom:4}}>
                <span>Emprise sol</span>
                <span style={{color:"#E8EDF5",fontFamily:"monospace",fontWeight:700}}>{(parseFloat(m.foot) || realFoot).toFixed(0)} m²</span>
              </div>
              <input type="range" min="40" max="500" step="2" value={parseFloat(m.foot) || realFoot}
                onChange={function(e){ setMeas("foot", e.target.value); }}
                style={{width:"100%",accentColor:"#FF8C42",cursor:"pointer"}}/>
            </div>

            <div style={{fontSize:9,color:"#2E4A6A",lineHeight:1.4,
              padding:"7px 0",borderTop:"1px solid #1C3050",marginTop:6}}>
              Les murs et le perimetre sont recalcules automatiquement.
              Pour saisir manuellement chaque cote, utilisez l'onglet <span style={{color:"#607898",fontWeight:700}}>Mesures</span>.
            </div>
          </div>
        )}

        <div style={{fontSize:10,fontWeight:700,color:"#607898",textTransform:"uppercase",
          letterSpacing:"0.08em",marginBottom:12}}>Donnees projet</div>
        {project.meas && [
          ["Murs",     (m.walls||"-")+" m²"],
          ["Toit",     (m.roof||"-")+" m²"],
          ["Perimetre",(m.perim||"-")+" m"],
          ["Hauteur",  (m.h||"-")+" m"],
          ["Emprise",  (m.foot||"-")+" m²"],
          ["Fenetres", m.win||"-"],
          ["Portes",   m.doors||"-"],
        ].map(function(pair) {
          return (
            <div key={pair[0]} style={{display:"flex",justifyContent:"space-between",
              padding:"6px 0",borderBottom:"1px solid #1C3050"}}>
              <span style={{fontSize:11,color:"#607898"}}>{pair[0]}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#E8EDF5",fontFamily:"monospace"}}>{pair[1]}</span>
            </div>
          );
        })}
        <div style={{marginTop:18,fontSize:10,fontWeight:700,color:"#607898",
          textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:11}}>Apercu materiau</div>
        {MATS.map(function(mt) {
          var active = mat && mat.id === mt.id;
          return (
            <button type="button" key={mt.id}
              onClick={function(){setMat(active ? null : mt);}} style={{
              display:"flex",alignItems:"center",gap:9,padding:"7px 9px",
              borderRadius:8,border:"1px solid "+(active ? "#00C2FF" : "#1C3050"),
              cursor:"pointer",background:active ? "rgba(0,194,255,0.13)" : "transparent",
              marginBottom:5,width:"100%",outline:"none",
            }}>
              <MatTile m={mt} size={22}/>
              <span style={{fontSize:11,color:"#E8EDF5",flex:1,textAlign:"left"}}>{mt.lbl}</span>
              {active && <span style={{color:"#00C2FF",fontSize:12}}>OK</span>}
            </button>
          );
        })}

        {(project.photos || []).length > 0 && (
          <div style={{marginTop:14,paddingTop:11,borderTop:"1px solid #1C3050"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#00E5A0",textTransform:"uppercase",
              letterSpacing:"0.08em",marginBottom:8}}>Vos photos</div>
            {(project.photos || []).map(function(p, i) {
              var pm = photoMat(p, i);
              var active = mat && mat.id === pm.id;
              return (
                <button type="button" key={pm.id}
                  onClick={function(){setMat(active ? null : pm);}} style={{
                  display:"flex",alignItems:"center",gap:9,padding:"6px 9px",
                  borderRadius:8,border:"1px solid "+(active ? "#00E5A0" : "#1C3050"),
                  cursor:"pointer",background:active ? "rgba(0,229,160,0.10)" : "transparent",
                  marginBottom:5,width:"100%",outline:"none",
                }}>
                  <img src={p.url} alt={p.name||""}
                    style={{width:22,height:22,borderRadius:4,objectFit:"cover",
                      border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}}/>
                  <span style={{fontSize:11,color:"#E8EDF5",flex:1,textAlign:"left",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name || ("Photo "+(i+1))}</span>
                  {active && <span style={{color:"#00E5A0",fontSize:12}}>OK</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TabMeas({ project, onUpdate }) {
  var m = project.meas || {};
  var rooms = project.rooms || [];

  var FIELDS = [
    {key:"walls", lbl:"Surface murs", unit:"m²", col:"#00C2FF"},
    {key:"roof",  lbl:"Surface toit", unit:"m²", col:"#00E5A0"},
    {key:"perim", lbl:"Perimetre",    unit:"m",  col:"#FF8C42"},
    {key:"h",     lbl:"Hauteur",      unit:"m",  col:"#E8EDF5"},
    {key:"foot",  lbl:"Emprise sol",  unit:"m²", col:"#E8EDF5"},
    {key:"win",   lbl:"Fenetres",     unit:"",   col:"#E8EDF5"},
    {key:"doors", lbl:"Portes",       unit:"",   col:"#E8EDF5"},
  ];

  function setMeasField(key, val) {
    var next = Object.assign({}, m, {[key]: val});
    onUpdate({meas: next});
  }

  function setRoomField(i, field, val) {
    var next = rooms.map(function(r, j) {
      return j === i ? Object.assign({}, r, {[field]: val}) : r;
    });
    onUpdate({rooms: next});
  }

  function addRoom() {
    onUpdate({rooms: rooms.concat([{n:"Nouveau mur", a:"0", l:"--", h:"--", t:"w"}])});
  }

  function delRoom(i) {
    onUpdate({rooms: rooms.filter(function(_, j){ return j !== i; })});
  }

  /* Shared style for inline text inputs in the rooms table */
  var cellInput = {
    width:"100%", boxSizing:"border-box",
    background:"#0A1828", border:"1px solid #1C3050",
    borderRadius:5, color:"#E8EDF5", fontSize:12,
    padding:"4px 6px", outline:"none",
    fontFamily:"monospace",
  };

  return (
    <div style={{padding:"22px 24px", overflowY:"auto"}}>

      {/* Hero instruction banner with progress */}
      {(function(){
        var filled = FIELDS.filter(function(f){ var v = m[f.key]; return v !== "" && v != null && parseFloat(v) > 0; }).length;
        var total = FIELDS.length;
        var pct = Math.round((filled/total)*100);
        var ready = filled === total;
        return (
          <div style={{background: ready ? "rgba(0,229,160,0.10)" : "rgba(0,194,255,0.08)",
            border:"1px solid " + (ready ? "#00E5A0" : "#00C2FF"),
            borderRadius:10, padding:"12px 18px", marginBottom:22,
            display:"flex", alignItems:"center", gap:14}}>
            <div style={{fontSize:28}}>{ready ? "✓" : "📐"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:800, color: ready ? "#00E5A0" : "#00C2FF", marginBottom:4}}>
                {ready ? "Toutes les mesures sont saisies" : "Saisie des mesures"}
              </div>
              <div style={{fontSize:12, color:"#607898"}}>
                {filled}/{total} champs renseignes — sauvegarde automatique a chaque touche
              </div>
              <div style={{height:4, background:"#1C3050", borderRadius:2, marginTop:8, overflow:"hidden"}}>
                <div style={{height:"100%", width:pct+"%",
                  background: ready ? "#00E5A0" : "#00C2FF",
                  transition:"width 0.3s"}}/>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7 measurement cards */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:26}}>
        {FIELDS.map(function(f) {
          var v = m[f.key];
          var empty = v === "" || v == null || !(parseFloat(v) > 0);
          var borderCol = empty ? "rgba(255,140,66,0.55)" : f.col;
          return (
            <div key={f.key} style={{background:"#0F1C2E",
              border: "1px solid " + (empty ? "rgba(255,140,66,0.35)" : "#1C3050"),
              borderRadius:10, padding:"14px 16px",
              transition:"border-color 0.2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:9, color:"#607898", textTransform:"uppercase",
                  letterSpacing:"0.08em"}}>{f.lbl}</div>
                {empty && (
                  <span style={{fontSize:8,color:"#FF8C42",fontWeight:700,
                    textTransform:"uppercase",letterSpacing:"0.05em"}}>vide</span>
                )}
              </div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <input
                  type="number"
                  step="any"
                  value={v === "" || v == null ? "" : v}
                  onChange={function(e){ setMeasField(f.key, e.target.value); }}
                  placeholder="0"
                  style={{
                    flex:1, background:"#0A1828",
                    border:"2px solid " + borderCol,
                    borderRadius:6, color: empty ? "#607898" : f.col,
                    fontSize:22, fontWeight:900,
                    fontFamily:"monospace", padding:"6px 10px",
                    outline:"none", textAlign:"right",
                    boxSizing:"border-box",
                    transition:"border-color 0.2s, color 0.2s",
                  }}
                />
                {f.unit ? <span style={{color:"#607898", fontSize:13, flexShrink:0}}>{f.unit}</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rooms / facades table */}
      <div style={{background:"#0F1C2E", border:"1px solid #1C3050",
        borderRadius:12, overflow:"hidden"}}>
        <div style={{padding:"12px 16px", borderBottom:"1px solid #1C3050",
          display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <span style={{fontSize:13, fontWeight:700, color:"#E8EDF5"}}>Facades et zones</span>
            <span style={{fontSize:11, color:"#607898", marginLeft:10}}>
              cliquez dans une cellule pour modifier
            </span>
          </div>
          <button type="button" onClick={addRoom}
            style={{background:"#00C2FF", color:"#000", border:"none",
              borderRadius:7, padding:"5px 14px", fontSize:12, fontWeight:800,
              cursor:"pointer", outline:"none"}}>
            + Ajouter
          </button>
        </div>

        {rooms.length === 0 && (
          <div style={{padding:"24px", textAlign:"center", color:"#607898", fontSize:13}}>
            Aucune facade — cliquez + Ajouter
          </div>
        )}

        {rooms.length > 0 && (
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"rgba(0,0,0,0.25)"}}>
                {["Nom","Surface","Longueur","Hauteur","Type",""].map(function(h,i){
                  return (
                    <th key={i} style={{padding:"8px 12px", textAlign:"left",
                      fontSize:9, color:"#607898", fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.06em"}}>
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rooms.map(function(room, i) {
                return (
                  <tr key={i} style={{borderTop:"1px solid #1C3050",
                    background:i%2===0 ? "transparent" : "rgba(0,0,0,0.06)"}}>
                    <td style={{padding:"8px 12px"}}>
                      <input value={room.n || ""}
                        onChange={function(e){ setRoomField(i,"n",e.target.value); }}
                        style={{...cellInput, fontFamily:"inherit", fontWeight:600, color:"#E8EDF5", width:130}}/>
                    </td>
                    <td style={{padding:"8px 12px"}}>
                      <input type="number" step="any" value={room.a || ""}
                        onChange={function(e){ setRoomField(i,"a",e.target.value); }}
                        placeholder="m2"
                        style={{...cellInput, color:"#00C2FF", width:80, textAlign:"right"}}/>
                    </td>
                    <td style={{padding:"8px 12px"}}>
                      <input value={room.l || ""}
                        onChange={function(e){ setRoomField(i,"l",e.target.value); }}
                        placeholder="m"
                        style={{...cellInput, width:80}}/>
                    </td>
                    <td style={{padding:"8px 12px"}}>
                      <input value={room.h || ""}
                        onChange={function(e){ setRoomField(i,"h",e.target.value); }}
                        placeholder="m"
                        style={{...cellInput, width:80}}/>
                    </td>
                    <td style={{padding:"8px 12px"}}>
                      <select value={room.t || "w"}
                        onChange={function(e){ setRoomField(i,"t",e.target.value); }}
                        style={{background:"#152135", border:"1px solid #1C3050",
                          color:"#E8EDF5", padding:"4px 6px", borderRadius:5,
                          fontSize:11, cursor:"pointer", outline:"none"}}>
                        <option value="w">Mur</option>
                        <option value="r">Toit</option>
                      </select>
                    </td>
                    <td style={{padding:"8px 12px", textAlign:"center"}}>
                      <button type="button" onClick={function(){ delRoom(i); }}
                        style={{background:"rgba(255,71,87,0.15)",
                          border:"1px solid #FF4757", color:"#FF4757",
                          borderRadius:5, width:28, height:28,
                          fontSize:14, cursor:"pointer", outline:"none",
                          display:"inline-flex", alignItems:"center", justifyContent:"center"}}>
                        X
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

/* Build a virtual material from an uploaded project photo */
function photoMat(photo, idx) {
  var idKey = photo.id || idx;
  return {
    id:    "photo-" + idKey,
    lbl:   "Photo: " + (photo.name || ("image " + (idx+1))),
    col:   "#9E8E7E",
    fill:  "url(#mat-photo-" + idKey + ")",
    price: null,
    photo: photo,
  };
}

/* Mini-tile that previews a material's pattern. Uses an inline SVG with
   <MatDefs> + a square filled with the pattern URL. */
function MatTile({ m, photos, size }) {
  var s = size || 40;
  return (
    <svg width={s} height={s} viewBox={"0 0 "+s+" "+s}
      style={{borderRadius:8,border:"1.5px solid rgba(255,255,255,0.1)",flexShrink:0,display:"block"}}>
      <MatDefs photos={photos}/>
      <rect width={s} height={s} fill={m.fill || m.col}/>
    </svg>
  );
}

function TabDesign({ project, mat, setMat }) {
  var [hov, setHov] = useState(null);
  var disp = hov || mat;
  var photos = project.photos || [];
  var photoMats = photos.map(photoMat);
  return (
    <div style={{display:"flex",minHeight:"calc(100vh - 92px)"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",background:"#060D18",gap:14,padding:24}}>
        <div style={{background:"#0A1522",borderRadius:14,padding:"24px 40px",
          border:"1px solid #1C3050",position:"relative"}}>
          {disp && (
            <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",
              background:"#0F1C2E",border:"1px solid #00C2FF",borderRadius:20,
              padding:"3px 12px",fontSize:11,color:"#00C2FF",fontWeight:700,whiteSpace:"nowrap"}}>
              {disp.lbl}
            </div>
          )}
          <House shape={project.shape} mat={disp} photos={photos}/>
        </div>
        <p style={{color:"#607898",fontSize:11,textAlign:"center"}}>
          Survolez pour previsualiser - Cliquez pour selectionner
        </p>
      </div>
      <div style={{width:268,borderLeft:"1px solid #1C3050",overflowY:"auto",
        padding:"16px 14px",flexShrink:0}}>
        <div style={{fontSize:12,fontWeight:700,color:"#E8EDF5",marginBottom:14}}>Materiaux</div>
        {MATS.map(function(m) {
          var active = mat && mat.id === m.id;
          return (
            <button type="button" key={m.id}
              onClick={function(){setMat(active ? null : m);}}
              onMouseEnter={function(){setHov(m);}}
              onMouseLeave={function(){setHov(null);}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"11px 13px",
                borderRadius:10,border:"1px solid "+(active ? "#00C2FF" : "#1C3050"),
                cursor:"pointer",background:active ? "rgba(0,194,255,0.13)" : "#0F1C2E",
                marginBottom:7,width:"100%",outline:"none"}}>
              <MatTile m={m}/>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:600,color:"#E8EDF5"}}>{m.lbl}</div>
                <div style={{fontSize:10,color:"#607898",marginTop:2}}>~{m.price} EUR/m2</div>
              </div>
              {active && <span style={{color:"#00C2FF",fontSize:12}}>OK</span>}
            </button>
          );
        })}

        {/* Section: photos importees comme texture custom */}
        <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid #1C3050"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#E8EDF5",marginBottom:6}}>Vos photos</div>
          <div style={{fontSize:10,color:"#607898",marginBottom:10,lineHeight:1.4}}>
            {photoMats.length === 0
              ? "Importez des photos dans l'onglet Photos pour creer des textures personnalisees."
              : "Appliquez la texture d'une photo de chantier directement sur le batiment."}
          </div>
          {photoMats.map(function(pm) {
            var active = mat && mat.id === pm.id;
            return (
              <button type="button" key={pm.id}
                onClick={function(){setMat(active ? null : pm);}}
                onMouseEnter={function(){setHov(pm);}}
                onMouseLeave={function(){setHov(null);}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"9px 11px",
                  borderRadius:10,border:"1px solid "+(active ? "#00E5A0" : "#1C3050"),
                  cursor:"pointer",background:active ? "rgba(0,229,160,0.10)" : "#0F1C2E",
                  marginBottom:6,width:"100%",outline:"none"}}>
                <img src={pm.photo.url} alt={pm.photo.name}
                  style={{width:40,height:40,borderRadius:8,objectFit:"cover",
                    border:"1.5px solid rgba(255,255,255,0.1)",flexShrink:0}}/>
                <div style={{flex:1,textAlign:"left",minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#E8EDF5",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {pm.photo.name || "Photo"}
                  </div>
                  <div style={{fontSize:10,color:"#607898",marginTop:2}}>texture personnalisee</div>
                </div>
                {active && <span style={{color:"#00E5A0",fontSize:12}}>OK</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabDevis({ project, mat, setToast }) {
  var [margin, setMargin] = useState(15);
  var [done, setDone] = useState(false);
  var m = project.meas || {};
  var walls = parseFloat(m.walls) || 0;
  var roof  = parseFloat(m.roof)  || 0;
  if (!walls && !roof) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",minHeight:"calc(100vh - 92px)",gap:10,color:"#607898"}}>
        <div style={{fontSize:36}}>$</div>
        <div style={{fontSize:14,fontWeight:600}}>Saisissez les mesures dans l onglet Mesures</div>
      </div>
    );
  }
  var M   = mat || MATS[3];
  var wc2 = Math.round(walls * M.price);
  var rc2 = Math.round(roof  * 68);
  var lb  = Math.round((wc2+rc2) * 0.28);
  var sub = wc2+rc2+lb;
  var tva = Math.round(sub * 0.2);
  var tot = sub + tva;
  var sell= Math.round(sub * (1 + margin/100) * 1.2);
  var f   = function(n){ return n.toLocaleString("fr-FR"); };
  return (
    <div style={{padding:"22px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
        <div>
          <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
            overflow:"hidden",marginBottom:14}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1C3050",
              fontSize:12,fontWeight:700,color:"#E8EDF5"}}>
              Detail - {M.lbl}
            </div>
            {[
              ["Revetement murs",walls+" m2 x "+M.price+" EUR/m2",wc2],
              ["Toiture",roof+" m2 x 68 EUR/m2",rc2],
              ["Main oeuvre (28%)","Pose et finitions",lb],
            ].map(function(row) {
              return (
                <div key={row[0]} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #1C3050"}}>
                  <div>
                    <div style={{fontSize:12,color:"#E8EDF5",fontWeight:500}}>{row[0]}</div>
                    <div style={{fontSize:10,color:"#607898",marginTop:2}}>{row[1]}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:"#E8EDF5",fontFamily:"monospace"}}>
                    {f(row[2])} EUR
                  </span>
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 16px",
              borderBottom:"1px solid #1C3050"}}>
              <span style={{color:"#607898",fontSize:12}}>Sous-total HT</span>
              <span style={{fontFamily:"monospace",fontSize:12,color:"#E8EDF5"}}>{f(sub)} EUR</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 16px",
              borderBottom:"1px solid #1C3050"}}>
              <span style={{color:"#607898",fontSize:12}}>TVA 20%</span>
              <span style={{fontFamily:"monospace",fontSize:12,color:"#E8EDF5"}}>{f(tva)} EUR</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",
              background:"rgba(0,194,255,0.13)"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#E8EDF5"}}>TOTAL TTC</span>
              <span style={{fontSize:18,fontWeight:900,color:"#00C2FF",fontFamily:"monospace"}}>
                {f(tot)} EUR
              </span>
            </div>
          </div>
          <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,color:"#E8EDF5"}}>Marge commerciale</span>
              <span style={{fontSize:14,fontWeight:900,color:"#00E5A0",fontFamily:"monospace"}}>{margin}%</span>
            </div>
            <input type="range" min={0} max={60} value={margin}
              onChange={function(e){setMargin(+e.target.value);}}
              style={{width:"100%",accentColor:"#00C2FF",cursor:"pointer"}}/>
            <div style={{display:"flex",justifyContent:"space-between",
              marginTop:12,paddingTop:10,borderTop:"1px solid #1C3050"}}>
              <span style={{fontSize:12,color:"#607898"}}>Prix de vente TTC</span>
              <span style={{fontSize:17,fontWeight:900,color:"#00E5A0",fontFamily:"monospace"}}>
                {f(sell)} EUR
              </span>
            </div>
          </div>
        </div>
        <div>
          <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
            padding:"16px 18px",marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:"#607898",textTransform:"uppercase",
              letterSpacing:"0.08em",marginBottom:12}}>Recapitulatif</div>
            <div style={{fontSize:16,fontWeight:900,color:"#E8EDF5",marginBottom:2}}>{project.addr}</div>
            <div style={{fontSize:12,color:"#607898",marginBottom:14}}>{project.city}</div>
            {[["Murs",walls+" m2"],["Toit",roof+" m2"],["Materiau",M.lbl],["Prix mat.",M.price+" EUR/m2"]].map(function(pair) {
              return (
                <div key={pair[0]} style={{display:"flex",justifyContent:"space-between",
                  padding:"6px 0",borderBottom:"1px solid #1C3050"}}>
                  <span style={{fontSize:11,color:"#607898"}}>{pair[0]}</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#E8EDF5",fontFamily:"monospace"}}>{pair[1]}</span>
                </div>
              );
            })}
          </div>
          {done && (
            <div style={{background:"rgba(0,229,160,0.11)",border:"1px solid #00E5A0",
              borderRadius:8,padding:"9px 13px",marginBottom:10,fontSize:12,
              color:"#00E5A0",fontWeight:600}}>
              Proposition generee!
            </div>
          )}
          <Btn primary={true} onClick={function(){setDone(true);setToast("Proposition generee");}}
            style={{width:"100%",marginBottom:9}}>
            Generer la proposition
          </Btn>
          <Btn onClick={function(){exportProjectPdf(project); setToast("PDF telecharge");}} style={{width:"100%"}}>
            Exporter en PDF
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ---- Reports ---- */
var REPORT_TEMPLATES = {
  meas: {
    title:"Nouveau Rapport de Mesures",
    co:{nom:"",adr:"",tel:"",email:""},
    cl:{nom:"",adr:"",tel:"",email:""},
    tech:"", techDate:new Date().toLocaleDateString("fr-FR"),
    notes:"",
    data:{"Surface murs":"","Surface toit":"","Perimetre":"","Hauteur":"","Emprise sol":"","Fenetres":"","Portes":""},
    rows:[],
  },
  devis: {
    title:"Nouveau Devis",
    co:{nom:"",adr:"",tel:"",email:""},
    cl:{nom:"",adr:"",tel:"",email:""},
    lines:[{d:"Prestation 1",q:"1",u:"fft",pu:"0.00",t:"0.00"}],
    discount:"0", acompte:"30",
    payTerms:"Acompte 30% a la commande, solde a reception.",
    notes:"Delai 3 semaines. Garantie decennale incluse. TVA 20%.",
    validity:"30 jours",
  },
  insp: {
    title:"Nouveau Rapport Inspection",
    co:{nom:"",adr:"",tel:"",email:""},
    cl:{nom:"",adr:"",tel:"",email:""},
    tech:"", techDate:new Date().toLocaleDateString("fr-FR"),
    checks:[
      {z:"Facade", it:"Etat general facade", s:"ok", note:""},
      {z:"Toiture", it:"Etat tuiles ardoises", s:"ok", note:""},
      {z:"Murs porteurs", it:"Integrite structurelle", s:"ok", note:""},
    ],
    reco:"",
  },
  prop: {
    title:"Nouvelle Proposition",
    co:{nom:"",adr:"",tel:"",email:""},
    cl:{nom:"",adr:"",tel:"",email:""},
    intro:"",
    projs:[],
    gantt:[],
    cgu:"Tout devis accepte engage le client. Prix fermes 30 jours.",
    sigCl:"", sigPro:"",
    version:"v1.0",
  },
};

function nextRefForKind(kind, reports) {
  var prefix = {meas:"RPT",devis:"DEV",insp:"INS",prop:"PRO"}[kind] || "DOC";
  var year = new Date().getFullYear();
  var n = (reports||[]).filter(function(r){ return r.kind === kind; }).length + 1;
  return prefix + "-" + year + "-" + String(n).padStart(3,"0");
}

function Reports({ reports, setReports }) {
  var [sel,  setSel]  = useState(reports[0] && reports[0].id);
  var [toast,setToast]= useState("");
  var [showNew, setShowNew] = useState(false);
  var r = reports.find(function(x){ return x.id === sel; });
  function upd(id, p) { setReports(function(rs){ return rs.map(function(x){ return x.id===id ? Object.assign({},x,p) : x; }); }); }
  function updD(id, k, p) { setReports(function(rs){ return rs.map(function(x){ if (x.id!==id) return x; var n={}; Object.keys(x[k]).forEach(function(f){n[f]=x[k][f];}); Object.keys(p).forEach(function(f){n[f]=p[f];}); return Object.assign({},x,{[k]:n}); }); }); }
  function createReport(kind) {
    var tpl = REPORT_TEMPLATES[kind];
    if (!tpl) return;
    var nr = Object.assign({}, JSON.parse(JSON.stringify(tpl)), {
      id: "R" + Date.now(),
      kind: kind,
      status: "draft",
      ref: nextRefForKind(kind, reports),
      updated: new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}),
    });
    setReports(function(rs){ return rs.concat([nr]); });
    setSel(nr.id);
    setShowNew(false);
    setToast("Rapport cree");
  }
  function deleteReport(id) {
    if (!window.confirm("Supprimer ce rapport definitivement?")) return;
    setReports(function(rs){ return rs.filter(function(x){ return x.id !== id; }); });
    setToast("Rapport supprime");
    var rest = reports.filter(function(x){ return x.id !== id; });
    setSel(rest[0] ? rest[0].id : null);
  }
  var icons = {meas:"[M]",devis:"[$]",insp:"[I]",prop:"[P]"};
  var KINDS = [
    {id:"meas",  lbl:"Rapport de mesures"},
    {id:"devis", lbl:"Devis commercial"},
    {id:"insp",  lbl:"Inspection technique"},
    {id:"prop",  lbl:"Proposition / contrat"},
  ];
  return (
    <div style={{display:"flex",height:"100vh"}}>
      {toast && <Toast msg={toast} onDone={function(){setToast("");}}/>}
      {showNew && (
        <div onClick={function(){setShowNew(false);}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:200,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={function(e){e.stopPropagation();}}
            style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:14,
              padding:24,width:460,maxWidth:"90vw"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#E8EDF5",marginBottom:14}}>
              Nouveau rapport - choisir un type
            </div>
            {KINDS.map(function(k) {
              return (
                <button type="button" key={k.id} onClick={function(){createReport(k.id);}}
                  style={{display:"flex",alignItems:"center",gap:12,width:"100%",
                    padding:"12px 14px",background:"#152135",border:"1px solid #1C3050",
                    borderRadius:8,marginBottom:8,cursor:"pointer",outline:"none",
                    color:"#E8EDF5",fontSize:13,fontWeight:600,textAlign:"left"}}>
                  <span style={{fontFamily:"monospace",fontSize:12,color:"#00C2FF"}}>{icons[k.id]}</span>
                  {k.lbl}
                </button>
              );
            })}
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
              <Btn sm={true} onClick={function(){setShowNew(false);}}>Annuler</Btn>
            </div>
          </div>
        </div>
      )}
      <div data-noprint="1" style={{width:245,borderRight:"1px solid #1C3050",overflowY:"auto",
        padding:"14px 0",flexShrink:0}}>
        <div style={{padding:"0 14px 10px",display:"flex",justifyContent:"space-between",
          alignItems:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#607898",
            textTransform:"uppercase",letterSpacing:"0.08em"}}>{reports.length} Rapports</div>
          <button type="button" onClick={function(){setShowNew(true);}}
            style={{background:"#00C2FF",color:"#000",border:"none",borderRadius:5,
              padding:"3px 8px",fontSize:11,fontWeight:800,cursor:"pointer",outline:"none"}}>+</button>
        </div>
        {reports.map(function(x) {
          var active = sel===x.id;
          return (
            <div key={x.id} onClick={function(){setSel(x.id);}}
              role="button" tabIndex={0}
              style={{
                display:"block",width:"100%",padding:"11px 14px",
                background:active ? "rgba(0,194,255,0.13)" : "transparent",
                borderLeft:"3px solid "+(active ? "#00C2FF" : "transparent"),
                cursor:"pointer",textAlign:"left",outline:"none",marginBottom:1,
                position:"relative",
              }}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:700,color:"#E8EDF5",flex:1,
                  lineHeight:1.3,marginRight:6}}>
                  {icons[x.kind]} {x.title}
                </span>
                <Badge s={x.status}/>
              </div>
              <div style={{fontSize:10,color:"#607898"}}>{x.ref}</div>
              <div style={{fontSize:10,color:"#2E4A6A",marginTop:2}}>{x.updated}</div>
              {active && (
                <button type="button"
                  onClick={function(e){ e.stopPropagation(); deleteReport(x.id); }}
                  title="Supprimer"
                  style={{position:"absolute",top:8,right:8,
                    background:"rgba(255,71,87,0.13)",border:"1px solid #FF4757",
                    color:"#FF4757",borderRadius:4,width:20,height:20,
                    fontSize:11,fontWeight:900,cursor:"pointer",outline:"none",
                    display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>X</button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
        {r && r.kind === "meas"  && <RptMeas  r={r} upd={upd} updD={updD} T2={setToast}/>}
        {r && r.kind === "devis" && <RptDevis r={r} upd={upd} updD={updD} T2={setToast}/>}
        {r && r.kind === "insp"  && <RptInsp  r={r} upd={upd} updD={updD} T2={setToast}/>}
        {r && r.kind === "prop"  && <RptProp  r={r} upd={upd} updD={updD} T2={setToast}/>}
      </div>
    </div>
  );
}

function RptHead({ r, upd, T2, stats }) {
  var statList = stats || ["draft","review","sent","done"];
  return (
    <div style={{display:"flex",gap:9,marginBottom:22,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1}}>
        <div style={{fontSize:20,fontWeight:900,color:"#E8EDF5",marginBottom:2}}>
          <EF val={r.title} onSave={function(v){upd(r.id,{title:v});T2("Titre mis a jour");}}
            style={{fontSize:20}}/>
        </div>
        <div style={{fontSize:11,color:"#607898"}}>{r.ref}</div>
      </div>
      <select value={r.status} onChange={function(e){upd(r.id,{status:e.target.value});}}
        style={{background:"#152135",border:"1px solid #1C3050",color:"#E8EDF5",
          padding:"6px 10px",borderRadius:6,fontSize:12,cursor:"pointer",outline:"none"}}>
        {statList.map(function(s) {
          return <option key={s} value={s}>{BM[s] ? BM[s].lbl : s}</option>;
        })}
      </select>
      <Btn sm={true} onClick={function(){exportReportPdf(r); T2("PDF telecharge");}}>PDF</Btn>
      <Btn sm={true} onClick={function(){window.print();}}>Imprimer</Btn>
      <Btn sm={true} primary={true} onClick={function(){T2("Duplique");}}>Dupliquer</Btn>
    </div>
  );
}

function CoCl({ r, upd, updD, T2 }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
      {[["Entreprise","co"],["Client","cl"]].map(function(pair) {
        var title = pair[0];
        var key   = pair[1];
        return (
          <div key={key} style={{background:"#0F1C2E",border:"1px solid #1C3050",
            borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#607898",textTransform:"uppercase",
              letterSpacing:"0.07em",marginBottom:10}}>{title}</div>
            {Object.keys(r[key]).map(function(f) {
              return (
                <div key={f} style={{display:"flex",gap:7,marginBottom:6,alignItems:"center"}}>
                  <span style={{fontSize:10,color:"#2E4A6A",width:42,flexShrink:0}}>{f}</span>
                  <EF val={r[key][f]}
                    onSave={function(nv){updD(r.id,key,{[f]:nv});T2("Mis a jour");}}
                    style={{fontSize:11,color:"#E8EDF5"}}/>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function RptMeas({ r, upd, updD, T2 }) {
  return (
    <div>
      <RptHead r={r} upd={upd} T2={T2}/>
      <CoCl r={r} upd={upd} updD={updD} T2={T2}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginBottom:18}}>
        {Object.keys(r.data).map(function(k) {
          return (
            <div key={k} style={{background:"#0F1C2E",border:"1px solid #1C3050",
              borderRadius:8,padding:"11px 13px"}}>
              <div style={{fontSize:9,color:"#607898",textTransform:"uppercase",
                letterSpacing:"0.07em",marginBottom:6}}>{k}</div>
              <EF val={r.data[k]}
                onSave={function(nv){var d=Object.assign({},r.data,{[k]:nv});upd(r.id,{data:d});T2("OK");}}
                style={{fontSize:15,fontWeight:900,color:"#00C2FF",fontFamily:"monospace"}}/>
            </div>
          );
        })}
      </div>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"10px 15px",borderBottom:"1px solid #1C3050",
          fontSize:12,fontWeight:700,color:"#E8EDF5"}}>Detail facades</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"rgba(0,0,0,0.2)"}}>
              {["Facade","Surface","Long.","Haut.","Materiau"].map(function(h) {
                return <th key={h} style={{padding:"7px 14px",textAlign:"left",fontSize:9,
                  color:"#607898",fontWeight:600,textTransform:"uppercase"}}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {r.rows.map(function(row, i) {
              return (
                <tr key={i} style={{borderTop:"1px solid #1C3050"}}>
                  {["n","s","l","h","m"].map(function(f) {
                    return (
                      <td key={f} style={{padding:"9px 14px",fontSize:12,
                        color:f==="s" ? "#00C2FF" : "#E8EDF5",
                        fontFamily:f==="s" ? "monospace" : "inherit"}}>
                        <EF val={row[f]}
                          onSave={function(v){
                            var rows=r.rows.map(function(rw,j){ return j===i ? Object.assign({},rw,{[f]:v}) : rw; });
                            upd(r.id,{rows:rows}); T2("OK");
                          }}/>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:10,
        padding:"13px 15px",marginBottom:13}}>
        <div style={{fontSize:10,fontWeight:700,color:"#607898",marginBottom:7,
          textTransform:"uppercase"}}>Notes</div>
        <EF val={r.notes} multi={true}
          onSave={function(v){upd(r.id,{notes:v});T2("Notes mises a jour");}}
          style={{fontSize:12,lineHeight:1.6}}/>
      </div>
      <div style={{display:"flex",gap:12}}>
        {[["Technicien","tech"],["Date","techDate"]].map(function(pair) {
          return (
            <div key={pair[1]} style={{background:"#0F1C2E",border:"1px solid #1C3050",
              borderRadius:8,padding:"11px 14px",flex:1}}>
              <div style={{fontSize:9,color:"#607898",textTransform:"uppercase",marginBottom:6}}>{pair[0]}</div>
              <EF val={r[pair[1]]}
                onSave={function(v){upd(r.id,{[pair[1]]:v});T2("OK");}}
                style={{fontSize:13,fontWeight:700,color:"#E8EDF5"}}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RptDevis({ r, upd, updD, T2 }) {
  var sub  = r.lines.reduce(function(a,l){ return a+parseFloat(l.t||0); }, 0);
  var disc = parseFloat(r.discount||0);
  var ad   = sub*(1-disc/100);
  var tva  = ad*0.2;
  var tot  = ad+tva;
  var f    = function(n){ return n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}); };
  function updLine(i, field, val) {
    var lines = r.lines.map(function(l,j) {
      if (j !== i) return l;
      var u = Object.assign({},l,{[field]:val});
      if (field === "q" || field === "pu") {
        var q2 = parseFloat(field==="q" ? val : l.q) || 0;
        var p2 = parseFloat(field==="pu"? val : l.pu)|| 0;
        u.t = (q2*p2).toFixed(2);
      }
      return u;
    });
    upd(r.id,{lines:lines}); T2("OK");
  }
  return (
    <div>
      <RptHead r={r} upd={upd} T2={T2}/>
      <CoCl r={r} upd={upd} updD={updD} T2={T2}/>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #1C3050",
          fontSize:12,fontWeight:700,color:"#E8EDF5"}}>Lignes du devis</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"rgba(0,0,0,0.2)"}}>
              {["Description","Qte","Unite","P.U.","Total"].map(function(h) {
                return <th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:9,
                  color:"#607898",fontWeight:600,textTransform:"uppercase"}}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {r.lines.map(function(line, i) {
              return (
                <tr key={i} style={{borderTop:"1px solid #1C3050"}}>
                  <td style={{padding:"9px 12px",fontSize:12,color:"#E8EDF5",minWidth:140}}>
                    <EF val={line.d} onSave={function(v){updLine(i,"d",v);}}/></td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:12}}>
                    <EF val={line.q} onSave={function(v){updLine(i,"q",v);}}/></td>
                  <td style={{padding:"9px 12px",fontSize:12,color:"#607898"}}>
                    <EF val={line.u} onSave={function(v){updLine(i,"u",v);}}/></td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:12}}>
                    <EF val={line.pu} onSave={function(v){updLine(i,"pu",v);}}/></td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:12,
                    color:"#00C2FF",fontWeight:700}}>
                    {f(parseFloat(line.t||0))} EUR
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="button" onClick={function(){
          var newLine = {d:"Nouvelle prestation",q:"1",u:"fft",pu:"0.00",t:"0.00"};
          upd(r.id,{lines:r.lines.concat([newLine])});
          T2("Ligne ajoutee");
        }} style={{margin:"9px 12px",background:"#152135",border:"1px dashed #1C3050",
          color:"#607898",padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:11,
          outline:"none"}}>
          + Ajouter
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 255px",gap:14}}>
        <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#607898",marginBottom:8,
            textTransform:"uppercase"}}>Conditions</div>
          <EF val={r.payTerms} multi={true}
            onSave={function(v){upd(r.id,{payTerms:v});T2("OK");}}
            style={{fontSize:12,lineHeight:1.6}}/>
          <div style={{marginTop:11,display:"flex",gap:12}}>
            {[["Remise %","discount","#FF8C42"],["Acompte %","acompte","#00E5A0"]].map(function(row) {
              return (
                <div key={row[1]} style={{flex:1}}>
                  <div style={{fontSize:9,color:"#607898",marginBottom:4,textTransform:"uppercase"}}>{row[0]}</div>
                  <EF val={r[row[1]]}
                    onSave={function(v){upd(r.id,{[row[1]]:v});T2("OK");}}
                    style={{fontSize:14,fontWeight:700,color:row[2]}}/>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:10,padding:"14px 16px"}}>
          {[["Sous-total HT",f(sub)+" EUR","#E8EDF5"],
            ["Remise "+disc+"%","-"+f(sub*disc/100)+" EUR","#FF8C42"],
            ["TVA 20%",f(tva)+" EUR","#607898"],
            ["TOTAL TTC",f(tot)+" EUR","#00C2FF"],
          ].map(function(row) {
            var isTotal = row[0] === "TOTAL TTC";
            return (
              <div key={row[0]} style={{display:"flex",justifyContent:"space-between",
                padding:"7px 0",borderBottom:isTotal ? "none" : "1px solid #1C3050"}}>
                <span style={{fontSize:isTotal?13:11,fontWeight:isTotal?800:400,
                  color:isTotal?"#E8EDF5":"#607898"}}>{row[0]}</span>
                <span style={{fontFamily:"monospace",fontSize:isTotal?15:12,
                  fontWeight:isTotal?900:600,color:row[2]}}>{row[1]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

var SC = {ok:"#00E5A0",warn:"#FF8C42",crit:"#FF4757"};
var SL = {ok:"Conforme",warn:"Surveiller",crit:"Critique"};

function RptInsp({ r, upd, updD, T2 }) {
  var ok    = r.checks.filter(function(c){ return c.s==="ok"; }).length;
  var wa    = r.checks.filter(function(c){ return c.s==="warn"; }).length;
  var cr    = r.checks.filter(function(c){ return c.s==="crit"; }).length;
  var score = Math.round(((ok*2+wa) / (r.checks.length*2)) * 20);
  function setChk(i, f, v) {
    var checks = r.checks.map(function(c,j){ return j===i ? Object.assign({},c,{[f]:v}) : c; });
    upd(r.id,{checks:checks}); T2("OK");
  }
  return (
    <div>
      <RptHead r={r} upd={upd} T2={T2} stats={["draft","review","sent"]}/>
      <CoCl r={r} upd={upd} updD={updD} T2={T2}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:20}}>
        {[
          [score+"/20","Score", score>=16?"#00E5A0":score>=10?"#FF8C42":"#FF4757"],
          [ok,  "Conformes","#00E5A0"],
          [wa,  "Surveiller","#FF8C42"],
          [cr,  "Critiques","#FF4757"],
        ].map(function(row) {
          return (
            <div key={row[1]} style={{background:"#0F1C2E",border:"1px solid #1C3050",
              borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:row[2],fontFamily:"monospace",marginBottom:3}}>
                {row[0]}
              </div>
              <div style={{fontSize:10,color:"#607898",textTransform:"uppercase"}}>{row[1]}</div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"10px 15px",borderBottom:"1px solid #1C3050",
          fontSize:12,fontWeight:700,color:"#E8EDF5"}}>
          Checklist ({r.checks.length} points)
        </div>
        {r.checks.map(function(c, i) {
          return (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,
              padding:"10px 15px",borderBottom:"1px solid #1C3050",
              background:i%2===0 ? "transparent" : "rgba(0,0,0,0.07)"}}>
              <span style={{fontSize:9,background:"rgba(255,255,255,0.05)",
                padding:"2px 7px",borderRadius:4,color:"#607898",
                whiteSpace:"nowrap",flexShrink:0,marginTop:2}}>{c.z}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#E8EDF5",marginBottom:4,fontWeight:500}}>{c.it}</div>
                <EF val={c.note} onSave={function(v){setChk(i,"note",v);}}
                  style={{fontSize:11,color:"#607898"}}/>
              </div>
              <select value={c.s} onChange={function(e){setChk(i,"s",e.target.value);}}
                style={{background:"transparent",border:"1px solid "+SC[c.s],color:SC[c.s],
                  padding:"4px 7px",borderRadius:6,fontSize:11,fontWeight:700,
                  cursor:"pointer",flexShrink:0,outline:"none"}}>
                {Object.keys(SL).map(function(k) {
                  return <option key={k} value={k} style={{background:"#152135",color:"#E8EDF5"}}>{SL[k]}</option>;
                })}
              </select>
            </div>
          );
        })}
      </div>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:10,padding:"13px 15px"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#607898",marginBottom:7,
          textTransform:"uppercase"}}>Recommandations</div>
        <EF val={r.reco} multi={true}
          onSave={function(v){upd(r.id,{reco:v});T2("OK");}}
          style={{fontSize:12,lineHeight:1.7,whiteSpace:"pre-line"}}/>
      </div>
    </div>
  );
}

function RptProp({ r, upd, updD, T2 }) {
  var WEEKS = [1,2,3,4,5,6,7,8,9,10];
  function updP(i, f, v) {
    var projs = r.projs.map(function(p,j){ return j===i ? Object.assign({},p,{[f]:v}) : p; });
    upd(r.id,{projs:projs}); T2("OK");
  }
  return (
    <div>
      <div style={{display:"flex",gap:9,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:900,color:"#E8EDF5",marginBottom:2}}>
            <EF val={r.title} onSave={function(v){upd(r.id,{title:v});T2("OK");}} style={{fontSize:20}}/>
          </div>
          <div style={{fontSize:11,color:"#607898"}}>{r.ref}</div>
        </div>
        <select value={r.status} onChange={function(e){upd(r.id,{status:e.target.value});}}
          style={{background:"#152135",border:"1px solid #1C3050",color:"#E8EDF5",
            padding:"6px 10px",borderRadius:6,fontSize:12,cursor:"pointer",outline:"none"}}>
          {["draft","review","sent"].map(function(s) {
            return <option key={s} value={s}>{BM[s] ? BM[s].lbl : s}</option>;
          })}
        </select>
        <Btn sm={true} onClick={function(){exportReportPdf(r); T2("PDF telecharge");}}>PDF</Btn>
        <Btn sm={true} onClick={function(){window.print();}}>Imprimer</Btn>
        <Btn sm={true} primary={true} onClick={function(){T2("Duplique");}}>Dupliquer</Btn>
      </div>
      <CoCl r={r} upd={upd} updD={updD} T2={T2}/>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:10,
        padding:"13px 15px",marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,color:"#607898",marginBottom:7,
          textTransform:"uppercase"}}>Presentation</div>
        <EF val={r.intro} multi={true}
          onSave={function(v){upd(r.id,{intro:v});T2("OK");}}
          style={{fontSize:12,lineHeight:1.7}}/>
      </div>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"10px 15px",borderBottom:"1px solid #1C3050",
          fontSize:12,fontWeight:700,color:"#E8EDF5"}}>Projets inclus</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"rgba(0,0,0,0.2)"}}>
              {["Projet","Surface","Budget","Delai","Priorite"].map(function(h) {
                return <th key={h} style={{padding:"7px 13px",textAlign:"left",fontSize:9,
                  color:"#607898",fontWeight:600,textTransform:"uppercase"}}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {r.projs.map(function(p, i) {
              return (
                <tr key={i} style={{borderTop:"1px solid #1C3050"}}>
                  {[["n","#E8EDF5"],["s","#607898"],["b","#00C2FF"],["d","#607898"],["p","#E8EDF5"]].map(function(pair) {
                    var f2=pair[0], col2=pair[1];
                    return (
                      <td key={f2} style={{padding:"9px 13px",fontSize:12,color:col2,
                        fontFamily:f2==="b"?"monospace":"inherit",fontWeight:f2==="b"?700:400}}>
                        <EF val={p[f2]} onSave={function(v){updP(i,f2,v);}}/>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        padding:"14px 16px",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:"#E8EDF5",marginBottom:12}}>Planning (semaines)</div>
        <div style={{display:"flex",gap:4,marginBottom:6,paddingLeft:130}}>
          {WEEKS.map(function(w) {
            return <div key={w} style={{flex:1,textAlign:"center",fontSize:9,color:"#607898",fontWeight:700}}>S{w}</div>;
          })}
        </div>
        {r.gantt.map(function(g, i) {
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
              <div style={{width:124,fontSize:11,color:"#607898",textAlign:"right",flexShrink:0}}>{g.t}</div>
              <div style={{flex:1,display:"flex",height:18}}>
                {WEEKS.map(function(w) {
                  var on = w >= g.s && w < g.s + g.dur;
                  return (
                    <div key={w} style={{flex:1,
                      background:on ? g.col : "#1C3050",
                      borderRadius:w===g.s ? "4px 0 0 4px" : w===g.s+g.dur-1 ? "0 4px 4px 0" : 0,
                      opacity:on ? 0.85 : 0.22,
                      margin:"0 1px"}}/>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:10,
        padding:"13px 15px",marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,color:"#607898",marginBottom:7,
          textTransform:"uppercase"}}>Conditions Generales</div>
        <EF val={r.cgu} multi={true}
          onSave={function(v){upd(r.id,{cgu:v});T2("OK");}}
          style={{fontSize:11,lineHeight:1.6,color:"#607898"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {[["Signature Client","sigCl"],["Signature MesurePro","sigPro"]].map(function(pair) {
          return (
            <div key={pair[1]} style={{background:"#0F1C2E",border:"1px solid #1C3050",
              borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontSize:10,color:"#607898",textTransform:"uppercase",marginBottom:9}}>{pair[0]}</div>
              <div style={{height:44,borderBottom:"2px dashed #1C3050",marginBottom:7}}/>
              <EF val={r[pair[1]]}
                onSave={function(v){upd(r.id,{[pair[1]]:v});T2("OK");}}
                style={{fontSize:11,color:"#607898"}}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Modal ---- */
/* ---- AsyncAutoComplete: debounced async search dropdown
   For Photon-based address/city searches. Debounces user keystrokes,
   shows a loading dot while the request is in flight, picks reset
   the input + close. */
function AsyncAutoComplete({ value, onChange, onPick, fetchOptions, getLabel, getKey, placeholder, debounceMs, minChars }) {
  var [items, setItems]   = useState([]);
  var [open, setOpen]     = useState(false);
  var [loading, setLoad]  = useState(false);
  var [version, setVer]   = useState(0);
  var timer = useRef(null);
  var reqVersion = useRef(0);

  useEffect(function() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    var v = (value || "").trim();
    var min = minChars || 3;
    if (v.length < min) {
      setItems([]); setLoad(false);
      return;
    }
    setLoad(true);
    var thisVer = version + 1;
    setVer(thisVer);
    reqVersion.current = thisVer;
    timer.current = setTimeout(function() {
      fetchOptions(v).then(function(arr) {
        if (reqVersion.current !== thisVer) return; /* stale */
        setItems(arr || []);
        setLoad(false);
      }).catch(function(){ setLoad(false); setItems([]); });
    }, debounceMs || 320);
    return function() { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div style={{position:"relative"}}>
      <input value={value} onChange={function(e){ onChange(e.target.value); setOpen(true); }}
        onFocus={function(){ setOpen(true); }}
        onBlur={function(){ setTimeout(function(){ setOpen(false); }, 180); }}
        placeholder={placeholder}
        style={{width:"100%",boxSizing:"border-box",background:"#08111E",
          border:"1px solid #1C3050",borderRadius:7,color:"#E8EDF5",
          fontSize:13,padding:"9px 12px",paddingRight: loading ? 30 : 12,outline:"none"}}/>
      {loading && (
        <div style={{position:"absolute",right:10,top:11,fontSize:11,
          color:"#00C2FF",animation:"none",fontWeight:700}}>⏳</div>
      )}
      {open && items.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:30,
          background:"#0F1C2E",border:"1px solid #00C2FF",borderRadius:7,marginTop:3,
          maxHeight:260,overflowY:"auto",
          boxShadow:"0 6px 22px rgba(0,0,0,0.55)"}}>
          {items.map(function(o, i) {
            return (
              <button key={getKey ? getKey(o) : i} type="button"
                onMouseDown={function(e){ e.preventDefault(); onPick(o); setOpen(false); }}
                style={{display:"block",width:"100%",padding:"8px 12px",
                  background:"transparent",border:"none",textAlign:"left",
                  color:"#E8EDF5",fontSize:12,cursor:"pointer",outline:"none",
                  borderBottom: i < items.length - 1 ? "1px solid #1C3050" : "none",
                  lineHeight:1.4}}
                onMouseEnter={function(e){ e.currentTarget.style.background = "rgba(0,194,255,0.13)"; }}
                onMouseLeave={function(e){ e.currentTarget.style.background = "transparent"; }}>
                {getLabel(o)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- AutoComplete: simple inline dropdown (light, no external dep) ---- */
function AutoComplete({ value, onChange, onPick, getLabel, options, placeholder, max }) {
  var [open, setOpen] = useState(false);
  max = max || 8;
  var v = (value || "").toString().trim().toLowerCase();
  var matches = !v ? [] : (options || []).filter(function(o){
    return getLabel(o).toLowerCase().indexOf(v) === 0;
  }).slice(0, max);
  return (
    <div style={{position:"relative"}}>
      <input value={value} onChange={function(e){ onChange(e.target.value); setOpen(true); }}
        onFocus={function(){ setOpen(true); }}
        onBlur={function(){ setTimeout(function(){ setOpen(false); }, 180); }}
        placeholder={placeholder}
        style={{width:"100%",boxSizing:"border-box",background:"#08111E",
          border:"1px solid #1C3050",borderRadius:7,color:"#E8EDF5",
          fontSize:13,padding:"9px 12px",outline:"none"}}/>
      {open && matches.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:30,
          background:"#0F1C2E",border:"1px solid #00C2FF",borderRadius:7,marginTop:3,
          maxHeight:220,overflowY:"auto",
          boxShadow:"0 6px 22px rgba(0,0,0,0.55)"}}>
          {matches.map(function(o, i) {
            return (
              <button key={i} type="button"
                onMouseDown={function(e){ e.preventDefault(); onPick(o); setOpen(false); }}
                style={{display:"block",width:"100%",padding:"7px 12px",
                  background:"transparent",border:"none",textAlign:"left",
                  color:"#E8EDF5",fontSize:12,cursor:"pointer",outline:"none",
                  borderBottom: i < matches.length - 1 ? "1px solid #1C3050" : "none"}}
                onMouseEnter={function(e){ e.currentTarget.style.background = "rgba(0,194,255,0.13)"; }}
                onMouseLeave={function(e){ e.currentTarget.style.background = "transparent"; }}>
                {getLabel(o)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, onCreate }) {
  var [step, setStep]       = useState(0);
  /* Identification fields */
  var [civilite, setCivilite] = useState("M.");
  var [nom, setNom]         = useState("");
  var [prenom, setPrenom]   = useState("");
  /* Address fields */
  var [rue, setRue]         = useState("");
  var [num, setNum]         = useState("");
  var [cp, setCp]           = useState("");
  var [city, setCity]       = useState("");
  /* Photos */
  var [photos, setPhotos]   = useState([]);
  var fRef = useRef();
  /* Belgian postal codes loaded async */
  var [bePostal, setBePostal] = useState([]);
  var [geoStatus, setGeoStatus] = useState("");
  /* Civilités configurables (from localStorage) */
  var civilites = useMemo(function(){
    return loadStored(STORE_KEY_CIVILITES, DEFAULT_CIVILITES);
  }, []);

  useEffect(function() {
    loadBePostalCodes().then(function(j){ setBePostal(j); });
  }, []);

  /* "Civilité personne" => prénom required. Société/SCI/ASBL => nom only. */
  var isPerson = ["M.","Mme","Mlle","Monsieur","Madame","Mademoiselle"].indexOf(civilite) !== -1;

  /* Validation */
  var step0Ok = nom.trim().length > 1
    && (!isPerson || prenom.trim().length > 1)
    && rue.trim().length > 2
    && num.trim().length > 0
    && /^\d{4}$/.test(cp.trim())
    && city.trim().length > 1;
  var stepOk = step === 0 ? step0Ok : true;

  function geoLocate() {
    if (!navigator.geolocation) {
      setGeoStatus("Géolocalisation non supportée par ce navigateur");
      return;
    }
    setGeoStatus("Localisation en cours…");
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        setGeoStatus("Lecture de l'adresse…");
        reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(function(d){
          if (!d || !d.address) {
            setGeoStatus("Adresse introuvable - saisissez manuellement");
            return;
          }
          var a = d.address;
          if (a.road) setRue(a.road);
          if (a.house_number) setNum(a.house_number);
          if (a.postcode) setCp(a.postcode);
          var v = a.city || a.town || a.village || a.municipality || a.suburb;
          if (v) setCity(v);
          setGeoStatus("✓ Adresse localisée");
        }).catch(function(){ setGeoStatus("Erreur de géolocalisation"); });
      },
      function(err) {
        setGeoStatus(err.code === 1 ? "Permission refusée" :
                     err.code === 2 ? "Position indisponible" :
                     err.code === 3 ? "Délai dépassé" : "Erreur " + err.code);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  function pickPostalByCp(item) {
    setCp(item[0]);
    setCity(item[1]);
  }
  function pickPostalByCity(item) {
    setCity(item[1]);
    setCp(item[0]);
  }

  function onFiles(fileList) {
    var arr = Array.prototype.slice.call(fileList);
    var next = arr.map(function(f) {
      return { name: f.name, size: f.size, url: URL.createObjectURL(f) };
    });
    setPhotos(function(prev){ return prev.concat(next); });
  }
  function removePhoto(i) {
    setPhotos(function(prev) {
      var p = prev[i];
      if (p && p.url) { try { URL.revokeObjectURL(p.url); } catch(e){} }
      return prev.filter(function(_, j){ return j !== i; });
    });
  }

  /* Composed values for the project record */
  var fullClient = isPerson ? (civilite + " " + prenom.trim() + " " + nom.trim()).trim()
                            : (civilite + " " + nom.trim()).trim();
  var fullAddr   = (num.trim() + " " + rue.trim()).trim();

  var labelStyle = {fontSize:11,color:"#607898",marginBottom:4};
  var inputStyle = {width:"100%",boxSizing:"border-box",background:"#08111E",
    border:"1px solid #1C3050",borderRadius:7,color:"#E8EDF5",
    fontSize:13,padding:"9px 12px",outline:"none"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:14,
        padding:24,width:560,maxWidth:"94vw",maxHeight:"94vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",gap:5,marginBottom:22}}>
          {["Identification","Photos","Lancement"].map(function(s, i) {
            return (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",
                alignItems:"center",gap:4}}>
                <div style={{width:24,height:24,borderRadius:"50%",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:700,
                  background:i<=step ? "#00C2FF" : "#1C3050",
                  color:i<=step ? "#000" : "#607898"}}>{i+1}</div>
                <div style={{width:"100%",height:2,
                  background:i<step ? "#00C2FF" : "#1C3050",borderRadius:2}}/>
                <span style={{fontSize:10,color:i<=step ? "#E8EDF5" : "#607898"}}>{s}</span>
              </div>
            );
          })}
        </div>

        {step === 0 && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:16,fontWeight:800,color:"#E8EDF5"}}>Identification du chantier</div>
              <button type="button" onClick={geoLocate}
                title="Localiser automatiquement via le GPS"
                style={{background:"#152135",border:"1px solid #00C2FF",
                  color:"#00C2FF",borderRadius:7,padding:"5px 11px",fontSize:11,
                  fontWeight:700,cursor:"pointer",outline:"none"}}>
                📍 Géolocaliser
              </button>
            </div>
            {geoStatus && (
              <div style={{fontSize:10,color:"#00C2FF",marginBottom:10,fontStyle:"italic"}}>
                {geoStatus}
              </div>
            )}

            {/* Address: async autocomplete via Photon (covers all BE
                streets + sub-municipalities). Picking a result fills
                rue / num / cp / ville in one shot. */}
            <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:8,marginBottom:9}}>
              <div>
                <div style={labelStyle}>Adresse (rue) *</div>
                <AsyncAutoComplete
                  value={rue}
                  onChange={setRue}
                  onPick={function(o){
                    setRue(o.street || "");
                    if (o.num) setNum(o.num);
                    if (o.postcode) setCp(o.postcode);
                    if (o.city) setCity(o.city);
                  }}
                  fetchOptions={searchAddressBE}
                  getLabel={function(o){ return o.display; }}
                  getKey={function(o){ return o.display; }}
                  placeholder="Boulevard Haussmann (toute adresse Belgique)"
                  minChars={3}/>
              </div>
              <div>
                <div style={labelStyle}>N° *</div>
                <input value={num} onChange={function(e){setNum(e.target.value);}}
                  placeholder="15"
                  style={inputStyle}/>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8,marginBottom:9}}>
              <div>
                <div style={labelStyle}>Code postal *</div>
                <AutoComplete
                  value={cp}
                  onChange={setCp}
                  onPick={pickPostalByCp}
                  getLabel={function(o){ return o[0]; }}
                  options={bePostal}
                  placeholder="1000"
                  max={10}/>
              </div>
              <div>
                <div style={labelStyle}>Ville (incl. sous-communes) *</div>
                <AsyncAutoComplete
                  value={city}
                  onChange={setCity}
                  onPick={function(o){
                    setCity(o.city);
                    if (o.postcode) setCp(o.postcode);
                  }}
                  fetchOptions={searchCityBE}
                  getLabel={function(o){ return o.display; }}
                  getKey={function(o){ return o.city + ":" + o.postcode; }}
                  placeholder="Bruxelles, Templeuve, Schaerbeek..."
                  minChars={2}/>
              </div>
            </div>

            <div style={{height:1,background:"#1C3050",margin:"14px 0 12px"}}/>

            {/* Client identity */}
            <div style={{display:"grid",
              gridTemplateColumns: isPerson ? "1fr 1.5fr 1.5fr" : "1fr 3fr",
              gap:8}}>
              <div>
                <div style={labelStyle}>Civilité *</div>
                <select value={civilite} onChange={function(e){setCivilite(e.target.value);}}
                  style={Object.assign({}, inputStyle, {cursor:"pointer"})}>
                  {civilites.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
                </select>
              </div>
              <div>
                <div style={labelStyle}>{isPerson ? "Nom *" : "Raison sociale *"}</div>
                <input value={nom} onChange={function(e){setNom(e.target.value);}}
                  placeholder={isPerson ? "Bernard" : "SCI Haussmann"}
                  style={inputStyle}/>
              </div>
              {isPerson && (
                <div>
                  <div style={labelStyle}>Prénom *</div>
                  <input value={prenom} onChange={function(e){setPrenom(e.target.value);}}
                    placeholder="Laurent"
                    style={inputStyle}/>
                </div>
              )}
            </div>

            <div style={{fontSize:9,color:"#2E4A6A",marginTop:11,lineHeight:1.5}}>
              Tous les champs marqués * sont obligatoires.
              <br/>Les civilités sont configurables dans <span style={{color:"#607898",fontWeight:700}}>Paramètres</span>.
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#E8EDF5",marginBottom:5}}>Photos</div>
            <div onClick={function(){fRef.current.click();}}
              style={{border:"2px dashed #1C3050",borderRadius:10,padding:"24px",
                textAlign:"center",cursor:"pointer",marginBottom:12,
                background:"rgba(0,194,255,0.04)"}}>
              <div style={{fontSize:32,marginBottom:7}}>{photos.length > 0 ? "=" : "+"}</div>
              <div style={{color:"#E8EDF5",fontSize:13,fontWeight:600}}>
                {photos.length > 0 ? photos.length+" photo(s) sélectionnée(s)" : "Glisser vos photos ici ou cliquer"}
              </div>
              <div style={{color:"#607898",fontSize:11,marginTop:3}}>JPG, PNG, WEBP</div>
              <input ref={fRef} type="file" multiple accept="image/*" style={{display:"none"}}
                onChange={function(e){onFiles(e.target.files); e.target.value="";}}/>
            </div>
            {photos.length > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,
                maxHeight:160,overflowY:"auto",padding:"4px 2px"}}>
                {photos.map(function(p, i) {
                  return (
                    <div key={i} style={{position:"relative",aspectRatio:"1/1",
                      borderRadius:6,overflow:"hidden",border:"1px solid #1C3050"}}>
                      <img src={p.url} alt={p.name}
                        style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      <button type="button" onClick={function(){removePhoto(i);}}
                        style={{position:"absolute",top:3,right:3,
                          background:"rgba(255,71,87,0.92)",color:"#fff",
                          border:"none",borderRadius:4,width:18,height:18,
                          fontSize:11,fontWeight:900,cursor:"pointer",lineHeight:1,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#E8EDF5",marginBottom:8}}>Récapitulatif</div>
            <div style={{background:"#152135",border:"1px solid #1C3050",borderRadius:9,
              padding:"13px 16px",marginBottom:14}}>
              {[["Client",fullClient||"--"],
                ["Adresse",fullAddr||"--"],
                ["Code postal / Ville", (cp||"--") + " " + (city||"--")],
                ["Photos",photos.length+" fichier(s)"]
              ].map(function(pair) {
                return (
                  <div key={pair[0]} style={{display:"flex",justifyContent:"space-between",
                    padding:"5px 0",borderBottom:"1px solid #1C3050"}}>
                    <span style={{fontSize:12,color:"#607898"}}>{pair[0]}</span>
                    <span style={{fontSize:12,color:"#E8EDF5",fontWeight:600,
                      maxWidth:"60%",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis"}}>{pair[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:18}}>
          <Btn sm={true} onClick={onClose}>Annuler</Btn>
          {step > 0 && <Btn sm={true} onClick={function(){setStep(function(s){return s-1;});}}>Précédent</Btn>}
          <Btn sm={true} primary={true}
            onClick={function(){
              if (!stepOk) return;
              if (step < 2) setStep(function(s){return s+1;});
              else {
                onCreate({
                  addr:fullAddr, city:(cp+" "+city).trim(),
                  client:fullClient, photos:photos,
                  civilite:civilite, nom:nom, prenom:prenom,
                  cp:cp, rue:rue, num:num,
                });
                onClose();
              }
            }}
            style={{opacity:stepOk ? 1 : 0.4, cursor:stepOk ? "pointer" : "not-allowed"}}>
            {step < 2 ? "Suivant" : "Lancer"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ---- Settings ---- */
var DEFAULT_PROFILE = { nom:"Jean Dupont", role:"Entrepreneur", ville:"Paris", tel:"", email:"" };

function Settings({ projects, reports }) {
  var [profile, setProfile] = useState(function(){
    return loadStored(STORE_KEY_PROFILE, DEFAULT_PROFILE);
  });
  var [toast, setToast] = useState("");
  useEffect(function(){ saveStored(STORE_KEY_PROFILE, profile); }, [profile]);

  function setField(k, v) { setProfile(function(p){ return Object.assign({},p,{[k]:v}); }); }
  function resetDemo() {
    if (!window.confirm("Effacer toutes vos donnees (projets + rapports + profil) et restaurer la demo?")) return;
    try {
      window.localStorage.removeItem(STORE_KEY_PROJECTS);
      window.localStorage.removeItem(STORE_KEY_REPORTS);
      window.localStorage.removeItem(STORE_KEY_PROFILE);
    } catch(e) {}
    window.location.reload();
  }

  var stats = [
    {lbl:"Projets",   val:(projects||[]).length, col:"#00C2FF"},
    {lbl:"Rapports",  val:(reports||[]).length,  col:"#00E5A0"},
    {lbl:"En cours",  val:(projects||[]).filter(function(p){return p.status==="processing";}).length, col:"#FF8C42"},
    {lbl:"Termines",  val:(projects||[]).filter(function(p){return p.status==="done";}).length, col:"#E8EDF5"},
  ];

  var fields = [
    ["Nom", "nom"],
    ["Role", "role"],
    ["Ville", "ville"],
    ["Telephone", "tel"],
    ["Email", "email"],
  ];

  return (
    <div style={{padding:"26px 28px",overflowY:"auto",height:"100vh",boxSizing:"border-box"}}>
      {toast && <Toast msg={toast} onDone={function(){setToast("");}}/>}
      <div style={{fontSize:21,fontWeight:900,color:"#E8EDF5",marginBottom:18}}>Parametres</div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:22}}>
        {stats.map(function(s) {
          return (
            <div key={s.lbl} style={{background:"#0F1C2E",border:"1px solid #1C3050",
              borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:20,fontWeight:900,color:s.col,fontFamily:"monospace"}}>{s.val}</div>
              <div style={{fontSize:10,color:"#607898",textTransform:"uppercase",marginTop:3}}>{s.lbl}</div>
            </div>
          );
        })}
      </div>

      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:"#E8EDF5",marginBottom:14}}>Profil utilisateur</div>
        {fields.map(function(f) {
          return (
            <div key={f[1]} style={{display:"flex",alignItems:"center",gap:12,marginBottom:9}}>
              <div style={{width:90,fontSize:11,color:"#607898"}}>{f[0]}</div>
              <input value={profile[f[1]]||""}
                onChange={function(e){setField(f[1], e.target.value);}}
                style={{flex:1,background:"#08111E",border:"1px solid #1C3050",
                  borderRadius:6,color:"#E8EDF5",fontSize:13,padding:"7px 10px",outline:"none"}}/>
            </div>
          );
        })}
        <div style={{fontSize:10,color:"#2E4A6A",marginTop:8}}>
          Modifications sauvegardees automatiquement dans votre navigateur
        </div>
      </div>

      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:"#E8EDF5",marginBottom:8}}>Stockage</div>
        <div style={{fontSize:11,color:"#607898",marginBottom:12}}>
          Toutes vos donnees sont stockees localement dans votre navigateur (localStorage).
          Effacer le cache du navigateur supprimera tout.
        </div>
        <Btn sm={true} onClick={resetDemo}
          style={{background:"rgba(255,71,87,0.13)",border:"1px solid #FF4757",color:"#FF4757"}}>
          Reinitialiser (restaurer la demo)
        </Btn>
      </div>

      <CivilitesEditor/>

      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
        padding:"16px 18px",marginBottom:14,opacity:0.6}}>
        <div style={{fontSize:13,fontWeight:700,color:"#E8EDF5",marginBottom:6}}>Apparence</div>
        <div style={{fontSize:11,color:"#607898"}}>
          Theme clair - prevu dans une prochaine version (refonte CSS variables requise)
        </div>
      </div>
    </div>
  );
}

function CivilitesEditor() {
  var [list, setList] = useState(function(){
    return loadStored(STORE_KEY_CIVILITES, DEFAULT_CIVILITES);
  });
  var [draft, setDraft] = useState("");
  useEffect(function(){ saveStored(STORE_KEY_CIVILITES, list); }, [list]);
  function add() {
    var v = draft.trim();
    if (!v || list.indexOf(v) !== -1) return;
    setList(list.concat([v]));
    setDraft("");
  }
  function remove(c) {
    setList(list.filter(function(x){ return x !== c; }));
  }
  function reset() {
    if (!window.confirm("Restaurer la liste par defaut?")) return;
    setList(DEFAULT_CIVILITES.slice());
  }
  return (
    <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:12,
      padding:"16px 18px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:700,color:"#E8EDF5"}}>Civilités</div>
        <button type="button" onClick={reset}
          style={{background:"transparent",border:"1px solid #1C3050",
            color:"#607898",borderRadius:5,padding:"4px 10px",fontSize:10,
            cursor:"pointer",outline:"none"}}>Réinitialiser</button>
      </div>
      <div style={{fontSize:11,color:"#607898",marginBottom:10}}>
        Apparaissent dans le menu déroulant de l'étape Identification.
        M./Mme/Mlle... = personne (prénom requis). Société/SCI/ASBL = entité (nom seul).
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {list.map(function(c) {
          return (
            <div key={c} style={{display:"inline-flex",alignItems:"center",gap:6,
              background:"#152135",border:"1px solid #1C3050",borderRadius:14,
              padding:"4px 4px 4px 11px",fontSize:11,color:"#E8EDF5"}}>
              {c}
              <button type="button" onClick={function(){remove(c);}}
                style={{background:"rgba(255,71,87,0.2)",border:"none",
                  color:"#FF4757",borderRadius:"50%",width:16,height:16,
                  fontSize:10,fontWeight:900,cursor:"pointer",outline:"none",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:6}}>
        <input value={draft} onChange={function(e){setDraft(e.target.value);}}
          onKeyDown={function(e){ if (e.key === "Enter") add(); }}
          placeholder="Ajouter une civilité (ex: Maître)"
          style={{flex:1,boxSizing:"border-box",background:"#08111E",
            border:"1px solid #1C3050",borderRadius:6,color:"#E8EDF5",
            fontSize:12,padding:"7px 10px",outline:"none"}}/>
        <Btn sm={true} primary={true} onClick={add}>+ Ajouter</Btn>
      </div>
    </div>
  );
}

/* ---- localStorage persistence ---- */
var STORE_KEY_PROJECTS  = "mesurepro.projects.v1";
var STORE_KEY_REPORTS   = "mesurepro.reports.v1";
var STORE_KEY_PROFILE   = "mesurepro.profile.v1";
var STORE_KEY_CIVILITES = "mesurepro.civilites.v1";

var DEFAULT_CIVILITES = ["M.", "Mme", "Mlle", "Monsieur", "Madame", "Société", "SCI", "ASBL"];

/* Cached Belgian postal codes data, loaded once on first need */
var BE_POSTAL_CACHE = null;
function loadBePostalCodes() {
  if (BE_POSTAL_CACHE) return Promise.resolve(BE_POSTAL_CACHE);
  return fetch("/data/be-postal-codes.json")
    .then(function(r){ return r.ok ? r.json() : []; })
    .then(function(j){ BE_POSTAL_CACHE = j; return j; })
    .catch(function(){ BE_POSTAL_CACHE = []; return []; });
}

/* Reverse-geocode a lat/lng into address pieces using Nominatim (free
   OpenStreetMap geocoder). Polite User-Agent header is recommended in
   production but the dev server doesn't strictly need it. */
function reverseGeocode(lat, lng) {
  var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=fr&lat=" + lat + "&lon=" + lng;
  return fetch(url, { headers: { "Accept-Language": "fr" } })
    .then(function(r){ return r.ok ? r.json() : null; })
    .catch(function(){ return null; });
}

/* Belgium bbox = west,south,east,north. Used to restrict autocomplete
   results to Belgian addresses (incl. all sub-municipalities). */
var BE_BBOX = "2.5,49.4,6.5,51.6";

/* Live address search via Photon (Komoot's open OSM-backed
   autocomplete service - faster than Nominatim for as-you-type). */
function searchAddressBE(query) {
  var q = (query || "").trim();
  if (q.length < 3) return Promise.resolve([]);
  var url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(q)
    + "&lang=fr&limit=8&bbox=" + BE_BBOX;
  return fetch(url)
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){
      if (!j || !j.features) return [];
      return j.features
        .filter(function(f){ return f.properties && f.properties.countrycode === "BE"; })
        .map(function(f){
          var p = f.properties;
          var name = p.name || p.street || "";
          var city = p.city || p.district || p.locality || p.county || "";
          var pc   = p.postcode || "";
          /* "type" can be street, house, locality, region... */
          var disp = name;
          if (p.housenumber) disp += " " + p.housenumber;
          if (pc || city) disp += "  ·  " + (pc ? pc + " " : "") + city;
          return {
            street: name, num: p.housenumber || "",
            city: city, postcode: pc, type: p.type || "",
            display: disp,
          };
        });
    })
    .catch(function(){ return []; });
}

/* Live place search (cities + sub-municipalities + hamlets) for the
   "Ville" field. Filters on osm_tag=place (excludes streets/POIs). */
function searchCityBE(query) {
  var q = (query || "").trim();
  if (q.length < 2) return Promise.resolve([]);
  var url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(q)
    + "&lang=fr&limit=10&osm_tag=place&bbox=" + BE_BBOX;
  return fetch(url)
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){
      if (!j || !j.features) return [];
      return j.features
        .filter(function(f){ return f.properties && f.properties.countrycode === "BE"; })
        .map(function(f){
          var p = f.properties;
          var name = p.name || "";
          var pc = p.postcode || "";
          var state = p.state || "";
          var disp = name + (pc ? "  ·  " + pc : "") + (state ? "  ·  " + state : "");
          return { city: name, postcode: pc, state: state, display: disp };
        })
        .filter(function(o){ return o.city; });
    })
    .catch(function(){ return []; });
}

function loadStored(key, fallback) {
  try {
    var raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    var parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    if (parsed && typeof parsed === "object") return parsed;
    return fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStored(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

/* Merge stored items with hardcoded defaults: keeps user-created or
   user-edited entries from localStorage, but adds any default item
   whose id is not present yet. Lets new demo projects/reports show
   up automatically on next reload without wiping user data. */
function mergeWithDefaults(stored, defaults) {
  if (!stored || !Array.isArray(stored)) return defaults;
  var defMap = {};
  defaults.forEach(function(d){ if (d && d.id != null) defMap[String(d.id)] = d; });
  /* For known demo entries, force-refresh the `photos` field from defaults
     so iterations to the bundled demo content (e.g. swapping inline-SVG
     placeholders for real Unsplash URLs) reach the user without wiping
     their other edits to the same project. User-created entries
     (id not in defMap) are left untouched. */
  var merged = stored.map(function(s){
    var d = defMap[String(s.id)];
    if (!d) return s;
    var refreshed = Object.assign({}, s);
    if (Array.isArray(d.photos)) refreshed.photos = d.photos;
    return refreshed;
  });
  /* Add any default that is not yet present */
  var ids = {};
  merged.forEach(function(x){ if (x && x.id != null) ids[String(x.id)] = true; });
  var missing = defaults.filter(function(d){ return d && d.id != null && !ids[String(d.id)]; });
  return missing.length === 0 ? merged : merged.concat(missing);
}

/* ---- App root ---- */
export default function App() {
  var [projects, setProjects] = useState(function(){
    return mergeWithDefaults(loadStored(STORE_KEY_PROJECTS, null), PROJS);
  });
  var [reports,  setReports]  = useState(function(){
    return mergeWithDefaults(loadStored(STORE_KEY_REPORTS, null), RPTS);
  });
  var [view,     setView]     = useState("dash");
  var [openId,   setOpenId]   = useState(null);
  var [modal,    setModal]    = useState(false);

  useEffect(function(){ saveStored(STORE_KEY_PROJECTS, projects); }, [projects]);
  useEffect(function(){ saveStored(STORE_KEY_REPORTS,  reports);  }, [reports]);

  /* Boot-time auto-promote: any project stuck in 'processing' (demo data
     or a refresh during the 3s window) gets bumped to 'draft' after 3s. */
  useEffect(function() {
    var stuck = projects.filter(function(p){ return p.status === "processing"; });
    if (stuck.length === 0) return;
    var timeouts = stuck.map(function(p) {
      return setTimeout(function() {
        setProjects(function(ps) {
          return ps.map(function(x) {
            return x.id === p.id && x.status === "processing"
              ? Object.assign({},x,{status:"draft"})
              : x;
          });
        });
      }, 3000);
    });
    return function() { timeouts.forEach(clearTimeout); };
  }, []);

  var openP = projects.find(function(p){ return p.id === openId; }) || null;

  function nav(v) {
    if (v === "dash") setOpenId(null);
    setView(v);
  }

  function openProject(p) {
    setOpenId(p.id);
    setView("project");
  }

  function updateProject(id, patch) {
    setProjects(function(ps) {
      return ps.map(function(p){ return p.id === id ? Object.assign({},p,patch) : p; });
    });
  }

  function addProject(info) {
    var np = {
      id: Date.now(),
      addr: info.addr || "Nouvelle adresse",
      city: info.city || "Ville",
      status:"processing",
      date: new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}),
      area:0, floors:0, roof:"--", shape:"M",
      client: info.client || "",
      photos: info.photos || [],
      meas: Object.assign({},EMPTY_MEAS),
      rooms:[],
    };
    setProjects(function(ps){ return ps.concat([np]); });
    /* Auto-promote processing -> draft after 3s (no real CV pipeline yet) */
    setTimeout(function() {
      setProjects(function(ps) {
        return ps.map(function(p) {
          return p.id === np.id && p.status === "processing"
            ? Object.assign({},p,{status:"draft"})
            : p;
        });
      });
    }, 3000);
  }

  return (
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",
      background:"#08111E",color:"#E8EDF5",minHeight:"100vh"}}>
      <Sidebar view={view} setView={nav}/>
      <div style={{marginLeft:W,minHeight:"100vh"}}>
        {view === "dash" && (
          <Dashboard projects={projects} reports={reports} onOpen={openProject}
            onNew={function(){setModal(true);}}
            onOpenReports={function(){nav("reports");}}/>
        )}
        {view === "project" && openP && (
          <ProjectDetail
            project={openP}
            onBack={function(){nav("dash");}}
            onUpdate={function(patch){updateProject(openP.id,patch);}}
          />
        )}
        {view === "reports"  && <Reports reports={reports} setReports={setReports}/>}
        {view === "settings" && <Settings projects={projects} reports={reports}/>}
      </div>
      {modal && (
        <Modal
          onClose={function(){setModal(false);}}
          onCreate={function(info){addProject(info); setModal(false);}}
        />
      )}
    </div>
  );
}
