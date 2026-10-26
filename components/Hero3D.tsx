"use client";
import { Line, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Bee from "./three/Bee";
import CombSlab from "./three/CombSlab";
import HoneyBlock from "./three/HoneyBlock";
import Label3D from "./three/Label3D";
import Spider from "./three/Spider";
import Stage3D from "./three/Stage3D";
import { Seg } from "./ui";
import { KIND, WebSim } from "@/lib/sim/web";

/* Two specimens on the bench: a honeybee comb and an orb web with its spider. Switch Nature → Engineered
   and each gives way to what it inspired: an aluminium honeycomb sandwich panel, and a web-patterned
   steel cable net. Click a specimen to open its chapter. */

function Swap({ show, children }: { show: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => {
    const k = g.current.scale.x + ((show ? 1 : 0.0001) - g.current.scale.x) * Math.min(1, dt * 5);
    g.current.scale.setScalar(k); g.current.visible = k > 0.01;
  });
  return <group ref={g} scale={show ? 1 : 0.0001}>{children}</group>;
}

function FlyingBee({ r = 2.6, speed = 0.6, y = 1, phase = 0 }: { r?: number; speed?: number; y?: number; phase?: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    g.current.position.set(Math.cos(t) * r, y + Math.sin(t * 2.3) * 0.4, Math.sin(t) * r * 0.6 + 1.2);
    g.current.rotation.y = -t + Math.PI;
  });
  return <group ref={g} scale={0.32}><Bee flap={1} /></group>;
}

/** A web drawn from a settled WebSim, with dew drops on the capture spiral. */
function StaticWeb({ seed = 7, dew = true, cable = false }: { seed?: number; dew?: boolean; cable?: boolean }) {
  const { geo, drops } = useMemo(() => {
    const sim = new WebSim(cable ? { seed, radii: 14, spacing: 0.016 } : { seed });
    const pos: number[] = [], col: number[] = [], d: number[] = [];
    for (let i = 0; i < sim.ns; i++) {
      if (sim.broken[i] === 2) continue;
      const a = sim.a[i] * 3, b = sim.b[i] * 3;
      pos.push(sim.rest[a], sim.rest[a + 1], sim.rest[a + 2], sim.rest[b], sim.rest[b + 1], sim.rest[b + 2]);
      const c = sim.kind[i] === KIND.spiral ? (cable ? [0.75, 0.78, 0.82] : [0.82, 0.9, 0.72]) : sim.kind[i] === KIND.anchor ? [0.5, 0.53, 0.58] : [0.92, 0.94, 0.96];
      col.push(...c, ...c);
      if (dew && sim.kind[i] === KIND.spiral && (i * 7919) % 5 === 0) d.push((sim.rest[a] + sim.rest[b]) / 2, (sim.rest[a + 1] + sim.rest[b + 1]) / 2, 0.0006);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return { geo: g, drops: d };
  }, [seed, dew, cable]);
  const dropMesh = useMemo(() => {
    const n = drops.length / 3;
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0016, 10, 8), new THREE.MeshPhysicalMaterial({ color: "#e8f6ff", transmission: 1, roughness: 0, ior: 1.33, thickness: 0.002, emissive: new THREE.Color("#9fd8ff"), emissiveIntensity: 0.3 }), Math.max(1, n));
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { o.position.set(drops[i * 3], drops[i * 3 + 1], drops[i * 3 + 2]); o.scale.setScalar(0.6 + ((i * 37) % 10) / 10); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    m.count = n; return m;
  }, [drops]);
  return (
    <group>
      {cable ? <CableNet geo={geo} /> : <lineSegments geometry={geo}><lineBasicMaterial vertexColors toneMapped={false} /></lineSegments>}
      {dew && <primitive object={dropMesh} />}
    </group>
  );
}

function CableNet({ geo }: { geo: THREE.BufferGeometry }) {
  const segs = useMemo(() => {
    const p = geo.attributes.position.array as Float32Array, out: [number, number, number][][] = [];
    for (let i = 0; i < p.length; i += 6) out.push([[p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]]]);
    return out;
  }, [geo]);
  return <group>{segs.map((s, i) => <Line key={i} points={s} color="#c9ced8" lineWidth={1.6} />)}</group>;
}

export default function Hero3D({ className = "stage hero-stage" }: { className?: string }) {
  const [mode, setMode] = useState<"nature" | "made">("nature");
  const router = useRouter();
  const nat = mode === "nature";
  const go = (href: string) => (e: { stopPropagation: () => void }) => { e.stopPropagation(); router.push(href); };
  const hover = { onPointerOver: () => (document.body.style.cursor = "pointer"), onPointerOut: () => (document.body.style.cursor = "") };
  return (
    <Stage3D className={className} label="A honeybee comb and an orb web with its spider, or the honeycomb panel and cable net they inspired" camera={{ position: [1.6, 1.4, 16.5], fov: 34 }} look={{ bloom: 0.75, threshold: 0.62 }}
      background="radial-gradient(ellipse 45% 60% at 70% 55%, rgba(242,177,52,.16), transparent 70%), radial-gradient(ellipse 40% 60% at 95% 45%, rgba(159,216,255,.12), transparent 70%), #0d0e0b"
      overlay={<div className="hero-switch"><Seg options={[["nature", "Nature"], ["made", "Engineered"]]} value={mode} onChange={setMode} label="Show" /></div>}>
      <group position={[3.9, 0, 0]}>
        {/* the comb */}
        <group position={[-2.3, 0.2, 0]} rotation-y={0.35} onClick={go("/honeycomb")} {...hover}>
          <Swap show={nat}>
            <group scale={0.62}><CombSlab cols={16} rows={13} /></group>
            <mesh position={[0, 2.55, 0]}><boxGeometry args={[6.4, 0.35, 1.6]} /><meshStandardMaterial color="#6b4a2a" roughness={0.85} /></mesh>
            <FlyingBee r={3} speed={0.5} y={1.2} />
            <FlyingBee r={2.4} speed={-0.7} y={-0.6} phase={2} />
          </Swap>
          <Swap show={!nat}>
            <group position={[0, -1.6, 0]} rotation-x={0.25}><HoneyBlock cell={0.7} nx={7} nz={6} height={2.2} wall={0.025} skins /></group>
          </Swap>
          <Label3D position={[0, -2.9, 1.4]} color="#f2b134" size={0.34}>{nat ? "HONEYBEE COMB" : "HONEYCOMB SANDWICH PANEL"}</Label3D>
        </group>
        {/* the web */}
        <group position={[3.4, 0.4, -0.6]} rotation-y={-0.3} onClick={go("/spider-web")} {...hover}>
          <Swap show={nat}>
            <group scale={14}><StaticWeb /></group>
            <group rotation-x={Math.PI / 2} scale={0.32}><Spider rest={0.5} /></group>
          </Swap>
          <Swap show={!nat}>
            <group scale={14}><StaticWeb cable dew={false} seed={3} /></group>
          </Swap>
          <Label3D position={[0, -3.1, 1]} color="#9fd8ff" size={0.34}>{nat ? "GARDEN SPIDER ORB WEB" : "WEB-PATTERNED CABLE NET"}</Label3D>
        </group>
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.32} maxPolarAngle={Math.PI * 0.62} minAzimuthAngle={-0.7} maxAzimuthAngle={0.7} target={[2.4, 0, 0]} />
    </Stage3D>
  );
}
