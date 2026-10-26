/* A live orb web: every thread segment is a nonlinear spring, every junction a mass, integrated explicitly
   in real units (metres, kilograms, seconds, newtons).

   Geometry follows an Araneus orb: a hub with a few rings, straight radii, a polygonal frame tied to
   anchors, and an Archimedean capture spiral crossing the radii. Threads are pre-tensioned and the web is
   settled before anything hits it.

   Material: each thread kind has its own stress–strain law from lib/silk.ts (dragline for radii, frame,
   anchors and hub; viscid silk for the capture spiral). Radial threads can be switched to Cranford's two
   controls (linear elastic, elastic–plastic) to see why the real law localises damage.

   Hysteresis: Gosline et al. (1999) found both silks give back only ~35% of the energy they absorb. Once a
   thread is stretched past yield, unloading follows a straight line to a permanent set chosen so exactly
   65% of the stored energy is lost (elastic–plastic unloads at its initial modulus instead).

   Honest shortcuts, shown on the page:
   - Each junction carries at least 1 µg (and more near the stiff hub) so the explicit solver is stable with a
     5 µs step; a real Araneus web weighs 0.1–1 mg, this one ~2–4 mg.
   - Prey sticks wherever it touches (glue never lets go).
   Air drag on the threads uses Lamb's low-Reynolds-number drag on a thin cylinder (about 6×10⁻⁵ N·s/m² per
   metre of thread at ~1 m/s), so it is physical rather than a tuning knob. Sensenig, Lorentz & Blackledge
   (2012, J. R. Soc. Interface 9, 1880) found radial threads do most of the work of stopping prey, the capture
   spiral at most ~30% and air drag at most ~10%: the energy panel lets you check this model against that. */

import { FIBRES, lawParams, THREAD_D, type Law, type LawParams } from "../silk";

export const KIND = { radial: 0, spiral: 1, frame: 2, anchor: 3, hub: 4 } as const;
export const KIND_NAMES = ["radial", "capture spiral", "frame", "anchor", "hub"];
const PRESTRAIN = [0.006, 0.6, 0.008, 0.01, 0.004];
const RHO = 1300;

export interface WebSpec {
  R: number;          // outer radius of the capture area (m)
  radii: number;      // number of radii
  spacing: number;    // capture spiral spacing (m)
  hub: number;        // hub radius (m)
  free: number;       // free zone between hub and spiral (m)
  frameSides: number; // sides of the frame polygon
  sub: number;        // spiral segments split into this many pieces
  seed: number;
  radialLaw: Law;     // "silk" | "linear" | "plastic"
  spiralLaw: Law;     // "viscid" normally; "silk" makes a web with a dragline spiral
  defects: number;    // fraction of radial and spiral segments removed at random (0–0.5)
  dRadial?: number;   // radial thread diameter, µm
  dSpiral?: number;
}
export const DEFAULT_WEB: WebSpec = { R: 0.15, radii: 28, spacing: 0.0045, hub: 0.014, free: 0.016, frameSides: 6, sub: 1, seed: 7, radialLaw: "silk", spiralLaw: "viscid", defects: 0 };

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; };
}

export interface Prey { m: number; r: number; pos: [number, number, number]; vel: [number, number, number] }
export type Outcome = "flying" | "caught" | "through" | "slipped" | "none";

export class WebSim {
  spec: WebSpec;
  n = 0; ns = 0;
  pos!: Float64Array; vel!: Float64Array; frc!: Float64Array; mass!: Float64Array; fixed!: Uint8Array; rest!: Float32Array;
  a!: Int32Array; b!: Int32Array; L0!: Float64Array; area!: Float64Array; kind!: Uint8Array;
  emax!: Float64Array; eset!: Float64Array; broken!: Uint8Array; Lp!: Float64Array; work!: Float64Array; load!: Float32Array;
  laws: LawParams[] = [];
  lawOf!: Uint8Array;
  Wtab: Float64Array[] = [];
  nodeKind!: Uint8Array;
  ringR: number[] = [];
  spiralNodes: number[] = [];
  /** the radial nodes, per radius, from hub to frame */
  radialNodes: number[][] = [];
  t = 0;
  damping = 0;
  /** air-drag coefficient per node (N·s/m) */
  drag!: Float64Array;
  fprev!: Float64Array;
  airLoss = 0;
  stop: { t: number; z: number } | null = null;
  g = 9.81;
  prey: (Prey & { on: boolean; att: number[]; off: number[]; ke0: number; zMin: number; slowFor: number }) | null = null;
  outcome: Outcome = "none";
  pull: { node: number; dir: [number, number, number]; speed: number; d: number; F: number; on: boolean; trace: [number, number][] } | null = null;
  brokenCount = 0;
  brokenLog: { i: number; t: number }[] = [];
  /** cumulative work done on threads, per kind (J) */
  workByKind = [0, 0, 0, 0, 0];

