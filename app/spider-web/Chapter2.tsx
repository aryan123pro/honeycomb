"use client";
import HitWeb from "@/components/ch2/HitWeb";
import MakingSilk from "@/components/ch2/MakingSilk";
import SilkVsSteel from "@/components/ch2/SilkVsSteel";
import SpinWeb from "@/components/ch2/SpinWeb";
import WebNumbers from "@/components/ch2/WebNumbers";
import { Connects, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter2() {
  return (
    <Steps id="ch2" next={{ href: "/verdict", label: "Chapter III: Crush or catch" }}>
      <Step title="Spinning an orb">
        <StepHead eyebrow="Step 1 · anatomy of a spider web" title={<>Three threads, three <em>jobs</em></>}>Stiff radii carry the load, a stretchy spiral soaks up the impact, frame and anchors hand it to the twigs.</StepHead>
        <SpinWeb />
      </Step>
      <Step title="Hit the web">
        <StepHead eyebrow="Step 2 · how do webs survive damage?" title={<>Lose a thread, keep the <em>web</em></>}>A live simulation of two thousand silk threads. Throw insects at it, pull one thread until it snaps, cut it to pieces.</StepHead>
        <HitWeb />
        <Connects items={[{ href: "/web-lab", t: "Web Lab", s: "Design your own web: radii, spiral spacing, thread thickness" }]} />
      </Step>
      <Step title="Making silk">
        <StepHead eyebrow="Step 3 · how does a spider make silk?" title={<>Spun from <em>water</em>, at room temperature</>}>A liquid crystal pulled down a tapering duct lines its molecules up and sets into a fibre.</StepHead>
        <MakingSilk />
      </Step>
      <Step title="Silk vs steel">
        <StepHead eyebrow="Step 4 · statistics" title={<>Tougher than Kevlar, by <em>weight</em></>}>Four fibres pulled to breaking in one machine, and what &ldquo;stronger than steel&rdquo; really means.</StepHead>
        <SilkVsSteel />
      </Step>
      <Step title="Web numbers">
        <StepHead eyebrow="Step 5 · applications, timeline, pros & cons, future" title={<>From nets to <em>nerves</em></>}>Where web-inspired design is going, and what holds it back.</StepHead>
        <WebNumbers />
      </Step>
    </Steps>
  );
}
