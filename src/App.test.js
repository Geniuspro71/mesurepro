/* Smoke tests Vitest — helpers purs exportés depuis App.jsx.
   Lance : npm test (ou npx vitest run pour CI).
   Pas de DOM ici, donc inutile de monter les composants React. */
import { describe, it, expect } from "vitest";
import {
  slug,
  csvEscape,
  publicAsset,
  facadesAreEmpty,
  estimatePhotosSizeKB,
  parseSolarBuilding,
  BLE_DRIVERS,
  DEFAULT_PREFS,
  EMPTY_MEAS,
  /* Session 3 — features "best of breed" */
  I18N,
  SUPPORTED_LANGS,
  detectLang,
  BE_MATERIALS,
  computePEB,
  PEB_COLORS,
  encodeProjectForShare,
  decodeProjectFromShare,
  detectArPlatform,
  /* === Phase A — Module Intérieur === */
  LEVEL_TYPES,
  ROOM_TYPES,
  emptyInterior,
  emptyLevel,
  emptyRoom,
  roomArea,
  roomVolume,
  levelArea,
  interiorArea,
  interiorIsValidated,
  interiorCount,
  /* === Phase B — Module Extérieur === */
  FACADE_SIDES,
  FACADE_MATERIALS,
  FACADE_CONDITIONS,
  emptyExterior,
  emptyFacade,
  facadeBruteArea,
  facadeOpeningsArea,
  facadeNetArea,
  exteriorTotalBrute,
  exteriorTotalNet,
  exteriorCount,
  roofPitchFromFacades,
} from "./App.jsx";

describe("slug()", () => {
  it("retire les accents et espaces", () => {
    expect(slug("Avenue Haussmann")).toBe("avenue-haussmann");
  });
  it("retourne 'export' pour les chaînes vides (fallback nommage fichier)", () => {
    expect(slug("")).toBe("export");
    expect(slug(null)).toBe("export");
    expect(slug(undefined)).toBe("export");
  });
  it("compresse les espaces multiples en 1 seul tiret", () => {
    expect(slug("a  b   c")).toBe("a-b-c");
  });
});

describe("csvEscape()", () => {
  /* L'export CSV utilise « ; » comme séparateur (Excel FR), donc seuls ; " et \n
     déclenchent l'escape — pas la virgule. */
  it("entoure de guillemets quand la valeur contient un point-virgule", () => {
    expect(csvEscape("a;b")).toBe('"a;b"');
  });
  it("double les guillemets internes", () => {
    expect(csvEscape('a"b')).toBe('"a""b"');
  });
  it("laisse passer une valeur sans caractère problématique", () => {
    expect(csvEscape("simple")).toBe("simple");
    expect(csvEscape("a,b")).toBe("a,b");  /* virgule OK, on est en CSV-FR */
  });
});

describe("estimatePhotosSizeKB()", () => {
  it("retourne 0 quand pas de photos", () => {
    expect(estimatePhotosSizeKB([])).toBe(0);
    expect(estimatePhotosSizeKB(null)).toBe(0);
    expect(estimatePhotosSizeKB(undefined)).toBe(0);
  });
  it("estime correctement à partir d'une data URL JPEG", () => {
    /* Une data URL de longueur 4000 → ~3000 octets décodés → ~3 KB */
    const photo = { url: "data:image/jpeg;base64," + "A".repeat(4000), size: 0 };
    const kb = estimatePhotosSizeKB([photo]);
    expect(kb).toBeGreaterThan(2);
    expect(kb).toBeLessThan(5);
  });
  it("utilise photo.size en fallback quand pas de data URL", () => {
    const photo = { url: "https://example.com/img.jpg", size: 1024 * 50 };
    expect(estimatePhotosSizeKB([photo])).toBe(50);
  });
});

