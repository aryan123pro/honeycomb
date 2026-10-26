import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter2 from "./Chapter2";

export const metadata: Metadata = { title: "The web" };

export default function Page() {
  return (
    <>
      <PageHead numeral="II" eyebrow={<>Specimen <b>II</b> · orb web → nets, absorbers, fibres, medicine</>} title={<>The <em>web</em></>}
        coords={["Araneus diadematus · garden spider", "Caerostris darwini · Darwin's bark spider", "Cranford et al. 2012 · Nature"]}
        stats={[["≈160", "MJ/m³ to break garden-spider dragline (Gosline 1999)"], ["65%", "of absorbed energy lost as heat, so prey doesn't bounce out"], ["3.7×", "its own length: how far capture silk stretches"], ["25 m", "longest bridge line recorded"]]}>
        Cable bridges, safety nets and deployable structures are often heavy and fail catastrophically when one member breaks. An orb web is the opposite: light, stretchy where it needs to be, and it loses a thread, not the whole web.
      </PageHead>
      <Chapter2 />
    </>
  );
}
