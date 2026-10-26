/* Canvas charting shared by every model. Colours match the CSS tokens (wax on olive, silk on charcoal). */

export const INK = "#f3efd6", MUTED = "#c4bfa2", FAINT = "#8a8770", GRID = "rgba(243,239,214,.08)";
export const HONEY = "#f2b134", WAX = "#f6e7a8", AMBER = "#e8862a", SILK = "#e8e4d6", DEW = "#9fd8ff", STEEL = "#8b93a6";
export const GOOD = "#8fe3a0", BAD = "#ff6b4a", WARN = "#ffc457", LEAF = "#c6f08a", ROSE = "#ff8fb1";

let mono = "";
/** next/font renames families, so read the real one from the CSS variable. */
export function monoFamily() {
  if (!mono) mono = (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "ui-monospace") + ", ui-monospace, monospace";
  return mono;
}

export function setupCanvas(cv: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 300, h = cv.clientHeight || 150;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export interface Series { data: ArrayLike<number>; xs: ArrayLike<number>; color?: string; width?: number; fill?: string; dash?: number[]; dots?: boolean }
export interface PlotOpts {
  x: [number, number]; y: [number, number]; xlabel?: string; ylabel?: string; logx?: boolean; logy?: boolean;
  series?: Series[]; markers?: { x: number; label?: string; color?: string; row?: number }[];
  hlines?: { y: number; label?: string; color?: string }[];
  bars?: { x: number; v: number; w: number; color: string; label?: string; err?: number; base?: number }[];
  points?: { x: number; y: number; color: string; r?: number; label?: string; ring?: boolean }[];
  xticks?: number[]; yticks?: number[]; yfmt?: (v: number) => string; xfmt?: (v: number) => string; padL?: number;
  bands?: { x0: number; x1: number; color: string; label?: string }[];
  /** a dot riding a curve: the live state of a model */
  cursor?: { x: number; y: number; color: string };
}

export function plot(cv: HTMLCanvasElement, o: PlotOpts) {
  const { ctx, w, h } = setupCanvas(cv);
  const pad = { l: o.padL ?? 46, r: 14, t: 14, b: o.xlabel ? 38 : 24 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const xr = o.x, yr = o.y;
  const tx = (v: number) => (o.logx ? Math.log10(v) : v), ty = (v: number) => (o.logy ? Math.log10(v) : v);
  const X = (v: number) => pad.l + ((tx(v) - tx(xr[0])) / (tx(xr[1]) - tx(xr[0]))) * pw;
  const Y = (v: number) => pad.t + ph - ((ty(v) - ty(yr[0])) / (ty(yr[1]) - ty(yr[0]))) * ph;
  ctx.clearRect(0, 0, w, h);
  ctx.font = "10px " + monoFamily();
  for (const b of o.bands || []) {
    ctx.fillStyle = b.color; ctx.fillRect(X(b.x0), pad.t, X(b.x1) - X(b.x0), ph);
    if (b.label) { ctx.fillStyle = MUTED; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(b.label, (X(b.x0) + X(b.x1)) / 2, pad.t + 4); }
  }
  const xt = o.xticks || [], yt = o.yticks || [];
  ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.fillStyle = FAINT;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  xt.forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v) + 0.5, pad.t); ctx.lineTo(X(v) + 0.5, pad.t + ph); ctx.stroke(); ctx.fillText(o.xfmt ? o.xfmt(v) : String(v), X(v), pad.t + ph + 9); });
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  yt.forEach((v) => { ctx.beginPath(); ctx.moveTo(pad.l, Y(v) + 0.5); ctx.lineTo(pad.l + pw, Y(v) + 0.5); ctx.stroke(); ctx.fillText(o.yfmt ? o.yfmt(v) : String(v), pad.l - 6, Y(v)); });
  if (o.xlabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(o.xlabel, pad.l + pw / 2, h - 2); }
  if (o.ylabel) { ctx.save(); ctx.translate(11, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }

  ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t - 2, pw, ph + 4); ctx.clip();
  const zero = Y(o.logy ? yr[0] : Math.min(Math.max(yr[0], 0), yr[1]));
  for (const b of o.bars || []) {
    const x0 = X(b.x - b.w / 2), x1 = X(b.x + b.w / 2);
    const base = b.base != null ? Y(b.base) : zero;
    ctx.fillStyle = b.color; ctx.fillRect(x0, Math.min(base, Y(b.v)), x1 - x0, Math.abs(base - Y(b.v)));
    if (b.err) { ctx.strokeStyle = INK; ctx.lineWidth = 1; const cx = (x0 + x1) / 2; ctx.beginPath(); ctx.moveTo(cx, Y(b.v - b.err)); ctx.lineTo(cx, Y(b.v + b.err)); ctx.stroke(); }
  }
  for (const sr of o.series || []) {
    const xs = sr.xs, d = sr.data;
    if (!d || !d.length) continue;
    if (sr.fill) {
      ctx.fillStyle = sr.fill; ctx.beginPath(); ctx.moveTo(X(xs[0]), zero);
      for (let k = 0; k < d.length; k++) ctx.lineTo(X(xs[k]), Y(d[k]));
      ctx.lineTo(X(xs[d.length - 1]), zero); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = sr.color || INK; ctx.lineWidth = sr.width || 2; ctx.setLineDash(sr.dash || []); ctx.lineJoin = "round";
    ctx.beginPath();
    for (let m = 0; m < d.length; m++) { const xx = X(xs[m]), yy = Y(d[m]); if (m) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.setLineDash([]);
    if (sr.dots) { ctx.fillStyle = sr.color || INK; for (let m = 0; m < d.length; m++) { ctx.beginPath(); ctx.arc(X(xs[m]), Y(d[m]), 3, 0, 6.3); ctx.fill(); } }
  }
  for (const hl of o.hlines || []) {
    ctx.strokeStyle = hl.color || MUTED; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(hl.y) + 0.5); ctx.lineTo(pad.l + pw, Y(hl.y) + 0.5); ctx.stroke(); ctx.setLineDash([]);
    if (hl.label) { ctx.fillStyle = hl.color || MUTED; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(hl.label, pad.l + 6, Y(hl.y) - 3); }
  }
  for (const p of o.points || []) {
    ctx.fillStyle = p.color; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r ?? 3.5, 0, 6.3); if (p.ring) ctx.stroke(); else ctx.fill();
    if (p.label) { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(p.label, X(p.x) + 7, Y(p.y)); }
  }
  if (o.cursor) {
    const cx = X(o.cursor.x), cy = Y(o.cursor.y);
    ctx.fillStyle = o.cursor.color; ctx.shadowColor = o.cursor.color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.restore();
  for (const mk of o.markers || []) {
    ctx.strokeStyle = mk.color || INK; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(mk.x) + 0.5, pad.t); ctx.lineTo(X(mk.x) + 0.5, pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
    if (mk.label) {
      ctx.fillStyle = mk.color || INK; ctx.textBaseline = "top";
      const t = X(mk.x), right = t > pad.l + pw - 110;
      ctx.textAlign = right ? "right" : "left";
      ctx.fillText(mk.label, t + (right ? -5 : 5), pad.t + 2 + (mk.row || 0) * 14);
    }
  }
  for (const b of o.bars || []) if (b.label) { ctx.fillStyle = MUTED; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(b.label, X(b.x), pad.t + ph + 9); }
  return { X, Y, pad, pw, ph, ctx, w, h };
}

export const range = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const fmt = (v: number, d = 0) => v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
/** Engineering-friendly number: 3 significant figures, no exponent. */
export const sig = (v: number, s = 3) => { if (!isFinite(v)) return "—"; if (v === 0) return "0"; const d = Math.max(0, s - 1 - Math.floor(Math.log10(Math.abs(v)))); return fmt(v, Math.min(6, d)); };
/** Colour ramp for load (0 → 1 of breaking): cool silk, warm, hot. */
export function loadColor(x: number, out: [number, number, number] = [0, 0, 0]) {
  const t = clamp(x, 0, 1);
  // silk grey → honey → red
  const a = [0.78, 0.8, 0.82], b = [0.95, 0.69, 0.2], c = [1.0, 0.25, 0.18];
  if (t < 0.5) { const u = t / 0.5; for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * u; }
  else { const u = (t - 0.5) / 0.5; for (let i = 0; i < 3; i++) out[i] = b[i] + (c[i] - b[i]) * u; }
  return out;
}
/** Signed number with a true minus sign. */
export const sgnFmt = (v: number, d = 2) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d);