describe("BLE_DRIVERS", () => {
  it("contient au moins Leica + Bosch", () => {
    expect(BLE_DRIVERS.length).toBeGreaterThanOrEqual(2);
    const ids = BLE_DRIVERS.map((d) => d.id);
    expect(ids).toContain("leica");
    expect(ids).toContain("bosch");
  });
  it("chaque driver a un namePattern, services, characteristic et parser", () => {
    BLE_DRIVERS.forEach((d) => {
      expect(d.namePattern).toBeInstanceOf(RegExp);
      expect(Array.isArray(d.services)).toBe(true);
      expect(d.services.length).toBeGreaterThan(0);
      expect(typeof d.distanceCharacteristic).toBe("string");
      expect(typeof d.parse).toBe("function");
    });
  });
  it("Leica parser décode un float32 little-endian (4 bytes) en mètres", () => {
    const leica = BLE_DRIVERS.find((d) => d.id === "leica");
    /* 12.5 m → float32 LE = 0x00 0x00 0x48 0x41 */
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, 12.5, true);
    expect(leica.parse(new DataView(buf))).toBeCloseTo(12.5, 2);
  });
  it("Leica parser rejette une trame vide ou trop courte", () => {
    const leica = BLE_DRIVERS.find((d) => d.id === "leica");
    expect(leica.parse(null)).toBeNull();
    const tooShort = new DataView(new ArrayBuffer(2));
    expect(leica.parse(tooShort)).toBeNull();
  });
  it("Leica parser rejette une distance hors plage (< 0 ou > 200 m)", () => {
    const leica = BLE_DRIVERS.find((d) => d.id === "leica");
    const make = (m) => {
      const buf = new ArrayBuffer(4);
      new DataView(buf).setFloat32(0, m, true);
      return new DataView(buf);
    };
    expect(leica.parse(make(-1))).toBeNull();
    expect(leica.parse(make(300))).toBeNull();
  });
  it("Bosch parser décode une trame ASCII '1.234m'", () => {
    const bosch = BLE_DRIVERS.find((d) => d.id === "bosch");
    const ascii = (s) => {
      const buf = new ArrayBuffer(s.length);
      const view = new DataView(buf);
      for (let i = 0; i < s.length; i++) view.setUint8(i, s.charCodeAt(i));
      return view;
    };
    expect(bosch.parse(ascii("1.234m"))).toBeCloseTo(1.234, 3);
    expect(bosch.parse(ascii("5.0"))).toBe(5);
  });
  it("Bosch parser convertit mm en m via heuristique > 200 sans virgule", () => {
    const bosch = BLE_DRIVERS.find((d) => d.id === "bosch");
    const ascii = (s) => {
      const buf = new ArrayBuffer(s.length);
      const view = new DataView(buf);
      for (let i = 0; i < s.length; i++) view.setUint8(i, s.charCodeAt(i));
      return view;
    };
    /* "1234" sans point → 1234 mm → 1.234 m */
    expect(bosch.parse(ascii("1234"))).toBeCloseTo(1.234, 3);
  });
});

describe("parseSolarBuilding()", () => {
  it("retourne des KPI cohérents depuis une réponse Solar API simplifiée", () => {
    const fake = {
      boundingBox: {
        ne: { latitude: 50.8506, longitude: 4.3489 },  /* ~Bruxelles */
        sw: { latitude: 50.8500, longitude: 4.3480 },
      },
      solarPotential: {
        wholeRoofStats: { groundAreaMeters2: 120 },
        roofSegmentStats: [
          { pitchDegrees: 35, azimuthDegrees: 180, planeHeightAtCenterMeters: 6,
            stats: { areaMeters2: 70, groundAreaMeters2: 60 } },
          { pitchDegrees: 35, azimuthDegrees: 0,   planeHeightAtCenterMeters: 6,
            stats: { areaMeters2: 70, groundAreaMeters2: 60 } },
        ],
      },
    };
    const parsed = parseSolarBuilding(fake, { lat: 50.85, lng: 4.348 }, "Bruxelles");
    expect(parsed.summary.roofAreaTotalM2).toBeCloseTo(140, 0);
    expect(parsed.summary.footprintM2).toBe(120);
    expect(parsed.summary.maxHeightM).toBe(6);
    expect(parsed.summary.segmentCount).toBe(2);
    expect(parsed.segments.length).toBe(2);
    /* boundingBox 0.0006° lat ≈ 67 m N-S, 0.0009° lng * cos(50.85°) ≈ 63 m E-O */
    expect(parsed.summary.depthNS).toBeGreaterThan(50);
    expect(parsed.summary.depthNS).toBeLessThan(80);
    expect(parsed.summary.widthEW).toBeGreaterThan(40);
    expect(parsed.summary.widthEW).toBeLessThan(80);
  });
  it("gère une réponse Solar API sans wholeRoofStats", () => {
    const fake = {
      boundingBox: { ne: { latitude: 50.85, longitude: 4.35 }, sw: { latitude: 50.85, longitude: 4.35 } },
      solarPotential: {
        roofSegmentStats: [
          { pitchDegrees: 30, azimuthDegrees: 90, planeHeightAtCenterMeters: 5,
            stats: { areaMeters2: 50, groundAreaMeters2: 45 } },
        ],
      },
    };
    const parsed = parseSolarBuilding(fake, { lat: 50.85, lng: 4.35 }, "X");
    /* footprint = somme des segments en fallback */
    expect(parsed.summary.footprintM2).toBe(45);
    expect(parsed.summary.segmentCount).toBe(1);
  });
});

