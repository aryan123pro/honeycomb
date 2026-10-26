/* The spinning duct. Silk protein (spidroin) is stored as a liquid-crystalline dope, about half protein,
   in water (Vollrath & Knight 2001, Nature 410, 541). It flows down a long, tapering S-shaped duct; the
   taper accelerates it, which stretches the flow and lines the rod-like molecules up with it, while the
   duct pulls water and sodium out and pumps protons in (pH falls from about 7.6 to 5.7: Andersson et al.
   2014, PLoS Biol 12, e1001921). Near the spigot the aligned protein locks into β-sheet crystals and a
   solid thread is drawn out, the "internal draw-down"; the legs pulling it out add an "external" one.

   Model: rods in a uniaxial extensional flow (Jeffery's equation for a slender rod)
       dp/dt = ε̇ (D·p − (p·D·p) p) + rotational diffusion,  D = diag(1, −½, −½)
   The hyperbolic taper r(s) = r0 / √(1 + k s) gives a constant stretch rate ε̇ = u0 k / L. Rotational
   diffusion fades as water leaves (s > 0.7), freezing the alignment. Order parameter S = ⟨(3 cos²θ − 1)/2⟩:
   0 for random rods, 1 for perfectly aligned.

   The link from alignment to fibre properties (alignedProps) is illustrative, not fitted: it reproduces
   the trend of Vollrath, Madsen & Shao (2001, Proc. R. Soc. B 268, 2339): faster reeling makes stiffer,
   stronger, less stretchy silk. */

export interface DuctOpts { k: number; u0: number; reel: number; n: number; dope: number }
export const DUCT_DEFAULT: DuctOpts = { k: 14, u0: 0.12, reel: 10, n: 900, dope: 0.25 };

function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }
function gauss(r: () => number) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/** radius of the duct lumen along its length, normalised (spigot at s = 1) */
export const ductR = (s: number, k: number) => (s < 1 ? 1 / Math.sqrt(1 + k * Math.min(1, s)) : 1 / Math.sqrt(1 + k) * Math.max(0.35, 1 - (s - 1) * 0.6));
/** pH along the duct (Andersson et al. 2014): 7.6 in the sac, falling to 5.7 toward the spigot */
export const ductPH = (s: number) => 7.6 - 1.9 * Math.min(1, Math.max(0, (s - 0.15) / 0.75));
/** share of water still in the dope */
export const ductWater = (s: number) => 0.5 * (1 - Math.min(1, Math.max(0, (s - 0.55) / 0.45)) ** 1.5);

export class Duct {
  o: DuctOpts;
  s: Float32Array;        // position along duct, 0..1.25 (past 1 = drawn fibre)
  rad: Float32Array;      // radial position (fraction of lumen) and angle around axis
  phi: Float32Array;
  p: Float32Array;        // orientation, 3 per rod (x along the duct)
  private r = rng(11);
  constructor(o: Partial<DuctOpts> = {}) {
    this.o = { ...DUCT_DEFAULT, ...o };
    const n = this.o.n;
    this.s = new Float32Array(n); this.rad = new Float32Array(n); this.phi = new Float32Array(n); this.p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.spawn(i, this.r() * 1.25);
    for (let k = 0; k < 600; k++) this.step(1 / 60);
  }
  private spawn(i: number, s = 0) {
    const r = this.r;
    this.s[i] = s; this.rad[i] = Math.sqrt(r()) * 0.85; this.phi[i] = r() * Math.PI * 2;
    // the dope is already a liquid crystal: domains partly ordered, here along a random director
    let x = gauss(r), y = gauss(r), z = gauss(r);
    x *= 1 + this.o.dope * 2;
    const L = Math.hypot(x, y, z) || 1;
    this.p[i * 3] = x / L; this.p[i * 3 + 1] = y / L; this.p[i * 3 + 2] = z / L;
  }
  /** stretch rate (per second, in model time) at s */
  rate(s: number) {
    const { k, u0, reel } = this.o;
    if (s < 1) return u0 * k;
    // external draw-down between spigot and legs: the reeling speed sets it
    return s < 1.15 ? u0 * k * 0.05 * reel : 0;
  }
  speed(s: number) {
    const { k, u0, reel } = this.o;
    if (s < 1) return u0 * (1 + k * s) * 0.08;
    return u0 * (1 + k) * 0.08 * (1 + (reel / 10) * Math.min(1, (s - 1) / 0.15) * 1.5);
  }
  /** rotational diffusion: high in the watery sac, gone once the protein has set */
  diff(s: number) { return s > 1 ? 0.01 : 1.6 * Math.max(0.12, ductWater(s) / 0.5) ** 2; }
  step(dt: number) {
    const n = this.o.n, r = this.r;
    for (let i = 0; i < n; i++) {
      const s = this.s[i];
      const ed = this.rate(s), Dr = this.diff(s);
      let x = this.p[i * 3], y = this.p[i * 3 + 1], z = this.p[i * 3 + 2];
      // Jeffery: D·p = (x, −y/2, −z/2); p·D·p = x² − (y² + z²)/2
      const pdp = x * x - 0.5 * (y * y + z * z);
      x += ed * (x - pdp * x) * dt; y += ed * (-0.5 * y - pdp * y) * dt; z += ed * (-0.5 * z - pdp * z) * dt;
      const sd = Math.sqrt(2 * Dr * dt);
      x += sd * gauss(r); y += sd * gauss(r); z += sd * gauss(r);
      const L = Math.hypot(x, y, z) || 1;
      this.p[i * 3] = x / L; this.p[i * 3 + 1] = y / L; this.p[i * 3 + 2] = z / L;
      this.s[i] = s + this.speed(s) * dt;
      if (this.s[i] > 1.25) this.spawn(i, 0);
    }
  }
  /** order parameter of rods within [a, b) of the duct */
  order(a: number, b: number) {
    let S = 0, c = 0;
    for (let i = 0; i < this.o.n; i++) { const s = this.s[i]; if (s >= a && s < b) { const x = this.p[i * 3]; S += 1.5 * x * x - 0.5; c++; } }
    return c ? S / c : 0;
  }
}

/** Illustrative fibre properties from final alignment S (0..1): stiffer and stronger, less stretchy, as reeling speeds up. */
export function alignedProps(S: number) {
  const s = Math.max(0, Math.min(1, S));
  return { E: 4 + 10 * s, strength: 0.5 + 1.0 * s, ext: 0.45 - 0.25 * s };
}
