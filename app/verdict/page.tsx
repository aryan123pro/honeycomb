import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter3 from "./Chapter3";

export const metadata: Metadata = { title: "Crush or catch" };

export default function Page() {
  return (
    <>
      <PageHead numeral="III" eyebrow={<>Verdict · <b>comb</b> and <b>web</b>, side by side</>} title={<>Crush or <em>catch</em></>}>
        Two animals, two ways of surviving a blow without passing it on. One gives up its shape at a steady force; the other gives up a thread and keeps working.
      </PageHead>
      <Chapter3 />
    </>
  );
}
