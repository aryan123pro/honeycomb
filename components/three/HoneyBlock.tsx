"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/* A honeycomb block crushed out of plane, the way an energy absorber works. Cells stand vertically
   (flat-top hexagons in plan). Crushing starts at the loaded face: a band of wall at the top buckles into
   folds of half-wavelength H (Wierzbicki), the folds stack up, and the front moves down while the rest
   of the block is untouched, which is why the force stays flat. The vertex shader maps each wall point's
   original height to its crushed height and pushes it in and out along the wall's normal, alternating
   fold by fold; neighbouring walls fold in opposite senses, as in tests.

   Display units are arbitrary (the parent scales them); `fold` is the half-wavelength in the same units. */

export interface HoneyBlockProps {
  cell?: number;     // cell size across flats
  nx?: number; nz?: number;
  height?: number;
  wall?: number;     // drawn wall thickness
  crush?: number;    // crush distance from the top (same units)
  fold?: number;     // fold half-wavelength
  stroke?: number;   // fraction of crushed wall length that is lost as folds stack (≈ the densification strain)
  color?: string; metal?: number;
  skins?: boolean;   // facing sheets top and bottom
  reentrant?: boolean;
}

function wallsFor(cell: number, nx: number, nz: number) {
  // flat-top hexagons in the x–z plane: side a = cell/√3, columns 1.5a apart
  const a = cell / Math.sqrt(3);
  const seen = new Map<string, [number, number, number, number]>();
  const key = (x: number, z: number) => `${Math.round(x * 1e4)},${Math.round(z * 1e4)}`;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const cx = (i - (nx - 1) / 2) * 1.5 * a, cz = (j - (nz - 1) / 2 + (i % 2) * 0.5) * cell;
    for (let k = 0; k < 6; k++) {
      const a0 = (k * Math.PI) / 3, a1 = ((k + 1) * Math.PI) / 3;
      const x0 = cx + Math.cos(a0) * a, z0 = cz + Math.sin(a0) * a, x1 = cx + Math.cos(a1) * a, z1 = cz + Math.sin(a1) * a;
      const k0 = key(x0, z0), k1 = key(x1, z1), kk = k0 < k1 ? k0 + "|" + k1 : k1 + "|" + k0;
      if (!seen.has(kk)) seen.set(kk, [x0, z0, x1, z1]);
    }
  }
  return [...seen.values()];
}

export function honeyGeometry(cell: number, nx: number, nz: number, height: number, wall: number, rows = 140) {
  const walls = wallsFor(cell, nx, nz);
  const pos: number[] = [], nrm: number[] = [], wn: number[] = [], ph: number[] = [], idx: number[] = [];
  let base = 0;
  walls.forEach(([x0, z0, x1, z1], w) => {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), nxv = -dz / L, nzv = dx / L;
    const phase = (Math.round((Math.atan2(dz, dx) / Math.PI) * 3) + w) % 2; // neighbours fold opposite ways
    for (const side of [1, -1]) {
      const ox = nxv * wall * 0.5 * side, oz = nzv * wall * 0.5 * side;
      for (let r = 0; r <= rows; r++) {
        const y = (r / rows) * height;
        for (const t of [0, 1]) {
          pos.push(x0 + dx * t + ox, y, z0 + dz * t + oz);
          nrm.push(nxv * side, 0, nzv * side); wn.push(nxv, nzv); ph.push(phase);
        }
      }
      for (let r = 0; r < rows; r++) {
        const a = base + r * 2, b = a + 1, c = a + 2, d = a + 3;
        if (side > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
      }
      base += (rows + 1) * 2;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("aWall", new THREE.Float32BufferAttribute(wn, 2));
  g.setAttribute("aPhase", new THREE.Float32BufferAttribute(ph, 1));
  g.setIndex(idx);
  return { g, walls };
}

const VERT_HEAD = /* glsl */ `
attribute vec2 aWall; attribute float aPhase;
uniform float uCrush, uH, uFold, uStroke;
float foldOff(float y, out float dOff, out float yNew) {
  // length of original wall that has been consumed into folds
  float Lc = min(uH, uCrush / max(0.05, uStroke));
  float y0 = uH - Lc;
  if (y <= y0) { dOff = 0.0; yNew = y; return 0.0; }
  float u = y - y0;                      // distance into the crushed band
  yNew = y0 + u * (1.0 - uStroke);
  float s = aPhase > 0.5 ? 1.0 : -1.0;
  float amp = uFold * 0.55 * smoothstep(0.0, uFold * 0.6, u);
  float k = 3.14159265 / uFold;
  dOff = s * amp * k * cos(k * u) / max(0.05, 1.0 - uStroke);
  return s * amp * sin(k * u);
}
`;

export function useHoneyMaterial(color = "#c9ced8", metal = 0.85) {
  const uniforms = useMemo(() => ({ uCrush: { value: 0 }, uH: { value: 1 }, uFold: { value: 0.1 }, uStroke: { value: 0.72 } }), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: 0.32, side: THREE.DoubleSide, envMapIntensity: 1.2 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = VERT_HEAD + sh.vertexShader
        .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
          float dOffN, yNN; float offN = foldOff(position.y, dOffN, yNN);
          vec3 wN = vec3(aWall.x, 0.0, aWall.y);
          float sgn = dot(objectNormal, wN) >= 0.0 ? 1.0 : -1.0;
          objectNormal = normalize(objectNormal - sgn * vec3(0.0, 1.0, 0.0) * dOffN * 0.9);`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          float dOff, yN; float off = foldOff(position.y, dOff, yN);
          transformed.y = yN;
          transformed.xz += aWall * off;`);
    };
    m.customProgramCacheKey = () => "honey-fold";
    return m;
  }, [color, metal, uniforms]);
  return { mat, uniforms };
}