describe("DEFAULT_PREFS + EMPTY_MEAS", () => {
  it("DEFAULT_PREFS contient les clés attendues", () => {
    expect(DEFAULT_PREFS).toHaveProperty("tva");
    expect(DEFAULT_PREFS).toHaveProperty("currency");
    expect(DEFAULT_PREFS).toHaveProperty("depthRatio");
    expect(DEFAULT_PREFS).toHaveProperty("defaultCivilite");
    expect(DEFAULT_PREFS).toHaveProperty("theme");
    expect(DEFAULT_PREFS).toHaveProperty("lang"); /* Session 3 — i18n */
    expect(DEFAULT_PREFS.tva).toBeGreaterThan(0);
    expect(DEFAULT_PREFS.tva).toBeLessThan(100);
    expect(DEFAULT_PREFS.depthRatio).toBeGreaterThan(0);
    expect(DEFAULT_PREFS.depthRatio).toBeLessThan(1);
  });
  it("EMPTY_MEAS contient les 7 clés vides", () => {
    const keys = ["walls","roof","perim","h","foot","win","doors"];
    keys.forEach((k) => {
      expect(EMPTY_MEAS).toHaveProperty(k);
      expect(EMPTY_MEAS[k]).toBe("");
    });
  });
});

/* ============================================================================
   Session 3 — features "best of breed mondial"
============================================================================ */

describe("i18n (FR/NL/EN/DE)", () => {
  it("expose les 4 langues supportées", () => {
    expect(SUPPORTED_LANGS).toHaveLength(4);
    const codes = SUPPORTED_LANGS.map((L) => L.code);
    expect(codes).toEqual(expect.arrayContaining(["fr", "nl", "en", "de"]));
  });
  it("chaque langue a un libellé natif et un drapeau", () => {
    SUPPORTED_LANGS.forEach((L) => {
      expect(typeof L.code).toBe("string");
      expect(typeof L.label).toBe("string");
      expect(typeof L.flag).toBe("string");
      expect(L.label.length).toBeGreaterThan(2);
    });
  });
  it("I18N FR est la source de vérité (le plus de clés)", () => {
    const frKeys = Object.keys(I18N.fr).sort();
    expect(frKeys.length).toBeGreaterThan(50);
    expect(I18N.fr["nav.projects"]).toBe("Projets");
    expect(I18N.fr["status.draft"]).toBe("Brouillon");
  });
  it("traductions de base présentes dans NL/EN/DE", () => {
    ["nl", "en", "de"].forEach((lang) => {
      expect(I18N[lang]["nav.projects"]).toBeTruthy();
      expect(I18N[lang]["common.save"]).toBeTruthy();
      expect(I18N[lang]["status.draft"]).toBeTruthy();
    });
  });
  it("NL emploie 'Projecten' pour 'nav.projects'", () => {
    expect(I18N.nl["nav.projects"]).toBe("Projecten");
  });
  it("EN emploie 'Projects' pour 'nav.projects'", () => {
    expect(I18N.en["nav.projects"]).toBe("Projects");
  });
  it("DE emploie 'Projekte' pour 'nav.projects'", () => {
    expect(I18N.de["nav.projects"]).toBe("Projekte");
  });
  it("detectLang retourne un code parmi les langues supportées", () => {
    const code = detectLang();
    expect(["fr", "nl", "en", "de"]).toContain(code);
  });
});

