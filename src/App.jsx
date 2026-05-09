import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const C = {
  bg:"#08111E", surf:"#0F1C2E", card:"#152135", border:"#1C3050",
  acc:"#00C2FF", accL:"rgba(0,194,255,0.13)",
  grn:"#00E5A0", grnL:"rgba(0,229,160,0.11)",
  org:"#FF8C42", red:"#FF4757",
  txt:"#E8EDF5", mut:"#607898", dim:"#2E4A6A",
};

const EMPTY_MEAS = { walls:"", roof:"", perim:"", h:"", foot:"", win:"", doors:"" };

const PROJS = [
  { id:1, addr:"142 Rue de la Paix", city:"Paris 75001", status:"done",
    date:"2 mai 2026", area:284, floors:2, roof:"Pignon", shape:"L",
    meas:{ walls:"412.6", roof:"186.4", perim:"68.2", h:"7.4", foot:"142.3", win:"12", doors:"3" },
    rooms:[
      {n:"Mur Nord", a:"94.2", l:"16.4 m", h:"5.7 m", t:"w"},
      {n:"Mur Sud",  a:"94.2", l:"16.4 m", h:"5.7 m", t:"w"},
      {n:"Mur Est",  a:"78.4", l:"13.8 m", h:"5.7 m", t:"w"},
      {n:"Mur Ouest",a:"78.4", l:"13.8 m", h:"5.7 m", t:"w"},
      {n:"Toit",     a:"186.4",l:"---",    h:"---",    t:"r"},
    ]},
  { id:2, addr:"88 Avenue Victor Hugo", city:"Lyon 69006", status:"done",
    date:"28 avr. 2026", area:196, floors:1, roof:"4 pans", shape:"S",
    meas:{ walls:"298.1", roof:"124.8", perim:"56.4", h:"4.8", foot:"196.0", win:"8", doors:"2" },
    rooms:[
      {n:"Mur Nord",  a:"72.4", l:"14.8 m", h:"4.8 m", t:"w"},
      {n:"Mur Sud",   a:"72.4", l:"14.8 m", h:"4.8 m", t:"w"},
      {n:"Mur Est",   a:"64.2", l:"13.4 m", h:"4.8 m", t:"w"},
      {n:"Mur Ouest", a:"64.2", l:"13.4 m", h:"4.8 m", t:"w"},
      {n:"Toiture",   a:"124.8",l:"---",    h:"---",    t:"r"},
    ]},
  { id:3, addr:"23 Boulevard Carnot", city:"Bordeaux 33000", status:"processing",
    date:"6 mai 2026", area:320, floors:3, roof:"Terrasse", shape:"M",
    meas:{...EMPTY_MEAS}, rooms:[] },
  { id:4, addr:"7 Impasse des Tilleuls", city:"Nantes 44000", status:"draft",
    date:"7 mai 2026", area:0, floors:0, roof:"--", shape:"F",
    meas:{...EMPTY_MEAS}, rooms:[] },
];

