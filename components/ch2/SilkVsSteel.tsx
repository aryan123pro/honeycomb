"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg } from "@/components/ui";
import { audio } from "@/lib/audio";
import { fmt, range, sig } from "@/lib/plot";
import { DECK_TOUGHNESS, FIBRES, specificToughness, stress, toughness, type Fibre } from "@/lib/silk";

/* Silk vs steel (deck slides 29–30). Four fibres in one tensile machine, pulled to the same strain at
   once: Kevlar snaps at 2.7%, the high-strength steel at 12%, garden-spider dragline at 27%, Darwin's bark
   spider at 52%. The area under each curve is its toughness (energy to break per volume); switch to
   "per gram" and every stress is divided by density, which is where silk's famous lead comes from:
   steel is six times denser. */

const ORDER = ["kevlar", "steel", "araneus", "darwin"] as const;
const L0 = 4; // display length of each fibre at rest

function FibreRod({ f, x, strain }: { f: Fibre; x: number; strain: number }) {
  const broke = strain > f.ef;
  const top = useRef<THREE.Mesh>(null!), bot = useRef<THREE.Mesh>(null!);
  const snapped = useRef(false);
  useEffect(() => { if (broke && !snapped.current) { audio().snap(0.4); snapped.current = true; } if (!broke) snapped.current = false; }, [broke]);
  const glow = useMemo(() => new THREE.Color(f.color), [f.color]);
  useFrame((_s, dt) => {
    const len = L0 * (1 + Math.min(strain, f.ef));
    if (!broke) {
      top.current.visible = true; bot.current.visible = false;
      top.current.scale.y = len; top.current.position.y = len / 2;
      const load = stress(f, strain) / f.sf;
      (top.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + load * 1.6;
    } else {
      // recoil: the two halves spring back toward the grips
      const k = Math.min(1, dt * 6);
      bot.current.visible = true;
      top.current.scale.y += (L0 * 0.45 - top.current.scale.y) * k; top.current.position.y = top.current.scale.y / 2;
      bot.current.scale.y += (L0 * 0.45 - bot.current.scale.y) * k; bot.current.position.y = L0 * (1 + strainTop(strain)) - bot.current.scale.y / 2;
      (top.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
    }
  });
  const mat = <meshStandardMaterial color={f.color} emissive={glow} emissiveIntensity={0.2} roughness={0.35} metalness={f.id === "steel" ? 0.9 : 0.2} toneMapped={false} />;
  return (
    <group position={[x, 0, 0]}>
      <mesh ref={top}><cylinderGeometry args={[0.05, 0.05, 1, 12]} />{mat}</mesh>
      <mesh ref={bot} visible={false}><cylinderGeometry args={[0.05, 0.05, 1, 12]} />{mat}</mesh>
      <Label3D position={[0, -0.8, 0.4]} color={f.color} size={0.26}>{f.short.toUpperCase()}</Label3D>
    </group>
  );
}
const strainTop = (s: number) => Math.min(s, 0.6);

function Grip({ y }: { y: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => { g.current.position.y += (y - g.current.position.y) * Math.min(1, dt * 10); });
  return <group ref={g} position={[0, y, 0]}><mesh><boxGeometry args={[7.4, 0.45, 1]} /><meshStandardMaterial color="#3a3e46" metalness={0.7} roughness={0.35} /></mesh><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.3, 0.3, 0.6, 20]} /><meshStandardMaterial color="#9fd8ff" metalness={0.5} roughness={0.3} /></mesh></group>;
}

