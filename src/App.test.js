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
