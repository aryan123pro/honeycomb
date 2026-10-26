"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* A European garden spider (Araneus diadematus), the orb weaver of the chapter. Units: 1 = 1 cm; she is
   about 1.4 cm long without legs. Forward is +z, back is up (+y). Cephalothorax with eight eyes, a big
   abdomen with the white cross that names her, spinnerets at the tip, and eight jointed legs that step
   in alternating tetrapods when `walk` > 0. */

function crossTex() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 256, 0); grd.addColorStop(0, "#5a3a1e"); grd.addColorStop(0.5, "#8a5a2c"); grd.addColorStop(1, "#5a3a1e");
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  // folium: the darker leaf-shaped band down the back
  g.fillStyle = "#3b2412"; g.beginPath(); g.ellipse(128, 128, 70, 120, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#6e4624"; g.beginPath(); g.ellipse(128, 128, 46, 112, 0, 0, Math.PI * 2); g.fill();
  // the white cross of dots
  g.fillStyle = "#f4ecd8";
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(128, 40 + i * 13, 6 - Math.abs(i - 3) * 0.4, 0, Math.PI * 2); g.fill(); }
  for (const s of [-1, 1]) for (let i = 1; i < 4; i++) { g.beginPath(); g.arc(128 + s * i * 14, 80, 5.5 - i * 0.6, 0, Math.PI * 2); g.fill(); }
  // side speckles
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(240,225,190,${0.15 + Math.random() * 0.35})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const LEGS = [
  { a: 0.55, len: 2.0 }, { a: 0.95, len: 1.75 }, { a: 1.85, len: 1.35 }, { a: 2.45, len: 1.6 },
];

function Leg({ side, i, walk, rest = 0 }: { side: number; i: number; walk: number; rest?: number }) {
  const hip = useRef<THREE.Group>(null!), knee = useRef<THREE.Group>(null!);
  const L = LEGS[i];
  // tetrapod gait: legs 1 & 3 on one side swing with 2 & 4 on the other
  const phase = ((i % 2) + (side > 0 ? 1 : 0)) % 2 ? Math.PI : 0;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 7 + phase;
    const sw = Math.sin(t) * walk, lift = Math.max(0, Math.cos(t)) * walk;
    hip.current.rotation.y = side * (L.a - Math.PI / 2) * -1 + sw * 0.35 * side;
    hip.current.rotation.z = side * (0.55 + lift * 0.35 + rest * 0.4);
    knee.current.rotation.z = side * -(1.55 + lift * 0.3 - rest * 0.5);
  });
  const seg = L.len * 0.42;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6b4a2a", roughness: 0.55 }), []);
  const band = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8c49a", roughness: 0.6 }), []);
  return (
    <group position={[side * 0.18, 0, 0.3 - i * 0.12]}>
      <group ref={hip}>
        <mesh position={[side * seg / 2, 0, 0]} rotation-z={Math.PI / 2} material={mat}><capsuleGeometry args={[0.045, seg, 4, 8]} /></mesh>
        <mesh position={[side * seg * 0.85, 0, 0]} rotation-z={Math.PI / 2} material={band}><cylinderGeometry args={[0.05, 0.05, 0.08, 8]} /></mesh>
        <group ref={knee} position={[side * seg, 0, 0]}>
          <mesh position={[side * seg * 0.55, 0, 0]} rotation-z={Math.PI / 2} material={mat}><capsuleGeometry args={[0.035, seg * 1.1, 4, 8]} /></mesh>
          <mesh position={[side * seg * 0.5, 0, 0]} rotation-z={Math.PI / 2} material={band}><cylinderGeometry args={[0.04, 0.04, 0.07, 8]} /></mesh>
          <group position={[side * seg * 1.1, 0, 0]} rotation-z={side * 0.5}>
            <mesh position={[side * seg * 0.4, 0, 0]} rotation-z={Math.PI / 2} material={mat}><capsuleGeometry args={[0.025, seg * 0.8, 4, 6]} /></mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export default function Spider({ walk = 0, rest = 0, spinning = false }: { walk?: number; rest?: number; spinning?: boolean }) {
  const tex = useMemo(() => (typeof document === "undefined" ? null : crossTex()), []);
  const abd = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { abd.current.scale.y = 0.82 + Math.sin(clock.elapsedTime * 2.2) * 0.015; });
  return (
    <group>
      {/* cephalothorax */}
      <mesh position={[0, 0, 0.2]} scale={[0.9, 0.62, 1.1]} castShadow><sphereGeometry args={[0.3, 24, 18]} /><meshPhysicalMaterial color="#6b4a2a" roughness={0.45} clearcoat={0.5} /></mesh>
      {/* eight eyes */}
      {[[-0.06, 0.13, 0.5], [0.06, 0.13, 0.5], [-0.05, 0.09, 0.53], [0.05, 0.09, 0.53], [-0.16, 0.1, 0.45], [0.16, 0.1, 0.45], [-0.17, 0.12, 0.42], [0.17, 0.12, 0.42]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}><sphereGeometry args={[i < 2 ? 0.035 : 0.025, 10, 8]} /><meshPhysicalMaterial color="#050403" roughness={0.1} clearcoat={1} /></mesh>
      ))}
      {/* chelicerae and palps */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, -0.05, 0.52]} rotation-x={0.4}><capsuleGeometry args={[0.045, 0.1, 4, 8]} /><meshStandardMaterial color="#3d2814" roughness={0.5} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={"p" + s} position={[s * 0.16, -0.02, 0.6]} rotation={[1.2, 0, s * -0.4]}><capsuleGeometry args={[0.03, 0.22, 4, 6]} /><meshStandardMaterial color="#6b4a2a" /></mesh>)}
      {/* abdomen with the cross */}
      <mesh ref={abd} position={[0, 0.12, -0.42]} rotation-x={-Math.PI / 2 + 0.25} scale={[0.86, 0.82, 1]} castShadow>
        <sphereGeometry args={[0.55, 32, 26]} />
        <meshPhysicalMaterial map={tex} roughness={0.55} clearcoat={0.4} clearcoatRoughness={0.5} sheen={0.6} sheenColor="#f4e1b0" />
      </mesh>
      {/* spinnerets */}
      <mesh position={[0, -0.12, -0.92]} rotation-x={-1.2}><coneGeometry args={[0.07, 0.12, 8]} /><meshStandardMaterial color="#3d2814" emissive={spinning ? "#9fd8ff" : "#000"} emissiveIntensity={spinning ? 0.6 : 0} /></mesh>
      {[-1, 1].map((s) => [0, 1, 2, 3].map((i) => <Leg key={s + "" + i} side={s} i={i} walk={walk} rest={rest} />))}
    </group>
  );
}
