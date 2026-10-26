/* Honeycomb mechanics. SI units unless a name says otherwise.

   Out-of-plane crushing (the way a honeycomb absorbs an impact)
   - Wierzbicki (1983) Int. J. Impact Eng. 1, 157: mean crush stress of a metal hexagonal honeycomb
       σc = 16.56 σ0 (t/D)^(5/3)
     t foil thickness, D cell size (across flats), σ0 the foil's flow stress. Walls fold progressively in
     lobes of half-wavelength H = 0.821 (t D²)^(1/3).
   - For an expanded honeycomb (two of the six walls are double foil) relative density ρ̄ = (8/3)(t/D),
     so σc = 16.56 σ0 (3ρ̄/8)^(5/3). With σ0 = 215 MPa (5052-H39 foil) this reproduces HexWeb's published
     crush strengths across 1.0–8.1 pcf (HEXWEB rows below): checked in the Crush Lab plot.
   - Hexcel, HexWeb Honeycomb Attributes and Properties: crush curve has a compressive peak (removed by
     pre-crushing), then a flat plateau; the usable stroke is about 70% of the height. Bare compressive
     peak ≈ 2.2 × crush strength in their table.
   - Gibson & Ashby (1997) Cellular Solids: open-cell foam plateau σ = 0.3 σy ρ̄^(3/2); densification strain
     εD = 1 − 1.4 ρ̄; out-of-plane modulus of a honeycomb E3 ≈ ρ̄ Es (we use 0.4 ρ̄ Es, which matches
     HexWeb's stabilized modulus: real foil is not perfectly straight).

   In-plane (the auxetic step): Gibson & Ashby, regular or re-entrant hexagons with walls h (vertical) and
   l (inclined) at angle θ:  ν21 = (h/l + sin θ) sin θ / cos²θ;  negative θ gives a negative Poisson's
   ratio. Our animation hinges rigid walls, which gives exactly this ratio.

   Sandwich panels (Allen 1969; Zenkert 1995): per unit width, faces tf, core c, d = c + tf,
       D = Ef tf d²/2 + Ef tf³/6,  S = Gc d²/c,
       three-point bending δ = P L³/(48 D) + P L/(4 S);  uniform pressure, simply supported:
       δ = 5 q L⁴/(384 D) + q L²/(8 S).
   HexWeb's table: a solid sheet t → sandwich 2t is 7× stiffer (3.5× stronger) for +3% weight; 4t is 37×
   (9.25×) for +6%. sandwichVsSolid() reproduces the 7× and 37×.

   Seismic force on a facade panel: ASCE 7-16 eq. 13.3-1
       Fp = 0.4 ap SDS Wp (1 + 2z/h) / (Rp/Ip),  0.3 SDS Ip Wp ≤ Fp ≤ 1.6 SDS Ip Wp,
   exterior non-structural wall elements ap = 1.0, Rp = 2.5. */

export const PSI = 6894.757, PCF = 16.0185, INCH = 0.0254, G = 9.81;

export interface CellMat { id: string; name: string; rho: number; s0: number; E: number; color: string; note: string }
export const CELL_MATS: Record<string, CellMat> = {
  al: { id: "al", name: "Aluminium 5052", rho: 2680, s0: 215e6, E: 70e9, color: "#c9ced8", note: "Aerospace foil. σ0 = 215 MPa reproduces HexWeb's crush data." },
  steel: { id: "steel", name: "Mild steel", rho: 7850, s0: 300e6, E: 200e9, color: "#8b93a6", note: "As in hexagonal honeycomb steel dampers for buildings." },
  pla: { id: "pla", name: "3D-printed PLA", rho: 1240, s0: 50e6, E: 3.5e9, color: "#f2b134", note: "Estimate: printed polymers crack as they fold, so treat the plateau as optimistic." },
};

