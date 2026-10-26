import type { Metadata } from "next";
import HitWeb from "@/components/ch2/HitWeb";
import { Notes, PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Web Lab" };

export default function Page() {
  return (
    <>
      <PageHead numeral="L2" eyebrow={<>Lab <b>two</b> · nets</>} title={<>Web <em>Lab</em></>}>
        Spin your own orb: how many radii, how tight a spiral, how thick a thread. Then throw insects at it, pull its threads and cut it, and see what a spider has to balance.
      </PageHead>
      <main className="wrap" style={{ paddingBlock: "10px 30px" }}>
        <HitWeb lab />
        <Notes say="A spider has a fixed silk budget. More radii make the web stiffer and stronger; a tighter spiral catches small flies but costs silk. Try to catch a honeybee with the least silk." ask="What happens to a dragonfly if you double the radial thread diameter? And what does it cost?" />
      </main>
    </>
  );
}
