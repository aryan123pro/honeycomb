"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts } from "@/components/ui";
import { DEW, fmt, HONEY, range, SILK, WAX } from "@/lib/plot";
import { alignedProps, Duct, ductPH, ductR, ductWater } from "@/lib/sim/duct";

/* How a spider makes silk (deck slide 22; Vollrath & Knight 2001). A major ampullate gland: the sac
   (ampulla) stores the liquid-crystal dope; a long S-shaped duct tapers toward the spigot; the thread is
   drawn out and reeled. Molecules are rods (lib/sim/duct.ts, Jeffery's equation in an extensional flow):
   gold when pointing any which way, blue when lined up with the duct. Water leaves and the pH falls along
   the duct, so the alignment sets into a solid thread near the spigot. */

const N = 900;
function ductCurve() {
  // sac → three-limbed S-duct → spigot, in display units
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6.2, 0.8, 0), new THREE.Vector3(-4.6, 0.6, 0), new THREE.Vector3(-3.2, 1.6, 0.4), new THREE.Vector3(-1.6, 1.9, 0.2),
    new THREE.Vector3(-0.2, 1.2, -0.3), new THREE.Vector3(-1.2, -0.2, -0.4), new THREE.Vector3(-2.6, -0.8, 0), new THREE.Vector3(-1.4, -1.9, 0.4),
    new THREE.Vector3(0.6, -1.6, 0.2), new THREE.Vector3(2.0, -0.6, 0), new THREE.Vector3(3.2, -0.2, 0),
  ], false, "catmullrom", 0.4);
}
const R0 = 0.9; // lumen radius at the sac end, display units

function Gland({ k }: { k: number }) {
  const curve = useMemo(ductCurve, []);
  const geo = useMemo(() => {
    const segs = 260, radial = 28;
    const frames = curve.computeFrenetFrames(segs, false);
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const s = i / segs, p = curve.getPointAt(s), n = frames.normals[i], b = frames.binormals[i];
      // the sac bulges at the start; the duct narrows along its length
      const bulge = s < 0.12 ? 1 + 1.6 * Math.sin((s / 0.12) * Math.PI * 0.5 + Math.PI / 2) ** 2 * (1 - s / 0.12) : 1;
      const r = R0 * ductR(s, k) * bulge * 1.15;
      for (let j = 0; j <= radial; j++) { const a = (j / radial) * Math.PI * 2; pos.push(p.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * r, p.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * r, p.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * r); }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b2 = a + radial + 1; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }, [curve, k]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color="#d9e6ef" transmission={0.85} thickness={0.2} roughness={0.15} ior={1.33} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Rods({ duct, k }: { duct: Duct; k: number }) {
  const curve = useMemo(ductCurve, []);
  const frames = useMemo(() => curve.computeFrenetFrames(400, false), [curve]);
  const end = useMemo(() => curve.getPointAt(1), [curve]);
  const tanEnd = useMemo(() => curve.getTangentAt(1), [curve]);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.035, 0.32, 3, 6), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, toneMapped: false }), N);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); return m;
  }, []);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }, [mesh]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const gold = useMemo(() => new THREE.Color("#f2b134"), []), blue = useMemo(() => new THREE.Color("#9fd8ff"), []), white = useMemo(() => new THREE.Color("#eef6ff"), []);
  const v = useMemo(() => new THREE.Vector3(), []), up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame((_s, dt) => {
    duct.o.k = k;
    duct.step(Math.min(dt, 0.04));
    for (let i = 0; i < N; i++) {
      const s = duct.s[i];
      let px: THREE.Vector3, T: THREE.Vector3, Nn: THREE.Vector3, B: THREE.Vector3, r: number;
      if (s <= 1) {
        const f = Math.min(400, Math.round(s * 400));
        px = curve.getPointAt(Math.min(1, s)); T = frames.tangents[f]; Nn = frames.normals[f]; B = frames.binormals[f];
        r = R0 * ductR(s, k) * duct.rad[i];
      } else {
        // the drawn thread, heading off to the reel
        px = end.clone().addScaledVector(tanEnd, (s - 1) * 14); T = tanEnd; Nn = frames.normals[400]; B = frames.binormals[400];
        r = R0 * ductR(1, k) * duct.rad[i] * Math.max(0.15, 1 - (s - 1) * 6);
      }
      const a = duct.phi[i];
      o.position.copy(px).addScaledVector(Nn, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
      const p0 = duct.p[i * 3], p1 = duct.p[i * 3 + 1], p2 = duct.p[i * 3 + 2];
      v.set(0, 0, 0).addScaledVector(T, p0).addScaledVector(Nn, p1).addScaledVector(B, p2).normalize();
      o.quaternion.setFromUnitVectors(up, v);
      const shrink = s > 1 ? 0.75 : 1;
      o.scale.setScalar(shrink); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      const align = Math.abs(p0);
      c.copy(gold).lerp(blue, Math.max(0, (align - 0.4) / 0.6));
      if (s > 0.92) c.lerp(white, Math.min(1, (s - 0.92) / 0.2));
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

function Reel({ speed }: { speed: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => { g.current.rotation.z -= dt * speed * 0.4; });
  return (
    <group position={[6.6, -0.2, 0]}>
      <group ref={g}>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.9, 0.9, 0.6, 40]} /><meshStandardMaterial color="#e8e4d6" roughness={0.3} metalness={0.2} /></mesh>
        {[0, 1, 2].map((i) => <mesh key={i} rotation-z={(i * Math.PI) / 3} position={[0, 0, 0.32]}><boxGeometry args={[1.7, 0.08, 0.02]} /><meshStandardMaterial color="#8b93a6" metalness={0.8} roughness={0.3} /></mesh>)}
      </group>
      <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.5]}><cylinderGeometry args={[0.12, 0.12, 1, 12]} /><meshStandardMaterial color="#8b93a6" metalness={0.9} /></mesh>
    </group>
  );
}

