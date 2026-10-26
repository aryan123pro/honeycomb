"use client";
import { Connects, Notes, ProsCons, Timeline } from "@/components/ui";

/* The deck's spider-web applications (slides 24–26), timeline (27–28), advantages and limitations
   (32–33) and future possibilities (34–35). */

export default function WebNumbers() {
  return (
    <div className="stack" style={{ gap: 30 }}>
      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Applications (deck slides 24–26)</p>
        <div className="cardgrid">
          <div className="card"><h4>Biomedical &amp; tissue engineering</h4><p>Silk proteins in organ-on-chip models for drug screening; silk conduits that bridge nerve gaps; scaffolds for bone, cartilage, ligament, tendon and muscle repair; recombinant silk that strengthens artificial blood vessels; wound dressings that calm inflammation and speed healing in burn models.</p></div>
          <div className="card"><h4>Wearables &amp; smart sensors</h4><p>Elastomer-filled graphene fabrics with an orb web&apos;s layout make transparent, ultra-sensitive strain sensors for health monitoring; web-inspired composites switch strain response for warning systems and human–machine interfaces.</p></div>
          <div className="card"><h4>Bionic materials</h4><p>Engineers copy silk&apos;s alternating polyalanine crystals and glycine-rich amorphous matrix to make tough, light composites that absorb high-impact energy.</p></div>
          <div className="card"><h4>Drug delivery</h4><p>Silk particles carry large cancer drugs like doxorubicin to their target and release them slowly; silk carriers protect fragile DNA and RNA therapeutics and nucleic-acid vaccines.</p></div>
          <div className="card"><h4>Environmental monitoring</h4><p>Natural webs are passive air samplers: they trap and hold airborne heavy metals, PAHs and dioxins, a cheap record of industrial pollution.</p></div>
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Research timeline (deck slides 27–28)</p>
        <Timeline items={[
          { y: "1967", t: "Cable nets", d: "Frei Otto's cable nets model tensile architecture on webs (Expo 67).", key: true },
          { y: "1990", t: "Silk sequenced", d: "Sequencing reveals the alanine and glycine blocks at silk's core." },
          { y: "2018", t: "Pollution traps", d: "Spider webs shown to trap particulate pollutants." },
          { y: "2019", t: "Antimicrobial sutures", d: "Spidroins shield surgical sutures from infection." },
          { y: "2020", t: "Vascular scaffolds", d: "Silk scaffolds support blood-vessel cell differentiation." },
          { y: "2021", t: "Energy patches", d: "Spidroin patches harvest kinetic energy." },
          { y: "2022", t: "New shapes", d: "Biomaterials go beyond nature's structural forms." },
          { y: "2023", t: "Electronic skin", d: "Web-like tactile sensors form e-skin." },
          { y: "2024", t: "Silkworms spin spider silk", d: "Transgenic silkworms produce spider silk.", key: true },
          { y: "2025", t: "Lab blood vessels", d: "Silk nanomembranes line microfluidic vessels." },
        ]} />
      </div>

      <ProsCons
        pros={[
          ["High energy absorption per unit mass", "Absorbs a lot of energy for very little weight."],
          ["Non-catastrophic failure", "One broken thread does not bring the structure down (try it in step 2)."],
          ["Light, efficient use of material", "Covers a large area with very little silk."],
          ["Benign, biodegradable production", "Made at room conditions, from water (step 3)."],
          ["Principles transfer to synthetic fibres", "You don't need real silk to copy the design."],
        ]}
        cons={[
          ["Can't be farmed at scale", "Spiders are territorial, so silk can't be harvested like silkworm silk."],
          ["Recombinant silk is costly", "Making the proteins is technically difficult."],
          ["Sensitive to environment", "Humidity and temperature change its properties (wet dragline can shrink and soften)."],
          ["Unproven long-term durability", "UV exposure and ageing are open questions."],
          ["Hard to manufacture and certify", "Web-like geometries are difficult to build and approve."],
        ]}
      />

      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Future possibilities (deck slides 34–35)</p>
        <div className="cardgrid">
          <div className="card"><h4>Scalable recombinant silk</h4><p>Making natural-grade silk cheaply is the key unlock (Frontiers in Bioengineering and Biotechnology, 2022).</p></div>
          <div className="card"><h4>Spin like the spider</h4><p>Copy how spiders spin, not just what they spin (Vollrath &amp; Knight 2001).</p></div>
          <div className="card"><h4>3D-printed web structures</h4><p>Additive manufacturing makes complex web geometry buildable: web-inspired impact absorbers (Yavuz 2025) and a transparent, impact-absorbing composite (Zou 2020).</p></div>
          <div className="card"><h4>Hybrid composites</h4><p>Silk combined with other materials for extreme performance.</p></div>
          <div className="card"><h4>3D webs</h4><p>Beyond flat orbs to volumetric nets (Su et al. 2021 scanned 3D cobwebs in situ).</p></div>
          <div className="card"><h4>Self-healing nets</h4><p>Nets that sense damage and re-tension themselves.</p></div>
          <div className="card"><h4>AI-designed webs</h4><p>Let algorithms design the best web for each load (Cranford 2012 as the starting model).</p></div>
          <div className="card"><h4>Space and disaster structures</h4><p>Light, deployable, damage-tolerant nets for space and disaster zones.</p></div>
        </div>
      </div>
      <Connects items={[{ href: "/web-lab", t: "Web Lab", s: "Design your own orb and throw insects at it" }, { href: "/verdict", t: "Crush or catch", s: "Honeycomb and web, side by side" }]} />
      <Notes say="Spider silk is light, tough and fails gracefully, but we can't farm spiders and making the protein is expensive. The future is in copying the design and the spinning, not necessarily the spider." ask="Which application would you fund first: medical, sensors, or impact protection?" />
    </div>
  );
}
