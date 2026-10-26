"use client";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { audio } from "@/lib/audio";
import { loadColor } from "@/lib/plot";
import { threadHz } from "@/lib/silk";
import { KIND, type WebSim } from "@/lib/sim/web";

/* Draws a live WebSim and steps it. The web is in metres; the parent group scales it (10 → 1 unit = 1 dm).
   Threads are coloured by how close they are to breaking (silk grey → honey → red), the capture spiral
   carries glue droplets, broken threads vanish with a snap. The solver gets a fixed compute budget per
   frame, so the motion is slow-motion; the factor is reported through onStats. */

export interface WebStats { slowmo: number; t: number }

const BASE = [new THREE.Color("#d9dde3"), new THREE.Color("#cfe6a6"), new THREE.Color("#eef0f2"), new THREE.Color("#8a9099"), new THREE.Color("#d9dde3")];

export default function WebView({ sim, version, running = true, budgetMs = 7, onStats, onPick, showLoad = true, droplets = true, highlight = -1 }: {
  sim: WebSim; version: number; running?: boolean; budgetMs?: number;
  onStats?: (s: WebStats) => void; onPick?: (x: number, y: number, e: ThreeEvent<PointerEvent>) => void;
  showLoad?: boolean; droplets?: boolean; highlight?: number;
}) {
  const lines = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(sim.ns * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(sim.ns * 6), 3));
    return g;
  }, [sim, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const DROPS = 4;
  const dropGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(sim.ns * DROPS * 3), 3));
    return g;
  }, [sim, version]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { lines.dispose(); dropGeo.dispose(); }, [lines, dropGeo]);
  const steps = useRef(80);
  const broken0 = useRef(0);
  const tmp = useMemo(() => [0, 0, 0] as [number, number, number], []);

  const write = () => {
    const p = sim.pos, P = lines.attributes.position.array as Float32Array, C = lines.attributes.color.array as Float32Array;
    const D = dropGeo.attributes.position.array as Float32Array;
    let nd = 0;
    for (let i = 0; i < sim.ns; i++) {
      const a = sim.a[i] * 3, b = sim.b[i] * 3, o = i * 6;
      if (sim.broken[i]) { for (let k = 0; k < 6; k++) P[o + k] = p[a + (k % 3)]; continue; }
      P[o] = p[a]; P[o + 1] = p[a + 1]; P[o + 2] = p[a + 2]; P[o + 3] = p[b]; P[o + 4] = p[b + 1]; P[o + 5] = p[b + 2];
      const k = sim.kind[i], base = BASE[k];
      let r = base.r, g = base.g, bl = base.b;
      if (showLoad && k !== KIND.anchor) {
        const L = sim.load[i];
        if (L > 0.12) { loadColor(L, tmp); const m = Math.min(1, (L - 0.12) / 0.25); r = r + (tmp[0] - r) * m; g = g + (tmp[1] - g) * m; bl = bl + (tmp[2] - bl) * m; }
      }
      if (i === highlight) { r = 0.62; g = 0.85; bl = 1; }
      C[o] = C[o + 3] = r; C[o + 1] = C[o + 4] = g; C[o + 2] = C[o + 5] = bl;
      if (droplets && k === KIND.spiral) {
        for (let d = 0; d < DROPS; d++) {
          const t = (d + 0.5) / DROPS;
          D[nd++] = p[a] + (p[b] - p[a]) * t; D[nd++] = p[a + 1] + (p[b + 1] - p[a + 1]) * t; D[nd++] = p[a + 2] + (p[b + 2] - p[a + 2]) * t;
        }
      }
    }
    lines.attributes.position.needsUpdate = true; lines.attributes.color.needsUpdate = true;
    dropGeo.setDrawRange(0, nd / 3); dropGeo.attributes.position.needsUpdate = true;
  };

  useEffect(() => { broken0.current = sim.brokenCount; write(); }, [sim, version]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_s, dt) => {
    if (running) {
      const t0 = performance.now();
      const n = steps.current;
      sim.advance(n * 5e-6);
      const ms = performance.now() - t0;
      // keep the solver within its budget; the slow-motion factor follows
      steps.current = Math.max(20, Math.min(400, Math.round(n * (ms > budgetMs ? 0.85 : 1.06))));
      onStats?.({ slowmo: Math.max(1, Math.min(dt, 0.05) / (n * 5e-6)), t: sim.t });
      if (sim.brokenCount > broken0.current) {
        const last = sim.brokenLog[sim.brokenLog.length - 1];
        if (last) audio().snap(sim.kind[last.i] === KIND.radial ? 0.45 : 0.25);
        broken0.current = sim.brokenCount;
      }
    }
    write();
  });

  // pluck: clicking a thread plays its real tension frequency
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const local = e.object.worldToLocal(e.point.clone());
    onPick?.(local.x, local.y, e);
  };

  return (
    <group>
      <lineSegments geometry={lines} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.95} toneMapped={false} />
      </lineSegments>
      {droplets && (
        <points geometry={dropGeo} frustumCulled={false}>
          <pointsMaterial color="#e9f6ff" size={0.0016} sizeAttenuation transparent opacity={0.9} toneMapped={false} />
        </points>
      )}
      {onPick && (
        <mesh position={[0, 0, 0]} onPointerDown={pick} onPointerOver={() => (document.body.style.cursor = "crosshair")} onPointerOut={() => (document.body.style.cursor = "")}>
          <planeGeometry args={[sim.spec.R * 3.4, sim.spec.R * 3.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** The tension frequency of segment i: f = (1/2L)√(σ/ρ). */
export function segmentHz(sim: WebSim, i: number) {
  const L = sim.len(i), f = sim.force(i), sigma = f / sim.area[i];
  return threadHz(sigma, L);
}

/** Small insects to throw: m in kg, r in m, typical speeds from flight studies. */
export const PREY = [
  { id: "fruitfly", name: "Fruit fly", m: 1e-6, r: 0.0015, v: 1.0, color: "#8a5a2a" },
  { id: "housefly", name: "House fly", m: 20e-6, r: 0.004, v: 1.5, color: "#3a3a3a" },
  { id: "blowfly", name: "Blowfly", m: 60e-6, r: 0.005, v: 2.5, color: "#2e5a4a" },
  { id: "bee", name: "Honeybee", m: 100e-6, r: 0.006, v: 4, color: "#d99a2b" },
  { id: "dragonfly", name: "Dragonfly", m: 300e-6, r: 0.008, v: 5, color: "#3b7fb3" },
] as const;
export type PreyId = (typeof PREY)[number]["id"];

/** A simple insect, in metres, for the web scenes: body, head, wings. */
export function Insect({ kind, r }: { kind: PreyId; r: number }) {
  const p = PREY.find((x) => x.id === kind)!;
  const wing = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => { if (wing.current) wing.current.rotation.z = Math.sin(clock.elapsedTime * 40) * 0.5; });
  const L = r * 2.2;
  return (
    <group rotation-x={Math.PI / 2}>
      <mesh scale={[r * 0.75, L * 0.6, r * 0.75]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshPhysicalMaterial color={p.color} roughness={0.4} clearcoat={0.6} /></mesh>
      <mesh position={[0, L * 0.62, 0]} scale={r * 0.55}><sphereGeometry args={[1, 14, 10]} /><meshPhysicalMaterial color={kind === "bee" ? "#2b2014" : "#6a1a12"} roughness={0.3} clearcoat={1} /></mesh>
      {kind === "bee" && [0.1, -0.15, -0.4].map((y) => <mesh key={y} position={[0, y * L, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[r * 0.7, r * 0.12, 6, 18]} /><meshStandardMaterial color="#2a1c0c" /></mesh>)}
      <group ref={wing}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * r * 1.3, L * 0.2, r * 0.4]} rotation-z={s * 0.3}>
            <planeGeometry args={[r * (kind === "dragonfly" ? 3.4 : 1.8), r * 0.8]} />
            <meshPhysicalMaterial color="#dfefff" transparent opacity={0.45} side={THREE.DoubleSide} roughness={0.1} iridescence={1} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
