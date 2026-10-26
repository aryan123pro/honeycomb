"use client";
import Future from "@/components/ch3/Future";
import TwoWays from "@/components/ch3/TwoWays";
import { Step, StepHead, Steps } from "@/components/ui";

export default function Chapter3() {
  return (
    <Steps id="ch3" next={{ href: "/crush-lab", label: "Into the labs" }}>
      <Step title="Two ways to stop a blow">
        <StepHead eyebrow="Summary" title={<>Give up shape, or give up a <em>thread</em></>}>The comb and the web, live, and on one chart.</StepHead>
        <TwoWays />
      </Step>
      <Step title="What comes next">
        <StepHead eyebrow="Future possibilities" title={<>Where the ideas go <em>next</em></>}>Swarm-built cells, climate skins, recombinant silk and self-healing nets.</StepHead>
        <Future />
      </Step>
    </Steps>
  );
}
