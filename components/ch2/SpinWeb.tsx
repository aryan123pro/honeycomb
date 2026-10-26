"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Spider from "@/components/three/Spider";
import Stage3D from "@/components/three/Stage3D";
import { segmentHz } from "@/components/three/WebView";
import { CellTag, Notes, Plate, Readouts, Seg, SoundCue } from "@/components/ui";
import { audio } from "@/lib/audio";
import { DEW, fmt, LEAF, SILK } from "@/lib/plot";
import { FIBRES, toughness } from "@/lib/silk";
import { KIND, WebSim } from "@/lib/sim/web";

/* Spinning an orb, in the order an Araneus builds it (Zschokke 1999; Eberhard 1990): a bridge line, the
   frame and anchors, the radii out from the hub, a temporary auxiliary spiral working outward, then the
   sticky capture spiral laid inward while the auxiliary is cut away, and finally the hub. The web is the
   same settled geometry the Hit-the-web model uses, so the threads drawn here are the ones that are hit
   there. Click any thread to pluck it: it sounds at its real tension frequency f = (1/2L)√(σ/ρ). */

type Phase = { name: string; note: string; kinds: number[] };
const PHASES: Phase[] = [
  { name: "Bridge & frame", note: "A thread floated on the breeze snags a twig: the bridge. She reinforces it, drops a Y, and pulls the frame and anchors tight.", kinds: [KIND.anchor, KIND.frame] },
  { name: "Radii", note: "She walks out from the centre to the frame and back, laying each radius in dragline silk: stiff, strong, the web's skeleton.", kinds: [KIND.radial, KIND.hub] },
  { name: "Auxiliary spiral", note: "A temporary scaffold spiral, laid outward from the hub, holds the radii in place while she works.", kinds: [] },
  { name: "Capture spiral", note: "Working inward, she lays the stretchy, glue-coated capture spiral, cutting the scaffold away as she goes. This takes most of the time.", kinds: [KIND.spiral] },
  { name: "Waiting at the hub", note: "Done in about half an hour. She sits at the hub, head down, legs on the radii, feeling for vibrations.", kinds: [] },
];

interface Seg3 { a: THREE.Vector3; b: THREE.Vector3; kind: number; i: number; aux?: boolean }

