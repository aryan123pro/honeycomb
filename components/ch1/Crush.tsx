"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import HoneyBlock, { Press } from "@/components/three/HoneyBlock";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg, SoundCue } from "@/components/ui";
import { audio } from "@/lib/audio";
import { CELL_MATS, crushCurve, crushEnergy, crushStress, foilFor, foldH, INCH, PCF, PSI, sea, strokeOf, type Core, type CrushSpec } from "@/lib/honeycomb";
import { BAD, DEW, fmt, GOOD, HONEY, range, sig, STEEL } from "@/lib/plot";

/* "Crush, don't shatter": a 50 mm cube of HexWeb 3/16-5052-3.1 aluminium honeycomb in a testing
   machine, against an aluminium foam and a solid aluminium slab of the same mass (6.2 g). Stress–strain
   from lib/honeycomb.ts (Wierzbicki crush, calibrated to Hexcel's data; Gibson–Ashby foam). Energy is
   the area under the curve × volume. */

const SIDE = 0.05; // m
const VOL = SIDE ** 3;
const RHO_BAR = (3.1 * PCF) / 2680;
const D = (3 / 16) * INCH;
const SPEC = (core: Core, precrushed: boolean): CrushSpec => ({ core, mat: CELL_MATS.al, rhoBar: RHO_BAR, D, H: SIDE, precrushed });
const MASS_G = RHO_BAR * 2680 * VOL * 1000;
const SOLID_MM = RHO_BAR * SIDE * 1000;

function foamTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!; g.fillStyle = "#9aa1ad"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 11;
    const grd = g.createRadialGradient(x, y, r * 0.2, x, y, r); grd.addColorStop(0, "#3b3f47"); grd.addColorStop(0.8, "#6c727c"); grd.addColorStop(1, "rgba(154,161,173,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function FoamBlock({ strain, size }: { strain: number; size: number }) {
  const tex = useMemo(() => (typeof document === "undefined" ? null : foamTexture()), []);
  const m = useRef<THREE.Mesh>(null!);
  useFrame((_s, dt) => { const k = Math.max(0.03, 1 - strain); m.current.scale.y += (k - m.current.scale.y) * Math.min(1, dt * 10); m.current.position.y = (size * m.current.scale.y) / 2; });
  return <mesh ref={m} position={[0, size / 2, 0]} castShadow receiveShadow><boxGeometry args={[size, size, size]} /><meshStandardMaterial map={tex} roughness={0.8} metalness={0.5} /></mesh>;
}

