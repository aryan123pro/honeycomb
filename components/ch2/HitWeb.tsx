"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Stage3D from "@/components/three/Stage3D";
import WebView, { Insect, PREY, segmentHz, type PreyId, type WebStats } from "@/components/three/WebView";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg, SoundCue, Stack } from "@/components/ui";
import { audio } from "@/lib/audio";
import { BAD, DEW, fmt, HONEY, LEAF, sig, SILK, STEEL } from "@/lib/plot";
import { WEB_LAWS, type Law } from "@/lib/silk";
import { KIND, WebSim } from "@/lib/sim/web";

/* Hit the web. A live orb web (lib/sim/web.ts): every thread a nonlinear silk spring, real masses and
   speeds for the insects, energy tracked thread by thread. Three things to try:
   - Throw: an insect flies into the web and sticks; does the web stop it, and which threads did the work?
     (Sensenig et al. 2012: radials do most of it.)
   - Pull: drag one radial thread out of the plane slowly until it breaks, as Cranford et al. (2012) did
     with a needle, and compare real silk with linear-elastic and elastic–plastic threads.
   - Cut: snip threads and throw again; webs keep working with a lot of damage. */

type Mode = "throw" | "pull" | "cut";
const S = 10;

/** The flying insect, drawn at the prey's position in the web's metre-scale group. */
function PreyBody({ sim, kind }: { sim: WebSim; kind: PreyId }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(() => {
    const p = sim.prey; g.current.visible = !!p;
    if (p) g.current.position.set(p.pos[0], p.pos[1], p.pos[2]);
  });
  const r = PREY.find((x) => x.id === kind)!.r;
  return <group ref={g}><group rotation-x={-Math.PI / 2}><Insect kind={kind} r={r} /></group></group>;
}

function Aim({ at }: { at: [number, number] }) {
  const m = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { const s = 1 + 0.15 * Math.sin(clock.elapsedTime * 4); m.current.scale.setScalar(s); });
  return <mesh ref={m} position={[at[0], at[1], 0.002]}><ringGeometry args={[0.009, 0.011, 32]} /><meshBasicMaterial color="#f2b134" toneMapped={false} transparent opacity={0.85} /></mesh>;
}

const outcomeNow = (s: WebSim) => (s.stop ? "stopped" : s.outcome);
/** Mass of real silk in the web (without the solver's added mass), mg. */
const silkMg = (s: WebSim) => { let m = 0; for (let i = 0; i < s.ns; i++) if (s.broken[i] !== 2) m += 1300 * s.area[i] * s.L0[i]; return m * 1e6; };