export default function SpinWeb() {
  const sim = useMemo(() => new WebSim({ seed: 7 }), []);
  const S = 10; // 1 unit = 1 dm
  // the build sequence, segment by segment
  const order = useMemo(() => {
    const P = (i: number) => new THREE.Vector3(sim.rest[i * 3], sim.rest[i * 3 + 1], sim.rest[i * 3 + 2]);
    const seg = (i: number): Seg3 => ({ a: P(sim.a[i]), b: P(sim.b[i]), kind: sim.kind[i], i });
    const byKind = (k: number) => Array.from({ length: sim.ns }, (_, i) => i).filter((i) => sim.kind[i] === k && sim.broken[i] !== 2);
    const radial = byKind(KIND.radial).sort((p, q) => Math.atan2(sim.rest[sim.a[p] * 3 + 1], sim.rest[sim.a[p] * 3]) - Math.atan2(sim.rest[sim.a[q] * 3 + 1], sim.rest[sim.a[q] * 3]) || (sim.rest[sim.a[p] * 3] ** 2 + sim.rest[sim.a[p] * 3 + 1] ** 2) - (sim.rest[sim.a[q] * 3] ** 2 + sim.rest[sim.a[q] * 3 + 1] ** 2));
    const spiral = byKind(KIND.spiral).reverse(); // laid from the outside in
    // a coarse auxiliary spiral: an Archimedean spiral with wide spacing, outward
    const aux: Seg3[] = [];
    let prev: THREE.Vector3 | null = null;
    for (let t = 0; t < 1; t += 0.006) { const phi = t * Math.PI * 2 * 5, r = 0.03 + t * 0.12; const p = new THREE.Vector3(Math.cos(phi) * r, Math.sin(phi) * r, 0.0005); if (prev) aux.push({ a: prev, b: p, kind: -1, i: -1, aux: true }); prev = p; }
    return [
      [...byKind(KIND.anchor), ...byKind(KIND.frame)].map(seg),
      [...radial, ...byKind(KIND.hub)].map(seg),
      aux,
      spiral.map(seg),
    ] as Seg3[][];
  }, [sim]);
  const total = order.reduce((s, p) => s + p.length, 0);
  // relative time of each phase (capture spiral takes longest)
  const weights = [0.12, 0.2, 0.13, 0.55];
  const [t, setT] = useState(0);        // 0..1 progress
  const [play, setPlay] = useState(true);
  const [show, setShow] = useState<"all" | "radial" | "spiral" | "frame">("all");
  const [pluck, setPluck] = useState<{ hz: number; kind: number } | null>(null);
  useEffect(() => {
    if (!play) return;
    let raf = 0, last = performance.now();
    const f = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; setT((x) => { const n = x + dt / 26; if (n >= 1.08) { setPlay(false); return 1.08; } return n; }); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [play]);

  // which phase and how far through it
  let acc = 0, phase = 4, within = 1;
  for (let k = 0; k < 4; k++) { if (t < acc + weights[k]) { phase = k; within = (t - acc) / weights[k]; break; } acc += weights[k]; }
  const drawnCount = (k: number) => (k < phase ? order[k].length : k === phase ? Math.floor(order[k].length * within) : 0);
  const auxVisible = phase === 2 ? drawnCount(2) : phase === 3 ? Math.floor(order[2].length * (1 - within)) : 0;

  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const pos = useMemo(() => new Float32Array((total + 10) * 6), [total]);
  const col = useMemo(() => new Float32Array((total + 10) * 6), [total]);
  useEffect(() => { geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); }, [geo, pos, col]);
  useEffect(() => () => geo.dispose(), [geo]);
  const tip = useRef(new THREE.Vector3());
  // write drawn segments
  {
    let n = 0;
    const put = (s: Seg3 | undefined, frac = 1) => {
      if (!s) return;
      const b = frac < 1 ? s.a.clone().lerp(s.b, frac) : s.b;
      pos.set([s.a.x, s.a.y, s.a.z, b.x, b.y, b.z], n * 6);
      const dim = show !== "all" && !((show === "radial" && (s.kind === KIND.radial || s.kind === KIND.hub)) || (show === "spiral" && s.kind === KIND.spiral) || (show === "frame" && (s.kind === KIND.frame || s.kind === KIND.anchor)));
      const c = s.aux ? [0.55, 0.6, 0.66] : s.kind === KIND.spiral ? [0.78, 0.94, 0.54] : s.kind === KIND.anchor ? [0.55, 0.58, 0.62] : [0.88, 0.9, 0.93];
      const m = dim ? 0.18 : 1;
      col.set([c[0] * m, c[1] * m, c[2] * m, c[0] * m, c[1] * m, c[2] * m], n * 6);
      n++;
    };
    for (let k = 0; k < 4; k++) {
      if (k === 2) { for (let j = 0; j < auxVisible; j++) put(order[2][j]); continue; }
      const c = drawnCount(k);
      for (let j = 0; j < c; j++) put(order[k][j]);
      if (k === phase && c < order[k].length && order[k][c]) { const s = order[k][c]; const fr = (order[k].length * within) % 1; put(s, fr); tip.current.copy(s.a).lerp(s.b, fr); }
    }
    if (phase === 2 && auxVisible > 0) tip.current.copy(order[2][Math.max(0, auxVisible - 1)].b);
    if (phase === 4) tip.current.set(0, 0, 0);
    geo.setDrawRange(0, n * 2);
    if (geo.attributes.position) { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; }
  }

  const onPick = (x: number, y: number) => {
    // nearest drawn segment to the click, in metres
    let best = -1, bd = Infinity;
    for (let i = 0; i < sim.ns; i++) {
      if (sim.broken[i] === 2 || sim.kind[i] === KIND.anchor) continue;
      const a = sim.a[i] * 3, b = sim.b[i] * 3;
      const mx = (sim.rest[a] + sim.rest[b]) / 2, my = (sim.rest[a + 1] + sim.rest[b + 1]) / 2;
      const d = (mx - x) ** 2 + (my - y) ** 2; if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return;
    const hz = segmentHz(sim, best);
    audio().pluck(hz, 0.6);
    setPluck({ hz, kind: sim.kind[best] });
  };

  const f = show === "spiral" ? FIBRES.viscid : FIBRES.araneus;
  return (
    <div className="split">
      <Plate n="II·1" title="An orb, thread by thread" note="click a thread to pluck it · drag to turn">
        <Stage3D label="A garden spider building an orb web: frame, radii, auxiliary spiral, capture spiral" camera={{ position: [0.5, 0.2, 6.4], fov: 40 }} look={{ bloom: 0.9, threshold: 0.6 }} background="radial-gradient(ellipse 70% 70% at 50% 45%, #1b2026, #0c0d0f 80%)"
          overlay={<>
            <CellTag>Specimen II·1 · Araneus diadematus · {PHASES[phase].name.toLowerCase()}</CellTag>
            {pluck && <div className="hud tag hud-tr"><span className="k">{["radial", "capture spiral", "frame", "anchor", "hub"][pluck.kind]} thread</span><span className="big" style={{ color: DEW }}>{fmt(pluck.hz)}<small>Hz</small></span><span className="k">its tension note</span></div>}
          </>}>
          <group scale={S}>
            <lineSegments geometry={geo} frustumCulled={false}><lineBasicMaterial vertexColors toneMapped={false} /></lineSegments>
            <SpiderOn tip={tip} sitting={phase === 4} />
            <PickPlane onPick={onPick} R={sim.spec.R} />
            {/* the twigs the anchors are tied to */}
            <mesh position={[-0.2, 0.25, -0.01]} rotation-z={0.6}><cylinderGeometry args={[0.006, 0.009, 0.25, 8]} /><meshStandardMaterial color="#4a3a28" roughness={0.9} /></mesh>
            <mesh position={[0.23, -0.2, -0.01]} rotation-z={-0.9}><cylinderGeometry args={[0.006, 0.008, 0.2, 8]} /><meshStandardMaterial color="#4a3a28" roughness={0.9} /></mesh>
          </group>
          {phase >= 1 && <Label3D position={[1.15, 0.75, 0.05]} color={SILK} size={0.14}>RADIAL · stiff dragline</Label3D>}
          {phase >= 3 && <Label3D position={[0.9, -1.1, 0.05]} color={LEAF} size={0.14}>CAPTURE SPIRAL · stretchy, sticky</Label3D>}
          <Label3D position={[-1.5, 1.75, 0.05]} color="#8a9099" size={0.13}>FRAME &amp; ANCHORS</Label3D>
          <OrbitControls makeDefault enablePan={false} minDistance={2.2} maxDistance={9} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="dive-levels" style={{ marginTop: 0 }}>
          {PHASES.map((p, i) => <button key={p.name} aria-pressed={i === phase} onClick={() => { let a = 0; for (let k = 0; k < i; k++) a += weights[k] ?? 0; setT(i === 4 ? 1.0 : a + 0.001); setPlay(i < 4); }}><b>{i + 1} · {p.name}</b></button>)}
        </div>
        <p className="muted" style={{ fontSize: 15 }}>{PHASES[phase].note}</p>
        <div className="btnrow">
          <button className="btn sm primary" onClick={() => { if (t >= 1.07) setT(0); setPlay((p) => !p); }}>{play ? "Pause" : t >= 1.07 ? "Spin it again" : "Spin"}</button>
          <Seg options={[["all", "All"], ["radial", "Radials"], ["spiral", "Spiral"], ["frame", "Frame"]]} value={show} onChange={setShow} label="Highlight" />
        </div>
        <p className="eyebrow" style={{ marginTop: 6 }}>{show === "spiral" ? "Capture spiral silk (flagelliform + glue)" : "Dragline (major ampullate) silk"} · Gosline et al. 1999</p>
        <Readouts items={[
          ["Stiffness", f.E < 0.1 ? fmt(f.E * 1000, 0) : fmt(f.E, 0), f.E < 0.1 ? "MPa" : "GPa", "acc"],
          ["Strength", fmt(f.sf, 1), "GPa"],
          ["Stretch to break", fmt(f.ef * 100), "%"],
          ["Toughness", fmt(toughness(f)), "MJ/m³"],
        ]} />
        <div className="tablewrap"><table className="data">
          <thead><tr><th>Thread</th><th>Job</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr><td>Radial</td><td>Carry the main load from centre to frame</td><td>Stiff (≈10 GPa) and strong</td></tr>
            <tr><td>Capture spiral</td><td>Stretch, stick, and soak up the impact</td><td>Rubbery (3 MPa), stretches to 3.7× its length</td></tr>
            <tr><td>Frame &amp; anchor</td><td>Pass the load to branches or walls</td><td>Thick dragline, several strands</td></tr>
          </tbody>
        </table></div>
        <p className="honest">The web works because these jobs are divided, not because one thread does everything (deck, slide 20). The spider here is drawn about 2.5× life size; the web is 30 cm across.</p>
        <SoundCue label="Pluck threads" />
      </div>
      <Notes say="Three kinds of thread, three jobs. Radials are the skeleton: stiff dragline silk. The capture spiral is a rubber band covered in glue. The frame and anchors pass everything to the twigs. Click a thread and you'll hear it: spiders really do feel prey by these vibrations." show="Let the build play, then highlight Radials and Spiral in turn; pluck a radial and a spiral thread and compare the pitch." ask="Why would a spider use a different silk for the spiral than for the radii?" />
    </div>
  );
}

function SpiderOn({ tip, sitting }: { tip: React.MutableRefObject<THREE.Vector3>; sitting: boolean }) {
  const g = useRef<THREE.Group>(null!);
  const last = useRef(new THREE.Vector3());
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_s, dt) => {
    const target = tip.current;
    g.current.position.lerp(tmp.set(target.x, target.y, 0.004), Math.min(1, dt * 8));
    const dx = target.x - last.current.x, dy = target.y - last.current.y;
    // the model's head points −y after the tilt below; turn it to face the way she is walking
    const want = sitting ? 0 : dx * dx + dy * dy > 1e-10 ? Math.atan2(dx, -dy) : g.current.rotation.z;
    let d = want - g.current.rotation.z; d = ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    g.current.rotation.z += d * Math.min(1, dt * 6);
    last.current.copy(target);
  });
  // the spider model is in cm with +z forward and +y up: tilting it +90° about x puts her back toward the
  // viewer (+z) and her head down (−y), as she hangs in a vertical web; drawn 2.5× life size
  return <group ref={g}><group rotation-x={Math.PI / 2} scale={0.025}><Spider walk={sitting ? 0 : 1} rest={sitting ? 0.5 : 0} spinning={!sitting} /></group></group>;
}

function PickPlane({ onPick, R }: { onPick: (x: number, y: number) => void; R: number }) {
  return (
    <mesh onPointerDown={(e) => { e.stopPropagation(); const l = e.object.worldToLocal(e.point.clone()); onPick(l.x, l.y); }} onPointerOver={() => (document.body.style.cursor = "crosshair")} onPointerOut={() => (document.body.style.cursor = "")}>
      <planeGeometry args={[R * 3.4, R * 3.4]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}
