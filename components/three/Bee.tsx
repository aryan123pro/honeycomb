"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* A worker honeybee (Apis mellifera), about 1.3 cm long; 1 unit = 1 cm. Fuzzy amber thorax, banded
   abdomen, big dark compound eyes, elbowed antennae, three pairs of legs (the hind pair with pollen
   baskets) and two pairs of veined, glassy wings that beat when `flap` > 0. */

function stripes() {
  const c = document.createElement("canvas"); c.width = 16; c.height = 256;
  const g = c.getContext("2d")!;
  for (let y = 0; y < 256; y++) {
    const t = y / 256, band = Math.sin(t * Math.PI * 2 * 3.2 + 0.6);
    const dark = band > 0.25;
    g.fillStyle = dark ? "#2a1c0c" : t > 0.85 ? "#3a2510" : "#d99a2b";
    g.fillRect(0, y, 16, 1);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function wingTex() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(220,235,255,0.18)"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "rgba(60,45,30,0.85)"; g.lineWidth = 2;
  const veins = [[[0, 64], [256, 40]], [[0, 64], [200, 100]], [[60, 52], [120, 96]], [[120, 50], [150, 98]], [[170, 45], [190, 70]], [[0, 64], [256, 64]]];
  for (const [[x1, y1], [x2, y2]] of veins) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function Leg({ base, dir, len = 0.9, phase = 0, walk = 0, hind = false }: { base: [number, number, number]; dir: number; len?: number; phase?: number; walk?: number; hind?: boolean }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const s = Math.sin(clock.elapsedTime * 9 + phase) * walk;
    g.current.rotation.y = dir * (0.15 + s * 0.35);
  });
  const mat = <meshStandardMaterial color="#3a2a18" roughness={0.6} />;
  return (
    <group ref={g} position={base}>
      <group rotation={[0, 0, dir * -0.9]}>
        <mesh position={[dir * len * 0.22, 0, 0]} rotation-z={Math.PI / 2}><capsuleGeometry args={[0.05, len * 0.42, 4, 8]} />{mat}</mesh>
        <group position={[dir * len * 0.45, 0, 0]} rotation-z={dir * 1.5}>
          <mesh position={[dir * len * 0.25, 0, 0]} rotation-z={Math.PI / 2}><capsuleGeometry args={[hind ? 0.075 : 0.04, len * 0.48, 4, 8]} />{mat}</mesh>
          {hind && <mesh position={[dir * len * 0.28, 0, 0]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color="#f2b134" roughness={0.8} /></mesh>}
        </group>
      </group>
    </group>
  );
}

export default function Bee({ flap = 1, walk = 0, pollen = true }: { flap?: number; walk?: number; pollen?: boolean }) {
  const tex = useMemo(() => (typeof document === "undefined" ? null : stripes()), []);
  const wtex = useMemo(() => (typeof document === "undefined" ? null : wingTex()), []);
  const wings = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // honeybees beat at ~230 Hz; drawn far slower so the stroke reads
    const a = flap > 0 ? Math.sin(t * 38) * 0.75 * flap : 0;
    wings.current.forEach((w, i) => { if (w) w.rotation.z = (i % 2 ? -1 : 1) * (0.25 + a); });
  });
  const fuzz = <meshStandardMaterial color="#b9802a" roughness={1} />;
  return (
    <group>
      {/* head */}
      <group position={[0, 0.05, 0.62]}>
        <mesh scale={[0.95, 1, 0.75]} castShadow><sphereGeometry args={[0.3, 24, 20]} /><meshStandardMaterial color="#2b2014" roughness={0.55} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, 0.05, 0.02]} scale={[0.45, 1, 0.7]}><sphereGeometry args={[0.24, 20, 16]} /><meshPhysicalMaterial color="#120d08" roughness={0.25} clearcoat={1} /></mesh>
        ))}
        {[-1, 1].map((s) => (
          <group key={"a" + s} position={[s * 0.08, 0.18, 0.18]} rotation={[0.9, s * 0.35, 0]}>
            <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.02, 0.02, 0.36, 6]} /><meshStandardMaterial color="#1c140c" /></mesh>
            <mesh position={[0, 0.36, 0.14]} rotation-x={1.1}><cylinderGeometry args={[0.022, 0.018, 0.36, 6]} /><meshStandardMaterial color="#1c140c" /></mesh>
          </group>
        ))}
      </group>
      {/* thorax: fuzzy */}
      <mesh position={[0, 0.08, 0.2]} castShadow><sphereGeometry args={[0.36, 28, 22]} />{fuzz}</mesh>
      <mesh position={[0, 0.08, 0.2]} scale={1.06}><sphereGeometry args={[0.36, 16, 12]} /><meshStandardMaterial color="#e2aa48" roughness={1} transparent opacity={0.28} depthWrite={false} /></mesh>
      {/* abdomen: banded */}
      <mesh position={[0, -0.02, -0.42]} rotation-x={Math.PI / 2 + 0.12} scale={[1, 1, 0.82]} castShadow>
        <sphereGeometry args={[0.4, 30, 26, 0, Math.PI * 2, 0, Math.PI]} />
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.08, -0.86]} rotation-x={-Math.PI / 2}><coneGeometry args={[0.05, 0.14, 8]} /><meshStandardMaterial color="#1c140c" /></mesh>
      {/* wings: fore and hind, both sides */}
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * 0.12, 0.38, 0.22]} ref={(el) => { if (el) wings.current[i] = el; }}>
          <mesh position={[s * 0.42, 0, -0.32]} rotation={[-Math.PI / 2, 0, s * 0.35]}>
            <planeGeometry args={[0.5, 1.0]} />
            <meshPhysicalMaterial map={wtex} transparent opacity={0.85} side={THREE.DoubleSide} roughness={0.1} iridescence={1} iridescenceIOR={1.4} depthWrite={false} />
          </mesh>
          <mesh position={[s * 0.32, -0.02, -0.55]} rotation={[-Math.PI / 2, 0, s * 0.55]}>
            <planeGeometry args={[0.3, 0.55]} />
            <meshPhysicalMaterial map={wtex} transparent opacity={0.75} side={THREE.DoubleSide} roughness={0.1} iridescence={1} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {/* legs */}
      {[-1, 1].map((s) => [0.38, 0.2, 0.02].map((z, j) => <Leg key={s + "" + j} base={[s * 0.18, -0.16, z]} dir={s} len={j === 2 ? 1.05 : 0.85} phase={j * 2 + (s > 0 ? Math.PI : 0)} walk={walk} hind={j === 2 && pollen} />))}
    </group>
  );
}
