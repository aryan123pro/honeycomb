/* Sound, kept small. Two voices:
   - pluck(f): a plucked string (Karplus–Strong) at the frequency a taut thread really has,
     f = (1/2L)·√(σ/ρ). Spiders read prey from exactly these vibrations (Mortimer et al. 2016).
   - crunch(): a short filtered noise burst, one per fold of a crushing honeycomb wall.
   Browsers need a click before audio; the first toggle creates the AudioContext. */

type Fn = () => void;
class Engine {
  ctx: AudioContext | null = null;
  out: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  on = false;
  private subs = new Set<Fn>();
  private last = 0;
  subscribe(f: Fn) { this.subs.add(f); return () => { this.subs.delete(f); }; }
  private emit() { this.subs.forEach((f) => f()); }
  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const out = ctx.createGain(); out.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    const an = ctx.createAnalyser(); an.fftSize = 2048;
    out.connect(comp); comp.connect(an); an.connect(ctx.destination);
    this.ctx = ctx; this.out = out; this.analyser = an;
    return ctx;
  }
  toggle(v?: boolean) {
    const want = v ?? !this.on;
    if (want) { const c = this.ensure(); if (!c) return; c.resume(); }
    else this.ctx?.suspend();
    this.on = want; this.emit();
  }
  /** A plucked thread at frequency f (Hz), clamped to what speakers can play. */
  pluck(f: number, gain = 0.5, decay = 0.996) {
    if (!this.on || !this.ctx || !this.out) return;
    const ctx = this.ctx, now = ctx.currentTime;
    if (now - this.last < 0.012) return; this.last = now;
    const hz = Math.max(55, Math.min(3500, f));
    const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / hz)), len = Math.round(sr * 1.4);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 0, k = 0; i < len; i++) { const a = ring[k], b = ring[(k + 1) % N]; d[i] = a; ring[k] = decay * 0.5 * (a + b); k = (k + 1) % N; }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(this.out); src.start();
  }
  /** One fold collapsing: a short, low, filtered crackle. */
  crunch(gain = 0.4, tone = 900) {
    if (!this.on || !this.ctx || !this.out) return;
    const ctx = this.ctx, now = ctx.currentTime;
    if (now - this.last < 0.02) return; this.last = now;
    const len = Math.round(ctx.sampleRate * 0.09), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) * (Math.random() < 0.3 ? 1.6 : 0.6);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = tone; bp.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(bp); bp.connect(g); g.connect(this.out); src.start();
  }
  /** A snap: a thread breaking. */
  snap(gain = 0.35) { this.pluck(2600, gain, 0.97); }
}

let engine: Engine | null = null;
export function audio() { if (!engine) engine = new Engine(); return engine; }
