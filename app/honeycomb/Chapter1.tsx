"use client";
import Auxetic from "@/components/ch1/Auxetic";
import BeesBuild from "@/components/ch1/BeesBuild";
import CombNumbers from "@/components/ch1/CombNumbers";
import Crush from "@/components/ch1/Crush";
import Facade from "@/components/ch1/Facade";
import Sandwich from "@/components/ch1/Sandwich";
import { Connects, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter1() {
  return (
    <Steps id="ch1" next={{ href: "/spider-web", label: "Chapter II: The web" }}>
      <Step title="The heavy facade">
        <StepHead eyebrow="Step 1 · the problem statement" title={<>Heavy skins attract <em>earthquakes</em></>}>How can a facade panel be light, stiff in normal use, and crush in a controlled way when an earthquake, blast or impact hits?</StepHead>
        <Facade />
        <Connects items={[{ href: "/facade-lab", t: "Facade Lab", s: "Design your own panel for wind, earthquake and impact" }]} />
      </Step>
      <Step title="Bees without blueprints">
        <StepHead eyebrow="Step 2 · the biological phenomenon" title={<>Self-organised <em>hexagons</em></>}>A double-sided sheet of wax cells, built by thousands of bees following local rules, that holds the most honey for the least wax.</StepHead>
        <BeesBuild />
      </Step>
      <Step title="Crush, don't shatter">
        <StepHead eyebrow="Step 3 · why honeycomb?" title={<>Light, stiff, and the best <em>absorber</em> for its weight</>}>The same six grams of aluminium as a honeycomb, a foam and a solid slab, in a testing machine.</StepHead>
        <Crush />
        <Connects items={[{ href: "/crush-lab", t: "Crush Lab", s: "Design a core, drop a mass on it, compare with Hexcel's data" }]} />
      </Step>
      <Step title="The sandwich">
        <StepHead eyebrow="Step 4 · applications" title={<>Skins apart, <em>seven times</em> stiffer</>}>The sandwich panel: two thin skins held apart by a honeycomb core. Aircraft floors, flaps, radomes, train walls and facade panels.</StepHead>
        <Sandwich />
      </Step>
      <Step title="Pull it inside out">
        <StepHead eyebrow="Step 5 · advanced cores" title={<>Cells that pull <em>inward</em></>}>Turn the walls of a honeycomb inside out and it shrinks sideways when squeezed: an auxetic core for blast panels.</StepHead>
        <Auxetic />
      </Step>
      <Step title="Comb numbers">
        <StepHead eyebrow="Step 6 · statistics, timeline, pros & cons, future" title={<>What the <em>numbers</em> say</>}>The deck&apos;s evidence, with this site&apos;s models checked against it where they overlap.</StepHead>
        <CombNumbers />
      </Step>
    </Steps>
  );
}
