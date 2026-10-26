"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import HoneyBlock from "@/components/three/HoneyBlock";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg, SoundCue } from "@/components/ui";
import { audio } from "@/lib/audio";
import { CELL_MATS, cellInches, crushStress, dropTest, foilFor, foldH, G, HEXWEB, INCH, PCF, PSI, strokeOf, type CrushSpec } from "@/lib/honeycomb";
import { BAD, fmt, GOOD, HONEY, range, sig, WAX } from "@/lib/plot";
import { store } from "@/lib/site";

/* L1 · Crush Lab. Pick a real HexWeb product (or design a core), size the block, choose an impact, and
   drop it. The drop is integrated in time against the crush curve (lib/honeycomb.ts dropTest): the mass
   decelerates at F/m, F = crush stress × area. Pass if it stops inside the usable stroke with the peak
   deceleration under the limit you set. The density chart puts every Hexcel data-sheet row next to the
   model's curve, so you can see how far to trust it. */

const IMPACTS = [
  { id: "phone", name: "Phone, 1 m drop", m: 0.2, v: Math.sqrt(2 * G * 1), gmax: 1500, note: "A 200 g phone falling 1 m. Electronics survive around a thousand g for a millisecond." },
  { id: "tool", name: "Tool off a scaffold, 10 m", m: 2, v: Math.sqrt(2 * G * 10), gmax: 2000, note: "A 2 kg tool falling 10 m onto a facade panel. Here the limit protects the panel's fixings." },
  { id: "crashbox", name: "Car crash box, 15 km/h", m: 750, v: 15 / 3.6, gmax: 25, note: "Half of a 1500 kg car into one of two crash boxes at 15 km/h, the low-speed bumper test. Passengers need under ~25 g." },
  { id: "rock", name: "Rockfall on a barrier", m: 100, v: 10, gmax: 300, note: "A 100 kg rock at 10 m/s on a protective panel." },
] as const;

function DropTower({ H, W, crush, fold, massTop, drop }: { H: number; W: number; crush: number; fold: number; massTop: number; drop: number }) {
  const m = useRef<THREE.Group>(null!);
  useFrame(() => { m.current.position.y = massTop; });
  const nx = Math.max(3, Math.min(9, Math.round(W / 0.8))), nz = Math.max(3, Math.min(8, Math.round(W / 0.9)));
  return (
    <group>
      <mesh position={[0, -0.2, 0]} receiveShadow><boxGeometry args={[W + 3, 0.4, W + 3]} /><meshStandardMaterial color="#2c2f24" roughness={0.6} metalness={0.3} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 2 + 0.9), 5, 0]}><cylinderGeometry args={[0.12, 0.12, 10.4, 16]} /><meshStandardMaterial color="#c9ced8" metalness={1} roughness={0.2} /></mesh>)}
      <HoneyBlock cell={W / nx * 1.25} nx={nx} nz={nz} height={H} wall={0.03} crush={crush} fold={fold} stroke={0.78} skins />
      <group ref={m}>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[W + 1.4, 1, W * 0.9]} /><meshStandardMaterial color="#8b93a6" metalness={0.85} roughness={0.3} /></mesh>
        <mesh position={[0, 1.05, 0]}><boxGeometry args={[W * 0.5, 0.1, W * 0.5]} /><meshStandardMaterial color="#f2b134" metalness={0.4} roughness={0.4} /></mesh>
      </group>
      <Label3D position={[W / 2 + 1.6, drop + 1.4, 0]} color={WAX} size={0.4}>IMPACTOR</Label3D>
    </group>
  );
}

