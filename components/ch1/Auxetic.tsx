"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg } from "@/components/ui";
import { poisson21 } from "@/lib/honeycomb";
import { DEW, fmt, HONEY, range, sgnFmt } from "@/lib/plot";

/* Pull it inside out. A honeycomb seen in plan, squeezed from above by a platen. Walls are rigid and
   hinge at their joints (the flexure picture of Gibson & Ashby), so as the cell height falls the
   inclined walls rotate: θ changes and the cell width follows exactly. For regular hexagons (θ = +30°)
   the sides bulge out; for re-entrant cells (θ < 0) they pull in: a negative Poisson's ratio, an
   "auxetic" honeycomb that gathers material under the load. The measured ratio (lateral ÷ axial strain,
   from the animation's own geometry) matches ν21 = (h/l + sin θ) sin θ / cos²θ. */

const COLS = 7, ROWS = 7, L = 1;

function lattice(theta: number, h: number) {
  // vertical walls at (x, y) of height h; inclined walls of length L at ±θ
  const X = 2 * L * Math.cos(theta), Yr = h + L * Math.sin(theta);
  const ribs: { x0: number; y0: number; x1: number; y1: number; v: boolean }[] = [];
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const x = (i - (COLS - 1) / 2 + (j % 2 ? 0.5 : 0)) * X, y = (j - (ROWS - 1) / 2) * Yr;
    ribs.push({ x0: x, y0: y - h / 2, x1: x, y1: y + h / 2, v: true });
    if (j < ROWS - 1) for (const s of [-1, 1]) ribs.push({ x0: x, y0: y + h / 2, x1: x + s * L * Math.cos(theta), y1: y + h / 2 + L * Math.sin(theta), v: false });
  }
  return { ribs, W: COLS * X, H: ROWS * Yr };
}

