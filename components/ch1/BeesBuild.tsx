"use client";
import { Line, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Bee from "@/components/three/Bee";
import CombSlab, { CELL_A, CELL_D, CELL_W, waxMaterial } from "@/components/three/CombSlab";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts } from "@/components/ui";
import { TILINGS } from "@/lib/honeycomb";
import { fmt, GOOD, HONEY, MUTED, WAX } from "@/lib/plot";
import { Comb, roundedInset } from "@/lib/sim/comb";

/* The biology, in three levels:
   1. The comb: real proportions, double-sided, three-rhombus bases, cells tilted up 13°.
   2. No blueprint: random starting points + one local rule → hexagons (lib/sim/comb.ts), and round
      cells melting into hexagons as warm wax flows.
   3. Why hexagons: the wall needed per cell for triangles, squares, hexagons and separate circles. */

type Level = "comb" | "build" | "tile";

/* ---------- level 1: the comb ---------- */
function WalkingBee({ path, speed = 0.12, offset = 0 }: { path: [number, number][]; speed?: number; offset?: number }) {
  const g = useRef<THREE.Group>(null!);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(path.map(([x, y]) => new THREE.Vector3(x, y, CELL_D + 0.16)), true), [path]);
  useFrame(({ clock }) => {
    const u = ((clock.elapsedTime * speed + offset) % 1 + 1) % 1;
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    g.current.position.copy(p);
    g.current.rotation.set(0, 0, Math.atan2(t.y, t.x));
  });
  // the bee's back faces out of the comb (+z) and its head points along the path (+x before heading)
  return <group ref={g}><group rotation-z={Math.PI / 2} scale={0.55}><group rotation-x={Math.PI / 2}><Bee flap={0.15} walk={1} /></group></group></group>;
}

function CombLevel({ cut }: { cut: boolean }) {
  const clip = useMemo(() => (cut ? [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.05)] : undefined), [cut]);
  return (
    <group rotation-y={-0.5}>
      <CombSlab cols={20} rows={16} clip={clip} />
      {/* the wooden top bar the bees hang their comb from */}
      <mesh position={[0, 4.05, 0]} castShadow><boxGeometry args={[11.5, 0.6, 2.8]} /><meshStandardMaterial color="#6b4a2a" roughness={0.85} /></mesh>
      <WalkingBee path={[[-2, 1], [0.5, 1.6], [2.2, 0.4], [1, -1.4], [-1.6, -0.8]]} speed={0.05} />
      <WalkingBee path={[[2.5, -1.8], [3.4, 0.2], [1.8, 1.8], [0.2, -0.2]]} speed={0.07} offset={0.4} />
      {/* dimensions */}
      <Line points={[[-CELL_W / 2, -2.6, CELL_D + 0.05], [CELL_W / 2, -2.6, CELL_D + 0.05]]} color={HONEY} lineWidth={2} />
      <Label3D position={[0, -3.25, CELL_D + 0.1]} color={HONEY} size={0.42}>5.3 mm ACROSS</Label3D>
      <Label3D position={[4.6, 1.6, 0.8]} to={[3.6, 0.6, CELL_D]} color={WAX} size={0.36}>WALLS 0.07 MM</Label3D>
      <Label3D position={[-4.8, 2.2, 1.2]} to={[-3.4, 1.2, CELL_D]} color={WAX} size={0.36}>TILTED UP 13°</Label3D>
      {cut && <Label3D position={[0.2, -1.2, -1.8]} to={[0, 0, -0.1]} color={HONEY} size={0.36}>SHARED 3-RHOMBUS BASE</Label3D>}
      {cut && <Label3D position={[-0.6, 2.4, -2.2]} to={[0, 1.2, -CELL_D * 0.6]} color={WAX} size={0.32}>BACK CELLS, OFFSET</Label3D>}
    </group>
  );
}