export default function SilkVsSteel() {
  const [strain, setStrain] = useState(0);
  const [play, setPlay] = useState(false);
  const [per, setPer] = useState<"vol" | "mass">("vol");
  useEffect(() => {
    if (!play) return;
    let raf = 0, last = performance.now();
    const f = (t: number) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; setStrain((s) => { const n = s + dt * 0.07; if (n >= 0.56) { setPlay(false); return 0.56; } return n; }); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [play]);
  const fibres = ORDER.map((k) => FIBRES[k]);
  const xs = range(0, 0.56, 300);
  const scale = (f: Fibre) => (per === "vol" ? 1 : 1300 / f.rho); // per mass, normalised to silk's density
  const yMax = per === "vol" ? 3.8 : 3.8;
  return (
    <div className="split">
      <Plate n="II·4" title="Four fibres, one tensile machine" note="drag to turn">
        <Stage3D label="A tensile test pulling Kevlar, steel and two spider silks until each snaps" camera={{ position: [0, 2.2, 15.5], fov: 40 }} look={{ bloom: 0.9, threshold: 0.55 }} background="radial-gradient(ellipse 70% 70% at 50% 45%, #1b2026, #0c0d0f 80%)"
          overlay={<>
            <CellTag>Specimen II·4 · tensile test · strain {fmt(strain * 100)}%</CellTag>
            <div className="hud tag hud-tr"><span className="k">still holding</span><span className="big">{fibres.filter((f) => strain <= f.ef).length}<small>of 4</small></span></div>
          </>}>
          <group position={[0, -2.6, 0]}>
            <mesh position={[0, -0.25, 0]}><boxGeometry args={[7.4, 0.45, 1]} /><meshStandardMaterial color="#3a3e46" metalness={0.7} roughness={0.35} /></mesh>
            {fibres.map((f, i) => <FibreRod key={f.id} f={f} x={(i - 1.5) * 1.8} strain={strain} />)}
            <Grip y={L0 * (1 + strainTop(strain)) + 0.22} />
            <Label3D position={[4.6, L0 * (1 + strainTop(strain)) + 0.2, 0]} color="#9fd8ff" size={0.24}>{`+${fmt(strain * 100)}%`}</Label3D>
          </group>
          <OrbitControls makeDefault target={[0, 0.8, 0]} enablePan={false} minDistance={6} maxDistance={24} />
        </Stage3D>
      </Plate>
      <div className="stack">
        <div className="btnrow">
          <button className="btn sm primary" onClick={() => { if (strain >= 0.55) setStrain(0); setPlay((p) => !p); }}>{play ? "Pause" : strain >= 0.55 ? "Pull again" : strain > 0 ? "Carry on" : "Pull"}</button>
          <button className="btn sm" onClick={() => { setStrain(0); setPlay(false); }}>Reset</button>
          <Seg options={[["vol", "Per volume"], ["mass", "Per gram"]]} value={per} onChange={setPer} label="Compare" />
        </div>
        <Range label="Stretch" value={strain} min={0} max={0.56} step={0.002} onChange={(v) => { setPlay(false); setStrain(v); }} fmt={(v) => fmt(v * 100, 1) + "%"} />
        <Plot label="Stress against strain for four fibres" height={240} opts={{
          x: [0, 0.56], y: [0, yMax], padL: 40, xlabel: "strain", ylabel: per === "vol" ? "stress (GPa)" : "stress per density (GPa at silk's density)",
          xticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], yticks: [0, 1, 2, 3],
          series: fibres.flatMap((f) => {
            const done = xs.filter((x) => x <= Math.min(strain, f.ef));
            return [
              { xs: xs.filter((x) => x <= f.ef), data: xs.filter((x) => x <= f.ef).map((x) => stress(f, x) * scale(f)), color: f.color + "55", width: 1.2 },
              { xs: done, data: done.map((x) => stress(f, x) * scale(f)), color: f.color, width: 2.5, fill: f.color + "1f" },
            ];
          }),
          points: fibres.filter((f) => strain >= f.ef).map((f) => ({ x: f.ef, y: f.sf * scale(f), color: f.color, r: 4, ring: true })),
        }} />
        <div className="tablewrap"><table className="data">
          <thead><tr><th>Fibre</th><th>Strength</th><th>Stretch</th><th>Toughness</th><th>Per gram</th></tr></thead>
          <tbody>{fibres.map((f) => (
            <tr key={f.id}><td><span style={{ color: f.color }}>●</span> {f.name}</td><td className="n">{fmt(f.sf, 2)} GPa</td><td className="n">{fmt(f.ef * 100)}%</td><td className="n">{fmt(toughness(f))} MJ/m³</td><td className="n">{fmt(specificToughness(f))} J/g</td></tr>
          ))}</tbody>
        </table></div>
        <p className="honest">Areas match the deck&apos;s chart (slide 30: Kevlar 50, steel 170, garden spider 205, Darwin&apos;s bark 350 avg, 520 max MJ/m³) within its spread; the garden spider is calibrated to Gosline et al.&apos;s 160. <b>The fair comparison:</b> per volume, steel is far stronger and stiffer; silk wins on toughness, and by weight, because steel is six times denser.</p>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div className="statgrid">
          <div className="bigstat"><b>350<small>MJ/m³</small></b><span>average toughness of forcibly silked Darwin&apos;s bark spider dragline (354 ± 93)</span><cite>Agnarsson, Kuntner &amp; Blackledge 2010</cite><span className="model">Model curve: {fmt(toughness(FIBRES.darwin))} MJ/m³</span></div>
          <div className="bigstat"><b>520<small>MJ/m³</small></b><span>peak toughness of the best samples</span><cite>Agnarsson et al. 2010</cite></div>
          <div className="bigstat"><b>10×<small>Kevlar</small></b><span>tougher than Kevlar, and twice any other silk tested</span><cite>Agnarsson et al. 2010</cite><span className="model">Model: {fmt(toughness(FIBRES.darwin) / toughness(FIBRES.kevlar), 1)}× this Kevlar curve</span></div>
          <div className="bigstat"><b>25<small>m</small></b><span>bridge lines spanning rivers in Madagascar: the longest webs recorded, up to 2.8 m² of orb</span><cite>Agnarsson et al. 2010</cite></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Plot label="Toughness from the deck's chart" height={170} opts={{
            x: [-0.6, 4.6], y: [0, 560], padL: 40, yticks: [0, 100, 200, 300, 400, 500],
            bars: DECK_TOUGHNESS.map(([n, v, c], i) => ({ x: i, v, w: 0.55, color: c, label: n.replace("Garden spider dragline", "Garden spider").replace("High-strength steel", "Steel") })),
          }} />
          <p className="faint" style={{ fontSize: 12 }}>Toughness, MJ/m³, as plotted in the deck (slide 30). Sources: Agnarsson et al. 2010; Veritasium for steel and Kevlar.</p>
        </div>
      </div>
      <Notes say="Kevlar is the strongest fibre here, but it snaps at under 3% stretch. Spider silk is weaker but stretches 10 to 20 times further before breaking, so it soaks up far more energy. And it does it at a sixth of the weight of steel." show="Pull to the end, then switch to per gram and watch steel's curve drop." ask="Is spider silk 'stronger than steel'? (Per weight and in toughness, yes; per volume in strength and stiffness, no.)" />
    </div>
  );
}
