"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import HoneyBlock from "@/components/three/HoneyBlock";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import WebView, { Insect, PREY } from "@/components/three/WebView";
import { CellTag, Notes, Plate, Plot } from "@/components/ui";
import { CELL_MATS, crushStress, HEXWEB, PCF, strokeOf } from "@/lib/honeycomb";
import { DEW, HONEY, LEAF, SILK, STEEL, WAX } from "@/lib/plot";
import { FIBRES, toughness } from "@/lib/silk";
import { WebSim } from "@/lib/sim/web";

/* Crush or catch. Two ways to absorb a blow, side by side and live:
   - the comb's way: crush a cellular solid at a constant force, one time, turning energy into plastic folds;
   - the web's way: stretch a net of tough fibres, lose a thread or two locally, and keep working.
   The chart puts both on one footing: energy absorbed per unit volume against density, from this site's
   own models (HexWeb rows through the Wierzbicki crush × usable stroke; silk toughness from lib/silk).
   Diagonal lines are constant energy per gram. A material's toughness and a structure's crush energy
   are not the same measurement; the chart shows the per-gram potential of each. */

function CrushLoop() {
  const [crush, setCrush] = useState(0);
  const t = useRef(0);
  useFrame((_s, dt) => {
    t.current = (t.current + dt) % 5;
    const c = t.current < 3.4 ? (t.current / 3.4) * 2.1 : 0;
    if (Math.abs(c - crush) > 0.02 || (c === 0 && crush !== 0)) setCrush(c);
  });
  return (
    <group>
      <HoneyBlock cell={0.9} nx={5} nz={4} height={3} wall={0.03} crush={crush} fold={0.17} stroke={0.78} skins />
      <mesh position={[0, 3.5 - crush, 0]} castShadow><boxGeometry args={[4.4, 0.5, 4]} /><meshStandardMaterial color="#f2b134" metalness={0.6} roughness={0.35} /></mesh>
    </group>
  );
}

function CatchLoop() {
  const sim = useMemo(() => new WebSim({ seed: 11 }), []);
  const blow = PREY[2];
  const g = useRef<THREE.Group>(null!);
  const wait = useRef(0);
  const [v, setV] = useState(0);
  useFrame((_s, dt) => {
    if (!sim.prey) { sim.launch(blow.m, blow.r, 0.03, 0.02, blow.v); }
    if (sim.stop || sim.outcome === "through") { wait.current += dt; if (wait.current > 2.5) { Object.assign(sim, new WebSim({ seed: 11 })); wait.current = 0; setV((x) => x + 1); } }
    const p = sim.prey; if (p && g.current) g.current.position.set(p.pos[0], p.pos[1], p.pos[2]);
  });
  return (
    <group scale={9}>
      <WebView sim={sim} version={v} budgetMs={5} />
      <group ref={g}><group rotation-x={-Math.PI / 2}><Insect kind="blowfly" r={blow.r} /></group></group>
    </group>
  );
}