  constructor(spec: Partial<WebSpec> = {}) {
    this.spec = { ...DEFAULT_WEB, ...spec };
    this.build();
  }

  private build() {
    const s = this.spec, rand = rng(s.seed);
    const P: number[] = [], kindN: number[] = [];
    const fixed: number[] = [];
    const addNode = (x: number, y: number, k: number, fix = false) => { P.push(x, y, 0); kindN.push(k); fixed.push(fix ? 1 : 0); return kindN.length - 1; };
    const SA: number[] = [], SB: number[] = [], SK: number[] = [];
    const addSpring = (i: number, j: number, k: number) => { SA.push(i); SB.push(j); SK.push(k); };

    const N = s.radii;
    const ang = Array.from({ length: N }, (_, k) => (k / N) * Math.PI * 2 + (rand() - 0.5) * (Math.PI * 2 / N) * 0.35);
    // frame polygon, slightly irregular, a little outside the capture area; anchors beyond it
    const F = s.frameSides, off = rand() * Math.PI;
    const fv = Array.from({ length: F }, (_, j) => { const b = off + (j / F) * Math.PI * 2 + (rand() - 0.5) * 0.25; const r = s.R * (1.2 + (rand() - 0.5) * 0.12); return [Math.cos(b) * r, Math.sin(b) * r]; });

    const center = addNode(0, 0, KIND.hub);
    this.ringR = [s.hub * 0.45, s.hub];
    const radNodes: number[][] = Array.from({ length: N }, () => []);
    // hub rings
    const rings = this.ringR.map((r) => ang.map((a) => addNode(Math.cos(a) * r, Math.sin(a) * r, KIND.hub)));
    rings.forEach((ring) => ring.forEach((id, k) => { addSpring(id, ring[(k + 1) % N], KIND.hub); radNodes[k].push(id); }));
    for (let k = 0; k < N; k++) addSpring(center, rings[0][k], KIND.radial);
    // capture spiral crossings, sorted by spiral angle φ
    const rin = s.hub + s.free;
    const cross: { phi: number; k: number; r: number; id: number }[] = [];
    for (let k = 0; k < N; k++) {
      const a = ((ang[k] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      for (let t = 0; ; t++) {
        const phi = a + t * Math.PI * 2, r = rin + (s.spacing * phi) / (Math.PI * 2);
        if (r > s.R) break;
        cross.push({ phi, k, r, id: -1 });
      }
    }
    cross.sort((p, q) => p.phi - q.phi);
    for (const c of cross) { c.id = addNode(Math.cos(ang[c.k]) * c.r, Math.sin(ang[c.k]) * c.r, KIND.spiral); }
    // radial order along each radius
    for (let k = 0; k < N; k++) {
      const list = cross.filter((c) => c.k === k).sort((p, q) => p.r - q.r).map((c) => c.id);
      radNodes[k].push(...list);
    }
    // frame: where each radius meets the polygon
    const frameOnEdge: { j: number; tpar: number; id: number }[] = [];
    for (let k = 0; k < N; k++) {
      const dx = Math.cos(ang[k]), dy = Math.sin(ang[k]);
      for (let j = 0; j < F; j++) {
        const [x1, y1] = fv[j], [x2, y2] = fv[(j + 1) % F];
        const ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const tr = (x1 * ey - y1 * ex) / den, tp = (x1 * dy - y1 * dx) / den;
        if (tr > 0 && tp >= 0 && tp <= 1) {
          const id = addNode(dx * tr, dy * tr, KIND.frame);
          radNodes[k].push(id);
          frameOnEdge.push({ j, tpar: tp, id });
          break;
        }
      }
    }
    const fvId = fv.map(([x, y]) => addNode(x, y, KIND.frame));
    for (let j = 0; j < F; j++) {
      const on = frameOnEdge.filter((e) => e.j === j).sort((p, q) => p.tpar - q.tpar).map((e) => e.id);
      const chain = [fvId[j], ...on, fvId[(j + 1) % F]];
      for (let i = 0; i + 1 < chain.length; i++) addSpring(chain[i], chain[i + 1], KIND.frame);
      // two anchor threads per frame corner, spreading to fixed points (twigs, a wall)
      const [x, y] = fv[j], r = Math.hypot(x, y), u = [x / r, y / r];
      for (const sg of [-1, 1]) {
        const ax = x + (u[0] * 0.55 - u[1] * 0.18 * sg) * s.R, ay = y + (u[1] * 0.55 + u[0] * 0.18 * sg) * s.R;
        addSpring(fvId[j], addNode(ax, ay, KIND.anchor, true), KIND.anchor);
      }
    }
    // radial threads: hub ring → spiral crossings → frame
    for (let k = 0; k < N; k++) {
      const list = radNodes[k];
      for (let i = 1; i < list.length; i++) addSpring(list[i - 1], list[i], KIND.radial);
    }
    this.radialNodes = radNodes;
    // capture spiral, split into s.sub pieces with droplet-laden nodes between
    const spiralIds: number[] = cross.map((c) => c.id);
    for (let i = 0; i + 1 < cross.length; i++) {
      const p = cross[i], q = cross[i + 1];
      if (q.phi - p.phi > (2 * Math.PI) / N * 2.2) continue; // gap: missing radius
      let prev = p.id;
      for (let u = 1; u < s.sub; u++) {
        const f = u / s.sub;
        const phi = p.phi + (q.phi - p.phi) * f, r = rin + (s.spacing * phi) / (Math.PI * 2);
        // the chord between the two crossings, bowed slightly toward the spiral's arc
        const cx = P[p.id * 3] + (P[q.id * 3] - P[p.id * 3]) * f, cy = P[p.id * 3 + 1] + (P[q.id * 3 + 1] - P[p.id * 3 + 1]) * f;
        const ax = Math.cos(phi) * r, ay = Math.sin(phi) * r;
        const mid = addNode(cx * 0.6 + ax * 0.4, cy * 0.6 + ay * 0.4, KIND.spiral);
        spiralIds.push(mid);
        addSpring(prev, mid, KIND.spiral); prev = mid;
      }
      addSpring(prev, q.id, KIND.spiral);
    }
    this.spiralNodes = spiralIds;

    // defects: remove radial and spiral segments at random (never the frame or anchors)
    const keep = SK.map((k) => !((k === KIND.radial || k === KIND.spiral) && rand() < s.defects));

    // ---- pack into typed arrays ----
    const n = kindN.length, ns = SA.length;
    this.n = n; this.ns = ns;
    this.pos = Float64Array.from(P); this.vel = new Float64Array(n * 3); this.frc = new Float64Array(n * 3);
    this.rest = Float32Array.from(P);
    this.fixed = Uint8Array.from(fixed); this.nodeKind = Uint8Array.from(kindN);
    this.a = Int32Array.from(SA); this.b = Int32Array.from(SB); this.kind = Uint8Array.from(SK);
    this.L0 = new Float64Array(ns); this.area = new Float64Array(ns);
    this.emax = new Float64Array(ns); this.eset = new Float64Array(ns); this.broken = new Uint8Array(ns);
    this.Lp = new Float64Array(ns); this.work = new Float64Array(ns); this.load = new Float32Array(ns); this.fprev = new Float64Array(ns);
    const drag = new Float64Array(n);
    const dia = [s.dRadial ?? THREAD_D.radial, s.dSpiral ?? THREAD_D.spiral, THREAD_D.frame, THREAD_D.anchor, THREAD_D.hub];
    const mad = FIBRES.araneus, visc = FIBRES.viscid;
    this.laws = [lawParams(mad, s.radialLaw), lawParams(s.spiralLaw === "viscid" ? visc : mad, s.spiralLaw), lawParams(mad, "silk")];
    this.lawOf = new Uint8Array(ns);
    this.Wtab = this.laws.map((l) => energyTable(l));
    const mass = new Float64Array(n), ksum = new Float64Array(n);
    for (let i = 0; i < ns; i++) {
      const ia = SA[i], ib = SB[i], k = SK[i];
      const L = Math.hypot(P[ib * 3] - P[ia * 3], P[ib * 3 + 1] - P[ia * 3 + 1]);
      this.L0[i] = L / (1 + PRESTRAIN[k]);
      const d = dia[k] * 1e-6; this.area[i] = (Math.PI * d * d) / 4;
      this.lawOf[i] = k === KIND.radial ? 0 : k === KIND.spiral ? 1 : 2;
      this.Lp[i] = L;
      if (!keep[i]) { this.broken[i] = 2; continue; }
      const m = RHO * this.area[i] * this.L0[i];
      mass[ia] += m / 2; mass[ib] += m / 2;
      // air drag per metre of thread; glue droplets on the capture spiral add a little
      const cd = AIR_DRAG * this.L0[i] ;
      drag[ia] += cd / 2; drag[ib] += cd / 2;
      const kk = (maxTangent(this.laws[this.lawOf[i]]) * this.area[i]) / this.L0[i];
      ksum[ia] += kk; ksum[ib] += kk;
    }
    // selective mass scaling: at least 1 µg, and enough that the stiffest node is stable at DT
    for (let i = 0; i < n; i++) mass[i] = Math.max(mass[i] + (kindN[i] === KIND.spiral ? 2e-10 : 0), 1e-9, ksum[i] * DT * DT * 2);
    this.mass = mass; this.drag = drag;
    this.settle();
  }

  /** Let the pre-tensioned web find its shape, with heavy damping, before anything touches it. */
  settle() {
    // settle under its own pre-tension and weight, heavily damped, so nothing moves once it starts
    const d = this.damping; this.damping = 900;
    for (let i = 0; i < 3200; i++) this.step(DT);
    this.damping = d;
    this.vel.fill(0); this.t = 0; this.work.fill(0); this.workByKind = [0, 0, 0, 0, 0]; this.airLoss = 0; this.stop = null;
    this.emax.fill(0); this.eset.fill(0);
    for (let i = 0; i < this.ns; i++) { this.Lp[i] = this.len(i); this.fprev[i] = this.force(i); }
    this.rest = Float32Array.from(this.pos);
    this.brokenCount = 0; this.brokenLog = [];
    this.stored0 = 0; this.stored0 = this.energies().stored;
  }

  /** Tension in segment i on its current branch (N). */
  force(i: number) {
    if (this.broken[i]) return 0;
    const e = this.len(i) / this.L0[i] - 1, p = this.laws[this.lawOf[i]];
    return branch(p, e, this.emax[i], this.eset[i]) * this.area[i];
  }
  len(i: number) {
    const p = this.pos, a = this.a[i] * 3, b = this.b[i] * 3;
    return Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]);
  }

