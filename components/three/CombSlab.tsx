"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/* A double-sided sheet of honeybee comb, in centimetres. Worker cells are about 5.3 mm across the flats
   with walls under 0.1 mm thick (drawn thicker so they show); each is about 11 mm deep and tilts up
   ~13° so honey doesn't run out. The cells on the two faces are offset by a third of a cell and share
   their bases: each base is three rhombi meeting at a point, the cap of a rhombic dodecahedron. With
   hexagon side a, the rhombi need an out-of-plane step d = a/(2√2) between alternate corners to have the
   √2 diagonal ratio of a rhombic dodecahedron (the 109.47° Maraldi angle). */

export const CELL_W = 0.53;            // across flats, cm
export const CELL_A = CELL_W / Math.sqrt(3); // side
export const CELL_D = 1.05;            // depth, cm
const TILT = (13 * Math.PI) / 180;

/** Hexagon corners (pointy-top, as in natural comb: vertical side walls, a vertex up and down). */
export const hexCorner = (k: number, r: number): [number, number] => { const a = Math.PI / 6 + (k * Math.PI) / 3; return [Math.cos(a) * r, Math.sin(a) * r]; };

/** One cell's geometry: six inset walls (inner faces + rim) and the three-rhombus base. side = +1 front, −1 back. */
export function cellGeometry(wall = 0.03, depth = CELL_D, side = 1, withBase = true) {
  const a = CELL_A, ai = a - wall / Math.sqrt(3), d = a / (2 * Math.sqrt(2));
  const pos: number[] = [];
  const quad = (p: number[][]) => { pos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]); };
  // base heights: even corners at 0, odd corners raised by d; the apex at the centre sinks by d
  const zb = (k: number) => (k % 2 ? d : 0);
  const tilt = (x: number, y: number, z: number) => { const zz = z * side; return [x, y + Math.sin(TILT) * zz, zz * Math.cos(TILT)]; };
  for (let k = 0; k < 6; k++) {
    const [x0, y0] = hexCorner(k, ai), [x1, y1] = hexCorner(k + 1, ai);
    const [X0, Y0] = hexCorner(k, a), [X1, Y1] = hexCorner(k + 1, a);
    // inner face, from the base up to the rim (wound to face the cell's axis)
    quad([tilt(x1, y1, zb(k + 1)), tilt(x0, y0, zb(k)), tilt(x0, y0, depth), tilt(x1, y1, depth)]);
    // outer face (shared plane with the neighbour; hidden inside the comb, visible at its edge)
    quad([tilt(X0, Y0, zb(k)), tilt(X1, Y1, zb(k + 1)), tilt(X1, Y1, depth), tilt(X0, Y0, depth)]);
    // rim
    quad([tilt(x0, y0, depth), tilt(X0, Y0, depth), tilt(X1, Y1, depth), tilt(x1, y1, depth)]);
  }
  if (withBase) {
    const c = tilt(0, 0, -d);
    for (let r = 0; r < 3; r++) {
      const k = r * 2;
      const [xa, ya] = hexCorner(k, ai), [xb, yb] = hexCorner(k + 1, ai), [xc, yc] = hexCorner(k + 2, ai);
      quad([c, tilt(xc, yc, zb(k + 2)), tilt(xb, yb, zb(k + 1)), tilt(xa, ya, zb(k))].map((p) => p as number[]));
    }
  }
  if (side < 0) for (let i = 0; i < pos.length; i += 9) { for (let j = 0; j < 3; j++) { const t = pos[i + 3 + j]; pos[i + 3 + j] = pos[i + 6 + j]; pos[i + 6 + j] = t; } }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Cell centres for a patch of comb, pointy-top hex lattice. */
export function combCenters(cols: number, rows: number, shape: "rect" | "oval" = "oval") {
  const out: [number, number][] = [];
  const w = CELL_W, h = CELL_A * 1.5;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = (i - cols / 2 + (j % 2) * 0.5) * w, y = (j - rows / 2) * h;
    if (shape === "oval" && (x / (cols * w * 0.5)) ** 2 + (y / (rows * h * 0.52)) ** 2 > 1) continue;
    out.push([x, y]);
  }
  return out;
}

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