function Podium({ color }: { color: string }) {
  return (
    <group>
      <mesh position-y={-0.2} receiveShadow castShadow><cylinderGeometry args={[2.6, 2.8, 0.4, 6]} /><meshStandardMaterial color="#20231a" roughness={0.6} metalness={0.3} /></mesh>
      <mesh position-y={0.005} rotation-x={-Math.PI / 2}><ringGeometry args={[2.35, 2.45, 6]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    </group>
  );
}

export default function TwoWays() {
  // Ashby-style points: density (kg/m³) and energy absorbed per volume (MJ/m³)
  const pts = useMemo(() => {
    const hex = HEXWEB.map(([, pcf]) => { const rho = pcf * PCF, rb = rho / 2680; return { x: rho, y: (crushStress(CELL_MATS.al, rb) * strokeOf(rb)) / 1e6 }; });
    const foam = [0.02, 0.05, 0.1, 0.2].map((rb) => ({ x: rb * 2680, y: (0.3 * 215e6 * rb ** 1.5 * (1 - 1.4 * rb)) / 1e6 }));
    return { hex, foam };
  }, []);
  const silks = [FIBRES.araneus, FIBRES.viscid, FIBRES.darwin, FIBRES.kevlar, FIBRES.steel].map((f) => ({ x: f.rho, y: toughness(f), c: f.color, label: f.short }));
  const seaLine = (jpg: number) => ({ xs: [10, 10000], data: [jpg * 10 / 1000, jpg * 10000 / 1000] }); // J/g × kg/m³ → kJ/m³ → MJ/m³ ×1e-3
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="split">
        <Plate n="III·1" title="The comb crushes; the web catches" note="drag to turn · both are live">
          <Stage3D label="Side by side: a honeycomb block crushing under a platen, and an orb web catching a blowfly" camera={{ position: [0, 5, 23], fov: 36 }} look={{ bloom: 0.8, threshold: 0.6 }} background="radial-gradient(ellipse 60% 70% at 25% 60%, rgba(242,177,52,.14), transparent 70%), radial-gradient(ellipse 60% 70% at 75% 60%, rgba(159,216,255,.12), transparent 70%), #0d0e0b"
            overlay={<CellTag>Specimen III·1 · crush or catch</CellTag>}>
            <group position={[-3.6, -1.6, 0]}>
              <Podium color={HONEY} />
              <CrushLoop />
              <Label3D position={[0, -1.2, 2.8]} color={HONEY} size={0.42}>CRUSH · honeycomb</Label3D>
            </group>
            <group position={[3.6, 1.2, 0]}>
              <group position={[0, -2.8, 0]}><Podium color={DEW} /></group>
              <CatchLoop />
              <Label3D position={[0, -4, 2.8]} color={DEW} size={0.42}>CATCH · orb web</Label3D>
            </group>
            <OrbitControls makeDefault enablePan={false} minDistance={8} maxDistance={30} target={[0, 0.4, 0]} />
          </Stage3D>
        </Plate>
        <div className="stack">
          <div className="tablewrap"><table className="data">
            <thead><tr><th></th><th style={{ color: "var(--honey)" }}>Comb: crush</th><th style={{ color: "var(--dew)" }}>Web: catch</th></tr></thead>
            <tbody>
              <tr><td>How</td><td>Walls fold, one lobe at a time</td><td>Fibres stretch, soften, then stiffen</td></tr>
              <tr><td>Force</td><td>Flat plateau: the gentlest stop for its stroke</td><td>Rises as the web deepens</td></tr>
              <tr><td>Energy</td><td>Kept as permanent folds</td><td>65% turned to heat; the rest springs back</td></tr>
              <tr><td>After</td><td>Spent: replace the core</td><td>Still works; a hole is local</td></tr>
              <tr><td>Damage</td><td>Progressive, predictable</td><td>Sacrificial threads, the rest intact</td></tr>
              <tr><td>Best for</td><td>Crash boxes, facades, landing legs</td><td>Nets, barriers, cables, fabrics</td></tr>
            </tbody>
          </table></div>
          <p className="muted" style={{ fontSize: 14.5 }}>Both put the material where the load goes and give up some of it on purpose. The comb gives up shape; the web gives up a thread. Neither passes the blow straight on, which is the failure the deck started from.</p>
        </div>
      </div>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <h4>Energy absorbed per volume against density, from this site&apos;s models</h4>
        <Plot label="Ashby-style chart of energy absorbed against density" height={320} opts={{
          x: [20, 10000], y: [0.05, 600], logx: true, logy: true, padL: 50, xlabel: "density (kg/m³), log scale", ylabel: "energy absorbed (MJ/m³), log",
          xticks: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000], yticks: [0.1, 1, 10, 100], xfmt: (v) => (v >= 1000 ? v / 1000 + "k" : String(v)), yfmt: (v) => String(v),
          series: [1, 10, 100].map((j) => ({ ...seaLine(j), color: "rgba(243,239,214,.16)", width: 1, dash: [4, 4] })),
          points: [
            ...pts.hex.map((p) => ({ ...p, color: HONEY, r: 3 })),
            ...pts.foam.map((p) => ({ ...p, color: STEEL, r: 3, ring: true })),
            ...silks.map((s) => ({ x: s.x * (s.label === "Capture spiral" ? 0.72 : 1), y: s.y * (s.label === "Capture spiral" ? 0.82 : 1), color: s.c, r: 5, label: s.label })),
          ],
          bands: [],
        }} />
        <div className="legend"><span><i style={{ background: HONEY }} />HexWeb aluminium honeycombs (crush × usable stroke)</span><span><i style={{ background: STEEL }} />aluminium foams (Gibson–Ashby)</span><span><i style={{ background: SILK }} />fibres: energy to break</span><span><i style={{ background: "rgba(243,239,214,.4)" }} />dashed: 1, 10, 100 J per gram</span></div>
        <p className="faint" style={{ fontSize: 12.5 }}>Honeycombs sit on the 10 J/g line at a few percent of aluminium&apos;s density, ahead of foams at the same weight. Silk sits near 100 J/g, but only as fibre toughness: a web uses a tiny fraction of its volume as silk, so a web as a whole absorbs far less per cubic metre of air it spans. <span style={{ color: LEAF }}>Capture spiral</span> and <span style={{ color: WAX }}>dragline</span> both sit at 1300 kg/m³ and about 160 MJ/m³; the spiral is drawn nudged left so both labels show.</p>
      </div>
      <Notes say="Two strategies. The comb crushes: steady force, one use. The web catches: it stretches, loses a thread, and keeps working. Per gram, silk is the more absorbent material, honeycomb the better ready-made absorber." show="Point out the flat platen speed on the left and the web bouncing back on the right." ask="Which would you put on a building facade, and which on a rockfall barrier?" />
    </div>
  );
}
