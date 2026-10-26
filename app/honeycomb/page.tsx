import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter1 from "./Chapter1";

export const metadata: Metadata = { title: "The comb" };

export default function Page() {
  return (
    <>
      <PageHead numeral="I" eyebrow={<>Specimen <b>I</b> · honeybee comb → sandwich panels, crash absorbers, facades</>} title={<>The <em>comb</em></>}
        coords={["Apis mellifera · western honeybee", "HexWeb 5052 aluminium honeycomb", "ASCE 7-16 facade design"]}
        stats={[["1.861", "wall per cell for hexagons, the least possible (Hales 1999)"], ["7×", "stiffer than a solid sheet, for 3% more weight (Hexcel)"], ["12.8 J/g", "energy one gram of aluminium honeycomb absorbs crushing"], ["1/55", "the mass of a precast concrete facade panel"]]}>
        Conventional concrete and solid-panel facades are heavy and rigid: they attract large seismic forces and pass shocks straight into the frame. Bees build the opposite: a structure that is mostly air, stiff in use, and crushes gently when overloaded.
      </PageHead>
      <Chapter1 />
    </>
  );
}