describe("BE_MATERIALS — quantitatif matériaux Belgique 2026", () => {
  it("contient au moins 6 matériaux toiture + 7 matériaux façade", () => {
    expect(BE_MATERIALS.roof.length).toBeGreaterThanOrEqual(6);
    expect(BE_MATERIALS.facade.length).toBeGreaterThanOrEqual(7);
  });
  it("chaque matériau a id, lbl, unit, ratio, priceEur, group, note", () => {
    [...BE_MATERIALS.roof, ...BE_MATERIALS.facade].forEach((m) => {
      expect(typeof m.id).toBe("string");
      expect(typeof m.lbl).toBe("string");
      expect(typeof m.unit).toBe("string");
      expect(typeof m.ratio).toBe("number");
      expect(m.ratio).toBeGreaterThan(0);
      expect(typeof m.priceEur).toBe("number");
      expect(m.priceEur).toBeGreaterThan(0);
      expect(typeof m.note).toBe("string");
    });
  });
  it("tuiles terre cuite ~13 u/m² @ ~1.85 EUR/u (cohérence marché BE)", () => {
    const tuiles = BE_MATERIALS.roof.find((m) => m.id === "tiles_terre_cuite");
    expect(tuiles).toBeTruthy();
    expect(tuiles.ratio).toBeCloseTo(13, 0);
    expect(tuiles.priceEur).toBeGreaterThan(1);
    expect(tuiles.priceEur).toBeLessThan(5);
  });
  it("ardoises naturelles ~22 u/m² @ ~3.4 EUR/u", () => {
    const ard = BE_MATERIALS.roof.find((m) => m.id === "ardoises_naturelle");
    expect(ard.ratio).toBeCloseTo(22, 0);
    expect(ard.priceEur).toBeGreaterThan(2);
  });
});