function Lattice({ theta0, h, strain }: { theta0: number; h: number; strain: number }) {
  const count = COLS * ROWS * 3;
  const mesh = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.07, 1.2), new THREE.MeshStandardMaterial({ color: "#c9ced8", metalness: 0.85, roughness: 0.3 }), count); m.castShadow = true; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3); return m; }, [count]);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }, [mesh]);
  const cur = useRef(0);
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame((_s, dt) => {
    cur.current += (strain - cur.current) * Math.min(1, dt * 6);
    const th = thetaAt(theta0, h, cur.current);
    const { ribs } = lattice(th, h);
    ribs.forEach((r, i) => {
      const dx = r.x1 - r.x0, dy = r.y1 - r.y0, len = Math.hypot(dx, dy);
      o.position.set((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 0); o.rotation.set(0, 0, Math.atan2(dy, dx)); o.scale.set(len + 0.05, 1, 1); o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      c.set(r.v ? "#c9ced8" : theta0 < 0 ? "#9fd8ff" : "#f2b134"); mesh.setColorAt(i, c);
    });
    mesh.count = ribs.length;
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

/** θ after compressing the cell height by `strain` (rigid walls, hinged joints). */
function thetaAt(theta0: number, h: number, strain: number) {
  const Y0 = h + L * Math.sin(theta0), Y = Y0 * (1 - strain);
  return Math.asin(Math.max(-0.99, Math.min(0.99, (Y - h) / L)));
}

function Platen({ y, w }: { y: number; w: number }) {
  const m = useRef<THREE.Mesh>(null!);
  useFrame((_s, dt) => { m.current.position.y += (y - m.current.position.y) * Math.min(1, dt * 6); });
  return <mesh ref={m} position={[0, y, 0]} castShadow><boxGeometry args={[w, 0.35, 1.6]} /><meshStandardMaterial color="#f2b134" metalness={0.5} roughness={0.35} /></mesh>;
}

export default function Auxetic() {
  const [mode, setMode] = useState<"regular" | "reentrant">("regular");
  const [strain, setStrain] = useState(0.08);
  const [deg, setDeg] = useState(30);
  const theta0 = ((mode === "regular" ? 1 : -1) * deg * Math.PI) / 180;
  const h = mode === "regular" ? 1 : 2;
  const base = lattice(theta0, h), now = lattice(thetaAt(theta0, h, strain), h);
  const lat = (now.W - base.W) / base.W, ax = (now.H - base.H) / base.H;
  const nuMeasured = ax !== 0 ? -lat / ax : poisson21(theta0, h);
  const nu = poisson21(theta0, h);
  const thetas = range(-45, 45, 91);
  return (
    <div className="split">
      <Plate n="I·5" title="Squeeze a honeycomb from above" note="drag to turn">
        <Stage3D label="A honeycomb lattice squeezed from above: regular cells bulge out, re-entrant cells pull in" camera={{ position: [0, -1, 28], fov: 36 }} look={{ bloom: 0.5 }}
          overlay={<>
            <CellTag>Specimen I·5 · in-plane · {mode === "regular" ? "regular hexagons" : "re-entrant (auxetic)"}</CellTag>
            <div className="hud tag hud-tr">
              <span className="k">Poisson&apos;s ratio</span>
              <span className="big" style={{ color: nu < 0 ? DEW : HONEY }}>{sgnFmt(nuMeasured)}</span>
              <span className="k">{nu < 0 ? "sides pull IN" : "sides bulge OUT"}</span>
            </div>
          </>}>
          <Lattice theta0={theta0} h={h} strain={strain} />
          <Platen y={now.H / 2 + 0.45} w={base.W + 3} />
          <Platen y={-now.H / 2 - 0.45} w={base.W + 3} />
          <WidthMarks w0={base.W} w={now.W} y={-base.H / 2 - 1.6} />
          <OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.35} maxPolarAngle={Math.PI * 0.65} minAzimuthAngle={-0.6} maxAzimuthAngle={0.6} />
        </Stage3D>
      </Plate>
      <div className="stack">
        <Seg options={[["regular", "Regular hexagons"], ["reentrant", "Re-entrant (auxetic)"]]} value={mode} onChange={setMode} label="Cell shape" />
        <Range label="Squeeze" value={strain} min={0} max={0.18} step={0.005} onChange={setStrain} fmt={(v) => fmt(v * 100, 1) + "%"} />
        <Range label="Wall angle θ" value={deg} min={10} max={40} step={1} onChange={setDeg} fmt={(v) => (mode === "regular" ? "+" : "−") + v + "°"} />
        <Readouts items={[
          ["Height change", fmt(ax * 100, 1), "%"],
          ["Width change", (lat > 0 ? "+" : "") + fmt(lat * 100, 1), "%", lat < 0 ? "cool" : "hot"],
          ["ν from the geometry", sgnFmt(nuMeasured), ""],
          ["ν Gibson–Ashby (small)", sgnFmt(nu), "", "acc"],
        ]} />
        <Plot label="Poisson's ratio against wall angle" height={180} opts={{
          x: [-45, 45], y: [-3, 3], padL: 34, xlabel: "wall angle θ (°)  ·  negative = re-entrant", ylabel: "ν",
          xticks: [-40, -20, 0, 20, 40], yticks: [-3, -2, -1, 0, 1, 2, 3],
          series: [{ xs: thetas, data: thetas.map((t) => Math.max(-3, Math.min(3, poisson21((t * Math.PI) / 180, t < 0 ? 2 : 1)))), color: HONEY, width: 2 }],
          hlines: [{ y: 0, color: "#5a5946" }],
          cursor: { x: (theta0 * 180) / Math.PI, y: Math.max(-3, Math.min(3, nu)), color: nu < 0 ? DEW : HONEY },
        }} />
        <div className="prose">
          <p><strong>Why it matters for blast panels.</strong> Squeeze a re-entrant core and it pulls material in toward the load instead of letting it escape sideways, so it fights back harder where it is hit. In a test of re-entrant cored panels the core and rear panel together dissipated <strong>85%</strong> of the blast energy (deck, slide 13), and auxetic sandwich beams beat regular honeycomb in close-in blasts.</p>
        </div>
        <div className="verdict bad"><b>The catch (deck, slide 15)</b><p>Very close to a blast the auxetic core densifies so fast that the cladding can act as a solid projectile and amplify the damage (Kalubadanage et al. 2021). Every absorber has a limit.</p></div>
      </div>
      <Notes say="An ordinary honeycomb squeezed from the top bulges out at the sides, like a sponge. Flip the walls inward and it does the opposite: it pulls in. That's an auxetic material, and it concentrates material where the blow lands." show="Switch between regular and re-entrant at the same squeeze and compare the width readout." ask="Where else would you want a material that gets denser where you push it? (Knee pads, helmets, stents.)" />
    </div>
  );
}

function WidthMarks({ w0, w, y }: { w0: number; w: number; y: number }) {
  return (
    <group position={[0, y, 0]}>
      {[-1, 1].map((s) => <mesh key={s} position={[(s * w0) / 2, 0, 0]}><boxGeometry args={[0.05, 0.8, 0.05]} /><meshBasicMaterial color="#8a8770" /></mesh>)}
      {[-1, 1].map((s) => <mesh key={"n" + s} position={[(s * w) / 2, 0, 0]}><boxGeometry args={[0.08, 1.1, 0.08]} /><meshBasicMaterial color={w < w0 ? "#9fd8ff" : "#f2b134"} toneMapped={false} /></mesh>)}
      <Label3D position={[0, -1.2, 0]} color={w < w0 ? "#9fd8ff" : "#f2b134"} size={0.5}>{`WIDTH ${w < w0 ? "−" : "+"}${Math.abs(((w - w0) / w0) * 100).toFixed(1)}%`}</Label3D>
    </group>
  );
}