export function waxMaterial(color = "#e9b44c") {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0, sheen: 0.6, sheenColor: new THREE.Color("#fff1c4"), sheenRoughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.6, side: THREE.DoubleSide, emissive: new THREE.Color(color), emissiveIntensity: 0.06 });
}

export default function CombSlab({ cols = 22, rows = 18, back = true, honey = 0.35, capped = 0.25, wax = "#e9b44c", seed = 4, shape = "oval", clip }: {
  cols?: number; rows?: number; back?: boolean; honey?: number; capped?: number; wax?: string; seed?: number; shape?: "rect" | "oval"; clip?: THREE.Plane[];
}) {
  const centers = useMemo(() => combCenters(cols, rows, shape), [cols, rows, shape]);
  const geoF = useMemo(() => cellGeometry(0.035, CELL_D, 1), []);
  const geoB = useMemo(() => cellGeometry(0.035, CELL_D, -1, false), []);
  const mat = useMemo(() => waxMaterial(wax), [wax]);
  const honeyMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#d8860f", roughness: 0.05, transmission: 0.35, thickness: 0.5, ior: 1.49, clearcoat: 1, emissive: new THREE.Color("#7a3a00"), emissiveIntensity: 0.25 }), []);
  const capMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#f3dc8e", roughness: 0.75, sheen: 1, sheenColor: new THREE.Color("#fff6d6") }), []);
  const hexGeo = useMemo(() => new THREE.CircleGeometry(CELL_A * 0.9, 6, Math.PI / 6), []);
  const pick = useMemo(() => { const r = rng(seed); return centers.map(() => { const u = r(); return u < capped ? 2 : u < capped + honey ? 1 : 0; }); }, [centers, honey, capped, seed]);

  const front = useMemo(() => { const m = new THREE.InstancedMesh(geoF, mat, centers.length); const o = new THREE.Object3D(); centers.forEach(([x, y], i) => { o.position.set(x, y, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; m.receiveShadow = true; return m; }, [centers, geoF, mat]);
  const backM = useMemo(() => { const m = new THREE.InstancedMesh(geoB, mat, centers.length); const o = new THREE.Object3D(); centers.forEach(([x, y], i) => { o.position.set(x + CELL_W / 2, y + CELL_A / 2, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); return m; }, [centers, geoB, mat]);
  const fills = useMemo(() => {
    const hn = pick.filter((p) => p === 1).length, cp = pick.filter((p) => p === 2).length;
    const H = new THREE.InstancedMesh(hexGeo, honeyMat, Math.max(1, hn)), C = new THREE.InstancedMesh(hexGeo, capMat, Math.max(1, cp));
    const o = new THREE.Object3D(); let a = 0, b = 0;
    centers.forEach(([x, y], i) => {
      if (pick[i] === 1) { const z = CELL_D * 0.72; o.position.set(x, y + Math.sin(TILT) * z, z * Math.cos(TILT)); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); H.setMatrixAt(a++, o.matrix); }
      if (pick[i] === 2) { const z = CELL_D * 0.985; o.position.set(x, y + Math.sin(TILT) * z, z * Math.cos(TILT)); o.rotation.set(-TILT * 0.3, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); C.setMatrixAt(b++, o.matrix); }
    });
    H.count = a; C.count = b;
    return { H, C };
  }, [centers, pick, hexGeo, honeyMat, capMat]);
  useEffect(() => () => { geoF.dispose(); geoB.dispose(); mat.dispose(); }, [geoF, geoB, mat]);
  useEffect(() => { for (const m of [mat, honeyMat, capMat]) { m.clippingPlanes = clip ?? null; m.needsUpdate = true; } }, [clip, mat, honeyMat, capMat]);

  return (
    <group>
      <primitive object={front} />
      {back && <primitive object={backM} />}
      <primitive object={fills.H} />
      <primitive object={fills.C} />
    </group>
  );
}