const MATS = [
  {id:"wood",  lbl:"Bardage Bois",     col:"#C68642", price:45},
  {id:"stone", lbl:"Pierre Naturelle", col:"#9E8E7E", price:120},
  {id:"brick", lbl:"Brique Rouge",     col:"#C04A2B", price:85},
  {id:"white", lbl:"Enduit Blanc",     col:"#E8E4DC", price:35},
  {id:"grey",  lbl:"Beton Cire",       col:"#7A8899", price:55},
  {id:"slate", lbl:"Clin Gris",        col:"#4A5568", price:62},
];

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
function House({ shape, matCol, small }) {
  const wc = matCol || "#BFB09A";
  const rc = "#2E1E10";
  const win = "#7BBCE8";
  const dr = "#6B4226";
  const sc = small ? 0.5 : 1;
  const W2 = 320 * sc;
  const H2 = 200 * sc;
  if (shape === "S") {
    return (
      <svg width={W2} height={H2} viewBox="0 0 320 200">
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
      <rect x="18"  y="98"  width="194" height="92" fill={wc}/>
      <rect x="212" y="118" width="88"  height="72" fill={sh(wc,-15)} rx="1"/>
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
function IsoModel({ matCol, floors }) {
  var [angle, setAngle] = useState(30);
  var [auto, setAuto]   = useState(true);

  /* auto-rotation — reads `auto` from state snapshot each tick via functional update */
  useEffect(function() {
    var running = true;
    function tick() {
      if (!running) return;
      setAuto(function(a) {
        if (a) setAngle(function(ang) { return ang + 0.5; });
        return a;
      });
      setTimeout(tick, 20);
    }
    tick();
    return function() { running = false; };
  }, []);

  var wc  = matCol || "#BFB09A";
  var rc  = "#2E1E10";
  var rad = (angle * Math.PI) / 180;

  function proj(x, y, z) {
    return {
      x: 160 + (x * Math.cos(rad) - y * Math.sin(rad)) * 0.85,
      y: 175 - (x * Math.sin(rad) + y * Math.cos(rad)) * 0.36 - z * 0.68,
    };
  }

  var bw = 130, bd = 65, bh = 60 + (floors || 2) * 12;
  var P = [
    proj(-bw/2,-bd/2,0), proj(bw/2,-bd/2,0), proj(bw/2,bd/2,0), proj(-bw/2,bd/2,0),
    proj(-bw/2,-bd/2,bh),proj(bw/2,-bd/2,bh),proj(bw/2,bd/2,bh),proj(-bw/2,bd/2,bh),
  ];
  function pp(pts) { return pts.map(function(p){ return p.x+","+p.y; }).join(" "); }
  var rid  = proj(0,-bd/2-3,bh+40);
  var rid2 = proj(0, bd/2+3,bh+40);
  function bi(bl,br,tl,tr,u,v2) {
    var bx=bl.x+(br.x-bl.x)*u, by=bl.y+(br.y-bl.y)*u;
    var tx=tl.x+(tr.x-tl.x)*u, ty=tl.y+(tr.y-tl.y)*u;
    return {x:bx+(tx-bx)*v2, y:by+(ty-by)*v2};
  }
  var wins = [[0.08,0.30,0.20,0.62],[0.36,0.58,0.20,0.62]];

  function rotate(delta) {
    setAuto(false);
    setAngle(function(a) { return a + delta; });
  }

  var btnStyle = {
    background:"#152135", border:"1px solid #1C3050", color:"#E8EDF5",
    borderRadius:8, width:36, height:36, fontSize:18, cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center",
    outline:"none", flexShrink:0, fontWeight:700, lineHeight:1,
  };

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
      {/* SVG — no mouse events, purely display */}
      <div style={{flex:1, minHeight:220}}>
        <svg width="100%" height="100%" viewBox="0 0 320 280" style={{display:"block"}}>
          <ellipse cx="165" cy="232" rx="110" ry="17" fill="rgba(0,0,0,0.28)"/>
          <polygon points={pp([P[0],P[3],P[7],P[4]])} fill={sh(wc,-22)} stroke="#0A0E1A" strokeWidth="1.2"/>
          <polygon points={pp([P[0],P[1],P[5],P[4]])} fill={wc}         stroke="#0A0E1A" strokeWidth="1.2"/>
          <polygon points={pp([P[4],P[7],rid2,rid])}  fill={sh(rc,-6)}  stroke="#100804" strokeWidth="1"/>
          <polygon points={pp([P[5],P[4],rid,rid2])}  fill={sh(rc,14)}  stroke="#100804" strokeWidth="1"/>
          {wins.map(function(coords, i) {
            var x1=coords[0],x2=coords[1],y1=coords[2],y2=coords[3];
            var w=[bi(P[0],P[1],P[4],P[5],x1,y1),bi(P[0],P[1],P[4],P[5],x2,y1),
                   bi(P[0],P[1],P[4],P[5],x2,y2),bi(P[0],P[1],P[4],P[5],x1,y2)];
            return <polygon key={i} points={pp(w)} fill="rgba(100,178,228,0.88)" stroke="#3a6080" strokeWidth="0.8"/>;
          })}
          <text x={P[0].x-40} y={(P[0].y+P[4].y)/2+4}
            fill="#00E5A0" fontSize="10" fontFamily="monospace" fontWeight="bold">
            {(bh/9.8).toFixed(1)} m
          </text>
          <text x={(P[0].x+P[1].x)/2-18} y={(P[0].y+P[1].y)/2+34}
            fill="#00C2FF" fontSize="10" fontFamily="monospace" fontWeight="bold">
            16.4 m
          </text>
        </svg>
      </div>

      {/* Controls */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
        borderTop:"1px solid #1C3050", background:"#0A1422", flexShrink:0,
      }}>
        {/* Rotate left */}
        <button type="button" onClick={function(){ rotate(-15); }} style={btnStyle}>&#8592;</button>

        {/* Slider */}
        <input
          type="range" min={0} max={360} value={Math.round(angle % 360 + 360) % 360}
          onChange={function(e){ setAuto(false); setAngle(+e.target.value); }}
          style={{flex:1, accentColor:"#00C2FF", cursor:"pointer", height:4}}
        />

        {/* Rotate right */}
        <button type="button" onClick={function(){ rotate(15); }} style={btnStyle}>&#8594;</button>

        {/* Auto toggle */}
        <button type="button"
          onClick={function(){ setAuto(function(a){ return !a; }); }}
          style={{
            ...btnStyle, width:"auto", padding:"0 12px", fontSize:11, fontWeight:700,
            background: auto ? "#00C2FF" : "#152135",
            color: auto ? "#000" : "#607898",
            border: auto ? "none" : "1px solid #1C3050",
          }}>
          {auto ? "AUTO" : "PAUSE"}
        </button>
      </div>
    </div>
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
function Dashboard({ projects, onOpen, onNew }) {
  var [q, setQ] = useState("");
  var list = projects.filter(function(p) {
    return (p.addr+p.city).toLowerCase().indexOf(q.toLowerCase()) !== -1;
  });
  return (
    <div style={{padding:"26px 28px",overflowY:"auto",height:"100%",boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:"#E8EDF5"}}>Mes Projets</div>
          <div style={{color:"#607898",fontSize:12,marginTop:3}}>
            {projects.length} proprietes
          </div>
        </div>
        <Btn onClick={onNew} primary={true}>+ Nouveau projet</Btn>
      </div>
      <div style={{position:"relative",marginBottom:18}}>
        <input value={q} onChange={function(e){setQ(e.target.value);}} placeholder="Rechercher..."
          style={{width:"100%",boxSizing:"border-box",background:"#0F1C2E",
            border:"1px solid #1C3050",borderRadius:8,color:"#E8EDF5",
            fontSize:13,padding:"9px 12px",outline:"none"}}/>
      </div>
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
                  <div style={{fontSize:11,color:"#607898",marginTop:6}}>Photos a capturer</div>
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
        {tab === "model"  && <TabModel  project={project} mat={mat} setMat={setMat}/>}
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
  var inpRef = useRef();
  function addFiles(fileList) {
    var arr = Array.prototype.slice.call(fileList);
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
  return (
    <div style={{padding:"22px 24px",overflowY:"auto",height:"calc(100vh - 92px)",boxSizing:"border-box"}}>
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
            return (
              <div key={i} style={{position:"relative",aspectRatio:"4/3",
                borderRadius:8,overflow:"hidden",border:"1px solid #1C3050",
                cursor:"pointer",background:"#060D18"}}
                onClick={function(){ setZoom(p); }}>
                <img src={p.url} alt={p.name}
                  style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
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

function TabModel({ project, mat, setMat }) {
  return (
    <div style={{display:"flex",height:"calc(100vh - 92px)"}}>
      <div style={{flex:1,padding:18,display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{background:"#060D18",borderRadius:10,border:"1px solid #1C3050",
          flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <IsoModel matCol={mat ? mat.col : null} floors={project.floors || 2}/>
        </div>
      </div>
      <div style={{width:218,borderLeft:"1px solid #1C3050",overflowY:"auto",
        padding:"16px 14px",flexShrink:0}}>
        <div style={{fontSize:10,fontWeight:700,color:"#607898",textTransform:"uppercase",
          letterSpacing:"0.08em",marginBottom:12}}>Donnees projet</div>
        {project.meas && [
          ["Murs",     project.meas.walls+" m2"],
          ["Toit",     project.meas.roof+" m2"],
          ["Perimetre",project.meas.perim+" m"],
          ["Hauteur",  project.meas.h+" m"],
          ["Emprise",  project.meas.foot+" m2"],
          ["Fenetres", project.meas.win],
          ["Portes",   project.meas.doors],
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
        {MATS.map(function(m) {
          var active = mat && mat.id === m.id;
          return (
            <button type="button" key={m.id}
              onClick={function(){setMat(active ? null : m);}} style={{
              display:"flex",alignItems:"center",gap:9,padding:"7px 9px",
              borderRadius:8,border:"1px solid "+(active ? "#00C2FF" : "#1C3050"),
              cursor:"pointer",background:active ? "rgba(0,194,255,0.13)" : "transparent",
              marginBottom:5,width:"100%",outline:"none",
            }}>
              <div style={{width:17,height:17,borderRadius:4,background:m.col,
                border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}}/>
              <span style={{fontSize:11,color:"#E8EDF5",flex:1,textAlign:"left"}}>{m.lbl}</span>
              {active && <span style={{color:"#00C2FF",fontSize:12}}>OK</span>}
            </button>
          );
        })}
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

      {/* Hero instruction banner */}
      <div style={{background:"rgba(0,194,255,0.08)", border:"1px solid #00C2FF",
        borderRadius:10, padding:"12px 18px", marginBottom:22,
        display:"flex", alignItems:"center", gap:12}}>
        <div style={{fontSize:28}}>📐</div>
        <div>
          <div style={{fontSize:14, fontWeight:800, color:"#00C2FF", marginBottom:2}}>
            Saisie des mesures
          </div>
          <div style={{fontSize:12, color:"#607898"}}>
            Tapez directement dans chaque champ — les valeurs se sauvegardent a chaque touche
          </div>
        </div>
      </div>

      {/* 7 measurement cards */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:26}}>
        {FIELDS.map(function(f) {
          return (
            <div key={f.key} style={{background:"#0F1C2E", border:"1px solid #1C3050",
              borderRadius:10, padding:"14px 16px"}}>
              <div style={{fontSize:9, color:"#607898", textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:10}}>{f.lbl}</div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <input
                  type="number"
                  step="any"
                  value={m[f.key] === "" || m[f.key] == null ? "" : m[f.key]}
                  onChange={function(e){ setMeasField(f.key, e.target.value); }}
                  placeholder="0"
                  style={{
                    flex:1, background:"#0A1828",
                    border:"2px solid " + f.col,
                    borderRadius:6, color:f.col,
                    fontSize:22, fontWeight:900,
                    fontFamily:"monospace", padding:"6px 10px",
                    outline:"none", textAlign:"right",
                    boxSizing:"border-box",
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

function TabDesign({ project, mat, setMat }) {
  var [hov, setHov] = useState(null);
  var disp = hov || mat;
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
          <House shape={project.shape} matCol={disp ? disp.col : null}/>
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
              <div style={{width:40,height:40,borderRadius:8,background:m.col,
                border:"1.5px solid rgba(255,255,255,0.1)",flexShrink:0}}/>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:600,color:"#E8EDF5"}}>{m.lbl}</div>
                <div style={{fontSize:10,color:"#607898",marginTop:2}}>~{m.price} EUR/m2</div>
              </div>
              {active && <span style={{color:"#00C2FF",fontSize:12}}>OK</span>}
            </button>
          );
        })}
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
function Reports({ reports, setReports }) {
  var [sel,  setSel]  = useState(reports[0] && reports[0].id);
  var [toast,setToast]= useState("");
  var r = reports.find(function(x){ return x.id === sel; });
  function upd(id, p) { setReports(function(rs){ return rs.map(function(x){ return x.id===id ? Object.assign({},x,p) : x; }); }); }
  function updD(id, k, p) { setReports(function(rs){ return rs.map(function(x){ if (x.id!==id) return x; var n={}; Object.keys(x[k]).forEach(function(f){n[f]=x[k][f];}); Object.keys(p).forEach(function(f){n[f]=p[f];}); return Object.assign({},x,{[k]:n}); }); }); }
  var icons = {meas:"[M]",devis:"[$]",insp:"[I]",prop:"[P]"};
  return (
    <div style={{display:"flex",height:"100vh"}}>
      {toast && <Toast msg={toast} onDone={function(){setToast("");}}/>}
      <div data-noprint="1" style={{width:245,borderRight:"1px solid #1C3050",overflowY:"auto",
        padding:"14px 0",flexShrink:0}}>
        <div style={{padding:"0 14px 10px",fontSize:11,fontWeight:700,color:"#607898",
          textTransform:"uppercase",letterSpacing:"0.08em"}}>{reports.length} Rapports</div>
        {reports.map(function(x) {
          return (
            <button type="button" key={x.id} onClick={function(){setSel(x.id);}} style={{
              display:"block",width:"100%",padding:"11px 14px",
              background:sel===x.id ? "rgba(0,194,255,0.13)" : "transparent",
              border:"none",
              borderLeft:"3px solid "+(sel===x.id ? "#00C2FF" : "transparent"),
              cursor:"pointer",textAlign:"left",outline:"none",marginBottom:1,
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
            </button>
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
function Modal({ onClose, onCreate }) {
  var [step, setStep]   = useState(0);
  var [addr, setAddr]   = useState("");
  var [city, setCity]   = useState("");
  var [cli,  setCli]    = useState("");
  var [photos, setPhotos] = useState([]);
  var fRef = useRef();
  var ok = step === 0 ? addr.trim().length > 3 : true;
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
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div style={{background:"#0F1C2E",border:"1px solid #1C3050",borderRadius:14,
        padding:28,width:480,maxWidth:"90vw",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",gap:5,marginBottom:24}}>
          {["Adresse","Photos","Lancement"].map(function(s, i) {
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
            <div style={{fontSize:16,fontWeight:800,color:"#E8EDF5",marginBottom:14}}>Adresse du projet</div>
            {[["Adresse complète",addr,setAddr,"12 Rue de la Liberte"],
              ["Ville et code postal",city,setCity,"Marseille, 13001"],
              ["Nom du client",cli,setCli,"M. Dupont"],
            ].map(function(row) {
              return (
                <div key={row[0]} style={{marginBottom:11}}>
                  <div style={{fontSize:11,color:"#607898",marginBottom:4}}>{row[0]}</div>
                  <input value={row[1]} onChange={function(e){row[2](e.target.value);}}
                    placeholder={row[3]}
                    style={{width:"100%",boxSizing:"border-box",background:"#08111E",
                      border:"1px solid #1C3050",borderRadius:7,color:"#E8EDF5",
                      fontSize:13,padding:"9px 12px",outline:"none"}}/>
                </div>
              );
            })}
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
                {photos.length > 0 ? photos.length+" photo(s) selectionnee(s)" : "Glisser vos photos ici ou cliquer"}
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
            <div style={{fontSize:16,fontWeight:800,color:"#E8EDF5",marginBottom:5}}>Lancer l analyse</div>
            <div style={{background:"#152135",border:"1px solid #1C3050",borderRadius:9,
              padding:"13px 16px",marginBottom:14}}>
              {[["Adresse",addr||"--"],["Ville",city||"--"],
                ["Client",cli||"--"],["Photos",photos.length+" fichier(s)"]
              ].map(function(pair) {
                return (
                  <div key={pair[0]} style={{display:"flex",justifyContent:"space-between",
                    padding:"5px 0",borderBottom:"1px solid #1C3050"}}>
                    <span style={{fontSize:12,color:"#607898"}}>{pair[0]}</span>
                    <span style={{fontSize:12,color:"#E8EDF5",fontWeight:600}}>{pair[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:18}}>
          <Btn sm={true} onClick={onClose}>Annuler</Btn>
          {step > 0 && <Btn sm={true} onClick={function(){setStep(function(s){return s-1;});}}>Precedent</Btn>}
          <Btn sm={true} primary={true}
            onClick={function(){
              if (step < 2) setStep(function(s){return s+1;});
              else { onCreate({addr:addr,city:city,client:cli,photos:photos}); onClose(); }
            }}
            style={{opacity:ok ? 1 : 0.5, cursor:ok ? "pointer" : "not-allowed"}}>
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

/* ---- localStorage persistence ---- */
var STORE_KEY_PROJECTS = "mesurepro.projects.v1";
var STORE_KEY_REPORTS  = "mesurepro.reports.v1";
var STORE_KEY_PROFILE  = "mesurepro.profile.v1";

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

/* ---- App root ---- */
export default function App() {
  var [projects, setProjects] = useState(function(){ return loadStored(STORE_KEY_PROJECTS, PROJS); });
  var [reports,  setReports]  = useState(function(){ return loadStored(STORE_KEY_REPORTS,  RPTS);  });
  var [view,     setView]     = useState("dash");
  var [openId,   setOpenId]   = useState(null);
  var [modal,    setModal]    = useState(false);

  useEffect(function(){ saveStored(STORE_KEY_PROJECTS, projects); }, [projects]);
  useEffect(function(){ saveStored(STORE_KEY_REPORTS,  reports);  }, [reports]);

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
          <Dashboard projects={projects} onOpen={openProject} onNew={function(){setModal(true);}}/>
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
