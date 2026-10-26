import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import FacadeLab from "./FacadeLab";

export const metadata: Metadata = { title: "Facade Lab" };

export default function Page() {
  return (
    <>
      <PageHead numeral="L3" eyebrow={<>Lab <b>three</b> · the problem statement</>} title={<>Facade <em>Lab</em></>}>
        Design a facade panel that is light, stiff in normal use, and crushes in a controlled way when hit. Six checks: wind, stress, shear, wrinkling, earthquake and impact.
      </PageHead>
      <main className="wrap"><FacadeLab /></main>
    </>
  );
}