describe("computePEB — Indicateur Performance Énergétique Belgique", () => {
  it("retourne une classe A++ à G selon kWh/m²/an", () => {
    /* Maison neuve (2023, isolation full) → A ou A++ */
    const neuve = computePEB({
      meas: { foot: "100", walls: "200", roof: "120", h: "6" },
      floors: 2, yearBuilt: "2023", insulation: "full",
    });
    expect(["A++", "A", "B"]).toContain(neuve.cls);
    expect(neuve.kwhPerYear).toBeLessThan(170);
  });
  it("Maison ancienne sans isolation → F ou G", () => {
    const vieille = computePEB({
      meas: { foot: "120", walls: "300", roof: "150", h: "8" },
      floors: 2, yearBuilt: "1930", insulation: "none",
    });
    expect(["E", "F", "G"]).toContain(vieille.cls);
    expect(vieille.kwhPerYear).toBeGreaterThan(255);
  });
  it("renseigne heatedArea, kwhPerYear, annualTotal", () => {
    const peb = computePEB({
      meas: { foot: "80", walls: "200", roof: "100", h: "6" },
      floors: 2, yearBuilt: "1985", insulation: "partial",
    });
    expect(typeof peb.cls).toBe("string");
    expect(typeof peb.kwhPerYear).toBe("number");
    expect(peb.heatedArea).toBeCloseTo(80 * 2, 0); /* foot * floors */
    expect(peb.annualTotal).toBeCloseTo(peb.kwhPerYear * peb.heatedArea, -2);
  });
  it("PEB_COLORS mappe les 8 classes (A++ → G)", () => {
    ["A++","A","B","C","D","E","F","G"].forEach((c) => {
      expect(PEB_COLORS).toHaveProperty(c);
      expect(PEB_COLORS[c]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});

describe("encodeProjectForShare / decodeProjectFromShare", () => {
  it("round-trip : encode puis decode retourne le même projet", () => {
    const project = {
      id: 42,
      addr: "Rue de la Paix 10",
      city: "Bruxelles 1000",
      client: "M. Test",
      status: "done",
      meas: { walls: "200", roof: "100", h: "6", foot: "80" },
      photos: [{ url: "/photos/abc.jpg", name: "façade" }],
    };
    const encoded = encodeProjectForShare(project);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(20);
    /* URL-safe : pas de +, /, = */
    expect(encoded).not.toMatch(/[+/=]/);
    const decoded = decodeProjectFromShare(encoded);
    expect(decoded).toBeTruthy();
    expect(decoded.addr).toBe(project.addr);
    expect(decoded.city).toBe(project.city);
    expect(decoded.meas.walls).toBe("200");
  });
  it("strip les blob: et data: URLs des photos (trop lourdes)", () => {
    const project = {
      addr: "Test", city: "Test", meas: { foot: "80" },
      photos: [
        { url: "/photos/keep.jpg", name: "ok" },
        { url: "blob:http://example/abc", name: "blob" },
        { url: "data:image/jpeg;base64,AAA", name: "data" },
      ],
    };
    const enc = encodeProjectForShare(project);
    const dec = decodeProjectFromShare(enc);
    expect(dec.photos.length).toBe(1);
    expect(dec.photos[0].url).toBe("/photos/keep.jpg");
  });
  it("decode invalide retourne null (tolérant à l'erreur)", () => {
    expect(decodeProjectFromShare("garbage!!!notbase64")).toBeNull();
    expect(decodeProjectFromShare("")).toBeNull();
  });
});

describe("detectArPlatform", () => {
  it("retourne 'ios' / 'android' / 'other'", () => {
    const p = detectArPlatform();
    expect(["ios", "android", "other"]).toContain(p);
  });
});

/* =============================================================
   Phase A — Module Intérieur (mesurepro v1 + JSX merge — 2026-05-20)
   ============================================================= */

describe("Phase A — constantes", () => {
  it("LEVEL_TYPES contient 5 niveaux (cave/rdc/etage1/etage2/combles)", () => {
    expect(LEVEL_TYPES).toHaveLength(5);
    const ids = LEVEL_TYPES.map(l => l.id);
    expect(ids).toEqual(["cave", "rdc", "etage1", "etage2", "combles"]);
    LEVEL_TYPES.forEach(l => {
      expect(l).toHaveProperty("label");
      expect(l).toHaveProperty("emoji");
    });
  });

  it("ROOM_TYPES contient 10 types de pièces", () => {
    expect(ROOM_TYPES).toHaveLength(10);
    const ids = ROOM_TYPES.map(r => r.id);
    expect(ids).toContain("salon");
    expect(ids).toContain("cuisine");
    expect(ids).toContain("chambre");
    expect(ids).toContain("sdb");
    expect(ids).toContain("autre");
  });
});

describe("emptyInterior / emptyLevel / emptyRoom", () => {
  it("emptyInterior() retourne {levels: []}", () => {
    const i = emptyInterior();
    expect(i).toEqual({ levels: [] });
  });

  it("emptyLevel('rdc') produit un level rdc vide avec id unique", () => {
    const l = emptyLevel("rdc");
    expect(l.type).toBe("rdc");
    expect(l.label).toBe("Rez-de-chaussée");
    expect(l.rooms).toEqual([]);
    expect(typeof l.id).toBe("string");
    expect(l.id.length).toBeGreaterThanOrEqual(5);
  });

  it("emptyLevel(type inconnu) fallback rdc", () => {
    const l = emptyLevel("xxx_inconnu");
    expect(l.type).toBe("rdc");
  });

  it("emptyRoom('salon') produit une pièce vide non validée", () => {
    const r = emptyRoom("salon");
    expect(r.type).toBe("salon");
    expect(r.label).toBe("Salon");
    expect(r.length).toBe("");
    expect(r.width).toBe("");
    expect(r.height).toBe("");
    expect(r.area).toBe("");
    expect(r.hasPhoto).toBe(false);
    expect(r.photoUrl).toBeNull();
    expect(r.validated).toBe(false);
  });

  it("emptyRoom(type inconnu) fallback salon", () => {
    const r = emptyRoom("zzz_inexistant");
    expect(r.type).toBe("salon");
  });

  it("deux emptyLevel produisent des ids différents", () => {
    const a = emptyLevel("rdc");
    const b = emptyLevel("rdc");
    expect(a.id).not.toBe(b.id);
  });
});

describe("roomArea / roomVolume", () => {
  it("roomArea(5, 4) === 20", () => {
    expect(roomArea(5, 4)).toBe(20);
  });

  it("roomArea accepte des strings numériques", () => {
    expect(roomArea("5.5", "3.2")).toBe(17.6);
  });

  it("roomArea arrondit à 2 décimales", () => {
    expect(roomArea(3.333, 3.333)).toBe(11.11);
  });

  it("roomArea(0 ou négatif ou vide) === 0", () => {
    expect(roomArea(0, 4)).toBe(0);
    expect(roomArea(-1, 4)).toBe(0);
    expect(roomArea("", "")).toBe(0);
    expect(roomArea(null, null)).toBe(0);
    expect(roomArea(undefined, undefined)).toBe(0);
    expect(roomArea("abc", "def")).toBe(0);
  });

  it("roomVolume(20, 2.5) === 50", () => {
    expect(roomVolume(20, 2.5)).toBe(50);
  });

  it("roomVolume invalide → 0", () => {
    expect(roomVolume(0, 2.5)).toBe(0);
    expect(roomVolume(20, -1)).toBe(0);
    expect(roomVolume("", "")).toBe(0);
  });
});

describe("levelArea / interiorArea / interiorIsValidated / interiorCount", () => {
  function mkProj(levels) {
    return { interior: { levels } };
  }
  function mkLevel(rooms) {
    return { id: "L1", type: "rdc", label: "RDC", emoji: "🏠", rooms };
  }
  function mkRoom(area, validated) {
    return { id: "R" + Math.random(), type: "salon", label: "Salon", emoji: "🛋️",
      length: "", width: "", height: "2.5", area: String(area), hasPhoto: true,
      photoUrl: "x", remarks: "", validated: !!validated };
  }

  it("levelArea({rooms:[]}) === 0", () => {
    expect(levelArea({ rooms: [] })).toBe(0);
    expect(levelArea(null)).toBe(0);
    expect(levelArea(undefined)).toBe(0);
  });

  it("levelArea additionne les surfaces des pièces", () => {
    const lvl = mkLevel([mkRoom(20), mkRoom(15.5), mkRoom("invalid"), mkRoom(0)]);
    expect(levelArea(lvl)).toBe(35.5);
  });

  it("interiorArea(project sans intérieur) === 0", () => {
    expect(interiorArea({})).toBe(0);
    expect(interiorArea(null)).toBe(0);
    expect(interiorArea({ interior: { levels: [] } })).toBe(0);
  });

  it("interiorArea agrège tous les niveaux", () => {
    const p = mkProj([
      mkLevel([mkRoom(20), mkRoom(10)]),
      mkLevel([mkRoom(30)]),
    ]);
    expect(interiorArea(p)).toBe(60);
  });

  it("interiorIsValidated false si aucune pièce", () => {
    expect(interiorIsValidated({})).toBe(false);
    expect(interiorIsValidated(mkProj([]))).toBe(false);
    expect(interiorIsValidated(mkProj([mkLevel([])]))).toBe(false);
  });

  it("interiorIsValidated true seulement si toutes les pièces sont validées", () => {
    const ok = mkProj([mkLevel([mkRoom(20, true), mkRoom(15, true)])]);
    const partial = mkProj([mkLevel([mkRoom(20, true), mkRoom(15, false)])]);
    expect(interiorIsValidated(ok)).toBe(true);
    expect(interiorIsValidated(partial)).toBe(false);
  });

  it("interiorCount retourne {levels, rooms, validated}", () => {
    const p = mkProj([
      mkLevel([mkRoom(20, true), mkRoom(15, false)]),
      mkLevel([mkRoom(30, true)]),
    ]);
    expect(interiorCount(p)).toEqual({ levels: 2, rooms: 3, validated: 2 });
  });

  it("interiorCount sur projet vide", () => {
    expect(interiorCount({})).toEqual({ levels: 0, rooms: 0, validated: 0 });
    expect(interiorCount(null)).toEqual({ levels: 0, rooms: 0, validated: 0 });
  });
});

/* =============================================================
   Phase B — Module Extérieur (façades détaillées — 2026-05-20)
   ============================================================= */

describe("Phase B — constantes", () => {
  it("FACADE_SIDES contient 4 côtés (sud/est/nord/ouest)", () => {
    expect(FACADE_SIDES).toHaveLength(4);
    expect(FACADE_SIDES.map(s => s.id)).toEqual(["sud", "est", "nord", "ouest"]);
    FACADE_SIDES.forEach(s => expect(s).toHaveProperty("short"));
  });

  it("FACADE_MATERIALS contient 7 types", () => {
    expect(FACADE_MATERIALS).toHaveLength(7);
    const ids = FACADE_MATERIALS.map(m => m.id);
    expect(ids).toContain("enduit");
    expect(ids).toContain("brique");
    expect(ids).toContain("autre");
  });

  it("FACADE_CONDITIONS contient 3 niveaux avec couleur", () => {
    expect(FACADE_CONDITIONS).toHaveLength(3);
    expect(FACADE_CONDITIONS.map(c => c.id)).toEqual(["bon", "moyen", "mauvais"]);
    FACADE_CONDITIONS.forEach(c => expect(c).toHaveProperty("color"));
  });
});

describe("emptyExterior / emptyFacade", () => {
  it("emptyExterior() produit 4 façades", () => {
    const e = emptyExterior();
    expect(e.facades).toHaveLength(4);
    expect(e.facades.map(f => f.side)).toEqual(["sud", "est", "nord", "ouest"]);
  });

  it("emptyFacade('sud') retourne une façade sud vide non validée", () => {
    const f = emptyFacade("sud");
    expect(f.side).toBe("sud");
    expect(f.widthTotal).toBe("");
    expect(f.heightLeft).toBe("");
    expect(f.heightRight).toBe("");
    expect(f.hasPignon).toBe(false);
    expect(f.hasDevers).toBe(false);
    expect(f.validated).toBe(false);
    expect(typeof f.id).toBe("string");
  });

  it("emptyFacade(type inconnu) fallback sud", () => {
    const f = emptyFacade("xxx");
    expect(f.side).toBe("sud");
  });

  it("4 emptyFacade ont des ids différents", () => {
    const ids = ["sud", "est", "nord", "ouest"].map(s => emptyFacade(s).id);
    expect(new Set(ids).size).toBe(4);
  });
});

describe("facadeBruteArea / facadeOpeningsArea / facadeNetArea", () => {
  function mkF(p) { return Object.assign(emptyFacade("sud"), p); }

  it("façade sans dimensions → 0", () => {
    expect(facadeBruteArea(mkF({}))).toBe(0);
    expect(facadeBruteArea(null)).toBe(0);
  });

  it("rectangle simple : 10 × 5 = 50", () => {
    expect(facadeBruteArea(mkF({ widthTotal: "10", heightLeft: "5" }))).toBe(50);
  });

  it("hauteurs asymétriques 10 × (4+6)/2 = 50", () => {
    expect(facadeBruteArea(mkF({ widthTotal: "10", heightLeft: "4", heightRight: "6" }))).toBe(50);
  });

  it("pignon ajoute triangle : 10 × 5 + 10 × (8-5)/2 = 65", () => {
    expect(facadeBruteArea(mkF({
      widthTotal: "10", heightLeft: "5", heightRight: "5",
      hasPignon: true, heightCorniche: "5", heightFaitage: "8"
    }))).toBe(65);
  });

  it("facadeOpeningsArea somme portes+fenêtres+baies", () => {
    expect(facadeOpeningsArea(mkF({ surfDoors: "2", surfWindows: "3.5", surfBays: "4" }))).toBe(9.5);
  });

  it("facadeNetArea = brute - ouvertures, jamais négatif", () => {
    const f = mkF({ widthTotal: "10", heightLeft: "5", surfWindows: "8" });
    expect(facadeNetArea(f)).toBe(42);
  });

  it("facadeNetArea avec ouvertures > brute → 0", () => {
    const f = mkF({ widthTotal: "10", heightLeft: "5", surfWindows: "100" });
    expect(facadeNetArea(f)).toBe(0);
  });
});

describe("exteriorTotalBrute / exteriorTotalNet / exteriorCount / roofPitchFromFacades", () => {
  function mkProj(facades) { return { exterior: { facades } }; }
  function mkF(p) { return Object.assign(emptyFacade("sud"), p); }

  it("totaux à 0 sur projet vide", () => {
    expect(exteriorTotalBrute({})).toBe(0);
    expect(exteriorTotalBrute(null)).toBe(0);
    expect(exteriorTotalNet({})).toBe(0);
  });

  it("exteriorTotalBrute somme les 4 façades", () => {
    const p = mkProj([
      mkF({ widthTotal: "10", heightLeft: "5" }), // 50
      mkF({ widthTotal: "8", heightLeft: "5" }),  // 40
      mkF({ widthTotal: "10", heightLeft: "5" }), // 50
      mkF({ widthTotal: "8", heightLeft: "5" })   // 40
    ]);
    expect(exteriorTotalBrute(p)).toBe(180);
  });

  it("exteriorCount retourne {total, validated}", () => {
    const p = mkProj([
      mkF({ validated: true }),
      mkF({ validated: true }),
      mkF({ validated: false }),
      mkF({ validated: false })
    ]);
    expect(exteriorCount(p)).toEqual({ total: 4, validated: 2 });
    expect(exteriorCount({})).toEqual({ total: 0, validated: 0 });
  });

  it("roofPitchFromFacades null si pas de pignon", () => {
    const p = mkProj([mkF({ widthTotal: "10", heightLeft: "5" })]);
    expect(roofPitchFromFacades(p)).toBeNull();
  });

  it("roofPitchFromFacades calcule l'angle depuis pignon (10m large, +3m de rise → atan(3/5) ≈ 31°)", () => {
    const p = mkProj([mkF({
      widthTotal: "10", heightLeft: "5", heightCorniche: "5",
      hasPignon: true, heightFaitage: "8"
    })]);
    const pitch = roofPitchFromFacades(p);
    expect(pitch).not.toBeNull();
    expect(pitch).toBeGreaterThan(30);
    expect(pitch).toBeLessThan(32);
  });

  it("roofPitchFromFacades null si faîtage ≤ corniche", () => {
    const p = mkProj([mkF({
      widthTotal: "10", heightLeft: "5", heightCorniche: "5",
      hasPignon: true, heightFaitage: "5"
    })]);
    expect(roofPitchFromFacades(p)).toBeNull();
  });
});

describe("publicAsset() — chemins assets compatibles sous-chemin", () => {
  it("préfixe un chemin relatif avec BASE_URL", () => {
    /* En test, import.meta.env.BASE_URL vaut "/" → résultat racine. */
    expect(publicAsset("photos/x.jpg")).toBe("/photos/x.jpg");
    expect(publicAsset("data/be-postal-codes.json")).toBe("/data/be-postal-codes.json");
    expect(publicAsset("textures/")).toBe("/textures/");
  });

  it("retire le slash initial pour éviter un double slash", () => {
    expect(publicAsset("/photos/x.jpg")).toBe("/photos/x.jpg");
    expect(publicAsset("///data/x.json")).toBe("/data/x.json");
    expect(publicAsset("/photos/x.jpg").indexOf("//")).toBe(-1);
  });

  it("gère les entrées vides ou nulles sans planter", () => {
    expect(publicAsset("")).toBe("/");
    expect(publicAsset(null)).toBe("/");
    expect(publicAsset(undefined)).toBe("/");
  });

  it("ne perd pas les sous-dossiers ni l'extension", () => {
    expect(publicAsset("photos/sub/dir/photo.jpg")).toBe("/photos/sub/dir/photo.jpg");
  });
});

describe("facadesAreEmpty() — protection des mesures manuelles", () => {
  const empty = {
    sud:   { l:"", h:"", win:"", doors:"" },
    est:   { l:"", h:"", win:"", doors:"" },
    nord:  { l:"", h:"", win:"", doors:"" },
    ouest: { l:"", h:"", win:"", doors:"" },
  };

  it("true quand aucune façade n'a de saisie", () => {
    expect(facadesAreEmpty(empty)).toBe(true);
    expect(facadesAreEmpty(null)).toBe(true);
    expect(facadesAreEmpty(undefined)).toBe(true);
  });

  it("false dès qu'une longueur est saisie", () => {
    const f = JSON.parse(JSON.stringify(empty));
    f.sud.l = "10";
    expect(facadesAreEmpty(f)).toBe(false);
  });

  it("false dès qu'une hauteur est saisie", () => {
    const f = JSON.parse(JSON.stringify(empty));
    f.est.h = "6";
    expect(facadesAreEmpty(f)).toBe(false);
  });

  it("false dès qu'un nombre de fenêtres/portes est saisi", () => {
    const fw = JSON.parse(JSON.stringify(empty));
    fw.nord.win = "3";
    expect(facadesAreEmpty(fw)).toBe(false);
    const fd = JSON.parse(JSON.stringify(empty));
    fd.ouest.doors = "1";
    expect(facadesAreEmpty(fd)).toBe(false);
  });

  it("ignore les valeurs non numériques / zéro", () => {
    const f = JSON.parse(JSON.stringify(empty));
    f.sud.l = "0"; f.sud.h = "abc";
    expect(facadesAreEmpty(f)).toBe(true);
  });
});