/** HexWeb CR III 5052 hexagonal aluminium honeycomb (Hexcel data sheet, typical values). [cell in, density pcf, bare compressive psi, crush psi] */
export const HEXWEB: [string, number, number, number][] = [
  ["1/8", 3.1, 285, 130], ["1/8", 4.5, 550, 260], ["1/8", 6.1, 980, 450], ["1/8", 8.1, 1500, 750],
  ["5/32", 2.6, 220, 90], ["5/32", 3.8, 395, 185], ["5/32", 5.3, 690, 340], ["5/32", 6.9, 1080, 575], ["5/32", 8.4, 1530, 800],
  ["3/16", 2.0, 160, 60], ["3/16", 3.1, 290, 130], ["3/16", 4.4, 520, 250], ["3/16", 5.7, 820, 390], ["3/16", 6.9, 1120, 575], ["3/16", 8.1, 1600, 750],
  ["1/4", 1.6, 90, 40], ["1/4", 2.3, 190, 75], ["1/4", 3.4, 340, 150], ["1/4", 4.3, 500, 230], ["1/4", 5.2, 690, 335], ["1/4", 6.0, 990, 430],
  ["3/8", 1.0, 50, 25], ["3/8", 1.6, 90, 40], ["3/8", 2.3, 190, 75], ["3/8", 3.0, 285, 120], ["3/8", 3.7, 370, 180], ["3/8", 4.2, 520, 220],
];
export const cellInches = (s: string) => { const [a, b] = s.split("/").map(Number); return a / b; };

/** Relative density of an expanded hexagonal honeycomb (double walls on two sides). */
export const relDensity = (t: number, D: number) => (8 / 3) * (t / D);
/** Foil thickness that gives a relative density for a cell size. */
export const foilFor = (rhoBar: number, D: number) => (3 / 8) * rhoBar * D;

/** Wierzbicki mean crush stress (Pa). */
export const crushStress = (m: CellMat, rhoBar: number) => 16.56 * m.s0 * Math.pow((3 * rhoBar) / 8, 5 / 3);
/** Initial (bare) compressive peak, from HexWeb's typical ratio. */
export const PEAK_RATIO = 2.2;
/** Fold half-wavelength (m). */
export const foldH = (t: number, D: number) => 0.821 * Math.cbrt(t * D * D);
/** Usable stroke as a fraction of height (Hexcel: about 70%; denser cores bottom out sooner). */
export const strokeOf = (rhoBar: number) => Math.max(0.45, 0.72 - 1.4 * rhoBar);
export const E3of = (m: CellMat, rhoBar: number) => 0.4 * rhoBar * m.E;

export type Core = "honeycomb" | "foam" | "solid";
export interface CrushSpec { core: Core; mat: CellMat; rhoBar: number; D: number; H: number; precrushed?: boolean }

/** Stress (Pa) against nominal strain for a core crushed out of plane. Smooth enough to plot, with the
    fold-by-fold ripple of a real honeycomb test. */
export function crushCurve(s: CrushSpec, e: number): number {
  if (e <= 0) return 0;
  if (s.core === "solid") {
    // the same mass as a solid slab: elastic, then it yields at the material's strength (a very stiff, very high wall)
    return Math.min(s.mat.s0, s.mat.E * e * 50);
  }
  const ed = s.core === "foam" ? 1 - 1.4 * s.rhoBar : strokeOf(s.rhoBar);
  const plat = s.core === "foam" ? 0.3 * s.mat.s0 * Math.pow(s.rhoBar, 1.5) : crushStress(s.mat, s.rhoBar);
  const E3 = s.core === "foam" ? s.mat.E * s.rhoBar * s.rhoBar : E3of(s.mat, s.rhoBar);
  const peak = s.core === "honeycomb" && !s.precrushed ? PEAK_RATIO * plat : plat;
  const ePk = peak / E3;
  if (e < ePk) return E3 * e;
  let sig: number;
  if (s.core === "foam") {
    sig = plat * (1 + 0.25 * (e - ePk)); // a gently rising plateau
  } else {
    // drop from the peak to the plateau over the first fold, then ripple once per fold (2H of crush)
    const H = foldH(foilFor(s.rhoBar, s.D), s.D);
    const fold = (2 * H) / s.H;
    const drop = Math.exp(-(e - ePk) / (fold * 0.35));
    sig = plat + (peak - plat) * drop + 0.07 * plat * Math.sin((2 * Math.PI * (e - ePk)) / fold);
  }
  if (e > ed) { const x = (e - ed) / (1 - ed); sig += plat * (Math.pow(1 / Math.max(0.02, 1 - x), 3) - 1); }
  return sig;
}