/* ---------- level 2: building without a blueprint ---------- */
function WaxSheet({ comb, melt, version }: { comb: Comb; melt: number; version: number }) {
  const mat = useMemo(() => waxMaterial("#f0c35a"), []);
  const geo = useMemo(() => {
    const W = comb.W, H = comb.H, m = 0.35;
    const shape = new THREE.Shape([new THREE.Vector2(-W / 2 - m, -H / 2 - m), new THREE.Vector2(W / 2 + m, -H / 2 - m), new THREE.Vector2(W / 2 + m, H / 2 + m), new THREE.Vector2(-W / 2 - m, H / 2 + m)]);
    for (const c of comb.cells) {
      const hole = roundedInset(c.poly, 0.07, melt, 4);
      if (hole.length > 2) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: false, curveSegments: 2 });
  }, [comb, melt, version]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {/* the comb's back: a midrib so the cells read as cups */}
      <mesh position={[0, 0, 0.05]}><planeGeometry args={[comb.W + 0.7, comb.H + 0.7]} /><meshStandardMaterial color="#b3802a" roughness={0.7} side={THREE.DoubleSide} /></mesh>
      {comb.cells.map((c, i) => (c.interior ? <mesh key={i} position={[c.site[0], c.site[1], 1.14]}><circleGeometry args={[0.04, 8]} /><meshBasicMaterial color={c.sides === 6 ? "#8fe3a0" : "#ff6b4a"} toneMapped={false} /></mesh> : null))}
    </group>
  );
}

/* ---------- level 3: four tilings ---------- */
function Tiling({ kind, x }: { kind: (typeof TILINGS)[number]["id"]; x: number }) {
  const mat = useMemo(() => waxMaterial("#f0c35a"), []);
  const geo = useMemo(() => {
    // every cell has area 1 (unit); a 3.2 × 3.2 patch
    const W = 3.2, t = 0.06;
    const shape = new THREE.Shape([new THREE.Vector2(-W / 2, -W / 2), new THREE.Vector2(W / 2, -W / 2), new THREE.Vector2(W / 2, W / 2), new THREE.Vector2(-W / 2, W / 2)]);
    const add = (pts: [number, number][]) => { if (pts.every(([px, py]) => Math.abs(px) < W / 2 - 0.02 && Math.abs(py) < W / 2 - 0.02)) shape.holes.push(new THREE.Path(pts.map(([px, py]) => new THREE.Vector2(px, py)))); };
    const poly = (cx: number, cy: number, n: number, R: number, rot: number) => Array.from({ length: n }, (_, k) => { const a = rot + (k * 2 * Math.PI) / n; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] as [number, number]; });
    if (kind === "sq") { const s = 1; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) add(poly(i * s, j * s, 4, (s - t) / Math.SQRT2, Math.PI / 4)); }
    if (kind === "hex") { const a = Math.sqrt(2 / (3 * Math.sqrt(3))), w = a * Math.sqrt(3); for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) add(poly((i + (j % 2) * 0.5) * w, j * a * 1.5, 6, a - t / Math.sqrt(3), Math.PI / 6)); }
    if (kind === "tri") {
      const s = Math.sqrt(4 / Math.sqrt(3)), h = (s * Math.sqrt(3)) / 2, r = s / Math.sqrt(3) - t / Math.sqrt(3) * 1.2;
      for (let j = -3; j <= 3; j++) for (let i = -6; i <= 6; i++) { const up = (i + j) % 2 === 0; const cx = (i * s) / 2, cy = j * h + (up ? -h / 6 : h / 6); add(poly(cx, cy, 3, r, up ? Math.PI / 2 : -Math.PI / 2)); }
    }
    if (kind === "circ") { const r = Math.sqrt(1 / Math.PI), d = 2 * r + t; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) add(poly((i + (j % 2) * 0.5) * d, (j * d * Math.sqrt(3)) / 2, 28, r - t / 2, 0)); }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false, curveSegments: 2 });
  }, [kind]);
  useEffect(() => () => geo.dispose(), [geo]);
  const T = TILINGS.find((q) => q.id === kind)!;
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      <Label3D position={[0, 2.15, 0.4]} color={kind === "hex" ? GOOD : WAX} size={0.32}>{T.name.toUpperCase()}</Label3D>
      <Label3D position={[0, -2.35, 0.4]} color={kind === "hex" ? GOOD : MUTED} size={0.27}>{`${T.wall.toFixed(3)} wall per cell`}</Label3D>
    </group>
  );
}

