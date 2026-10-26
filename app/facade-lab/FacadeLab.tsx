"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { towerLoads } from "@/components/ch1/Facade";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { TOWER_H } from "@/components/three/Tower";
import { CellTag, Notes, Plate, Range, Readouts, Seg } from "@/components/ui";
import { fp, G, massPerArea, PANELS, PCF, pressureStrip, PSI, type Sandwich } from "@/lib/honeycomb";
import { fmt, HONEY, sig } from "@/lib/plot";

/* L3 · Facade Lab: the deck's problem statement, solved by design. A storey-height facade panel spans
   vertically between two floor slabs (simply supported, 1.5 m wide). You choose the aluminium skins and a
   HexWeb 1/4" aluminium core (density sets its shear stiffness, shear strength and crush strength, all
   from Hexcel's data sheet), then check it against:
   - wind: deflection ≤ span/175 (a common curtain-wall limit), skin stress ≤ yield/1.5, core shear ≤
     typical strength/1.5, and face wrinkling 0.5 (Ef Ec Gc)^(1/3) ≥ 1.5 × skin stress;
   - earthquake: ASCE 7-16 Fp on a roof-level panel ≤ the capacity of its four fixings;
   - impact: a falling object crushes the core under a 100 × 100 mm footprint; the dent must stay within
     the usable 70% of the core, and the force reaching the fixings is crush stress × footprint.
   Sandwich theory (lib/honeycomb.ts): δ = 5qL⁴/(384D) + qL²/(8S). */

// HexWeb CR III 5052, 1/4" cells: [pcf, L shear typ psi, L shear modulus ksi, stabilised compressive modulus ksi, crush psi]
const CORES: [number, number, number, number, number][] = [[1.6, 85, 21, 20, 40], [2.3, 140, 32, 45, 75], [3.4, 230, 50, 90, 150], [4.3, 320, 66, 140, 230], [5.2, 410, 82, 190, 335], [6.0, 530, 96, 235, 430]];
const W = 1.5; // panel width, m
const SY = 160e6; // 5005-H34 facade skin yield (≈ 160 MPa)
const IMPACTS = [
  { id: "hail", name: "Hailstone", m: 0.05, h: 20, note: "A 5 cm, 50 g hailstone at terminal speed (~20 m/s ≈ a 20 m fall)." },
  { id: "tool", name: "Dropped tool", m: 1, h: 5, note: "A 1 kg spanner from 5 m above, on a maintenance day." },
  { id: "debris", name: "Blast debris", m: 2, h: 30, note: "A 2 kg fragment at ~24 m/s (equivalent to a 30 m fall), thrown by a nearby explosion." },
] as const;

function PanelBay({ L, tf, c, defl, shake, dent, impactor }: { L: number; tf: number; c: number; defl: (y: number) => number; shake: boolean; dent: number; impactor: number }) {
  const th = 12; // thickness drawn ×12 so the core shows
  const geos = useMemo(() => [tf, c, tf].map((t) => new THREE.BoxGeometry(W, L, t * th, 1, 60, 1)), [L, tf, c]);
  const bases = useMemo(() => geos.map((g) => Float32Array.from(g.attributes.position.array as Float32Array)), [geos]);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  const dRef = useRef(defl); dRef.current = defl;
  const grp = useRef<THREE.Group>(null!);
  const imp = useRef<THREE.Mesh>(null!);
  const tImp = useRef(0);
  useEffect(() => { tImp.current = 0; }, [impactor]);
  useFrame(({ clock }, dt) => {
    // layers stack back from the outer skin; the inner skin bows with the rest but takes no dent
    const offs = [0, tf * th / 2 + c * th / 2, tf * th + c * th];
    geos.forEach((g, k) => {
      const p = g.attributes.position.array as Float32Array, b = bases[k];
      for (let i = 0; i < p.length; i += 3) {
        const y = b[i + 1] + L / 2;
        // bow under wind, plus the impact dent (Gaussian, front skin and core only)
        const r2 = b[i] * b[i] + (y - L * 0.55) ** 2;
        const dz = -dRef.current(y) + (k < 2 && impactor > 0 ? -dent * th * Math.exp(-r2 / 0.012) * Math.min(1, tImp.current * 3) : 0);
        p[i] = b[i]; p[i + 1] = b[i + 1]; p[i + 2] = b[i + 2] - offs[k] + dz;
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
    });
    grp.current.position.x = shake ? Math.sin(clock.elapsedTime * 2 * Math.PI * 1.2) * 0.06 : 0;
    if (impactor > 0) {
      tImp.current += dt;
      const u = Math.min(1, tImp.current * 1.6);
      imp.current.visible = true;
      imp.current.position.set(0, L * 0.05 + L * 0.5, 1.2 * (1 - u) + 0.08);
    } else imp.current.visible = false;
  });
  const mats = [
    <meshStandardMaterial key="a" color="#d9dde3" metalness={0.8} roughness={0.3} />,
    <meshStandardMaterial key="b" color="#e6d29a" metalness={0.3} roughness={0.6} />,
    <meshStandardMaterial key="c" color="#c9ced8" metalness={0.8} roughness={0.35} />,
  ];
  return (
    <group>
      {/* slab edges and mullions */}
      {[0, L].map((y) => <mesh key={y} position={[0, y - L / 2, -0.6]} receiveShadow><boxGeometry args={[3.4, 0.3, 1.2]} /><meshStandardMaterial color="#8d8b80" roughness={0.85} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 2 + 0.06), 0, -0.1]}><boxGeometry args={[0.08, L, 0.18]} /><meshStandardMaterial color="#5a5e66" metalness={0.8} roughness={0.35} /></mesh>)}
      <group ref={grp}>
        {geos.map((g, k) => <mesh key={k} geometry={g} castShadow receiveShadow>{mats[k]}</mesh>)}
      </group>
      {/* fixings */}
      {[[-0.6, -L / 2 + 0.05], [0.6, -L / 2 + 0.05], [-0.6, L / 2 - 0.05], [0.6, L / 2 - 0.05]].map(([x, y], i) => <mesh key={i} position={[x, y, -0.05]}><boxGeometry args={[0.12, 0.12, 0.2]} /><meshStandardMaterial color="#f2b134" metalness={0.5} roughness={0.4} /></mesh>)}
      <mesh ref={imp} visible={false}><sphereGeometry args={[0.07, 20, 16]} /><meshStandardMaterial color="#8b93a6" metalness={0.9} roughness={0.25} /></mesh>
    </group>
  );
}