/** Energy absorbed (J/m³) up to strain e. */
export function crushEnergy(s: CrushSpec, e: number, n = 300) {
  let w = 0;
  for (let i = 0; i < n; i++) { const a = (i / n) * e, b = ((i + 1) / n) * e; w += 0.5 * (crushCurve(s, a) + crushCurve(s, b)) * (b - a); }
  return w;
}
/** Specific energy absorption to the end of the plateau, J/g. */
export function sea(s: CrushSpec) {
  const ed = s.core === "foam" ? 1 - 1.4 * s.rhoBar : s.core === "solid" ? 0.002 : strokeOf(s.rhoBar);
  return crushEnergy(s, ed) / (s.rhoBar * s.mat.rho) / 1000;
}

export interface DropResult { stopped: boolean; stroke: number; peakF: number; peakG: number; absorbed: number; t: number; trace: { t: number; x: number; v: number; F: number }[] }
/** Drop a mass m at speed v onto a core of area A and height H; integrate until it stops or bottoms out. */
export function dropTest(s: CrushSpec, A: number, m: number, v0: number): DropResult {
  let x = 0, v = v0, t = 0, peakF = 0;
  const dt = Math.min(2e-5, s.H / Math.max(v0, 0.1) / 4000);
  const trace: DropResult["trace"] = [];
  let k = 0, absorbed = 0;
  while (v > 0 && t < 2) {
    const e = x / s.H;
    if (e >= 0.985) break;
    const F = crushCurve(s, e) * A;
    peakF = Math.max(peakF, F);
    const a = G - F / m;
    v += a * dt; const dx = Math.max(0, v) * dt; x += dx; t += dt;
    absorbed += F * dx;
    if (k++ % 25 === 0) trace.push({ t, x, v, F });
  }
  trace.push({ t, x, v: Math.max(0, v), F: crushCurve(s, x / s.H) * A });
  const stopped = v <= 0;
  return { stopped, stroke: x, peakF, peakG: peakF / (m * G), absorbed, t, trace };
}

/* ---------- sandwich panels ---------- */
export interface Sandwich { tf: number; c: number; Ef: number; rhoF: number; Gc: number; rhoC: number; sfY: number; tauC: number; Ec: number }
/** Flexural rigidity per unit width (N·m). */
export const rigidity = (s: Sandwich) => { const d = s.c + s.tf; return (s.Ef * s.tf * d * d) / 2 + (s.Ef * s.tf ** 3) / 6; };
/** Shear stiffness per unit width (N/m). */
export const shearStiff = (s: Sandwich) => { const d = s.c + s.tf; return s.c > 0 ? (s.Gc * d * d) / s.c : Infinity; };
export const massPerArea = (s: Sandwich) => 2 * s.rhoF * s.tf + s.rhoC * s.c;
/** Three-point bending, central load P per unit width (N/m) over span L: bending and core-shear parts. */
export function threePoint(s: Sandwich, P: number, L: number) {
  const D = rigidity(s), S = shearStiff(s), d = s.c + s.tf;
  const bend = (P * L ** 3) / (48 * D), shear = S === Infinity ? 0 : (P * L) / (4 * S);
  const M = (P * L) / 4;
  return { bend, shear, total: bend + shear, faceStress: M / (s.tf * d), coreShear: P / 2 / d };
}
/** Uniform pressure q (Pa) on a strip spanning L, simply supported. */
export function pressureStrip(s: Sandwich, q: number, L: number) {
  const D = rigidity(s), S = shearStiff(s), d = s.c + s.tf;
  const bend = (5 * q * L ** 4) / (384 * D), shear = S === Infinity ? 0 : (q * L * L) / (8 * S);
  const M = (q * L * L) / 8, V = (q * L) / 2;
  return { bend, shear, total: bend + shear, faceStress: M / (s.tf * d), coreShear: V / d, wrinkle: 0.5 * Math.cbrt(s.Ef * s.Ec * s.Gc) };
}
/** Split a solid sheet of thickness t into two t/2 faces around a core of thickness k·t. Returns stiffness and strength ratios. */
export function sandwichVsSolid(k: number) {
  const t = 1, tf = t / 2, d = k * t + tf;
  const D = (tf * d * d) / 2 + tf ** 3 / 6, D0 = t ** 3 / 12;
  // strength: the outer fibre stress σ = M (h/2) / I, h the total thickness (as Hexcel compares them)
  const h = k * t + 2 * tf, I = 2 * (tf ** 3 / 12 + tf * (d / 2) ** 2);
  return { stiffness: D / D0, strength: I / (h / 2) / (t * t / 6) };
}

