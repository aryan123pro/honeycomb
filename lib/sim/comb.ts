/* Bees without a blueprint.

   Each cell is a point (where a bee starts excavating) inside a frame. Its territory is everything closer
   to it than to any other cell: a Voronoi cell, which is exactly where walls end up when neighbours dig
   toward each other and meet. One local rule repeated by every cell, "move toward the middle of your own
   space", is Lloyd's relaxation; started from random points it settles into hexagons. No cell knows
   the pattern.

   This is a stand-in for the attach–excavate rule of Narumi et al. (2018, PLOS ONE 13, e0205353): both are
   local rules, both end in hexagons. The circle-to-hexagon "melt" follows Pirk et al. (2004) and Karihaloo
   et al. (2013): cells start round; warm wax flows and the walls pull straight at the junctions.

   Wax accounting: wall length per cell, shared walls counted once, divided by √(area) so cells of any
   size compare. The regular hexagon's 1.861 is the minimum (Hales 1999, the Honeycomb Conjecture). */

export type Pt = [number, number];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; };
}

/** Clip a convex polygon by the half-plane of points closer to p than to q. */
function clip(poly: Pt[], p: Pt, q: Pt): Pt[] {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[0] - p[0], ny = q[1] - p[1];
  const side = (v: Pt) => (v[0] - mx) * nx + (v[1] - my) * ny; // ≤ 0 keeps
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa <= 0) !== (sb <= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
export const area = (poly: Pt[]) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
export function centroid(poly: Pt[]): Pt {
  let cx = 0, cy = 0, A = 0;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], c = a[0] * b[1] - b[0] * a[1]; A += c; cx += (a[0] + b[0]) * c; cy += (a[1] + b[1]) * c; }
  A /= 2; return A ? [cx / (6 * A), cy / (6 * A)] : poly[0];
}

export interface Cell { site: Pt; poly: Pt[]; sides: number; interior: boolean; nb: number[] }

export class Comb {
  sites: Pt[] = [];
  cells: Cell[] = [];
  W: number; H: number;
  iter = 0;
  private rand: () => number;
  constructor(W: number, H: number, n: number, seed = 3) {
    this.W = W; this.H = H; this.rand = rng(seed);
    this.scatter(n);
  }
  /** Random starting points with a little spacing (no two bees on top of each other). */
  scatter(n: number) {
    const pts: Pt[] = [], r = this.rand, minD = Math.sqrt((this.W * this.H) / n) * 0.35;
    let tries = 0;
    while (pts.length < n && tries < n * 60) {
      tries++;
      const p: Pt = [(r() - 0.5) * this.W * 0.98, (r() - 0.5) * this.H * 0.98];
      if (pts.every((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 > minD * minD)) pts.push(p);
    }
    this.sites = pts; this.iter = 0; this.voronoi();
  }
  /** Place one new cell in the biggest gap at the growing edge (bees extend the comb downward). */
  add(at?: Pt) {
    const p: Pt = at ?? [(this.rand() - 0.5) * this.W * 0.9, -this.H / 2 + this.rand() * this.H * 0.12];
    this.sites.push(p); this.voronoi();
  }
  voronoi() {
    const hw = this.W / 2, hh = this.H / 2;
    const box: Pt[] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    const S = this.sites, n = S.length;
    const reach = Math.sqrt((this.W * this.H) / Math.max(1, n)) * 3.2;
    this.cells = S.map((p, i) => {
      let poly = box;
      const nb: number[] = [];
      // nearest first, so the polygon shrinks fast; skip sites too far to matter
      const order = S.map((q, j) => [j, (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2] as [number, number]).filter(([j, d]) => j !== i && d < reach * reach).sort((a, b) => a[1] - b[1]);
      for (const [j] of order) { poly = clip(poly, p, S[j]); nb.push(j); }
      const interior = poly.every((v) => Math.abs(v[0]) < hw - 1e-6 && Math.abs(v[1]) < hh - 1e-6);
      return { site: p, poly, sides: poly.length, interior, nb };
    });
    // true neighbours share an edge: keep only those whose bisector produced an edge
    for (const c of this.cells) c.sides = dedupe(c.poly).length;
  }
  /** One round of the local rule: every cell steps toward the centre of its own space. */
  relax(rate = 1) {
    this.sites = this.cells.map((c) => { const g = centroid(c.poly); return [c.site[0] + (g[0] - c.site[0]) * rate, c.site[1] + (g[1] - c.site[1]) * rate] as Pt; });
    this.iter++;
    this.voronoi();
  }
  stats() {
    const inner = this.cells.filter((c) => c.interior && c.poly.length > 2);
    const hex = inner.filter((c) => c.sides === 6).length;
    let ratio = 0;
    for (const c of inner) { const P = perim(c.poly); ratio += P / 2 / Math.sqrt(Math.abs(area(c.poly))); }
    const sizes = inner.map((c) => Math.abs(area(c.poly)));
    const mean = sizes.reduce((a, b) => a + b, 0) / Math.max(1, sizes.length);
    const cv = Math.sqrt(sizes.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, sizes.length)) / (mean || 1);
    return { n: this.cells.length, inner: inner.length, hexShare: inner.length ? hex / inner.length : 0, wall: inner.length ? ratio / inner.length : 0, sizeCV: cv };
  }
}

function dedupe(poly: Pt[]) {
  const out: Pt[] = [];
  for (const p of poly) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) out.push(p); }
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-6) out.pop();
  // drop near-collinear vertices so a hexagon with a tiny extra edge still counts as six-sided
  const res: Pt[] = [];
  for (let i = 0; i < out.length; i++) {
    const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const cross = Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) / (l1 * l2 || 1);
    if (cross > 0.06 && Math.min(l1, l2) > 1e-4) res.push(b);
  }
  return res;
}
export const perim = (poly: Pt[]) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };

/** A rounded version of a polygon, inset by half a wall: r = 0 is sharp, r = 1 as round as it can get.
    Returns the outline points (for a hole in the wax). */
export function roundedInset(poly: Pt[], halfWall: number, round: number, seg = 5): Pt[] {
  const P = dedupe(poly);
  const n = P.length; if (n < 3) return [];
  // inset each edge by halfWall
  const lines = P.map((a, i) => {
    const b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L; // inward for counter-clockwise polygons
    return { a: [a[0] + nx * halfWall, a[1] + ny * halfWall] as Pt, d: [dx / L, dy / L] as Pt };
  });
  const inter = (l1: (typeof lines)[0], l2: (typeof lines)[0]): Pt => {
    const den = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0];
    if (Math.abs(den) < 1e-9) return l2.a;
    const t = ((l2.a[0] - l1.a[0]) * l2.d[1] - (l2.a[1] - l1.a[1]) * l2.d[0]) / den;
    return [l1.a[0] + l1.d[0] * t, l1.a[1] + l1.d[1] * t];
  };
  const V = P.map((_, i) => inter(lines[(i - 1 + n) % n], lines[i]));
  if (area(V) <= 0) return [];
  // the largest round corner: the inscribed radius of the inset cell
  const c = centroid(V);
  let rin = Infinity;
  for (let i = 0; i < n; i++) { const a = V[i], b = V[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; rin = Math.min(rin, Math.abs((b[0] - a[0]) * (a[1] - c[1]) - (a[0] - c[0]) * (b[1] - a[1])) / L); }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = V[(i - 1 + n) % n], b = V[i], cc = V[(i + 1) % n];
    const u: Pt = [a[0] - b[0], a[1] - b[1]], v: Pt = [cc[0] - b[0], cc[1] - b[1]];
    const lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
    const half = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv)))) / 2;
    // radius limited so tangent points stay on each edge's half
    const rMax = Math.min(lu, lv) * 0.5 * Math.tan(half);
    const r = Math.min(round * rin, rMax);
    const tdist = r / Math.tan(half);
    const p1: Pt = [b[0] + (u[0] / lu) * tdist, b[1] + (u[1] / lu) * tdist], p2: Pt = [b[0] + (v[0] / lv) * tdist, b[1] + (v[1] / lv) * tdist];
    if (r < 1e-7) { out.push(b); continue; }
    // centre of the corner circle along the bisector
    const bis: Pt = [u[0] / lu + v[0] / lv, u[1] / lu + v[1] / lv], bl = Math.hypot(bis[0], bis[1]) || 1;
    const dc = r / Math.sin(half);
    const o: Pt = [b[0] + (bis[0] / bl) * dc, b[1] + (bis[1] / bl) * dc];
    let a1 = Math.atan2(p1[1] - o[1], p1[0] - o[0]), a2 = Math.atan2(p2[1] - o[1], p2[0] - o[0]);
    let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= seg; k++) { const t = a1 + (da * k) / seg; out.push([o[0] + Math.cos(t) * r, o[1] + Math.sin(t) * r]); }
  }
  return out;
}
