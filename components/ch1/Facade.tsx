"use client";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import Tower, { PANEL_W, PLAN, STOREYS, STOREY_H, TOWER_H, type PanelLook } from "@/components/three/Tower";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg } from "@/components/ui";
import { fp, G, PANELS } from "@/lib/honeycomb";
import { BAD, fmt, GOOD, HONEY, sig } from "@/lib/plot";

/* The problem statement, as a building. Heavy cladding is heavy seismic mass: the design force on every
   panel's fixings (ASCE 7-16 eq. 13.3-1) and the building's base shear both scale with it.

   Building: 30 × 30 m, ten 3.5 m storeys, 7 kPa of floor seismic weight; facade on all four faces
   (120 m × 35 m = 4200 m²). Base shear V = Cs·W with Cs = SDS / (R/Ie), R = 8 (special moment frame),
   Ie = 1. Both simplifications are stated on the page. */

export const FLOOR_KPA = 7, R_FRAME = 8;
export const FACADE_M2 = 4 * PLAN * TOWER_H;
export function towerLoads(kgm2: number, SDS: number) {
  const Wfloors = FLOOR_KPA * 1000 * PLAN * PLAN * STOREYS;
  const Wfac = kgm2 * G * FACADE_M2;
  const V = (SDS / R_FRAME) * (Wfloors + Wfac);
  const panelW = kgm2 * G * PANEL_W * STOREY_H;
  return { Wfloors, Wfac, V, panelW, fpRoof: fp(panelW, SDS, TOWER_H, TOWER_H), fpGround: fp(panelW, SDS, 0, TOWER_H), share: Wfac / (Wfloors + Wfac) };
}

export default function Facade() {
  const [look, setLook] = useState<PanelLook>("precast");
  const [sds, setSds] = useState(1.0);
  const [shake, setShake] = useState(true);
  const panel = PANELS.find((p) => p.id === look)!;
  const L = towerLoads(panel.kgm2, sds), base = towerLoads(PANELS[0].kgm2, sds);
  const dV = (L.V / base.V - 1) * 100;

  return (
    <div className="split">
      <Plate n="I·1" title="Ten storeys, two kinds of skin, one earthquake" note="drag to turn · scroll to zoom">
        <Stage3D label="A ten-storey tower swaying in an earthquake, its facade panels coloured by seismic force" camera={{ position: [-58, 30, 82], fov: 36 }} look={{ bloom: 0.4 }}
          overlay={<>
            <CellTag>Specimen I·1 · seismic facade · S<sub>DS</sub> {sds.toFixed(2)} g</CellTag>
            <div className="hud tag hud-tr">
              <span className="k">force on each roof panel</span>
              <span className="big" style={{ color: L.fpRoof > 5000 ? BAD : GOOD }}>{sig(L.fpRoof / 1000, 2)}<small>kN</small></span>
              <span className="k">panel weighs {sig(panel.kgm2 * PANEL_W * STOREY_H, 3)} kg</span>
            </div>
            <div className="hud tag hud-bl"><span className="k">panel colour</span><br />white: low force · red: high (force grows 3× from ground to roof)</div>
          </>}>
          <group position={[0, -TOWER_H / 2 + 4, 0]}>
            <Tower look={look} shake={shake ? Math.min(1.4, sds) : 0} amp={0.8 + 0.6 * (L.V / base.V)} />
            <Label3D position={[0, TOWER_H + 5, PLAN / 2]} color={HONEY} size={2.2}>{panel.name.toUpperCase()}</Label3D>
          </group>
          <OrbitControls makeDefault target={[0, 2, 0]} enablePan={false} minDistance={30} maxDistance={160} maxPolarAngle={Math.PI * 0.49} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <Seg options={PANELS.map((p) => [p.id as PanelLook, p.name.split(",")[0]])} value={look} onChange={setLook} label="Facade panel" />
        <p className="faint" style={{ fontSize: 13, marginTop: -4 }}>{panel.note}</p>
        <Range label="Design shaking, S_DS" value={sds} min={0.2} max={1.6} step={0.05} onChange={setSds} fmt={(v) => v.toFixed(2) + " g"} />
        <div className="row"><button className="btn sm" aria-pressed={shake} onClick={() => setShake((s) => !s)}>{shake ? "Stop the shaking" : "Shake"}</button></div>
        <Readouts items={[
          ["Panel mass", sig(panel.kgm2, 3), "kg/m²", "acc"],
          ["Whole facade", fmt(panel.kgm2 * FACADE_M2 / 1000), "t"],
          ["Fixing force, roof", sig(L.fpRoof / 1000, 2), "kN"],
          ["Base shear vs concrete", (dV > 0 ? "+" : "") + fmt(dV, 1), "%", dV < -1 ? "cool" : undefined],
        ]} />
        <Plot label="Seismic force on one panel's fixings, ground to roof" height={190} opts={{
          x: [0, TOWER_H], y: [0, Math.max(12, base.fpRoof / 1000 * 1.1)], padL: 40, xlabel: "height up the tower (m)", ylabel: "Fp (kN)",
          xticks: [0, 10, 20, 30], yticks: [0, 5, 10, 15, 20].filter((v) => v <= Math.max(12, base.fpRoof / 1000 * 1.1)),
          series: [
            { xs: [0, TOWER_H], data: [base.fpGround / 1000, base.fpRoof / 1000], color: "#9b9a8e", width: 1.5, dash: [5, 4] },
            { xs: [0, TOWER_H], data: [L.fpGround / 1000, L.fpRoof / 1000], color: HONEY, width: 2.5 },
          ],
        }} />
        <p className="faint" style={{ fontSize: 12.5, marginTop: -6 }}>Dashed: precast concrete. Solid: your panel. ASCE 7-16 eq. 13.3-1 (a<sub>p</sub> = 1, R<sub>p</sub> = 2.5) for a 1.5 × 3.5 m panel.</p>
        <p className="honest">Seismic force is mass times acceleration, so a lighter skin is a smaller load everywhere: on its own fixings, on the frame, at the foundation. <b>Assumptions:</b> 7 kPa floors and R = 8 for the base shear; the sway is drawn exaggerated. The facade is {fmt(L.share * 100, 1)}% of this building&apos;s seismic weight.</p>
      </div>
      <Notes say="Concrete cladding weighs about 360 kg per square metre. In an earthquake every kilogram becomes a sideways force, three times bigger at the roof than at the ground. Switch to the honeycomb panel: same look from the street, a fiftieth of the mass." show="Start on precast, then switch to aluminium honeycomb and watch the roof force and the base shear drop." ask="The panel is lighter, but we also want it to absorb a blow if something hits it. How can something be light, stiff and a good crumple zone at once?" />
    </div>
  );
}
