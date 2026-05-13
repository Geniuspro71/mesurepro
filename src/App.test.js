/* Smoke tests Vitest — helpers purs exportés depuis App.jsx.
   Lance : npm test (ou npx vitest run pour CI).
   Pas de DOM ici, donc inutile de monter les composants React. */
import { describe, it, expect } from "vitest";
import {
  slug,
  csvEscape,
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
