"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Expand, LayoutGrid, Minimize, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CELLS, CHAPTERS, LABS, REFS, STORY, STORY_MINUTES, TRACKED, store, type PageInfo } from "@/lib/site";
import { audio } from "@/lib/audio";

interface StepReg { titles: string[]; go: (i: number) => void; active: number }
const ShellCtx = createContext<{ setSteps: (s: StepReg | null) => void; presenting: boolean; story: boolean; startStory: () => void }>({ setSteps: () => {}, presenting: false, story: false, startStory: () => {} });

/* every model in the presentation, flattened in order */
const STOPS = STORY.flatMap((p, pi) => p.steps.map((t, si) => ({ pi, si, href: p.href, title: t, k: p.k, of: p.steps.length })));
const stopHref = (s: (typeof STOPS)[number]) => s.href + (s.of > 1 ? "#step-" + (s.si + 1) : "");

export function toggleFullscreen(el?: Element | null) {
  try {
    if (document.fullscreenElement && (!el || document.fullscreenElement === el)) document.exitFullscreen();
    else (el || document.documentElement).requestFullscreen().catch(() => {});
  } catch { /* not supported */ }
}

function useFullscreen() {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const f = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  return fs;
}

/** Whether sound is on, for any component. */
export function useSoundOn() {
  return useSyncExternalStore((f) => audio().subscribe(f), () => audio().on, () => false);
}

function Clock({ start, onReset }: { start: number; onReset: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const sec = Math.max(0, Math.floor((now - start) / 1000)), lim = STORY_MINUTES * 60;
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  return (
    <button className={"dock-clock" + (sec > lim ? " over" : sec > lim - 120 ? " warn" : "")} onClick={onReset} title="Time since the story started. Click to restart the clock.">
      <i style={{ width: Math.min(100, (sec / lim) * 100) + "%" }} />
      <span className="num">{mm}:{ss}</span><small>/ {STORY_MINUTES}:00</small><RotateCcw size={11} />
    </button>
  );
}
export const useShell = () => useContext(ShellCtx);

/* A hexagon with an orb web inside it: the two structures of the site in one mark. */
function Logo() {
  const hex = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return `${(16 + Math.cos(a) * 14).toFixed(2)},${(16 + Math.sin(a) * 14).toFixed(2)}`; }).join(" ");
  const spokes = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `M16 16 L${(16 + Math.cos(a) * 11).toFixed(2)} ${(16 + Math.sin(a) * 11).toFixed(2)}`; }).join(" ");
  const spiral = Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * Math.PI * 2 * 2.4, r = 3 + (i / 48) * 8; return `${i ? "L" : "M"}${(16 + Math.cos(a) * r).toFixed(2)} ${(16 + Math.sin(a) * r).toFixed(2)}`; }).join(" ");
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <polygon points={hex} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={spokes} stroke="currentColor" strokeWidth=".7" opacity=".7" />
      <path d={spiral} fill="none" stroke="currentColor" strokeWidth=".7" opacity=".9" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </svg>
  );
}

/* Sound switch with a live level meter: plucks and crunches light it up. */
function SoundMeter() {
  const on = useSoundOn();
  const [lvl, setLvl] = useState(0);
  useEffect(() => {
    if (!on) { setLvl(0); return; }
    let raf = 0, last = 0;
    const buf = new Float32Array(1024);
    const f = (t: number) => {
      raf = requestAnimationFrame(f);
      if (t - last < 60) return; last = t;
      const e = audio();
      if (!e.analyser) return;
      e.analyser.getFloatTimeDomainData(buf);
      let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const db = 10 * Math.log10(s / buf.length + 1e-12);
      setLvl(Math.max(0, Math.min(1, (db + 60) / 54)));
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const n = 8;
  return (
    <button className="spl" aria-pressed={on} onClick={() => audio().toggle()} title={on ? "Sound on. Click or press M to mute." : "Sound off. Click or press M to hear threads and crushing cells."}>
      {on ? <Volume2 size={14} /> : <VolumeX size={14} />}
      <span className="bars hide-sm" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} className={(i / n < lvl ? "on" : "") + (i >= 6 ? " top" : i >= 4 ? " mid" : "")} style={{ height: 30 + i * 9 + "%" }} />)}</span>
      <span className="db">{on ? "on" : "sound"}</span>
    </button>
  );
}