export default function FacadeLab() {
  const [tfmm, setTf] = useState(1.0);
  const [cmm, setC] = useState(25);
  const [ci, setCi] = useState(2);
  const [L, setL] = useState(3.5);
  const [q, setQ] = useState(1.2);
  const [sds, setSds] = useState(1.0);
  const [fix, setFix] = useState(1.5);
  const [impId, setImpId] = useState<(typeof IMPACTS)[number]["id"]>("tool");
  const [load, setLoad] = useState<"wind" | "quake" | "impact">("wind");
  const [shot, setShot] = useState(0);
  const core = CORES[ci];
  const s: Sandwich = { tf: tfmm / 1000, c: cmm / 1000, Ef: 70e9, rhoF: 2700, sfY: SY, Gc: core[2] * 1000 * PSI, rhoC: core[0] * PCF, tauC: core[1] * PSI, Ec: core[3] * 1000 * PSI };
  const r = pressureStrip(s, q * 1000, L);
  const kgm2 = massPerArea(s);
  const limit = L / 175;
  const panelW = kgm2 * G * W * L;
  const Fp = fp(panelW, sds, TOWER_H, TOWER_H);
  const imp = IMPACTS.find((x) => x.id === impId)!;
  const E = imp.m * G * imp.h, Aimp = 0.01, sc = core[4] * PSI;
  const dent = E / (sc * Aimp);
  const checks = [
    { k: "Wind deflection", v: `${sig(r.total * 1000, 3)} mm`, lim: `≤ ${sig(limit * 1000, 3)} mm (L/175)`, ok: r.total <= limit },
    { k: "Skin stress", v: `${sig(r.faceStress / 1e6, 3)} MPa`, lim: `≤ ${fmt(SY / 1.5 / 1e6)} MPa`, ok: r.faceStress <= SY / 1.5 },
    { k: "Core shear", v: `${sig(r.coreShear / 1e3, 3)} kPa`, lim: `≤ ${sig(s.tauC / 1.5 / 1e3, 3)} kPa`, ok: r.coreShear <= s.tauC / 1.5 },
    { k: "Face wrinkling", v: `${sig(r.wrinkle / 1e6, 3)} MPa`, lim: `≥ ${sig((1.5 * r.faceStress) / 1e6, 3)} MPa`, ok: r.wrinkle >= 1.5 * r.faceStress },
    { k: "Seismic fixings (roof)", v: `${sig(Fp / 1000, 3)} kN`, lim: `≤ ${fmt(4 * fix, 1)} kN`, ok: Fp <= 4 * fix * 1000 },
    { k: "Impact dent", v: `${sig(dent * 1000, 3)} mm`, lim: `≤ ${sig(0.7 * cmm, 3)} mm`, ok: dent <= 0.7 * s.c },
  ];
  const allOk = checks.every((c) => c.ok);
  const precast = towerLoads(PANELS[0].kgm2, sds);
  const D = (s.Ef * s.tf * (s.c + s.tf) ** 2) / 2 + (s.Ef * s.tf ** 3) / 6, S = (s.Gc * (s.c + s.tf) ** 2) / s.c;
  // the drawn bow: 12 cm at the L/175 limit, never more than 30 cm however soft the panel
  const exag = load === "wind" ? Math.min(0.12 / limit, 0.3 / Math.max(1e-6, r.total)) : 0;
  const defl = (y: number) => exag * ((q * 1000) / (24 * D) * (y ** 4 - 2 * L * y ** 3 + L ** 3 * y) + ((q * 1000) / (2 * S)) * (L * y - y * y));

  return (
    <div className="lab-grid">
      <div className="stack">
        <Plate n="L3" title="One facade bay: your panel between two floors" note="drag to turn · scroll to zoom">
          <Stage3D label="A facade panel spanning between two floor slabs, bowing in wind, shaking, or being struck" camera={{ position: [3.4, 0.9, 6.4], fov: 42 }} look={{ bloom: 0.4, ao: 0.4 }}
            overlay={<>
              <CellTag>Facade Lab · {fmt(L, 1)} m span · {sig(kgm2, 3)} kg/m²</CellTag>
              <div className="hud tag hud-tr"><span className="k">design checks</span><span className={"outcome " + (allOk ? "good" : "bad")} style={{ fontSize: "1.5rem" }}>{checks.filter((c) => c.ok).length} / {checks.length} pass</span><span className="k">{load === "wind" ? "bow drawn exaggerated" : load === "quake" ? "shaking at 1.2 Hz" : "impact at mid-height"}</span></div>
            </>}>
            <PanelBay L={L} tf={s.tf} c={s.c} defl={defl} shake={load === "quake"} dent={load === "impact" ? Math.min(dent, s.c) : 0} impactor={load === "impact" ? shot + 1 : 0} />
            <Label3D position={[-1.4, L / 2 + 0.35, 0]} color={HONEY} size={0.18}>{`SKIN ${fmt(tfmm, 1)} MM · CORE ${cmm} MM · ${core[0]} PCF`}</Label3D>
            <OrbitControls makeDefault enablePan={false} minDistance={2.5} maxDistance={12} />
          </Stage3D>
        </Plate>
        <div className="checks">
          {checks.map((c) => <div key={c.k} className={"check " + (c.ok ? "pass" : "fail")}><span className="dot" /><span><b>{c.k}</b>{c.lim}</span><span className="v">{c.v}</span></div>)}
        </div>
      </div>
      <aside className="lab-side">
        <div className="panel">
          <h4>Panel</h4>
          <Range label="Span (floor to floor)" value={L} min={2.5} max={4.5} step={0.1} onChange={setL} fmt={(v) => fmt(v, 1) + " m"} />
          <Range label="Aluminium skins" value={tfmm} min={0.5} max={3} step={0.1} onChange={setTf} fmt={(v) => fmt(v, 1) + " mm each"} />
          <Range label="Honeycomb core" value={cmm} min={10} max={120} step={1} onChange={setC} fmt={(v) => v + " mm"} />
          <Range label="Core density (HexWeb ¼″)" value={ci} min={0} max={CORES.length - 1} step={1} onChange={setCi} fmt={(v) => CORES[v][0] + " pcf"} />
        </div>
        <div className="panel">
          <h4>Loads</h4>
          <Seg options={[["wind", "Wind"], ["quake", "Earthquake"], ["impact", "Impact"]]} value={load} onChange={(v) => { setLoad(v); if (v === "impact") setShot((x) => x + 1); }} label="Show" />
          <Range label="Wind pressure" value={q} min={0.4} max={3} step={0.1} onChange={setQ} fmt={(v) => fmt(v, 1) + " kPa"} />
          <Range label="Design shaking S_DS" value={sds} min={0.2} max={1.6} step={0.05} onChange={setSds} fmt={(v) => v.toFixed(2) + " g"} />
          <Range label="Capacity per fixing (×4)" value={fix} min={0.5} max={10} step={0.5} onChange={setFix} fmt={(v) => fmt(v, 1) + " kN"} />
          <Seg options={IMPACTS.map((x) => [x.id, x.name])} value={impId} onChange={(v) => { setImpId(v); setLoad("impact"); setShot((x) => x + 1); }} label="Impact" />
          <p className="faint" style={{ fontSize: 12.5 }}>{imp.note} {sig(E, 3)} J.</p>
        </div>
        <Readouts items={[
          ["Panel mass", sig(kgm2, 3), "kg/m²", "acc"],
          ["vs precast", fmt((kgm2 / PANELS[0].kgm2) * 100, 1), "%", "cool"],
          ["Roof fixing force", sig(Fp / 1000, 3), "kN"],
          ["Precast needs", sig(precast.fpRoof * (W * L) / (1.5 * 3.5) / 1000, 3), "kN"],
        ]} />
        <div className={"verdict " + (allOk ? "good" : "bad")}><b>{allOk ? "A light, safe facade" : "Not yet"}</b><p>{allOk ? `Every check passes at ${sig(kgm2, 3)} kg/m², about ${fmt(PANELS[0].kgm2 / kgm2, 0)}× lighter than precast concrete. That's the problem statement answered.` : "Stiffness comes from separating the skins (core thickness); strength from the skins; impact from core density and thickness. Change one thing at a time."}</p></div>
        <p className="honest">One-way span, simply supported, 1.5 m wide; real panels are often fixed on four edges and do better. Allowables and the L/175 limit are typical, not a code check. Core properties from Hexcel&apos;s data sheet (typical values ÷ 1.5).</p>
      </aside>
      <Notes say="This is the problem statement as a design job. The honeycomb panel has to be stiff enough for wind, light enough that the earthquake force on its fixings is small, and crushable enough to absorb a blow. All three come from the same idea: skins held apart by a light cellular core." ask="Which single change helps the most checks at once?" />
    </div>
  );
}