export default function CrushLab() {
  const [matId, setMatId] = useState<keyof typeof CELL_MATS>("al");
  const [row, setRow] = useState(10); // 3/16-3.1
  const [custom, setCustom] = useState(false);
  const [cellMm, setCellMm] = useState(4.8);
  const [foil, setFoil] = useState(25);
  const [Hmm, setH] = useState(50);
  const [side, setSide] = useState(100);
  const [pre, setPre] = useState(true);
  const [imp, setImp] = useState<(typeof IMPACTS)[number]["id"]>("phone");
  const [gmax, setGmax] = useState<number>(IMPACTS[0].gmax);
  const I = IMPACTS.find((x) => x.id === imp)!;
  useEffect(() => { setGmax(I.gmax); }, [imp]); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = CELL_MATS[matId];
  const D = custom ? cellMm / 1000 : cellInches(HEXWEB[row][0]) * INCH;
  const rhoBar = custom ? (8 / 3) * (foil * 1e-6) / D : (HEXWEB[row][1] * PCF) / 2680;
  const spec: CrushSpec = { core: "honeycomb", mat, rhoBar, D, H: Hmm / 1000, precrushed: pre };
  const A = (side / 1000) ** 2;
  const res = useMemo(() => dropTest(spec, A, I.m, I.v), [matId, rhoBar, D, Hmm, side, pre, imp]); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = crushStress(mat, rhoBar);
  const usable = strokeOf(rhoBar) * spec.H;
  const coreMass = rhoBar * mat.rho * A * spec.H * 1000;
  const pass = res.stopped && res.stroke <= usable && res.peakG <= gmax;
  const ke = 0.5 * I.m * I.v * I.v;

  // replay the drop: 1.8 s of animation whatever the real duration
  const [p, setP] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now(); let lastFold = -1;
    const f = (t: number) => { const u = Math.min(1, (t - t0) / 2200); setP(u); const fd = Math.floor((u * res.stroke) / (2 * foldH(foilFor(rhoBar, D), D))); if (fd > lastFold && u > 0.25) { audio().crunch(0.3, 600 + Math.random() * 500); lastFold = fd; } if (u < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [run, res, rhoBar, D]);
  // first 25% of the replay: the fall; then the crush, following the trace in time
  const falling = p < 0.25;
  const tr = res.trace, tEnd = res.t;
  const at = (u: number) => { const tt = u * tEnd; let k = 0; while (k < tr.length - 1 && tr[k + 1].t < tt) k++; return tr[k]; };
  const cur = falling ? null : at((p - 0.25) / 0.75);
  const x = cur ? cur.x : 0;

  // display: the block fits a 4 × 7 unit box whatever its real size
  const s = Math.min(4 / (side / 1000), 7 / spec.H), dW = (side / 1000) * s, dH = spec.H * s, dX = Math.min(x, spec.H * 0.98) * s;
  const dropH = 5;
  const massTop = falling ? dH + dropH * (1 - (p / 0.25) ** 2) : dH - dX;
  const dFold = Math.max(foldH(foilFor(rhoBar, D), D) * s, dH / 20);

  const [best, setBest] = useState<number | null>(null);
  useEffect(() => { setBest(store<number>("crushBest." + imp)); }, [imp]);
  useEffect(() => { if (pass && (best == null || coreMass < best)) { setBest(coreMass); store("crushBest." + imp, coreMass); } }, [pass, coreMass]); // eslint-disable-line react-hooks/exhaustive-deps

  const dens = range(0.8, 9, 60);
  return (
    <div className="lab-grid">
      <div className="stack">
        <Plate n="L1" title="Drop tower: your core under your impact" note="drag to turn · Drop again to replay">
          <Stage3D label="A drop tower: a steel impactor falls onto a honeycomb block and crushes it" camera={{ position: [11, 4.5, 16], fov: 40 }} look={{ bloom: 0.45, ao: 0.5 }}
            overlay={<>
              <CellTag>Crush Lab · {I.name} · {sig(ke, 3)} J</CellTag>
              <div className="hud tag hud-tr">
                <span className="k">verdict</span>
                <span className={"outcome " + (pass ? "good" : "bad")} style={{ fontSize: "1.5rem" }}>{!res.stopped || res.stroke > usable ? "Bottoms out" : res.peakG > gmax ? "Too hard" : "Protected"}</span>
                <span className="k">peak {sig(res.peakG, 3)} g · {sig(res.stroke * 1000, 3)} mm of {sig(usable * 1000, 3)} mm</span>
              </div>
            </>}>
            <group position={[0, -3, 0]}><DropTower H={dH} W={dW} crush={dX} fold={dFold} massTop={massTop} drop={dropH} /></group>
            <OrbitControls makeDefault target={[0, -0.5, 0]} enablePan={false} minDistance={7} maxDistance={30} />
          </Stage3D>
        </Plate>
        <div className="grid2">
          <Plot label="Force against crush distance during the drop" height={220} opts={{
            x: [0, spec.H * 1000], y: [0, Math.max(res.peakF, sc * A * 2.4) / 1000 * 1.1], padL: 44, xlabel: "crush (mm)", ylabel: "force (kN)",
            xticks: range(0, spec.H * 1000, 6).map((v) => Math.round(v)), yticks: range(0, Math.max(res.peakF, sc * A * 2.4) / 1000, 5).map((v) => +sig(v, 2)),
            series: [{ xs: res.trace.map((q) => q.x * 1000), data: res.trace.map((q) => q.F / 1000), color: HONEY, width: 2.5, fill: "rgba(242,177,52,.15)" }],
            markers: [{ x: usable * 1000, label: "usable stroke", color: "#8a8770" }],
            hlines: [{ y: gmax * I.m * G / 1000, label: `${gmax} g limit`, color: BAD }],
            cursor: cur ? { x: cur.x * 1000, y: cur.F / 1000, color: WAX } : undefined,
          }} />
          <Plot label="Crush strength against density: model and Hexcel data" height={220} opts={{
            x: [0.8, 9], y: [0, 900], padL: 44, xlabel: "core density (pcf)", ylabel: "crush (psi)", xticks: [1, 2, 3, 4, 5, 6, 7, 8, 9], yticks: [0, 200, 400, 600, 800],
            series: [{ xs: dens, data: dens.map((d) => crushStress(CELL_MATS.al, (d * PCF) / 2680) / PSI), color: HONEY, width: 2 }],
            points: [...HEXWEB.map(([, pcf, , c]) => ({ x: pcf, y: c, color: GOOD, r: 3.2, ring: true })), { x: (rhoBar * mat.rho) / PCF, y: sc / PSI, color: WAX, r: 6 }],
          }} />
        </div>
        <p className="faint" style={{ fontSize: 12.5, marginTop: -8 }}>Left: the drop, integrated in time. Right: <span style={{ color: HONEY }}>Wierzbicki model, aluminium</span>; <span style={{ color: GOOD }}>○ HexWeb CR III 5052 data sheet, all 27 products</span>; <span style={{ color: WAX }}>● your core</span>. The model is within ±14% of every row.</p>
      </div>

      <aside className="lab-side">
        <div className="panel">
          <h4>Impact</h4>
          <Seg options={IMPACTS.map((x) => [x.id, x.name])} value={imp} onChange={setImp} label="Impact" />
          <p className="faint" style={{ fontSize: 12.5 }}>{I.note}</p>
          <Range label="Deceleration limit" value={gmax} min={10} max={3000} step={5} onChange={setGmax} fmt={(v) => v + " g"} />
        </div>
        <div className="panel">
          <h4>Core</h4>
          <Seg options={[["al", "Aluminium"], ["steel", "Steel"], ["pla", "PLA print"]]} value={matId} onChange={(v) => { setMatId(v); if (v !== "al") setCustom(true); }} label="Material" />
          <Seg options={[[false, "HexWeb product"], [true, "Custom"]]} value={custom} onChange={(v) => { setCustom(v); if (!v) setMatId("al"); }} label="Source" />
          {!custom ? (
            <Range label="Product" value={row} min={0} max={HEXWEB.length - 1} step={1} onChange={setRow} fmt={(v) => `${HEXWEB[v][0]}" · ${HEXWEB[v][1]} pcf`} />
          ) : (<>
            <Range label="Cell size" value={cellMm} min={2} max={20} step={0.1} onChange={setCellMm} fmt={(v) => fmt(v, 1) + " mm"} />
            <Range label="Wall (foil) thickness" value={foil} min={10} max={400} step={1} onChange={setFoil} fmt={(v) => v + " µm"} />
          </>)}
          <Range label="Block height" value={Hmm} min={10} max={300} step={5} onChange={setH} fmt={(v) => v + " mm"} />
          <Range label="Block side" value={side} min={20} max={400} step={5} onChange={setSide} fmt={(v) => v + " mm"} />
          <div className="row"><button className="btn sm" aria-pressed={pre} onClick={() => setPre((x) => !x)}>Pre-crushed (no peak)</button><button className="btn sm primary" onClick={() => setRun((r) => r + 1)}>Drop again</button></div>
        </div>
        <Readouts items={[
          ["Crush stress", sig(sc / 1e6, 3), "MPa", "acc"],
          ["Peak deceleration", sig(res.peakG, 3), "g", res.peakG > gmax ? "hot" : "cool"],
          ["Stroke used", fmt(Math.min(999, (res.stroke / usable) * 100)), "%", res.stroke > usable ? "hot" : undefined],
          ["Core mass", sig(coreMass, 3), "g"],
          ["Energy in", sig(ke, 3), "J"],
          ["Your lightest pass", best == null ? "—" : sig(best, 3), "g"],
        ]} />
        <div className={"verdict " + (pass ? "good" : res.stopped && res.stroke <= usable ? "warn" : "bad")}>
          <b>{pass ? "Protected" : !res.stopped || res.stroke > usable ? "Bottoms out" : "Stops, but too hard"}</b>
          <p>{pass ? "It stops inside the usable stroke, under your deceleration limit. Now try to make it lighter." : !res.stopped || res.stroke > usable ? "The core is used up before the impactor stops: make it taller, bigger, or denser." : "It stops, but the crush force is too high for what you are protecting: a softer core or smaller area spreads the stop over more distance."}</p>
        </div>
        <p className="honest">Steel and PLA use the same folding law with their own strengths (PLA is an estimate: printed polymers crack). Densities quoted are relative to the solid foil. Strain-rate stiffening of aluminium honeycomb at impact speeds (up to ~30%) is not included.</p>
        <SoundCue label="Hear it crumple" />
      </aside>
      <Notes say="The trick of energy absorption is to stop something over a long distance at a steady force. Too dense and the force is too high; too soft and it runs out of stroke. The honeycomb's flat plateau makes it easy to hit the sweet spot." ask="For the car crash box, which matters more, the height of the block or its density?" />
    </div>
  );
}
