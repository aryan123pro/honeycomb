"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/* A ten-storey office tower, 30 × 30 m in plan, 3.5 m storeys, in metres. Concrete floor slabs and
   columns, a core, and facade panels 1.5 m wide hung storey by storey on two faces (the other two are
   left open so the frame shows). When `shake` > 0 the ground moves and the tower sways in its first
   mode (drift growing with height); panel colour shows the seismic force on each panel's fixings,
   which grows with height (ASCE 7: Fp ∝ 1 + 2z/h). */

export const STOREYS = 10, STOREY_H = 3.5, PLAN = 30, PANEL_W = 1.5;
export const TOWER_H = STOREYS * STOREY_H;

function hexTexture(base: string, line: string) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!; g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = line; g.lineWidth = 2;
  const a = 18, w = a * Math.sqrt(3);
  for (let row = -1; row < 12; row++) for (let col = -1; col < 10; col++) {
    const cx = col * w + (row % 2) * (w / 2), cy = row * a * 1.5;
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const an = Math.PI / 6 + (k * Math.PI) / 3; const x = cx + Math.cos(an) * a, y = cy + Math.sin(an) * a; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export type PanelLook = "precast" | "stone" | "glass" | "honey" | "stonehoney";

function panelMaterial(look: PanelLook) {
  switch (look) {
    case "precast": return new THREE.MeshStandardMaterial({ color: "#a7a497", roughness: 0.92 });
    case "stone": return new THREE.MeshStandardMaterial({ color: "#c9b998", roughness: 0.7 });
    case "glass": return new THREE.MeshPhysicalMaterial({ color: "#7fb6d6", roughness: 0.05, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.6 });
    case "honey": return new THREE.MeshStandardMaterial({ color: "#d9dde3", metalness: 0.85, roughness: 0.3, map: typeof document === "undefined" ? null : hexTexture("#b9bec8", "#8d939f") });
    case "stonehoney": return new THREE.MeshStandardMaterial({ color: "#e0cfa8", roughness: 0.65 });
  }
}

export default function Tower({ look, shake = 0, amp = 1, heat = true }: { look: PanelLook; shake?: number; amp?: number; heat?: boolean }) {
  const perFace = Math.round(PLAN / PANEL_W);
  const n = perFace * STOREYS * 2;
  const panelGeo = useMemo(() => new THREE.BoxGeometry(PANEL_W * 0.96, STOREY_H * 0.94, look === "precast" ? 0.15 : look === "stone" ? 0.06 : 0.03), [look]);
  const mat = useMemo(() => panelMaterial(look), [look]);
  const panels = useMemo(() => { const m = new THREE.InstancedMesh(panelGeo, mat, n); m.castShadow = true; m.receiveShadow = true; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); return m; }, [panelGeo, mat, n]);
  const slabs = useRef<THREE.Group>(null!);
  const ground = useRef<THREE.Group>(null!);
  useEffect(() => () => { panelGeo.dispose(); mat.dispose(); }, [panelGeo, mat]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // 1.2 Hz ground motion; first-mode response lags and grows with height (drawn exaggerated)
    const xg = shake * 0.35 * Math.sin(2 * Math.PI * 1.2 * t);
    const top = shake * amp * 1.6 * Math.sin(2 * Math.PI * 1.2 * t - 0.9);
    const sway = (z: number) => xg + top * Math.pow(z / TOWER_H, 1.3);
    ground.current.position.x = xg;
    slabs.current.children.forEach((c, i) => { c.position.x = sway(i * STOREY_H); });
    let k = 0;
    for (let face = 0; face < 2; face++) for (let s = 0; s < STOREYS; s++) for (let p = 0; p < perFace; p++) {
      const z = (s + 0.5) * STOREY_H;
      const u = (p + 0.5) * PANEL_W - PLAN / 2;
      if (face === 0) { o.position.set(u + sway(z), z, PLAN / 2 + 0.35); o.rotation.set(0, 0, 0); }
      else { o.position.set(PLAN / 2 + 0.35 + sway(z), z, -u); o.rotation.set(0, Math.PI / 2, 0); }
      // a panel's drift between its top and bottom fixings tilts it slightly
      o.rotation.z = -(sway(z + STOREY_H / 2) - sway(z - STOREY_H / 2)) / STOREY_H * 0.6;
      o.updateMatrix(); panels.setMatrixAt(k, o.matrix);
      if (heat) {
        // design force factor 1 + 2z/h, from 1 at the ground to 3 at the roof
        const f = (1 + (2 * z) / TOWER_H) / 3;
        const pulse = shake > 0 ? 0.65 + 0.35 * Math.abs(Math.sin(2 * Math.PI * 1.2 * t - 0.9)) : 0.5;
        col.setRGB(1, 1 - f * f * 0.35 * pulse, 1 - f * f * 0.6 * pulse);
      } else col.setRGB(1, 1, 1);
      panels.setColorAt(k, col);
      k++;
    }
    panels.instanceMatrix.needsUpdate = true;
    if (panels.instanceColor) panels.instanceColor.needsUpdate = true;
  });

  const columns = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (i === 0 || j === 0 || i === 4 || j === 4) out.push([-PLAN / 2 + (i * PLAN) / 4, -PLAN / 2 + (j * PLAN) / 4]);
    return out;
  }, []);

  return (
    <group>
      <group ref={ground}>
        <mesh position={[0, -0.6, 0]} receiveShadow><boxGeometry args={[PLAN + 14, 1.2, PLAN + 14]} /><meshStandardMaterial color="#2a2b20" roughness={0.95} /></mesh>
      </group>
      <group ref={slabs}>
        {Array.from({ length: STOREYS + 1 }, (_, s) => (
          <group key={s} position={[0, s * STOREY_H, 0]}>
            <mesh castShadow receiveShadow><boxGeometry args={[PLAN, 0.3, PLAN]} /><meshStandardMaterial color="#8d8b80" roughness={0.85} /></mesh>
            {s < STOREYS && columns.map(([x, z], i) => <mesh key={i} position={[x, STOREY_H / 2, z]} castShadow><boxGeometry args={[0.7, STOREY_H, 0.7]} /><meshStandardMaterial color="#77756b" roughness={0.9} /></mesh>)}
            {s < STOREYS && <mesh position={[0, STOREY_H / 2, 0]} castShadow><boxGeometry args={[7, STOREY_H, 7]} /><meshStandardMaterial color="#6b695f" roughness={0.9} /></mesh>}
          </group>
        ))}
      </group>
      <primitive object={panels} />
    </group>
  );
}
