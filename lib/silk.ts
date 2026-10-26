/* Silk and its rivals, as stress–strain laws. Stress in GPa, strain dimensionless, so the area under a curve
   (GPa) × 1000 is toughness in MJ/m³.

   Sources:
   - Gosline, Guerette, Ortlepp & Savage (1999) J. Exp. Biol. 202, 3295: Araneus diadematus major-ampullate
     (dragline) silk: E ≈ 10 GPa, strength 1.1 GPa, extensibility 0.27, toughness 160 MJ/m³; viscid
     (capture) silk: E 0.003 GPa, strength 0.5 GPa, extensibility 2.7, toughness ~150 MJ/m³; both dissipate
     about 65% of the energy they absorb as heat (hysteresis). Kevlar 49: 130 GPa, 3.6 GPa, 0.027.
   - Agnarsson, Kuntner & Blackledge (2010) PLoS ONE 5, e11234: Caerostris darwini forcibly silked dragline:
     toughness 354 ± 93 MJ/m³ (max 520), strength 1.652 GPa, extensibility 0.52, E 11.5 GPa.
   - Cranford, Tarakanova, Pugno & Buehler (2012) Nature 482, 72: dragline silk stiff at first, softens at a
     yield point, then stiffens strongly until it breaks; webs made of it localise damage. Their controls
     were linear-elastic and elastic–plastic threads; we keep both as switchable laws.
   - The deck (slide 30) plots Kevlar 50, high-strength steel 170, garden-spider dragline 205, Darwin's
     bark spider 350 (avg) and 520 (max) MJ/m³. Our curves are calibrated to land near those areas. */

export type Law = "silk" | "viscid" | "linear" | "plastic" | "steel";
export interface Fibre {
  id: string; name: string; short: string; law: Law;
  E: number;      // initial modulus, GPa
  ey: number;     // yield strain (silk, plastic, steel)
  E2: number;     // post-yield tangent at yield, GPa (silk); hardening modulus (steel)
  sf: number;     // stress at failure, GPa
  ef: number;     // strain at failure
  rho: number;    // density kg/m³
  color: string; note: string;
}

const C_SILK = "#e8e4d6", C_DARWIN = "#9fd8ff", C_KEVLAR = "#f2b134", C_STEEL = "#8b93a6", C_VISCID = "#c6f08a";

export const FIBRES: Record<string, Fibre> = {
  kevlar: { id: "kevlar", name: "Kevlar 49", short: "Kevlar", law: "linear", E: 130, ey: 0, E2: 0, sf: 3.6, ef: 0.027, rho: 1440, color: C_KEVLAR, note: "Very stiff and strong, but stretches under 3%: it stores little energy before it snaps." },
  steel: { id: "steel", name: "High-strength steel", short: "Steel", law: "steel", E: 200, ey: 0.006, E2: 3.6, sf: 1.5, ef: 0.12, rho: 7850, color: C_STEEL, note: "A ductile high-strength steel: yields at 1.2 GPa and hardens to 1.5 GPa. A hard-drawn wire would stretch under 1% and store far less (Gosline 1999 lists 6 MJ/m³)." },
  araneus: { id: "araneus", name: "Garden spider dragline", short: "Garden spider", law: "silk", E: 10, ey: 0.025, E2: 3.0, sf: 1.1, ef: 0.27, rho: 1300, color: C_SILK, note: "Araneus diadematus major-ampullate silk, the thread of radii, frames and the safety line." },
  darwin: { id: "darwin", name: "Darwin's bark spider dragline", short: "Darwin's bark", law: "silk", E: 11.5, ey: 0.025, E2: 0.7, sf: 1.652, ef: 0.52, rho: 1300, color: C_DARWIN, note: "Caerostris darwini, Madagascar: the toughest biological material measured. It bridges rivers 25 m wide." },
  viscid: { id: "viscid", name: "Capture spiral (viscid) silk", short: "Capture spiral", law: "viscid", E: 0.003, ey: 0, E2: 0, sf: 0.5, ef: 2.7, rho: 1300, color: C_VISCID, note: "Flagelliform core coated in glue droplets: as soft as rubber at first, it stretches to 3.7× its length." },
};

/** The deck's own toughness bars (slide 30), MJ/m³. */
export const DECK_TOUGHNESS: [string, number, string][] = [
  ["Kevlar", 50, C_KEVLAR], ["High-strength steel", 170, C_STEEL], ["Garden spider dragline", 205, C_SILK], ["Darwin's bark (avg)", 350, C_DARWIN], ["Darwin's bark (max)", 520, "#f2b134"],
];

