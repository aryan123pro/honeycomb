"use client";
import { Connects, Notes, ProsCons, Timeline } from "@/components/ui";
import { sandwichVsSolid } from "@/lib/honeycomb";
import { fmt } from "@/lib/plot";

/* The deck's honeycomb statistics (slide 13), applications (8–10), timeline (11–12), pros and cons
   (14–15) and future possibilities (16). Where one of this site's models covers a statistic, its own
   number is shown under the deck's. */

const STATS = [
  { v: "7×", s: "bending stiffness for a small increase in thickness, compared with a solid plate", cite: "Sandwich beams with rectangular, honeycomb and triangular cores, J. Marine Sci. Technol.", model: `Model: splitting a sheet round a core of equal thickness gives ${fmt(sandwichVsSolid(1).stiffness, 1)}× (Hexcel: 7×)` },
  { v: "23.7%", s: "higher specific energy absorption after optimising a honeycomb sandwich panel against its initial design", cite: "Ballistic impact of sandwich panels with additively manufactured honeycomb cores" },
  { v: "85%", s: "of the blast energy dissipated by the honeycomb core and rear panel together in a re-entrant (auxetic) core panel test", cite: "Blast resistance of re-entrant auxetic cored sandwich panels, Scientific Reports (2025)" },
  { v: "25%", s: "vibration reduction from double-skin facades designed as seismic absorbers", cite: "J. Rehabilitation in Civil Engineering review, facade strategies for tall buildings in seismic zones (2024)" },
];

export default function CombNumbers() {
  return (
    <div className="stack" style={{ gap: 30 }}>
      <div className="statgrid">
        {STATS.map((x) => (
          <div className="bigstat" key={x.v}><b>{x.v}</b><span>{x.s}</span><cite>{x.cite}</cite>{x.model && <span className="model">{x.model}</span>}</div>
        ))}
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Applications · from aircraft panels to cell culture (deck slides 8–10)</p>
        <div className="cardgrid">
          <div className="card"><h4>Aerospace &amp; transport panels</h4><p>Metal and composite honeycomb cores in sandwich panels: aircraft floors, flaps, radomes and engine cowls; crash absorbers; graded honeycombs that tune crumple zones in cars.</p></div>
          <div className="card"><h4>Micro- and nano-scale films</h4><p>Ordered porous &ldquo;honeycomb&rdquo; films act as photonic crystals and antireflective coatings, as templates for nanoparticle arrays, and as filters that hold mammalian cells but let bacteria through.</p></div>
          <div className="card"><h4>Additive manufacturing</h4><p>3D-printed polymer and metal honeycomb lattices place their imperfections deliberately to steer cracks, raising the work needed to break them.</p></div>
          <div className="card"><h4>Biomedical engineering</h4><p>Porous honeycomb films as scaffolds for tissue engineering and selective cell culture, and as microreactors that hold insulin or protein arrays.</p></div>
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Research timeline (deck slides 11–12)</p>
        <Timeline items={[
          { y: "1915", t: "Aircraft cores", d: "Hugo Junkers patents a honeycomb core to cut aircraft weight.", key: true },
          { y: "1938", t: "Bonded sandwiches", d: "Adhesive bonding joins skins to cores: the modern sandwich panel." },
          { y: "2018", t: "Quieter structures", d: "Acoustic ring cores damp structural vibration." },
          { y: "2019", t: "Silk–cellulose blocks", d: "Bio-based honeycomb composites maximise toughness." },
          { y: "2020", t: "Energy storage", d: "Honeycomb carbon networks boost supercapacitors." },
          { y: "2021", t: "UV shields", d: "Honeycomb TiO₂ mats block ultraviolet." },
          { y: "2022", t: "Tissue repair", d: "Honeycomb biomedical frameworks speed regeneration." },
          { y: "2023", t: "Elastic fibres", d: "Pseudoprotein honeycombs give highly elastic fibres." },
          { y: "2024", t: "Cell adhesion", d: "Spidroin honeycomb matrices help cells attach." },
          { y: "2025", t: "Tissue-on-chip", d: "Honeycomb chips tune local stress on living tissue.", key: true },
        ]} />
      </div>

      <ProsCons
        pros={[
          ["Standard in aircraft", "Control surfaces, radomes, engine cowls and interiors use honeycomb sandwich for its light weight and high strength (deck slide 14)."],
          ["Controlled, progressive folding", "A hexagonal honeycomb steel damper showed stable hysteresis, good ductility and high energy dissipation, while light and cheap."],
          ["Better blast resistance", "Honeycomb sandwich beams improved reinforced concrete beams in close-in explosion tests; the auxetic version absorbed more still."],
        ]}
        cons={[
          ["Moisture and fluids", "Fluid intrusion can degrade the adhesive bond and debond the facesheet from the core (Nomex core study, 2019)."],
          ["A limit to protection", "Very close to a blast the auxetic cladding can densify into a solid projectile and amplify damage (Kalubadanage et al. 2021)."],
          ["Facade motion", "Large facade displacements remain unresolved in facade-damper studies; devices need bumpers (Di Giovanni, Sapienza)."],
        ]}
      />

      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Future possibilities (deck slide 16)</p>
        <div className="cardgrid">
          <div className="card"><h4>Swarm-built structures</h4><p>Swarms of simple robots that build lightweight cellular structures in disaster zones or space, following local rules like the bees in step 2 (Penn Engineering; CU Boulder NSF bee-comb research).</p></div>
          <div className="card"><h4>Hive-inspired climate skins</h4><p>Building skins whose small vents follow simple local rules to ventilate and cool, like a hive (Frontiers in Built Environment, 2026).</p></div>
          <div className="card"><h4>Energy-harvesting impact panels</h4><p>Honeycomb panels that absorb a shock and turn the deformation into electricity for structural-health sensors (Tao et al. 2021, Nano-Micro Letters).</p></div>
          <div className="card"><h4>Honeycomb space habitats</h4><p>Hexagonal modules built from lunar or Martian soil (MIT Media Lab, MoonBRICCS).</p></div>
        </div>
      </div>
      <Connects items={[
        { href: "/crush-lab", t: "Crush Lab", s: "Design a core and drop a mass on it; check the model against Hexcel's data" },
        { href: "/facade-lab", t: "Facade Lab", s: "Design a panel for wind, earthquake and impact: the problem statement, solved" },
      ]} />
      <Notes say="Seven times stiffer, 85% of a blast absorbed, a quarter less vibration: honeycomb is everywhere because it's light and it fails gently. But it has limits: water gets in, and very close to a blast even a good core can make things worse." ask="Which con would you attack first if you were designing a honeycomb facade panel?" />
    </div>
  );
}