function Ring({ n, of }: { n: number; of: number }) {
  const c = 2 * Math.PI * 9;
  return (
    <span className="progress-ring hide-lg" title="Chapters and playgrounds you have opened in this browser">
      <svg viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="9" fill="none" stroke="var(--line-2)" strokeWidth="2" />
        <circle cx="11" cy="11" r="9" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={`${(c * n) / Math.max(1, of)} ${c}`} strokeLinecap="round" />
      </svg>
      {n}/{of}
    </span>
  );
}

function Menu({ label, n, items, open, setOpen, path }: { label: string; n: string; items: PageInfo[]; open: string; setOpen: (s: string) => void; path: string }) {
  const isOpen = open === label;
  return (
    <details open={isOpen} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; if (o !== isOpen) setOpen(o ? label : ""); }}>
      <summary onClick={(e) => { e.preventDefault(); setOpen(isOpen ? "" : label); }}><i>{n}</i>{label}</summary>
      <div className="menu">
        {items.map((p) => (
          <Link key={p.href} href={p.href} aria-current={path === p.href.split("#")[0] ? "page" : undefined} onClick={() => setOpen("")}>
            <span className="k">{p.k}</span><b>{p.title}</b><small>{p.sub}</small>
          </Link>
        ))}
      </div>
    </details>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [explored, setExplored] = useState(0);
  const [pal, setPal] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [steps, setSteps] = useState<StepReg | null>(null);
  const [story, setStory] = useState(false);
  const [panel, setPanel] = useState(false);
  const [t0, setT0] = useState(0);
  const fs = useFullscreen();
  const sound = useSoundOn();
  const barRef = useRef<HTMLElement>(null);
  const qRef = useRef<HTMLInputElement>(null);

  // persist only after the stored values have been read, or the first render would overwrite them
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setPresenting(!!store<boolean>("present")); setStory(!!store<boolean>("story")); setT0(store<number>("storyT0") || Date.now()); setHydrated(true); }, []);
  useEffect(() => { document.body.classList.toggle("story", story); if (hydrated) store("story", story); }, [story, hydrated]);
  useEffect(() => { document.body.classList.toggle("presenting", presenting); if (hydrated) store("present", presenting); }, [presenting, hydrated]);
  useEffect(() => { document.body.dataset.cell = CELLS[path] ?? "lobby"; }, [path]);
  useEffect(() => {
    const page = TRACKED.find((p) => p.href === path);
    const visited = store<string[]>("visited") || [];
    if (page && !visited.includes(page.id)) { visited.push(page.id); store("visited", visited); }
    setExplored(visited.filter((v) => TRACKED.some((p) => p.id === v)).length);
    setOpen("");
  }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(""); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const toggleFull = useCallback(() => toggleFullscreen(), []);

  // where we are in the story
  const pageIdx = STORY.findIndex((p) => p.href === path);
  const cur = pageIdx < 0 ? -1 : STOPS.findIndex((s) => s.pi === pageIdx && s.si === (steps && STORY[pageIdx].steps.length > 1 ? steps.active : 0));
  const goStop = useCallback((i: number) => {
    const s = STOPS[Math.max(0, Math.min(STOPS.length - 1, i))];
    setPanel(false);
    if (s.href === path && steps) steps.go(s.si);
    else if (s.href !== path || s.of > 1) router.push(stopHref(s));
    window.scrollTo({ top: 0 });
  }, [path, steps, router]);
  const step = useCallback((d: 1 | -1) => {
    // inside a chapter, move between its steps; in story mode, carry on into the next page
    if (steps && steps.active + d >= 0 && steps.active + d < steps.titles.length) { steps.go(steps.active + d); return; }
    if (story && cur >= 0) goStop(cur + d);
  }, [steps, story, cur, goStop]);
  const startStory = useCallback(() => {
    setStory(true);
    if (!document.fullscreenElement) toggleFullscreen();
    if (pageIdx < 0) goStop(0);
  }, [pageIdx, goStop]);
  const resetClock = () => { const t = Date.now(); setT0(t); store("storyT0", t); };

  type Entry = { t: string; s: string; href?: string; step?: number; action?: () => void };
  const entries = useMemo<Entry[]>(() => {
    const e: Entry[] = [{ t: "Home", s: "start", href: "/" }];
    CHAPTERS.forEach((p) => e.push({ t: p.title, s: "chapter " + p.k, href: p.href }));
    LABS.forEach((p) => e.push({ t: p.title, s: "playground", href: p.href }));
    REFS.forEach((p) => e.push({ t: p.title, s: "reference", href: p.href }));
    steps?.titles.forEach((t, i) => e.push({ t, s: "this page · step " + (i + 1), step: i }));
    e.push({ t: "Story mode", s: "S", action: () => setStory((x) => !x) });
    e.push({ t: "Sound on / off", s: "M", action: () => audio().toggle() });
    e.push({ t: "Toggle presenter mode", s: "P", action: () => setPresenting((p) => !p) });
    e.push({ t: "Full screen", s: "F", action: toggleFull });
    return e;
  }, [steps, toggleFull]);
  const results = entries.filter((e) => !q || (e.t + " " + e.s).toLowerCase().includes(q.toLowerCase()));
  const pick = (e?: Entry) => {
    if (!e) return;
    setPal(false);
    if (e.action) e.action();
    else if (e.step != null) steps?.go(e.step);
    else if (e.href) router.push(e.href);
  };
  useEffect(() => { if (pal) { setQ(""); setSel(0); setTimeout(() => qRef.current?.focus(), 0); } }, [pal]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPal((p) => !p); return; }
      const typing = /input|textarea|select/i.test(t.tagName) && (t as HTMLInputElement).type !== "range";
      if (typing || e.ctrlKey || e.metaKey || e.altKey || pal) return;
      if (e.key === "p" || e.key === "P") setPresenting((p) => !p);
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "m" || e.key === "M") audio().toggle();
      else if (e.key === "s" || e.key === "S") { if (story) setStory(false); else startStory(); }
      else if (e.key === "ArrowRight" || e.key === "PageDown") { step(1); e.preventDefault(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { step(-1); e.preventDefault(); }
      else if (e.key === "Escape") { setPal(false); setOpen(""); setPanel(false); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [toggleFull, step, story, startStory, pal]);

  const ctx = useMemo(() => ({ setSteps, presenting, story, startStory }), [presenting, story, startStory]);

  return (
    <ShellCtx.Provider value={ctx}>
      <header className="mast" ref={barRef}>
        <div className="wrap">
          <Link className="brand" href="/"><Logo /><span>Comb <i>&amp;</i> Web<small className="hide-sm">bio-inspired structures lab</small></span></Link>
          <nav className="nav" aria-label="Site">
            <Menu label="Chapters" n="01" items={CHAPTERS} open={open} setOpen={setOpen} path={path} />
            <Menu label="Labs" n="02" items={LABS} open={open} setOpen={setOpen} path={path} />
            <Menu label="Notes" n="03" items={REFS} open={open} setOpen={setOpen} path={path} />
          </nav>
          <div className="tools">
            <Ring n={explored} of={TRACKED.length} />
            <SoundMeter />
            <button className="btn sm primary" title="Full-screen story mode (S)" onClick={startStory}><Play size={12} /> <span className="hide-sm">Story</span></button>
            <button className="btn sm ghost hide-sm" title="Full screen (F)" aria-label="Full screen" onClick={toggleFull}>{fs ? <Minimize size={14} /> : <Expand size={14} />}</button>
            <button className="btn sm ghost hide-md" aria-pressed={presenting} title="Presenter mode (P)" onClick={() => setPresenting((p) => !p)}>Present</button>
            <button className="btn sm ghost hide-md" title="Jump anywhere" onClick={() => setPal(true)}><span className="kbd">Ctrl K</span></button>
          </div>
        </div>
      </header>

      {children}

      <footer className="foot">
        <div className="wrap">
          <span><b>Comb &amp; Web</b> &middot; bio-inspired structural engineering: honeycomb and spider-web structures &middot; C174 C175 C176</span>
          <span>Every model runs published mechanics live. Keys: &larr; &rarr; steps &middot; S story &middot; M sound &middot; P presenter &middot; F full screen &middot; Ctrl K jump</span>
        </div>
      </footer>

      {story && (
        <>
          {panel && (
            <div className="dock-panel" role="dialog" aria-label="All models">
              {STORY.map((p, pi) => (
                <section key={p.href}>
                  <h4><span>{p.k}</span>{p.title}</h4>
                  <div>
                    {p.steps.map((t, si) => {
                      const i = STOPS.findIndex((s) => s.pi === pi && s.si === si);
                      return <button key={t} className={(i === cur ? "on" : "") + (i < cur ? " done" : "")} onClick={() => goStop(i)}><span className="num">{i + 1}</span>{t}</button>;
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
          <nav className="dock" aria-label="Story controls">
            <button className="dock-btn" aria-pressed={panel} title="All models" onClick={() => setPanel((x) => !x)}><LayoutGrid size={16} /></button>
            <button className="dock-btn" disabled={cur <= 0} title="Previous (←)" onClick={() => step(-1)}><ChevronLeft size={18} /></button>
            <div className="dock-now">
              <span className="num">{cur >= 0 ? `${STOPS[cur].k} · ${cur + 1} / ${STOPS.length}` : "off the story path"}</span>
              <b>{cur >= 0 ? STOPS[cur].title : "Press → to rejoin"}</b>
              <i className="dock-progress">{STOPS.map((s, i) => <em key={i} className={i === cur ? "on" : i < cur ? "done" : ""} style={{ flex: 1 }} />)}</i>
            </div>
            <button className="dock-btn next" disabled={cur >= STOPS.length - 1} title="Next (→)" onClick={() => (cur < 0 ? goStop(0) : step(1))}>
              {cur >= 0 && cur < STOPS.length - 1 ? <span className="hide-sm">{STOPS[cur + 1].title}</span> : null}<ChevronRight size={18} />
            </button>
            <Clock start={t0} onReset={resetClock} />
            <button className="dock-btn" aria-pressed={sound} title="Sound (M)" onClick={() => audio().toggle()}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
            <button className="dock-btn" title="Full screen (F)" onClick={toggleFull}>{fs ? <Minimize size={15} /> : <Expand size={15} />}</button>
            <button className="dock-btn" title="Leave story mode (S)" onClick={() => { setStory(false); setPanel(false); }}><X size={16} /></button>
          </nav>
        </>
      )}

      <div className="palette" hidden={!pal} onClick={(e) => { if (e.target === e.currentTarget) setPal(false); }}>
        <div className="box" role="dialog" aria-label="Jump to">
          <input
            ref={qRef} id="palQ" type="text" placeholder={"Where to? A chapter, a step, a lab…"} autoComplete="off" value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { setSel((s) => Math.min(results.length - 1, s + 1)); e.preventDefault(); }
              else if (e.key === "ArrowUp") { setSel((s) => Math.max(0, s - 1)); e.preventDefault(); }
              else if (e.key === "Enter") { pick(results[sel]); e.preventDefault(); }
              else if (e.key === "Escape") setPal(false);
            }}
          />
          <ul>
            {results.map((e, i) => (
              <li key={e.t + e.s} className={i === sel ? "sel" : ""}>
                <a href={e.href || "#"} onClick={(ev) => { ev.preventDefault(); pick(e); }}>{e.t}<small>{e.s}</small></a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ShellCtx.Provider>
  );
}