/** Coefficient of the cubic stiffening term so a silk curve passes through (ef, sf). */
function silkC(f: Fibre) {
  const x = f.ef - f.ey, sy = f.E * f.ey;
  return (f.sf - sy - f.E2 * x) / (x * x * x);
}
const VISCID_N = 8;

/** Stress (GPa) at strain e on the loading curve. Zero in compression (a thread goes slack). */
export function stress(f: Fibre, e: number): number {
  if (e <= 0) return 0;
  switch (f.law) {
    case "linear": return (f.sf / f.ef) * e;
    case "viscid": return f.E * e + (f.sf - f.E * f.ef) * Math.pow(e / f.ef, VISCID_N);
    case "plastic": return e < f.ey ? f.E * e : f.E * f.ey;
    case "steel": {
      const sy = f.E * f.ey;
      if (e < f.ey) return f.E * e;
      // hardening that saturates at sf (Voce-type), reaching it near ef
      const x = (e - f.ey) / (f.ef - f.ey);
      return sy + (f.sf - sy) * (1 - Math.exp(-5 * x)) / (1 - Math.exp(-5));
    }
    case "silk": default: {
      if (e < f.ey) return f.E * e;
      const x = e - f.ey;
      return f.E * f.ey + f.E2 * x + silkC(f) * x * x * x;
    }
  }
}

/** Toughness: energy per volume to break, MJ/m³ (area under the curve). */
export function toughness(f: Fibre, upTo = f.ef) {
  const n = 400; let s = 0;
  for (let i = 0; i < n; i++) { const a = (i / n) * upTo, b = ((i + 1) / n) * upTo; s += 0.5 * (stress(f, a) + stress(f, b)) * (b - a); }
  return s * 1000;
}
/** Energy per kilogram to break, J/g (= kJ/kg). */
export const specificToughness = (f: Fibre) => (toughness(f) * 1e6) / f.rho / 1000;

/* A law with its parameters in the form the web solver needs (SI units, Pa). */
export interface LawParams { law: Law; E: number; ey: number; E2: number; C: number; sf: number; ef: number; hyst: boolean }
export function lawParams(f: Fibre, law: Law = f.law): LawParams {
  const g = { ...f, law };
  // the Cranford controls keep the dragline's failure point, so all three laws break at the same strain
  return { law, E: f.E * 1e9, ey: f.ey, E2: f.E2 * 1e9, C: (law === "silk" ? silkC(g) : 0) * 1e9, sf: f.sf * 1e9, ef: f.ef, hyst: law === "silk" || law === "viscid" || law === "plastic" };
}
/** Same as stress() but from LawParams, in Pa; inlined in the solver's hot loop. */
export function stressPa(p: LawParams, e: number): number {
  if (e <= 0) return 0;
  if (p.law === "linear") return (p.sf / p.ef) * e;
  if (p.law === "viscid") return p.E * e + (p.sf - p.E * p.ef) * Math.pow(e / p.ef, VISCID_N);
  if (p.law === "plastic") return e < p.ey ? p.E * e : p.E * p.ey;
  if (e < p.ey) return p.E * e;
  const x = e - p.ey;
  return p.E * p.ey + p.E2 * x + p.C * x * x * x;
}

/** Cranford's three material laws for the radial threads, as switchable options. */
export const WEB_LAWS: { id: Law; name: string; note: string }[] = [
  { id: "silk", name: "Real silk", note: "Stiff, then softens at yield, then stiffens hard until it breaks (Cranford 2012)." },
  { id: "linear", name: "Linear elastic", note: "Same breaking point, but a straight line: like a stiff engineering fibre." },
  { id: "plastic", name: "Elastic–plastic", note: "Yields and flows without stiffening: like a soft metal wire." },
];

/** Fundamental frequency of a taut thread: f = (1/2L)·√(σ/ρ). Spiders read prey from web vibrations. */
export const threadHz = (sigmaPa: number, L: number, rho = 1300) => Math.sqrt(Math.max(0, sigmaPa) / rho) / (2 * L);

/** Thread diameters used in the web model (µm). Araneus radii ~3–4 µm; frames thicker; capture-spiral core ~2.5 µm equivalent. */
export const THREAD_D = { radial: 3.6, spiral: 2.5, frame: 9, anchor: 12, hub: 3 };