export default function Crush() {
  const [core, setCore] = useState<Core>("honeycomb");
  const [pre, setPre] = useState(false);
  const [strain, setStrain] = useState(0);
  const [playing, setPlaying] = useState(false);
  const spec = SPEC(core, pre);
  const ed = core === "foam" ? 1 - 1.4 * RHO_BAR : strokeOf(RHO_BAR);
  const maxE = core === "solid" ? 0.002 : 0.86;
  const e = Math.min(strain, maxE);
  const sigma = crushCurve(spec, e);
  const energy = crushEnergy(spec, e) * VOL;

  // the run: the crosshead travels at a steady rate, like a quasi-static test
  const folds = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const f = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      setStrain((s) => {
        const n = Math.min(maxE, s + dt * (core === "solid" ? 0.0004 : 0.13));
        if (n >= maxE) setPlaying(false);
        return n;
      });
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [playing, core, maxE]);
  // a crunch for each fold that collapses
  const H = foldH(foilFor(RHO_BAR, D), D);
  useEffect(() => {
    if (core !== "honeycomb") return;
    const n = Math.floor((e * SIDE) / (2 * H * 1.0));
    if (n > folds.current) { audio().crunch(0.35, 700 + Math.random() * 500); }
    folds.current = n;
  }, [e, core, H]);

  // display: 1 unit = 1 cm; cells drawn 2× real so they read
  const disp = 5, dFold = Math.max((H * 100), disp / 18);
  const xs = useMemo(() => range(0, 0.86, 240), []);
  const curves = (["honeycomb", "foam"] as Core[]).map((c) => ({ c, ys: xs.map((x) => crushCurve(SPEC(c, pre), x) / 1e6) }));
  const yMax = 2.6;
  const colorOf = (c: Core) => (c === "honeycomb" ? HONEY : c === "foam" ? STEEL : BAD);

  return (
    <div className="split">
      <Plate n="I·3" title="A 50 mm cube in a testing machine" note="drag to turn · scroll to zoom">
        <Stage3D label="A testing machine crushing a honeycomb cube, a foam cube, or a thin solid slab of the same mass" camera={{ position: [10, 2.4, 13], fov: 38 }} look={{ bloom: 0.45, ao: 0.5 }}
          overlay={<>
            <CellTag>Specimen I·3 · HexWeb 3/16-5052-3.1 · {fmt(e * 100, core === "solid" ? 2 : 0)}% crushed</CellTag>
            <div className="hud tag hud-tr">
              <span className="k">load cell</span>
              <span className="big" style={{ color: core === "solid" && e > 0 ? BAD : HONEY }}>{sig(sigma * SIDE * SIDE / 1000, 3)}<small>kN</small></span>
              <span className="k">energy absorbed</span>
              <span className="big">{sig(energy, 3)}<small>J</small></span>
            </div>
          </>}>
          <group position={[0, -3, 0]}>
            <Press top={core === "solid" ? SOLID_MM / 10 * (1 - e) : disp * (1 - e)} width={9} height={9} plate={3.1} />
            {core === "honeycomb" && <HoneyBlock cell={1} nx={6} nz={5} height={disp} wall={0.035} crush={disp * e} fold={dFold} stroke={0.78} />}
            {core === "foam" && <FoamBlock strain={e} size={disp} />}
            {core === "solid" && <mesh position={[0, SOLID_MM / 20, 0]} castShadow><boxGeometry args={[disp, Math.max(0.03, SOLID_MM / 10), disp]} /><meshStandardMaterial color="#c9ced8" metalness={0.95} roughness={0.2} /></mesh>}
            <Label3D position={[-5.6, 3.2, 2]} color={colorOf(core)} size={0.5}>{core === "honeycomb" ? "ALUMINIUM HONEYCOMB" : core === "foam" ? "ALUMINIUM FOAM" : `SOLID SLAB · ${SOLID_MM.toFixed(2)} MM`}</Label3D>
            <Label3D position={[-5.6, 2.5, 2]} color="#8a8770" size={0.36}>{`same mass: ${MASS_G.toFixed(1)} g`}</Label3D>
          </group>
          <OrbitControls makeDefault target={[0, -0.8, 0]} enablePan={false} minDistance={6} maxDistance={30} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <Seg options={[["honeycomb", "Honeycomb"], ["foam", "Foam"], ["solid", "Solid slab"]]} value={core} onChange={(c) => { setCore(c); setStrain(0); setPlaying(false); }} label="Core" />
        <div className="btnrow">
          <button className="btn sm primary" onClick={() => { if (strain >= maxE - 1e-6) setStrain(0); setPlaying((p) => !p); }}>{playing ? "Pause" : strain > 0 && strain < maxE ? "Carry on" : "Run the test"}</button>
          <button className="btn sm" onClick={() => { setStrain(0); setPlaying(false); }}>Reset</button>
          {core === "honeycomb" && <button className="btn sm" aria-pressed={pre} onClick={() => setPre((p) => !p)}>Pre-crushed</button>}
        </div>
        <Range label="Crosshead travel" value={e} min={0} max={maxE} step={maxE / 400} onChange={(v) => { setPlaying(false); setStrain(v); }} fmt={(v) => (core === "solid" ? fmt(v * SIDE * 1e6, 0) + " µm" : fmt(v * SIDE * 1000, 1) + " mm")} />
        <Plot label="Stress against strain for the honeycomb and foam cores" height={230} opts={{
          x: [0, 0.86], y: [0, yMax], padL: 40, xlabel: "strain (crush ÷ height)", ylabel: "stress (MPa)",
          xticks: [0, 0.2, 0.4, 0.6, 0.8], yticks: [0, 0.5, 1, 1.5, 2, 2.5],
          series: curves.map(({ c, ys }) => ({ xs, data: ys, color: colorOf(c) + (c === core ? "" : "55"), width: c === core ? 2.5 : 1.5, fill: c === core ? colorOf(c) + "22" : undefined })),
          markers: core !== "solid" ? [{ x: ed, label: "densifies", color: "#8a8770" }] : [],
          cursor: core !== "solid" ? { x: e, y: sigma / 1e6, color: colorOf(core) } : undefined,
        }} />
        <Readouts items={[
          ["Crush stress", core === "solid" ? "215" : sig((core === "foam" ? 0.3 * CELL_MATS.al.s0 * RHO_BAR ** 1.5 : crushStress(CELL_MATS.al, RHO_BAR)) / 1e6, 2), "MPa", "acc"],
          ["Energy to 70%", core === "solid" ? "≈0" : sig(crushEnergy(spec, ed) * VOL, 3), "J"],
          ["Per gram", core === "solid" ? "≈0" : sig(sea(spec), 3), "J/g", core === "honeycomb" ? "cool" : undefined],
          ["Mass", MASS_G.toFixed(1), "g"],
        ]} />
        {core === "solid" && <div className="verdict bad"><b>Passes the shock straight on</b><p>The same 6 g as a solid slab is under a millimetre thick. It can squash only a few micrometres before it reaches the metal&apos;s strength: almost no stroke, so almost no energy absorbed, and the full force reaches whatever is behind it.</p></div>}
        {core !== "solid" && <p className="honest"><b>Model check:</b> Wierzbicki&apos;s formula with σ0 = 215 MPa gives {sig(crushStress(CELL_MATS.al, RHO_BAR) / PSI, 3)} psi for this product; Hexcel&apos;s data sheet says 130 psi crush, 290 psi bare peak. Cells and folds are drawn larger than real ({(H * 1000).toFixed(2)} mm half-wave) so you can see them.</p>}
        <SoundCue label="Hear it crumple" />
      </div>
      <Notes say="Same aluminium, same 6 grams, three shapes. The honeycomb crushes at a steady force, fold by fold, until it has used 70% of its height. The foam is far weaker. The solid slab doesn't crush at all, so it absorbs nothing and passes the blow on." show="Run the honeycomb test, then toggle pre-crushed to remove the first spike, then try foam." ask="Why is a flat force better than a spike for protecting a passenger or a building?" />
    </div>
  );
}
