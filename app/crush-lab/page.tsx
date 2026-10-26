import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import CrushLab from "./CrushLab";

export const metadata: Metadata = { title: "Crush Lab" };

export default function Page() {
  return (
    <>
      <PageHead numeral="L1" eyebrow={<>Lab <b>one</b> · energy absorption</>} title={<>Crush <em>Lab</em></>}>
        Choose a honeycomb, size the block, and drop something on it. Stop the impact inside the stroke without hitting too hard, with the lightest core you can.
      </PageHead>
      <main className="wrap"><CrushLab /></main>
    </>
  );
}
