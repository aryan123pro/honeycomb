"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg } from "@/components/ui";
import { massPerArea, PCF, PSI, sandwichVsSolid, threePoint, type Sandwich as SW } from "@/lib/honeycomb";
import { fmt, GOOD, HONEY, MUTED, range, sig, WAX } from "@/lib/plot";

/* The sandwich. Take a 2 mm aluminium sheet; split it into two 1 mm skins and glue a honeycomb core
   between them. Three-point bending over a 400 mm span, 100 mm wide, with a central load. Deflection =
   bending + core shear (Allen's sandwich theory, lib/honeycomb.ts). The 3D beam bends with exactly the
   computed shape: w(x) = P(3L²x − 4x³)/(48D) + P x/(2S) for x ≤ L/2, drawn ×`exag`. */

const L = 0.4, B = 0.1, T = 0.002;
const AL = { Ef: 70e9, rhoF: 2700, sfY: 200e6 };
const CORE = { Gc: 45e3 * PSI, rhoC: 3.1 * PCF, tauC: 210 * PSI, Ec: 75e3 * PSI };
const build = (k: number): SW => (k <= 0 ? { tf: T / 2, c: 0, ...AL, ...CORE } : { tf: T / 2, c: k * T, ...AL, ...CORE });
const solidD = (AL.Ef * T ** 3) / 12;

function hexSideTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 64;
  const g = c.getContext("2d")!; g.fillStyle = "#3a3d33"; g.fillRect(0, 0, 512, 64);
  g.strokeStyle = "#d6dae0"; g.lineWidth = 2;
  // side view of a honeycomb core: double walls every cell, single walls between
  for (let x = 0; x < 512; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); if ((x / 16) % 2 === 0) { g.beginPath(); g.moveTo(x + 3, 0); g.lineTo(x + 3, 64); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

/** A box whose vertices are bent along x by w(x); y is up. */
function BentBox({ len, h, w, y0, color, defl, metal = 0.85, map }: { len: number; h: number; w: number; y0: number; color: string; defl: (x: number) => number; metal?: number; map?: THREE.Texture | null }) {
  const geo = useMemo(() => new THREE.BoxGeometry(len, h, w, 80, 1, 1), [len, h, w]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useEffect(() => () => geo.dispose(), [geo]);
  const dRef = useRef(defl); dRef.current = defl;
  const cur = useRef(0);
  useFrame((_s, dt) => {
    cur.current += (1 - cur.current) * Math.min(1, dt * 6);
    const p = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < p.length; i += 3) { p[i] = base[i]; p[i + 1] = base[i + 1] + y0 - dRef.current(base[i]) * cur.current; p[i + 2] = base[i + 2]; }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  });
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color={color} metalness={metal} roughness={0.3} map={map ?? null} /></mesh>;
}

export default function Sandwich() {
  const [k, setK] = useState(1);
  const [P, setP] = useState(20);
  const s = build(k);
  const r = threePoint(s, P / B, L);       // per unit width
  const solid = (P * L ** 3) / (48 * solidD * B);
  const ratio = sandwichVsSolid(Math.max(0, k));
  const wt = massPerArea(s) / (2700 * T);
  // drawn so the solid sheet bows 3 cm at 20 N; the same factor for every build and load
  const exag = 0.03 / ((20 * L ** 3) / (48 * solidD * B));
  const D = (AL.Ef * s.tf * (s.c + s.tf) ** 2) / 2 + (AL.Ef * s.tf ** 3) / 6;
  const S = s.c > 0 ? (CORE.Gc * (s.c + s.tf) ** 2) / s.c : Infinity;
  const defl = (xm: number) => { const x = Math.min(Math.abs(xm), L / 2); const xx = L / 2 - x; const pw = P / B; return (pw * (3 * L * L * xx - 4 * xx ** 3)) / (48 * D) + (S === Infinity ? 0 : (pw * xx) / (2 * S)); };
  const tex = useMemo(() => (typeof document === "undefined" ? null : hexSideTexture()), []);
  useEffect(() => { if (tex) tex.repeat.set(L / 0.012, 1); }, [tex]);

  // display: 1 unit = 1 cm, thickness ×4 so the core shows
  const u = 100, th = 4;
  const dd = (x: number) => defl(x / u) * u * exag;
  const ks = range(0, 6, 60);
  const ks3 = [0, 1, 3];
  return (
    <div className="split">
      <Plate n="I·4" title="Split the sheet, add a core" note="drag to turn · scroll to zoom">
        <Stage3D label="A three-point bending test of a solid aluminium sheet or a honeycomb sandwich panel" camera={{ position: [14, 12, 62], fov: 34 }} look={{ bloom: 0.4, ao: 0.4 }}
          overlay={<>
            <CellTag>Specimen I·4 · three-point bend · {P} N</CellTag>
            <div className="hud tag hud-tr">
              <span className="k">mid-span sag</span>
              <span className="big" style={{ color: HONEY }}>{sig(r.total * 1000, 3)}<small>mm</small></span>
              <span className="k">solid 2 mm sheet: {sig(solid * 1000, 3)} mm</span>
            </div>
            <div className="hud tag hud-bl">sag drawn ×{fmt(exag, 0)} · thickness ×{th}</div>
          </>}>
          <group position={[0, -2, 0]}>
            {/* supports and the loading nose */}
            {[-1, 1].map((sg) => <mesh key={sg} position={[sg * L * u / 2, -0.6, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 14, 24]} /><meshStandardMaterial color="#9aa0a8" metalness={0.9} roughness={0.25} /></mesh>)}
            {[-1, 1].map((sg) => <mesh key={"p" + sg} position={[sg * L * u / 2, -3, 0]}><boxGeometry args={[2.4, 4, 13]} /><meshStandardMaterial color="#2c2f24" roughness={0.6} /></mesh>)}
            <Nose y={(s.c + 2 * s.tf) * u * th + 0.6 - dd(0)} />
            {k <= 0 ? (
              <BentBox len={L * u + 4} h={T * u * th} w={B * u} y0={T * u * th / 2} color="#c9ced8" defl={dd} />
            ) : (
              <>
                <BentBox len={L * u + 4} h={s.tf * u * th} w={B * u} y0={s.tf * u * th / 2} color="#c9ced8" defl={dd} />
                <BentBox len={L * u + 4} h={s.c * u * th} w={B * u * 0.995} y0={s.tf * u * th + (s.c * u * th) / 2} color="#d9cfa8" defl={dd} metal={0.4} map={tex} />
                <BentBox len={L * u + 4} h={s.tf * u * th} w={B * u} y0={(s.tf + s.c) * u * th + (s.tf * u * th) / 2} color="#c9ced8" defl={dd} />
              </>
            )}
            <Label3D position={[-L * u / 2 - 2, 4.5 + k * 0.8, 6]} color={HONEY} size={1.1}>{k <= 0 ? "SOLID 2 MM SHEET" : `SANDWICH · CORE ${fmt(k * 2, 1)} MM`}</Label3D>
          </group>
          <OrbitControls makeDefault target={[0, 0, 0]} enablePan={false} minDistance={20} maxDistance={110} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <Seg options={[[0, "Solid t"], [1, "Sandwich 2t"], [3, "Sandwich 4t"]]} value={ks3.includes(k) ? k : -1} onChange={setK} label="Build" />
        <Range label="Core thickness" value={k} min={0} max={6} step={0.1} onChange={setK} fmt={(v) => (v <= 0 ? "none (solid)" : fmt(v * 2, 1) + " mm = " + fmt(v, 1) + "t")} />
        <Range label="Load at mid-span" value={P} min={5} max={60} step={1} onChange={setP} fmt={(v) => v + " N"} />
        <Readouts items={[
          ["Stiffer than solid", k <= 0 ? "1.0" : fmt(ratio.stiffness, 1), "×", "acc"],
          ["Stronger", k <= 0 ? "1.0" : fmt(ratio.strength, 2), "×"],
          ["Heavier", "+" + fmt((wt - 1) * 100, 1), "%", "cool"],
          ["Core shear share", k <= 0 ? "0" : fmt((r.shear / r.total) * 100, 1), "%"],
        ]} />
        <Plot label="Stiffness gain against core thickness, with Hexcel's table" height={200} opts={{
          x: [0, 6], y: [0, 60], padL: 38, xlabel: "core thickness (× sheet thickness t)", ylabel: "stiffness ×",
          xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [0, 10, 20, 30, 40, 50, 60],
          series: [{ xs: ks, data: ks.map((x) => (x <= 0 ? 1 : sandwichVsSolid(x).stiffness)), color: HONEY, width: 2.5 }],
          points: [{ x: 1, y: 7, color: GOOD, r: 5, ring: true, label: "Hexcel 7×" }, { x: 3, y: 37, color: GOOD, r: 5, ring: true, label: "Hexcel 37×" }],
          cursor: { x: Math.max(0, k), y: k <= 0 ? 1 : ratio.stiffness, color: WAX },
        }} />
        <div className="tablewrap"><table className="data">
          <thead><tr><th></th><th>Solid t</th><th>2t sandwich</th><th>4t sandwich</th></tr></thead>
          <tbody>
            <tr><td>Stiffness</td><td className="n">1</td><td className="n">7.0 <span className="faint">(Hexcel 7)</span></td><td className="n">37 <span className="faint">(Hexcel 37)</span></td></tr>
            <tr><td>Strength</td><td className="n">1</td><td className="n">3.5 <span className="faint">(3.5)</span></td><td className="n">9.25 <span className="faint">(9.25)</span></td></tr>
            <tr><td>Weight</td><td className="n">1</td><td className="n">{fmt(massPerArea(build(1)) / (2700 * T), 3)} <span className="faint">(1.03)</span></td><td className="n">{fmt(massPerArea(build(3)) / (2700 * T), 3)} <span className="faint">(1.06)</span></td></tr>
          </tbody>
        </table></div>
        <p className="honest">Bending stiffness grows with the square of how far apart the skins are; the core only has to hold them apart and carry shear. Weights use a 3.1 pcf aluminium core and no adhesive (Hexcel&apos;s 1.03 and 1.06 include glue). <span style={{ color: MUTED }}>The deck&apos;s &ldquo;7× stiffness for 25% more volume&rdquo; is the same idea for a different panel.</span></p>
      </div>
      <Notes say="Same metal. We just moved half of it up and put a honeycomb in between. The panel is seven times stiffer and only 2% heavier. That's why aircraft floors, flaps and radomes are honeycomb sandwich." show="Slide the core from zero up to 4t and watch the sag shrink; the dots on the chart are Hexcel's own numbers." ask="If stiffness grows so fast with thickness, why not make the core a metre thick?" />
    </div>
  );
}

function Nose({ y }: { y: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => { g.current.position.y += (y - g.current.position.y) * Math.min(1, dt * 6); });
  return (
    <group ref={g} position={[0, y, 0]}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 14, 24]} /><meshStandardMaterial color="#f2b134" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 3.2, 0]}><boxGeometry args={[1.2, 5, 4]} /><meshStandardMaterial color="#4a4d3e" roughness={0.6} metalness={0.3} /></mesh>
    </group>
  );
}
