"use client";
import Hero3D from "@/components/Hero3D";
import { Connects, Notes, Plate } from "@/components/ui";

/* What comes next: both decks' future possibilities, next to the two specimens and what they became. */
export default function Future() {
  return (
    <div className="stack" style={{ gap: 22 }}>
      <Plate n="III·2" title="Nature, then engineering: switch the specimens" note="click a specimen to revisit its chapter">
        <Hero3D className="stage" />
      </Plate>
      <div className="grid2">
        <div className="card">
          <h4 style={{ color: "var(--honey)" }}>From the comb</h4>
          <ul className="prose" style={{ paddingLeft: 18, margin: 0, fontSize: 14 }}>
            <li><b>Swarm-built structures:</b> simple robots following local rules, building cellular structures in disaster zones or space.</li>
            <li><b>Hive-like climate skins:</b> facades whose vents follow local rules to ventilate and cool.</li>
            <li><b>Energy-harvesting impact panels:</b> cores that absorb a shock and power their own health sensors.</li>
            <li><b>Honeycomb habitats:</b> hexagonal modules from lunar or Martian soil.</li>
          </ul>
        </div>
        <div className="card">
          <h4 style={{ color: "var(--dew)" }}>From the web</h4>
          <ul className="prose" style={{ paddingLeft: 18, margin: 0, fontSize: 14 }}>
            <li><b>Affordable recombinant silk</b>, spun the way the spider spins it.</li>
            <li><b>3D-printed web structures</b> and hybrid silk composites.</li>
            <li><b>3D, self-healing and AI-designed nets</b> that re-tension themselves.</li>
            <li><b>Deployable, damage-tolerant nets</b> for space and disaster zones.</li>
          </ul>
        </div>
      </div>
      <div className="card">
        <h4>Where the two meet</h4>
        <p>The deck&apos;s own sources already cross over: a spiderweb-inspired energy absorber (Yavuz 2025) and a transparent, impact-absorbing composite with a web pattern (Zou 2020), honeycomb matrices made of spider silk protein (deck timeline, 2024). A panel could use both lessons: a crushable cellular core to take the first blow at a steady force, wrapped in a tough fibre net that holds the pieces when the core is spent.</p>
      </div>
      <Connects items={[
        { href: "/crush-lab", t: "Crush Lab", s: "Design a honeycomb core and test it" },
        { href: "/web-lab", t: "Web Lab", s: "Design an orb web and test it" },
        { href: "/facade-lab", t: "Facade Lab", s: "Solve the problem statement: a light, safe facade panel" },
      ]} />
      <Notes say="Both structures put material only where the load goes, and both fail in a controlled way. That is the lesson engineers are copying: not the wax or the silk, but the design." ask="If you could combine a honeycomb and a web in one product, what would it be?" />
    </div>
  );
}