export default function HoneyBlock({ cell = 1, nx = 7, nz = 6, height = 3, wall = 0.03, crush = 0, fold = 0.15, stroke = 0.72, color = "#dde1e8", metal = 0.7, skins = false }: HoneyBlockProps) {
  const { g } = useMemo(() => honeyGeometry(cell, nx, nz, height, wall), [cell, nx, nz, height, wall]);
  const { mat, uniforms } = useHoneyMaterial(color, metal);
  useEffect(() => () => g.dispose(), [g]);
  useEffect(() => { uniforms.uH.value = height; }, [height, uniforms]);
  // glide toward the target crush so changes animate
  const cur = useRef(crush);
  useFrame((_s, dt) => {
    cur.current += (crush - cur.current) * Math.min(1, dt * 10);
    uniforms.uCrush.value = cur.current; uniforms.uFold.value = fold; uniforms.uStroke.value = stroke;
  });
  const w = 1.5 * (cell / Math.sqrt(3)) * (nx - 1) + cell * 1.2, d = cell * (nz + 0.5);
  return (
    <group>
      <mesh geometry={g} material={mat} castShadow receiveShadow />
      {skins && <>
        <mesh position={[0, -0.02, 0]} receiveShadow><boxGeometry args={[w, 0.04, d]} /><meshStandardMaterial color="#aab0bc" metalness={0.9} roughness={0.28} /></mesh>
        <SkinTop w={w} d={d} height={height} crush={crush} />
      </>}
    </group>
  );
}

function SkinTop({ w, d, height, crush }: { w: number; d: number; height: number; crush: number }) {
  const m = useRef<THREE.Mesh>(null!);
  useFrame((_s, dt) => { m.current.position.y += (height - crush + 0.02 - m.current.position.y) * Math.min(1, dt * 10); });
  return <mesh ref={m} position={[0, height + 0.02, 0]} castShadow><boxGeometry args={[w, 0.04, d]} /><meshStandardMaterial color="#aab0bc" metalness={0.9} roughness={0.28} /></mesh>;
}

/** A universal testing machine: a base, two screw columns, a moving crosshead with a load cell and platen. */
export function Press({ top, width = 7, height = 7, color = "#2c2f24", plate = 2.1 }: { top: number; width?: number; height?: number; color?: string; plate?: number }) {
  const head = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => { head.current.position.y += (top - head.current.position.y) * Math.min(1, dt * 10); });
  const metal = <meshStandardMaterial color="#9aa0a8" metalness={0.9} roughness={0.25} />;
  return (
    <group>
      <mesh position={[0, -0.35, 0]} receiveShadow castShadow><boxGeometry args={[width, 0.5, plate * 2 + 1]} /><meshStandardMaterial color={color} roughness={0.6} metalness={0.3} /></mesh>
      <mesh position={[0, -0.05, 0]} receiveShadow><cylinderGeometry args={[plate, plate, 0.12, 48]} />{metal}</mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (width / 2 - 0.45), height / 2 - 0.1, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, height + 0.6, 20]} /><meshStandardMaterial color="#c9ced8" metalness={1} roughness={0.18} /></mesh>
        </group>
      ))}
      <mesh position={[0, height + 0.4, 0]} castShadow><boxGeometry args={[width, 0.5, 1.2]} /><meshStandardMaterial color={color} roughness={0.55} metalness={0.3} /></mesh>
      <group ref={head} position={[0, top, 0]}>
        <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[plate, plate, 0.12, 48]} />{metal}</mesh>
        {/* load cell */}
        <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.55, 0.55, 0.6, 32]} /><meshStandardMaterial color="#f2b134" metalness={0.5} roughness={0.35} /></mesh>
        <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[width - 0.2, 0.45, 1.0]} /><meshStandardMaterial color={color} roughness={0.55} metalness={0.35} /></mesh>
        <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.12, 0.12, 4, 12]} /><meshStandardMaterial color="#c9ced8" metalness={1} roughness={0.2} /></mesh>
      </group>
    </group>
  );
}