  /** Mass of the web in mg (real silk plus the solver's added mass). */
  get webMg() { let m = 0; for (let i = 0; i < this.n; i++) if (!this.fixed[i]) m += this.mass[i]; return m * 1e6; }

  /** Throw prey at the web: mass kg, radius m, at (x, y), speed m/s, from in front (+z). */
  launch(m: number, r: number, x: number, y: number, speed: number) {
    this.pull = null;
    this.prey = { m, r, pos: [x, y, r + 0.03], vel: [0, 0, -speed], on: true, att: [], off: [], ke0: 0.5 * m * speed * speed, zMin: 0, slowFor: 0 };
    this.outcome = "flying";
  }

  /** Pull one node out of the web plane at a steady speed, like a needle on a radial thread. */
  startPull(node: number, speed = 0.4) {
    this.prey = null; this.outcome = "none";
    this.pull = { node, dir: [0, 0, 1], speed, d: 0, F: 0, on: true, trace: [] };
  }

  /** Cut every unbroken segment touching a node (or the one segment nearest a point). */
  cutNear(x: number, y: number, z = 0) {
    let best = -1, bd = Infinity;
    const p = this.pos;
    for (let i = 0; i < this.ns; i++) {
      if (this.broken[i]) continue;
      const a = this.a[i] * 3, b = this.b[i] * 3;
      const mx = (p[a] + p[b]) / 2, my = (p[a + 1] + p[b + 1]) / 2, mz = (p[a + 2] + p[b + 2]) / 2;
      const d = (mx - x) ** 2 + (my - y) ** 2 + (mz - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0 && this.kind[best] !== KIND.anchor) { this.broken[best] = 3; this.brokenCount++; this.brokenLog.push({ i: best, t: this.t }); }
    return best;
  }

  nearestNode(x: number, y: number, z = 0, kinds?: number[]) {
    let best = -1, bd = Infinity; const p = this.pos;
    for (let i = 0; i < this.n; i++) {
      if (this.fixed[i] || (kinds && !kinds.includes(this.nodeKind[i]))) continue;
      const d = (p[i * 3] - x) ** 2 + (p[i * 3 + 1] - y) ** 2 + (p[i * 3 + 2] - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  step(dt: number) {
    const { pos, vel, frc, mass, fixed, a, b, L0, area, broken, emax, eset, Lp, work, load, lawOf, laws, fprev, drag } = this;
    const n = this.n, ns = this.ns;
    frc.fill(0);
    for (let i = 0; i < ns; i++) {
      if (broken[i]) continue;
      const ia = a[i] * 3, ib = b[i] * 3;
      const dx = pos[ib] - pos[ia], dy = pos[ib + 1] - pos[ia + 1], dz = pos[ib + 2] - pos[ia + 2];
      const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-12;
      const e = L / L0[i] - 1;
      const p = laws[lawOf[i]];
      let sig = 0;
      if (e > 0) {
        if (e >= emax[i]) {
          sig = law(p, e);
          emax[i] = e;
          if (e > p.ef) { broken[i] = 1; this.brokenCount++; this.brokenLog.push({ i, t: this.t }); load[i] = 0; fprev[i] = 0; continue; }
        } else {
          // unloading or reloading below the previous maximum
          const em = emax[i];
          if (p.hyst && em > (p.law === "viscid" ? 0.9 : p.ey * 0.5)) {
            if (eset[i] <= 0 || eset[i] >= em) eset[i] = setStrain(p, em, this.Wtab[lawOf[i]]);
            const es = eset[i];
            sig = e <= es ? 0 : law(p, em) * (e - es) / (em - es);
          } else sig = law(p, e);
        }
      }
      const f = sig * area[i];
      load[i] = sig / p.sf;
      const k = f / L;
      frc[ia] += k * dx; frc[ia + 1] += k * dy; frc[ia + 2] += k * dz;
      frc[ib] -= k * dx; frc[ib + 1] -= k * dy; frc[ib + 2] -= k * dz;
      // work done on the thread this step, trapezoidal so jitter does not bias it
      const dw = 0.5 * (f + fprev[i]) * (L - Lp[i]); work[i] += dw; this.workByKind[this.kind[i]] += dw; Lp[i] = L; fprev[i] = f;
    }
    // prey: sticky sphere
    const pr = this.prey;
    if (pr && pr.on) {
      let fx = 0, fy = 0, fz = 0, mAtt = 0;
      for (let j = 0; j < pr.att.length; j++) { const i = pr.att[j] * 3; fx += frc[i]; fy += frc[i + 1]; fz += frc[i + 2]; mAtt += mass[pr.att[j]]; }
      const M = pr.m + mAtt;
      // the prey's own air drag, ½ ρ Cd A v² with Cd ≈ 1
      const sp = Math.hypot(pr.vel[0], pr.vel[1], pr.vel[2]), cdA = 0.5 * 1.2 * Math.PI * pr.r * pr.r * sp;
      fx -= cdA * pr.vel[0]; fy -= cdA * pr.vel[1]; fz -= cdA * pr.vel[2];
      pr.vel[0] += (fx / M) * dt; pr.vel[1] += (fy / M - this.g) * dt; pr.vel[2] += (fz / M) * dt;
      pr.pos[0] += pr.vel[0] * dt; pr.pos[1] += pr.vel[1] * dt; pr.pos[2] += pr.vel[2] * dt;
    }
    // nodes
    const g = this.g, num = this.damping * dt;
    let air = 0;
    for (let i = 0; i < n; i++) {
      if (fixed[i]) continue;
      const j = i * 3, im = dt / mass[i];
      // air drag taken implicitly, so it can never destabilise the step
      const c = 1 / (1 + drag[i] * im + num);
      vel[j] = (vel[j] + frc[j] * im) * c;
      vel[j + 1] = (vel[j + 1] + frc[j + 1] * im - g * dt) * c;
      vel[j + 2] = (vel[j + 2] + frc[j + 2] * im) * c;
      air += drag[i] * (vel[j] * vel[j] + vel[j + 1] * vel[j + 1] + vel[j + 2] * vel[j + 2]);
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
    }
    if (!num) this.airLoss += air * dt;
    if (pr && pr.on) {
      // attached nodes ride with the prey
      for (let j = 0; j < pr.att.length; j++) {
        const i = pr.att[j] * 3;
        pos[i] = pr.pos[0] + pr.off[j * 3]; pos[i + 1] = pr.pos[1] + pr.off[j * 3 + 1]; pos[i + 2] = pr.pos[2] + pr.off[j * 3 + 2];
        vel[i] = pr.vel[0]; vel[i + 1] = pr.vel[1]; vel[i + 2] = pr.vel[2];
      }
    }
    // pulled node
    const pl = this.pull;
    if (pl && pl.on) {
      const i = pl.node * 3;
      pl.F = -(frc[i] * pl.dir[0] + frc[i + 1] * pl.dir[1] + frc[i + 2] * pl.dir[2]);
      pl.d += pl.speed * dt;
      pos[i] = this.rest[i] + pl.dir[0] * pl.d; pos[i + 1] = this.rest[i + 1] + pl.dir[1] * pl.d; pos[i + 2] = this.rest[i + 2] + pl.dir[2] * pl.d;
      vel[i] = vel[i + 1] = vel[i + 2] = 0;
    }
    this.t += dt;
  }

  /** Capture: any thread the prey's body touches sticks to it (glue). Junctions inside the body stick
      directly; a thread touched between junctions sticks by its nearer end. Run every few steps. */
  capture() {
    const pr = this.prey; if (!pr || !pr.on) return;
    const p = this.pos, cx = pr.pos[0], cy = pr.pos[1], cz = pr.pos[2];
    const reach = pr.r + 0.0012, r2 = reach * reach;
    const has = new Set(pr.att);
    const stick = (i: number) => { if (this.fixed[i] || has.has(i)) return; has.add(i); pr.att.push(i); pr.off.push(p[i * 3] - cx, p[i * 3 + 1] - cy, p[i * 3 + 2] - cz); };
    for (let i = 0; i < this.n; i++) {
      const dx = p[i * 3] - cx, dy = p[i * 3 + 1] - cy, dz = p[i * 3 + 2] - cz;
      if (dx * dx + dy * dy + dz * dz < r2) stick(i);
    }
    for (let i = 0; i < this.ns; i++) {
      if (this.broken[i] || this.kind[i] === KIND.anchor) continue;
      const a = this.a[i] * 3, b = this.b[i] * 3;
      const ex = p[b] - p[a], ey = p[b + 1] - p[a + 1], ez = p[b + 2] - p[a + 2];
      const wx = cx - p[a], wy = cy - p[a + 1], wz = cz - p[a + 2];
      const L2 = ex * ex + ey * ey + ez * ez || 1e-12;
      const t = Math.max(0, Math.min(1, (wx * ex + wy * ey + wz * ez) / L2));
      const qx = wx - ex * t, qy = wy - ey * t, qz = wz - ez * t;
      if (qx * qx + qy * qy + qz * qz < r2) stick(t < 0.5 ? this.a[i] : this.b[i]);
    }
  }

  /** Advance by `simTime` seconds of physics. Returns the number of steps taken. */
  advance(simTime: number) {
    const steps = Math.max(1, Math.round(simTime / DT));
    for (let s = 0; s < steps; s++) {
      if (s % 4 === 0) this.capture();
      this.step(DT);
    }
    this.judge();
    if (this.pull && this.pull.on) {
      this.pull.trace.push([this.pull.d, this.pull.F]);
      // stop once the pulled node has torn free (no force for a while after a peak)
      const tr = this.pull.trace, peak = tr.reduce((m, x) => Math.max(m, x[1]), 0);
      if (this.pull.d > 0.01 && peak > 0 && this.pull.F < peak * 0.02) this.pull.on = false;
      if (this.pull.d > 0.2) this.pull.on = false;
    }
    return steps;
  }

  private judge() {
    const pr = this.prey; if (!pr || !pr.on) return;
    pr.zMin = Math.min(pr.zMin, pr.pos[2]);
    const sp = Math.hypot(pr.vel[0], pr.vel[1], pr.vel[2]);
    // tethered: does any attached node still have an unbroken thread?
    let tied = false;
    if (pr.att.length) {
      const att = new Set(pr.att);
      for (let i = 0; i < this.ns && !tied; i++) if (!this.broken[i] && (att.has(this.a[i]) !== att.has(this.b[i]))) tied = true;
    }
    if (pr.att.length === 0 && pr.pos[2] < -pr.r * 3) { this.outcome = "slipped"; return; }
    if (pr.pos[2] < -this.spec.R * 1.2 || (pr.att.length > 0 && !tied && pr.pos[2] < -0.01)) { this.outcome = "through"; pr.on = false; return; }
    // stopped: still tethered, and the web has turned it round (what high-speed films measure)
    if (pr.att.length && tied && pr.vel[2] >= 0) {
      if (!this.stop) this.stop = { t: this.t, z: pr.zMin };
      this.outcome = "caught";
    }
    void sp;
  }

  /** Where the energy is now (J): elastic energy stored in threads, energy lost in threads (hysteresis
      and the snap of broken ones), air drag, and motion of the web. */
  energies() {
    let stored = 0, work = 0, webKE = 0;
    for (let i = 0; i < this.ns; i++) {
      work += this.work[i];
      if (this.broken[i]) continue;
      const p = this.laws[this.lawOf[i]], L = this.len(i), e = L / this.L0[i] - 1;
      const W = this.Wtab[this.lawOf[i]];
      const vol = this.area[i] * this.L0[i];
      let u: number;
      if (e <= 0) u = 0;
      else if (e >= this.emax[i] || this.eset[i] <= 0) u = tableAt(W, e, p.ef);
      else u = e <= this.eset[i] ? 0 : 0.5 * branch(p, e, this.emax[i], this.eset[i]) * (e - this.eset[i]);
      // energy relative to the settled, pre-tensioned web
      stored += u * vol;
    }
    for (let i = 0; i < this.n; i++) if (!this.fixed[i]) webKE += 0.5 * this.mass[i] * (this.vel[i * 3] ** 2 + this.vel[i * 3 + 1] ** 2 + this.vel[i * 3 + 2] ** 2);
    return { stored: stored - this.stored0, threadLoss: Math.max(0, work - (stored - this.stored0)), air: this.airLoss, webKE };
  }
  stored0 = 0;

  /** Prey kinetic energy now (J). */
  get preyKE() { const p = this.prey; return p ? 0.5 * p.m * (p.vel[0] ** 2 + p.vel[1] ** 2 + p.vel[2] ** 2) : 0; }
  /** Peak stress fraction (σ/σf) by kind, right now. */
  peakLoad(kind: number) { let m = 0; for (let i = 0; i < this.ns; i++) if (!this.broken[i] && this.kind[i] === kind) m = Math.max(m, this.load[i]); return m; }
  brokenByKind() { const c = [0, 0, 0, 0, 0]; for (let i = 0; i < this.ns; i++) if (this.broken[i] === 1 || this.broken[i] === 3) c[this.kind[i]]++; return c; }
  /** Share of web junctions still connected to an anchor (how much of the web still works). */
  intactShare() {
    const adj: number[][] = Array.from({ length: this.n }, () => []);
    for (let i = 0; i < this.ns; i++) if (!this.broken[i]) { adj[this.a[i]].push(this.b[i]); adj[this.b[i]].push(this.a[i]); }
    const seen = new Uint8Array(this.n); const q: number[] = [];
    for (let i = 0; i < this.n; i++) if (this.fixed[i]) { seen[i] = 1; q.push(i); }
    while (q.length) { const u = q.pop()!; for (const v of adj[u]) if (!seen[v]) { seen[v] = 1; q.push(v); } }
    let live = 0, tot = 0;
    for (let i = 0; i < this.n; i++) if (!this.fixed[i]) { tot++; if (seen[i]) live++; }
    return live / Math.max(1, tot);
  }
}

export const DT = 5e-6;
/** Lamb (1911) drag per unit length on a thin cylinder at low Reynolds number, for a 3 µm thread at ~1 m/s. */
export const AIR_DRAG = 6e-5;

/** Stress on the current branch: the loading curve, or the unloading line below a previous maximum. */
function branch(p: LawParams, e: number, em: number, es: number) {
  if (e <= 0) return 0;
  if (e >= em || !p.hyst || em <= (p.law === "viscid" ? 0.9 : p.ey * 0.5) || es <= 0) return law(p, e);
  return e <= es ? 0 : (law(p, em) * (e - es)) / (em - es);
}

function law(p: LawParams, e: number): number {
  if (p.law === "linear") return (p.sf / p.ef) * e;
  if (p.law === "viscid") { const r = e / p.ef, r2 = r * r, r4 = r2 * r2; return p.E * e + (p.sf - p.E * p.ef) * r4 * r4; }
  if (p.law === "plastic") return e < p.ey ? p.E * e : p.E * p.ey;
  if (e < p.ey) return p.E * e;
  const x = e - p.ey;
  return p.E * p.ey + p.E2 * x + p.C * x * x * x;
}
function tableAt(W: Float64Array, e: number, ef: number) {
  const f = Math.min(W.length - 1, (e / ef) * (W.length - 1)), i = Math.floor(f);
  return W[i] + (W[Math.min(W.length - 1, i + 1)] - W[i]) * (f - i);
}
/** Cumulative energy density along the loading curve, sampled to failure. */
function energyTable(p: LawParams) {
  const n = 256, t = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) { const e0 = ((i - 1) / n) * p.ef, e1 = (i / n) * p.ef; t[i] = t[i - 1] + 0.5 * (law(p, e0) + law(p, e1)) * (e1 - e0); }
  return t;
}
/** The stiffest the law ever gets (loading tangent or unloading line), Pa: sets the solver's stable mass. */
function maxTangent(p: LawParams) {
  if (p.law === "linear") return p.sf / p.ef;
  if (p.law === "viscid") return p.E + (8 * (p.sf - p.E * p.ef)) / p.ef;
  if (p.law === "plastic") return p.E;
  const x = p.ef - p.ey;
  return Math.max(p.E, p.E2 + 3 * p.C * x * x);
}
/** Permanent set after loading to em: unloading straight to it returns 35% of the energy (65% lost),
    but the unloading line is never steeper than the law's stiffest tangent (silk unloads at about its
    initial modulus), so at small strains less than 65% is lost. */
function setStrain(p: LawParams, em: number, W: Float64Array) {
  const s = law(p, em);
  if (s <= 0) return 0;
  if (p.law === "plastic") return Math.max(0, em - s / p.E);
  const f = Math.min(W.length - 1, (em / p.ef) * (W.length - 1)), i = Math.floor(f);
  const w = W[i] + (W[Math.min(W.length - 1, i + 1)] - W[i]) * (f - i);
  const cap = p.law === "viscid" ? maxTangent(p) : p.E;
  const es = em - (2 * 0.35 * w) / s;
  return Math.max(0, Math.min(es, em - s / cap));
}