export default function MakingSilk() {
  const [reel, setReel] = useState(10);
  const [taper, setTaper] = useState(true);
  const k = taper ? 14 : 0.05;
  const duct = useMemo(() => new Duct({ reel: 10 }), []);
  useEffect(() => { duct.o.reel = reel; }, [duct, reel]);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  const bins = range(0.05, 1.2, 24);
  const S = bins.map((b) => duct.order(b - 0.05, b + 0.05));
  const Sfib = duct.order(1.12, 1.25);
  const props = alignedProps(Sfib);
  return (
    <div className="split">
      <Plate n="II·3" title="Inside the silk gland" note="drag to turn · scroll to zoom">
        <Stage3D label="A spider's silk gland: rod-like proteins flowing down a tapering duct, lining up, and leaving as a thread" camera={{ position: [0.4, 0.6, 19], fov: 40 }} look={{ bloom: 0.8, threshold: 0.6 }} background="radial-gradient(ellipse 70% 70% at 50% 45%, #1b2026, #0c0d0f 80%)"
          overlay={<>
            <CellTag>Specimen II·3 · major ampullate gland · schematic scale</CellTag>
            <div className="hud tag hud-tr"><span className="k">alignment in the thread</span><span className="big" style={{ color: DEW }}>{fmt(Sfib, 2)}<small>S</small></span><span className="k">0 random · 1 perfectly aligned</span></div>
            <div className="hud tag hud-bl"><span style={{ color: HONEY }}>●</span> rods pointing any way &nbsp; <span style={{ color: DEW }}>●</span> lined up with the flow</div>
          </>}>
          <Gland k={k} />
          <Rods duct={duct} k={k} />
          <Reel speed={reel} />
          <Label3D position={[-6.2, 3.4, 0]} color={WAX} size={0.38}>SAC · liquid crystal dope, ~50% protein</Label3D>
          <Label3D position={[-1.4, 3.2, 0]} color={SILK} size={0.32}>{taper ? "TAPERING S-DUCT · flow stretches" : "NO TAPER · no stretch"}</Label3D>
          <Label3D position={[2.6, 1.4, 0]} color={DEW} size={0.32}>SPIGOT · pH 5.7, water out</Label3D>
          <Label3D position={[6.6, 1.4, 0]} color={SILK} size={0.32}>{`REEL · ${reel} mm/s`}</Label3D>
          <OrbitControls makeDefault enablePan={false} minDistance={6} maxDistance={28} />
        </Stage3D>
      </Plate>
      <div className="stack">
        <div className="prose">
          <p><strong>Spun at room temperature, from water.</strong> The raw silk is a liquid crystal: rod-like proteins that slide past each other easily. The taper speeds the flow up, which stretches it and swings the rods into line. Water and sodium are pulled out and the duct turns acidic, so the lined-up protein locks into a solid fibre at the spigot (deck, slide 22).</p>
        </div>
        <Range label="Reeling speed" value={reel} min={1} max={25} step={1} onChange={setReel} fmt={(v) => v + " mm/s"} />
        <div className="row"><button className="btn sm" aria-pressed={taper} onClick={() => setTaper((t) => !t)}>{taper ? "Remove the taper" : "Restore the taper"}</button></div>
        <Plot label="Alignment of the molecules along the duct" height={190} opts={{
          x: [0, 1.2], y: [-0.2, 1], padL: 36, xlabel: "along the gland  ·  sac → spigot (1) → thread", ylabel: "alignment S",
          xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1], xfmt: (v) => (v === 1 ? "spigot" : String(v)),
          bands: [{ x0: 1, x1: 1.2, color: "rgba(159,216,255,.07)", label: "drawn" }],
          series: [
            { xs: bins, data: S, color: DEW, width: 2.5, dots: true },
            { xs: range(0, 1, 40), data: range(0, 1, 40).map((s) => (ductPH(s) - 5.5) / 2.5), color: HONEY, width: 1.5, dash: [4, 3] },
            { xs: range(0, 1, 40), data: range(0, 1, 40).map((s) => ductWater(s) * 2), color: WAX, width: 1.5, dash: [1, 3] },
          ],
        }} />
        <p className="faint" style={{ fontSize: 12, marginTop: -6 }}><span style={{ color: HONEY }}>– –</span> pH 7.6 → 5.7 (Andersson et al. 2014) &nbsp; <span style={{ color: WAX }}>···</span> water 50% → 0</p>
        <Readouts items={[
          ["Thread alignment", fmt(Sfib, 2), "S", "acc"],
          ["Stiffness*", fmt(props.E, 1), "GPa"],
          ["Strength*", fmt(props.strength, 2), "GPa"],
          ["Stretch*", fmt(props.ext * 100), "%"],
        ]} />
        <p className="honest">* Illustrative: the link from alignment to fibre properties is not fitted to data. It shows the trend Vollrath, Madsen &amp; Shao (2001) measured: reel faster and silk gets stiffer and stronger but less stretchy. The duct is drawn short and fat; a real one is several centimetres long and narrower than a hair at the end.</p>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <p className="eyebrow" style={{ margin: "8px 0 14px" }}>Is it possible to make spider silk? (deck slide 23)</p>
        <div className="cardgrid">
          <div className="card"><h4>Farm spiders?</h4><p>No. Spiders are territorial and eat each other, so they can&apos;t be kept by the thousand like silkworms.</p></div>
          <div className="card"><h4>Bacteria and yeast</h4><p>Microbes can be given spider-silk genes and make recombinant spidroin, but the proteins are huge and repetitive, so yields are low and the cost high.</p></div>
          <div className="card"><h4>Transgenic silkworms</h4><p>Silkworms carrying spider-silk genes now spin composite threads in quantity (deck timeline, 2024): the industry&apos;s spinning machinery, with some of the spider&apos;s protein.</p></div>
          <div className="card"><h4>Spin like a spider</h4><p>Biomimetic spinning copies the duct: a falling pH and a stretching flow, at room temperature and in water. The process matters as much as the protein.</p></div>
        </div>
      </div>
      <Notes say="No heat, no harsh solvents: the spider pulls a liquid down a narrowing tube, the flow lines the molecules up, and the water is squeezed out. Copying the process, not just the protein, could give us strong fibres under gentle, sustainable conditions." show="Take the taper away and watch the rods stay gold. Then speed the reel up." ask="Why is it so hard to make spider silk in a factory if we know the protein? (Making the protein is only half of it; the spinning matters too.)" />
    </div>
  );
}