export default function HitWeb({ lab = false }: { lab?: boolean }) {
  const [law, setLaw] = useState<Law>("silk");
  const [defects, setDefects] = useState(0);
  const [mode, setMode] = useState<Mode>("throw");
  const [prey, setPrey] = useState<PreyId>("blowfly");
  const [aim, setAim] = useState<[number, number]>([0.04, 0.03]);
  const [version, setVersion] = useState(0);
  const [stats, setStats] = useState<WebStats>({ slowmo: 30, t: 0 });
  const lastSlow = useRef(30);
  const onStats = useCallback((st: WebStats) => { if (Math.abs(st.slowmo - lastSlow.current) / lastSlow.current > 0.08) { lastSlow.current = st.slowmo; setStats(st); } }, []);
  const [, tick] = useState(0);
  // the Web Lab adds design controls; the chapter uses the default Araneus web
  const [radii, setRadii] = useState(28);
  const [spacing, setSpacing] = useState(4.5);
  const [Rcm, setRcm] = useState(15);
  const [dRad, setDRad] = useState(3.6);
  const [dSpi, setDSpi] = useState(2.5);
  const spec = useMemo(() => ({ radialLaw: law, defects, seed: 7, ...(lab ? { radii, spacing: spacing / 1000, R: Rcm / 100, hub: (Rcm / 100) * 0.09, free: (Rcm / 100) * 0.1, dRadial: dRad, dSpiral: dSpi } : {}) }), [law, defects, lab, radii, spacing, Rcm, dRad, dSpi]);
  const sim = useMemo(() => new WebSim(spec), [spec]);
  const [log, setLog] = useState<{ prey: string; out: string; depth: number; broken: number; radial: number }[]>([]);
  const pulls = useRef<Record<string, [number, number][]>>({});

  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 120); return () => clearInterval(id); }, []);
  useEffect(() => { setVersion((v) => v + 1); }, [sim]);

  const throwAt = useCallback((x: number, y: number) => {
    const p = PREY.find((q) => q.id === prey)!;
    sim.damping = 0;
    sim.launch(p.m, p.r, x, y, p.v);
    setAim([x, y]);
  }, [sim, prey]);
  const reset = () => { const s = new WebSim(spec); Object.assign(sim, s); setVersion((v) => v + 1); };

  const onPick = (x: number, y: number) => {
    if (mode === "throw") { reset(); throwAt(x, y); }
    else if (mode === "cut") { const i = sim.cutNear(x, y); if (i >= 0) audio().snap(0.3); setVersion((v) => v + 1); }
    else {
      // pull the radial junction nearest the click
      reset();
      const node = sim.nearestNode(x, y, 0, [KIND.spiral]);
      if (node >= 0) { sim.damping = 400; sim.startPull(node, 0.8); setAim([sim.rest[node * 3], sim.rest[node * 3 + 1]]); }
    }
  };
  const pluckNear = () => {
    // the spider's view: pluck the radial under the aim and play its tension note
    let best = -1, bd = Infinity;
    for (let i = 0; i < sim.ns; i++) { if (sim.broken[i] || sim.kind[i] !== KIND.radial) continue; const a = sim.a[i] * 3; const d = (sim.pos[a] - aim[0]) ** 2 + (sim.pos[a + 1] - aim[1]) ** 2; if (d < bd) { bd = d; best = i; } }
    if (best >= 0) audio().pluck(segmentHz(sim, best), 0.6);
  };

  // record pull curves per law
  if (sim.pull) pulls.current[law] = sim.pull.trace.slice();
  const pr = sim.prey, p = PREY.find((q) => q.id === prey)!;
  const ke0 = pr ? pr.ke0 : 0.5 * p.m * p.v * p.v;
  const E = sim.energies();
  const w = sim.workByKind;
  const parts = [
    { k: "radial threads", v: Math.max(0, w[KIND.radial]), c: SILK },
    { k: "capture spiral", v: Math.max(0, w[KIND.spiral]), c: LEAF },
    { k: "frame & anchors", v: Math.max(0, w[KIND.frame] + w[KIND.anchor] + w[KIND.hub]), c: STEEL },
    { k: "air drag", v: Math.max(0, E.air), c: DEW },
  ];
  // freeze the split at the moment the insect is stopped (or gets through), as the papers measure it
  const snap = useRef<{ sim: WebSim; t: number; parts: typeof parts } | null>(null);
  if (!pr || outcomeNow(sim) === "flying" || (snap.current && snap.current.sim !== sim)) snap.current = null;
  else if (!snap.current) {
    snap.current = { sim, t: sim.t, parts };
    const tot = parts.reduce((a, q) => a + q.v, 0) || 1, b0 = sim.brokenByKind();
    const rec = { prey: p.name, out: sim.outcome === "caught" ? "caught" : sim.outcome === "slipped" ? "slipped through" : "broke through", depth: -(sim.stop?.z ?? (pr?.zMin ?? 0)) * 1000, broken: b0[0] + b0[1] + b0[2], radial: parts[0].v / tot };
    if (lab) setTimeout(() => setLog((l) => [rec, ...l].slice(0, 8)), 0);
  }
  const shown = snap.current ? snap.current.parts : parts;
  const bk = sim.brokenByKind();
  const outcome = sim.outcome;
  const pullTrace = sim.pull?.trace ?? [];
  const peakPull = pullTrace.reduce((m, x) => Math.max(m, x[1]), 0);
  const lawColor: Record<string, string> = { silk: HONEY, linear: DEW, plastic: BAD };

  return (
    <div className="split">
      <Plate n={lab ? "L2" : "II·2"} title={mode === "throw" ? "Throw an insect at the web" : mode === "pull" ? "Pull one thread until it breaks" : "Cut threads, then test it"} note="click the web to aim · drag to turn">
        <Stage3D label="A live orb web: insects fly into it and threads stretch, glow with load and snap" camera={{ position: [1.4, 0.5, 4.2], fov: 42 }} look={{ bloom: 0.9, threshold: 0.55 }} background="radial-gradient(ellipse 70% 70% at 50% 45%, #1b2026, #0c0d0f 80%)"
          overlay={<>
            <CellTag>Specimen {lab ? "L2" : "II·2"} · live solver · slow motion ×{fmt(stats.slowmo)}</CellTag>
            <div className="hud tag hud-tr">
              {mode === "pull" ? <>
                <span className="k">pulling force</span>
                <span className="big" style={{ color: lawColor[law] }}>{sig((sim.pull?.F ?? 0) * 1000, 3)}<small>mN</small></span>
                <span className="k">peak {sig(peakPull * 1000, 3)} mN · pulled {fmt((sim.pull?.d ?? 0) * 1000)} mm</span>
              </> : <>
                <span className="k">{pr ? p.name : "ready"}</span>
                <span className={"outcome " + (outcome === "caught" ? "good" : outcome === "through" ? "bad" : outcome === "slipped" ? "warn" : "")} style={{ fontSize: "1.6rem" }}>{outcome === "caught" ? "Caught" : outcome === "through" ? "Broke through" : outcome === "slipped" ? "Slipped through the mesh" : pr ? "Flying…" : "Click to throw"}</span>
                {sim.stop && <span className="k">stopped in {fmt(sim.stop.t * 1000)} ms, {fmt(-sim.stop.z * 1000)} mm deep</span>}
              </>}
            </div>
            <div className="hud tag hud-bl"><div className="loadkey"><span>load</span><i /><span>breaking</span></div></div>
          </>}>
          <group scale={S}>
            <WebView sim={sim} version={version} onStats={onStats} onPick={onPick} budgetMs={7} />
            <PreyBody sim={sim} kind={prey} />
            {mode !== "cut" && <Aim at={aim} />}
          </group>
          <OrbitControls makeDefault enablePan={false} minDistance={1.6} maxDistance={9} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <Seg options={[["throw", "Throw"], ["pull", "Pull a thread"], ["cut", "Cut"]]} value={mode} onChange={(m) => { setMode(m); if (m !== "cut") reset(); }} label="Experiment" />
        {mode === "throw" && <>
          <Seg options={PREY.map((q) => [q.id as PreyId, q.name])} value={prey} onChange={setPrey} label="Insect" />
          <p className="faint" style={{ fontSize: 13, marginTop: -4 }}>{p.name}: {sig(p.m * 1e6, 2)} mg at {p.v} m/s, carrying {sig(0.5 * p.m * p.v * p.v * 1e6, 3)} µJ.</p>
          <div className="btnrow">
            <button className="btn sm primary" onClick={() => { reset(); throwAt(aim[0], aim[1]); }}>Throw</button>
            <button className="btn sm" onClick={reset}>Fresh web</button>
            <button className="btn sm" onClick={pluckNear} title="Play the note of the radial under the target">Pluck</button>
          </div>
        </>}
        {mode === "pull" && <p className="muted" style={{ fontSize: 14 }}>Click a junction on a radial thread. The model pulls it straight out of the web, slowly, until something breaks. Then switch the silk and do it again: each law&apos;s curve stays on the chart.</p>}
        {mode === "cut" && <p className="muted" style={{ fontSize: 14 }}>Click threads to cut them. Then switch to Throw (keeping the damage: use the button below) and see if the web still holds.</p>}
        {mode === "cut" && <button className="btn sm" onClick={() => { setMode("throw"); throwAt(aim[0], aim[1]); }}>Throw at the damaged web</button>}
        <Seg options={WEB_LAWS.map((l) => [l.id, l.name])} value={law} onChange={setLaw} label="Radial thread material" />
        <p className="faint" style={{ fontSize: 12.5, marginTop: -4 }}>{WEB_LAWS.find((l) => l.id === law)!.note}</p>
        <Range label="Missing threads (defects)" value={defects} min={0} max={0.3} step={0.01} onChange={setDefects} fmt={(v) => fmt(v * 100) + "%"} />
        {lab && <div className="panel" style={{ display: "grid", gap: 12 }}>
          <h4>Your web</h4>
          <Range label="Radii" value={radii} min={10} max={48} step={1} onChange={setRadii} />
          <Range label="Spiral spacing" value={spacing} min={2} max={12} step={0.5} onChange={setSpacing} fmt={(v) => fmt(v, 1) + " mm"} />
          <Range label="Capture area radius" value={Rcm} min={8} max={22} step={1} onChange={setRcm} fmt={(v) => v + " cm"} />
          <Range label="Radial thread diameter" value={dRad} min={1.5} max={6} step={0.1} onChange={setDRad} fmt={(v) => fmt(v, 1) + " µm"} />
          <Range label="Spiral thread diameter" value={dSpi} min={1} max={4} step={0.1} onChange={setDSpi} fmt={(v) => fmt(v, 1) + " µm"} />
          <p className="faint" style={{ fontSize: 12.5 }}>Silk used: {sig(silkMg(sim), 3)} mg (an Araneus orb is about 0.1–0.5 mg of silk). Real orb weavers trade spacing against prey size: tight meshes for small flies, wide ones for big insects.</p>
        </div>}
        {lab && log.length > 0 && <div className="tablewrap"><table className="data">
          <thead><tr><th>Insect</th><th>Result</th><th>Depth</th><th>Broken</th><th>Radials did</th></tr></thead>
          <tbody>{log.map((r, i) => <tr key={i}><td>{r.prey}</td><td className={r.out === "caught" ? "good" : "bad"}>{r.out}</td><td className="n">{fmt(r.depth)} mm</td><td className="n">{r.broken}</td><td className="n">{fmt(r.radial * 100)}%</td></tr>)}</tbody>
        </table></div>}

        {mode === "pull" ? (
          <Plot label="Pull force against how far the thread is pulled, for each silk law" height={200} opts={{
            x: [0, 140], y: [0, 16], padL: 36, xlabel: "pulled out of the web (mm)", ylabel: "force (mN)", xticks: [0, 40, 80, 120], yticks: [0, 4, 8, 12, 16],
            series: Object.entries(pulls.current).map(([k, tr]) => ({ xs: tr.map((x) => x[0] * 1000), data: tr.map((x) => x[1] * 1000), color: lawColor[k] + (k === law ? "" : "88"), width: k === law ? 2.5 : 1.5 })),
          }} />
        ) : (
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <h4>Where the insect&apos;s energy went</h4>
            {pr ? <Stack parts={shown} /> : <p className="faint" style={{ fontSize: 13 }}>Throw something to see where its energy goes.</p>}
            {pr && snap.current && <p className="faint" style={{ fontSize: 12 }}>Split at the moment it {sim.outcome === "caught" ? "stopped" : "got through"} ({fmt(snap.current.t * 1000)} ms).</p>}
            <p className="faint" style={{ fontSize: 12.5 }}>Sensenig et al. (2012): radial threads do most of the work of stopping prey; the capture spiral rarely more than 30%, air drag rarely more than 10%. They treated the frame as rigid; here it stretches too.</p>
          </div>
        )}
        <Readouts items={[
          ["Threads broken", String(bk[0] + bk[1] + bk[2]), "", bk[0] + bk[1] > 0 ? "hot" : undefined],
          ["Radial · spiral", `${bk[0]} · ${bk[1]}`, ""],
          ["Web still attached", fmt(sim.intactShare() * 100, 1), "%", "cool"],
          mode === "pull" ? ["Work to break", sig(pullTrace.reduce((a, x, i) => (i ? a + 0.5 * (x[1] + pullTrace[i - 1][1]) * (x[0] - pullTrace[i - 1][0]) : 0), 0) * 1000, 3), "mJ"] : ["Insect energy left", pr ? sig((sim.preyKE / Math.max(1e-12, ke0)) * 100, 2) : "—", pr ? "%" : ""],
        ]} />
        <p className="honest"><b>Model:</b> {sim.n} junctions, {sim.ns} threads, real silk laws and insect masses, 5 µs steps. Each junction carries at least 1 µg so the solver stays stable (web ≈ {fmt(sim.webMg, 1)} mg; real orb webs 0.1–1 mg). Glue never lets go. <b>Cranford et al. found</b> real silk confines damage to the loaded thread better than linear threads; in this simpler web both confine it, while elastic–plastic threads break more and hold a quarter of the force.</p>
        <SoundCue label="Hear the threads" />
      </div>
      {!lab && <Notes say="This is a real simulation: about two thousand silk threads, each with silk's own stretch curve, and a fly with a real mass and speed. Watch where the colour goes: the radial threads light up, the spiral stretches, and the fly stops within a few centimetres." show="Throw a blowfly, then a dragonfly. Then switch to Pull, pull a radial with real silk, then with elastic–plastic: four times weaker." ask="Why would a spider rather lose one thread than have the whole web share the load evenly?" />}
    </div>
  );
}
