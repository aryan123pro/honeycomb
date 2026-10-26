"use client";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { audio } from "@/lib/audio";
import { plot, type PlotOpts } from "@/lib/plot";
import { store } from "@/lib/site";
import { useShell, useSoundOn } from "./Shell";

/* ---------- steps ---------- */
export function Step({ children }: { title: string; children: ReactNode }) { return <>{children}</>; }

export function Steps({ id, children, next }: { id: string; children: ReactNode; next?: { href: string; label: string } }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ title: string; children: ReactNode }>[];
  const titles = items.map((c) => c.props.title);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { setSteps } = useShell();

  const go = useCallback((i: number, scroll = true) => {
    const k = Math.max(0, Math.min(titles.length - 1, i));
    setActive(k);
    try { history.replaceState(null, "", "#step-" + (k + 1)); } catch { /* ignore */ }
    if (scroll && document.body.classList.contains("story")) window.scrollTo({ top: 0, behavior: "smooth" });
    else if (scroll && barRef.current) {
      const y = barRef.current.getBoundingClientRect().top + window.scrollY - 56;
      if (window.scrollY > y) window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [titles.length]);

  useEffect(() => {
    const read = () => { const m = /#step-(\d+)/.exec(location.hash); if (m) go(+m[1] - 1, false); };
    read();
    setSeen(store<number[]>("seen." + id) || []);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [id, go]);
  useEffect(() => {
    setSeen((s) => { if (s.includes(active)) return s; const n = [...s, active]; store("seen." + id, n); return n; });
    tabRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active, id]);
  // arrow keys live in the Shell, which also carries story mode across pages
  useEffect(() => { setSteps({ titles, go, active }); }, [titles.join("|"), go, active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setSteps(null), [setSteps]);

  const cur = items[active];
  return (
    <>
      <div className="steps-bar" ref={barRef}>
        <div className="wrap" role="tablist" aria-label="Steps">
          {titles.map((t, i) => (
            <button key={t} role="tab" ref={(el) => { tabRefs.current[i] = el; }} aria-selected={i === active} className={seen.includes(i) ? "seen" : ""} onClick={() => go(i)}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>{t}
            </button>
          ))}
        </div>
      </div>
      <main className="wrap">
        <section className="step active" key={active}>
          {cur}
          <div className="stepnav">
            {active > 0 ? <button className="btn ghost" onClick={() => go(active - 1)}>&larr; <span>{titles[active - 1]}</span></button> : <span />}
            {active < titles.length - 1
              ? <button className="btn primary" onClick={() => go(active + 1)}>Next &middot; {titles[active + 1]} &rarr;</button>
              : next ? <Link className="btn primary" href={next.href}>{next.label} &rarr;</Link> : <span />}
          </div>
        </section>
      </main>
    </>
  );
}

export function StepHead({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="step-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {children && <p className="lede">{children}</p>}
    </div>
  );
}

export function PageHead({ numeral, eyebrow, title, children, stats, coords }: {
  numeral: string; eyebrow: ReactNode; title: ReactNode; children?: ReactNode; stats?: [ReactNode, ReactNode][]; coords?: string[];
}) {
  return (
    <div className="wrap pagehead">
      <div className="numeral" aria-hidden="true">{numeral}</div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 style={{ marginTop: 10 }}>{title}</h1>
        {children && <p className="lede">{children}</p>}
        {coords && <div className="coords">{coords.map((c) => <span key={c} className="chip"><i />{c}</span>)}</div>}
        {stats && (
          <div className="statsrow">
            {stats.map(([b, s], i) => <div className="stat" key={i}><b>{b}</b><span>{s}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** A specimen: a framed 3D figure with hexagon-cut corners and a numbered caption. */
export function Plate({ n, title, children, note }: { n: string | number; title: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <figure style={{ margin: 0 }}>
      <div className="plate">{children}</div>
      <figcaption className="caption"><span><b>Specimen {n}</b>{title}</span>{note && <span>{note}</span>}</figcaption>
    </figure>
  );
}

/** The little top-left label inside a specimen: a live light, the specimen id and the run. */
export function CellTag({ children }: { children: ReactNode }) {
  return <div className="cell-tag"><span className="rec" />{children}</div>;
}

/** A stacked bar: where something went (energy, mass, drag), with a legend. */
export function Stack({ parts, unit, total }: { parts: { k: string; v: number; c: string }[]; unit?: string; total?: number }) {
  const sum = total ?? parts.reduce((a, p) => a + Math.max(0, p.v), 0);
  return (
    <div className="stackbar">
      <div className="bar">{parts.map((p) => <i key={p.k} title={p.k} style={{ width: (sum > 0 ? (Math.max(0, p.v) / sum) * 100 : 0) + "%", background: p.c }} />)}</div>
      <div className="legend">{parts.map((p) => <span key={p.k}><i style={{ background: p.c }} />{p.k} <b>{sum > 0 ? Math.round((Math.max(0, p.v) / sum) * 100) : 0}%</b>{unit ? "" : ""}</span>)}</div>
    </div>
  );
}

/* ---------- presenter notes ---------- */
export function Notes({ say, ask, show }: { say?: ReactNode; ask?: ReactNode; show?: ReactNode }) {
  return (
    <div className="notes">
      {say && <p><b>Say</b> {say}</p>}
      {show && <p><b>Show</b> {show}</p>}
      {ask && <p><b>Ask the class</b> {ask}</p>}
    </div>
  );
}

/* ---------- controls ---------- */
export function Range({ label, value, min, max, step = 1, onChange, fmt, id }: {
  label: ReactNode; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => ReactNode; id?: string;
}) {
  const auto = useId();
  const rid = id || auto;
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="ctrl">
      <label htmlFor={rid}><span>{label}</span><output>{fmt ? fmt(value) : value}</output></label>
      <input id={rid} type="range" min={min} max={max} step={step} value={value} style={{ ["--p" as string]: p + "%" }} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

export function Seg<T extends string | number | boolean>({ options, value, onChange, label }: { options: [T, ReactNode][]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

/** Independent on/off switches in one console row. */
export function Toggles<K extends string>({ items, value, onChange, label }: { items: [K, ReactNode][]; value: Record<K, boolean>; onChange: (v: Record<K, boolean>) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map(([k, l]) => <button key={k} aria-pressed={value[k]} onClick={() => onChange({ ...value, [k]: !value[k] })}>{l}</button>)}
    </div>
  );
}

export function Readouts({ items }: { items: [ReactNode, ReactNode, ReactNode?, ("hot" | "cool" | "acc")?][] }) {
  return (
    <div className="readouts">
      {items.map(([k, v, u, tone], i) => <div className={"readout" + (tone ? " " + tone : "")} key={i}><span className="k">{k}</span><span className="v">{v}{u && <small>{u}</small>}</span></div>)}
    </div>
  );
}

/* ---------- sound ---------- */
/** "This model makes sound" chip that doubles as the switch. */
export function SoundCue({ label = "This model makes sound" }: { label?: string }) {
  const on = useSoundOn();
  return (
    <button className="btn sm" aria-pressed={on} onClick={() => audio().toggle()} title="Sound on/off (M)">
      {on ? <Volume2 size={14} /> : <VolumeX size={14} />}{on ? "Listening" : label}<span className="kbd">M</span>
    </button>
  );
}

/* ---------- canvases ---------- */
export function useRaf(cb: (t: number, dt: number) => void, active = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    let raf = 0, last = performance.now(), t = 0;
    const f = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!document.hidden) { t += dt; ref.current(t, dt); }
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/** Re-run draw() whenever deps change or the canvas is resized. */
export function useCanvas(draw: (cv: HTMLCanvasElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => { if (ref.current) drawRef.current(ref.current); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ro = new ResizeObserver(() => drawRef.current(cv));
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);
  return ref;
}

export function Plot({ opts, height = 240, label }: { opts: PlotOpts; height?: number; label: string }) {
  const ref = useCanvas((cv) => plot(cv, opts), [opts]);
  return <canvas ref={ref} className="plot" style={{ height }} role="img" aria-label={label} />;
}

export function Connects({ items }: { items: { href: string; t: string; s: string }[] }) {
  return (
    <div className="connects" style={{ marginTop: 24 }}>
      {items.map((x) => <Link key={x.href} href={x.href}><b>{x.t}</b><small>{x.s}</small></Link>)}
    </div>
  );
}

export function ProsCons({ pros, cons }: { pros: [string, string][]; cons: [string, string][] }) {
  return (
    <div className="proscons">
      <div className="pro"><h4 className="good">Pros</h4><ul>{pros.map(([b, t]) => <li key={b}><b>{b}</b>{t}</li>)}</ul></div>
      <div className="con"><h4 className="bad">Cons</h4><ul>{cons.map(([b, t]) => <li key={b}><b>{b}</b>{t}</li>)}</ul></div>
    </div>
  );
}

export function Timeline({ items }: { items: { y: string; t: string; d: string; key?: boolean }[] }) {
  return (
    <div className="timeline">
      {items.map((x) => <div key={x.y + x.t} className={x.key ? "key" : ""}><b>{x.y}</b><h5>{x.t}</h5><p>{x.d}</p></div>)}
    </div>
  );
}