/* ---------- in-plane: regular and re-entrant hexagons ---------- */
/** Gibson–Ashby Poisson's ratio for loading along x2 (the h walls): lateral strain / axial strain. */
export const poisson21 = (theta: number, hl = 1) => ((hl + Math.sin(theta)) * Math.sin(theta)) / Math.cos(theta) ** 2;
/** Cell size for walls h (vertical) and l (inclined at θ to horizontal): width and height per repeat. */
export const cellBox = (theta: number, h: number, l: number) => ({ w: 2 * l * Math.cos(theta), hgt: 2 * (h + l * Math.sin(theta)) });

/* ---------- tiling efficiency (the Honeycomb Conjecture) ---------- */
/** Wall length per cell, shared walls counted once, for a cell of unit area: lower uses less wax. */
export const TILINGS = [
  { id: "tri", name: "Triangles", sides: 3, wall: 3 / Math.pow(3, 0.25), waste: 0, note: "Tile the plane, but a lot of wall for the area." },
  { id: "sq", name: "Squares", sides: 4, wall: 2, waste: 0, note: "Tile the plane; 7% more wall than hexagons." },
  { id: "hex", name: "Hexagons", sides: 6, wall: Math.sqrt(2 * Math.sqrt(3)), waste: 0, note: "The least wall of any tiling into equal areas (Hales 1999)." },
  { id: "circ", name: "Circles", sides: 0, wall: 2 * Math.sqrt(Math.PI), waste: 1 - Math.PI / (2 * Math.sqrt(3)), note: "Like bumblebee cells: every cell has its own wall, and 9% of the space is gaps." },
] as const;
/* hexagon of unit area: side a with (3√3/2)a² = 1; shared perimeter 3a = √(2√3) ≈ 1.861 */

/* ---------- seismic force on facade panels (ASCE 7-16 13.3-1) ---------- */
export function fp(Wp: number, SDS: number, z: number, h: number, ap = 1, Rp = 2.5, Ip = 1) {
  const raw = (0.4 * ap * SDS * Wp * (1 + (2 * z) / h)) / (Rp / Ip);
  return Math.min(1.6 * SDS * Ip * Wp, Math.max(0.3 * SDS * Ip * Wp, raw));
}

/** Facade panel builds (mass per m², kg). */
export interface Panel { id: string; name: string; kgm2: number; color: string; note: string; sandwich?: Sandwich }
const AL = { Ef: 70e9, rhoF: 2700, sfY: 200e6 };
const HW31 = { Gc: 45 * 6894.757 * 1000, rhoC: 3.1 * 16.0185, tauC: 210 * 6894.757, Ec: 75 * 6894.757 * 1000 };
export const PANELS: Panel[] = [
  { id: "precast", name: "Precast concrete, 150 mm", kgm2: 2400 * 0.15, color: "#9b9a8e", note: "The usual heavy cladding: 360 kg per square metre." },
  { id: "stone", name: "Stone on steel frame, 40 mm", kgm2: 2700 * 0.04 + 12, color: "#c2b59b", note: "Granite slabs on a sub-frame." },
  { id: "glass", name: "Glazed curtain wall", kgm2: 55, color: "#9fd8ff", note: "Double glazing in aluminium frames." },
  { id: "honey", name: "Aluminium honeycomb sandwich, 25 mm", kgm2: 0, color: "#f2b134", note: "1 mm aluminium skins on a 23 mm 3.1 pcf aluminium honeycomb core.", sandwich: { tf: 0.001, c: 0.023, ...AL, ...HW31 } },
  { id: "stonehoney", name: "Stone-faced honeycomb, 28 mm", kgm2: 0, color: "#e6c27a", note: "5 mm stone veneer bonded to an aluminium honeycomb panel: looks like stone, a tenth of the weight.", sandwich: { tf: 0.001, c: 0.022, ...AL, ...HW31 } },
];
PANELS[3].kgm2 = massPerArea(PANELS[3].sandwich!);
PANELS[4].kgm2 = massPerArea(PANELS[4].sandwich!) + 2700 * 0.005;