export default function BeesBuild() {
  const [level, setLevel] = useState<Level>("comb");
  const [cut, setCut] = useState(false);
  const comb = useMemo(() => new Comb(12, 7.2, 64, 9), []);
  const [version, setVersion] = useState(0);
  const [melt, setMelt] = useState(1);
  const [run, setRun] = useState(false);
  const [stats, setStats] = useState(() => comb.stats());
  const [hist, setHist] = useState<number[]>([comb.stats().wall]);

  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      comb.relax(0.6);
      const s = comb.stats();
      setStats(s); setHist((h) => [...h, s.wall].slice(-120)); setVersion((v) => v + 1);
      setMelt((m) => Math.max(0, m - 0.04));
      if (comb.iter > 70) setRun(false);
    }, 140);
    return () => clearInterval(id);
  }, [run, comb]);
  const restart = () => { comb.scatter(64); setMelt(1); setStats(comb.stats()); setHist([comb.stats().wall]); setVersion((v) => v + 1); setRun(false); };
  const hexWall = TILINGS[2].wall;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="dive-levels">
        <button aria-pressed={level === "comb"} onClick={() => setLevel("comb")}><b>1 · The comb</b><small>double-sided, wax-thin, tilted</small></button>
        <button aria-pressed={level === "build"} onClick={() => setLevel("build")}><b>2 · No blueprint</b><small>random starts, one local rule</small></button>
        <button aria-pressed={level === "tile"} onClick={() => setLevel("tile")}><b>3 · Why hexagons</b><small>least wax for the space</small></button>
      </div>
      <div className="split">
        <Plate n="I·2" title={level === "comb" ? "A worker comb at true proportions" : level === "build" ? "Bees digging toward each other" : "Same cell area, four ways"} note="drag to turn · scroll to zoom">
          <Stage3D label="Honeybee comb: its structure, how it self-organises, and why hexagons" camera={{ position: level === "tile" ? [0, 1.5, 16] : [4.5, 2, 15.5], fov: 40 }} look={{ bloom: 0.55, ao: 0.6 }}
            overlay={<>
              <CellTag>Specimen I·2 · {level === "comb" ? "Apis mellifera worker comb" : level === "build" ? `round ${comb.iter}` : "Hales 1999"}</CellTag>
              {level === "build" && <div className="hud tag hud-tr"><span className="k">six-sided cells</span><span className="big" style={{ color: GOOD }}>{fmt(stats.hexShare * 100)}<small>%</small></span><span className="k">wax vs perfect hexagons</span><span className="big">+{fmt((stats.wall / hexWall - 1) * 100, 1)}<small>%</small></span></div>}
              {level === "build" && <div className="hud tag hud-bl"><span style={{ color: "#8fe3a0" }}>●</span> six neighbours &nbsp; <span style={{ color: "#ff6b4a" }}>●</span> five or seven</div>}
            </>}>
            {level === "comb" && <CombLevel cut={cut} />}
            {level === "build" && <group position={[0, 0, -0.5]}><WaxSheet comb={comb} melt={melt} version={version} /><mesh position={[0, 4.15, 0.5]} castShadow><boxGeometry args={[13.5, 0.5, 1.6]} /><meshStandardMaterial color="#6b4a2a" roughness={0.85} /></mesh></group>}
            {level === "tile" && <group>{(["tri", "sq", "hex", "circ"] as const).map((k, i) => <Tiling key={k} kind={k} x={(i - 1.5) * 4} />)}</group>}
            <OrbitControls makeDefault enablePan={false} minDistance={5} maxDistance={24} />
          </Stage3D>
        </Plate>

        <div className="stack">
          {level === "comb" && <>
            <div className="prose">
              <p><strong>A double-sided sheet of six-sided wax cells.</strong> Neighbours share walls and the two faces share bases, so every wall does two jobs. Workers build cells 5.2–5.4 mm across with walls under a tenth of a millimetre thick, and tilt them up about 13° so honey stays in.</p>
              <p>Each base is three rhombi meeting at a point. That cap lets the cells on the back sit one third of a cell over, so the two faces nest.</p>
            </div>
            <div className="row"><button className="btn sm" aria-pressed={cut} onClick={() => setCut((c) => !c)}>{cut ? "Close the cutaway" : "Cut the comb open"}</button></div>
            <Readouts items={[["Cell width", "5.3", "mm", "acc"], ["Wall", "≈0.07", "mm"], ["Depth", "≈11", "mm"], ["Tilt", "≈13", "°"]]} />
            <p className="honest">Walls are drawn about 6× thicker than real so they show. Tóth (1964) found a base of two hexagons and two small rhombi would save 0.35% more wax; bees don&apos;t use it.</p>
          </>}
          {level === "build" && <>
            <div className="prose">
              <p><strong>No bee has a blueprint.</strong> Each dot is a place a bee starts digging. Every round, each cell does one thing: it moves toward the middle of its own space. That&apos;s all. Press play and the walls settle into hexagons.</p>
              <p>Cells also start <strong>round</strong>. Wax warmed by the bees&apos; bodies flows, and the walls pull straight where three cells meet. The melt slider replays that.</p>
            </div>
            <div className="btnrow">
              <button className="btn sm primary" onClick={() => setRun((r) => !r)}>{run ? "Pause" : comb.iter ? "Keep building" : "Let them build"}</button>
              <button className="btn sm" onClick={() => { comb.relax(1); setStats(comb.stats()); setHist((h) => [...h, comb.stats().wall]); setVersion((v) => v + 1); }}>One round</button>
              <button className="btn sm" onClick={restart}>New random start</button>
            </div>
            <Range label="Cells round → wax has flowed" value={1 - melt} min={0} max={1} step={0.01} onChange={(v) => setMelt(1 - v)} fmt={(v) => (v < 0.1 ? "round" : v > 0.9 ? "hexagonal" : fmt(v * 100) + "%")} />
            <Plot label="Wall per cell, falling toward the hexagon's minimum" height={170} opts={{
              x: [0, Math.max(10, hist.length - 1)], y: [1.84, Math.max(2.1, ...hist) + 0.02], padL: 40, xlabel: "round", ylabel: "wall / √area",
              xticks: [0, 20, 40, 60].filter((v) => v <= Math.max(10, hist.length)), yticks: [1.85, 1.9, 1.95, 2.0, 2.05],
              series: [{ xs: hist.map((_, i) => i), data: hist, color: HONEY, width: 2.5 }],
              hlines: [{ y: hexWall, label: "perfect hexagons 1.861", color: GOOD }],
            }} />
            <p className="honest">This local rule (Lloyd relaxation) stands in for the attach-and-excavate model of Narumi et al. (2018): both are local rules and both end in hexagons. Defects (red dots) also happen in real comb.</p>
          </>}
          {level === "tile" && <>
            <div className="prose">
              <p><strong>Which shape stores the most for the least wax?</strong> Only triangles, squares and hexagons tile a flat surface with no gaps. Give every cell the same area and count the wall each one needs, sharing walls with neighbours.</p>
              <p>Hexagons win. Thomas Hales proved in 1999 that no way of cutting a plane into equal areas uses less wall: the Honeycomb Conjecture. Round cells, like a bumblebee&apos;s, need their own wall each and leave 9% of the space as gaps.</p>
            </div>
            <Plot label="Wall needed per unit cell area" height={210} opts={{
              x: [-0.6, 3.6], y: [0, 3.8], padL: 36, yticks: [0, 1, 2, 3],
              bars: TILINGS.map((t, i) => ({ x: i, v: t.wall, w: 0.55, color: t.id === "hex" ? GOOD : t.id === "circ" ? "#ff6b4a" : WAX, label: t.name })),
              hlines: [{ y: hexWall, color: GOOD }],
            }} />
            <Readouts items={[["Squares vs hex", "+" + fmt((TILINGS[1].wall / hexWall - 1) * 100, 1), "%"], ["Triangles", "+" + fmt((TILINGS[0].wall / hexWall - 1) * 100, 1), "%"], ["Circles", "+" + fmt((TILINGS[3].wall / hexWall - 1) * 100), "%", "hot"]]} />
          </>}
        </div>
      </div>
      <Notes say="The comb is double-sided and every wall is shared, so nothing is wasted. Nobody plans it: each bee follows a local rule, and hexagons come out. And hexagons are mathematically the least wall for the space." show="Level 2: press 'Let them build' from a random start and watch the red dots turn green and the wax curve fall to the hexagon line." ask="Robots that follow simple local rules could build like this in a disaster zone. What rule would you give them?" />
    </div>
  );
}
