import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import References from "./References";

export const metadata: Metadata = { title: "Notes" };

export default function Page() {
  return (
    <>
      <PageHead numeral="R" eyebrow={<>Lab <b>notes</b> · sources, slides, team</>} title={<>The <em>logbook</em></>}>
        Where every number comes from, the original presentation, and the people who made it.
      </PageHead>
      <References />
    </>
  );
}
