import Link from "next/link";
import Hero3D from "@/components/Hero3D";
import StartStory from "@/components/StartStory";
import "./home.css";

export default function Home() {
  return (
    <main>
      <div className="cover">
        <div className="plate"><Hero3D /></div>
        <p className="cover-stamp">Bio-inspired structural engineering · honeycomb structures and spider-web-inspired structures · Nishtha Patel C174 · Soham Rane C175 · Gayatri C176</p>
        <div className="cover-text">
          <h1>Mostly air,<br /><em>hard to break.</em></h1>
          <p className="lede">A honeybee comb holds the most honey for the least wax and crushes gently when overloaded. A spider&apos;s web stops a flying bee and survives losing threads. Every model here is 3D and runs the published mechanics live: <b>crush it, throw insects at it, pull it apart.</b></p>
          <div className="cta">
            <StartStory />
            <Link className="btn" href="/honeycomb">Chapter I &rarr;</Link>
            <Link className="btn" href="/facade-lab">Open a lab</Link>
          </div>
        </div>
      </div>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">The problem statements</p><h2>Heavy, rigid, <em>brittle</em></h2></div>
          <p className="lede">Two engineering problems from the deck, and the animal that answers each one.</p>
        </div>
        <div className="ledger">
          <div className="comb"><span className="k">01 · Building facades</span><b>Too heavy</b><span>Concrete and solid-panel facades are heavy and rigid, so they attract large seismic forces and pass shocks straight into the frame. How can a panel be light, stiff in use, and crush in a controlled way in an earthquake, blast or impact?</span><small>answered by the honeycomb</small></div>
          <div className="web"><span className="k">02 · Cables, nets, barriers</span><b>Too brittle</b><span>Cable-supported bridges, protective nets and deployable structures rely on heavy members and can fail catastrophically when one is damaged. How do we get high impact absorption, damage tolerance and material efficiency at low weight?</span><small>answered by the orb web</small></div>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">Chapters · two specimens and a verdict</p><h2>Walk the <em>bench</em></h2></div>
          <p className="lede">Each chapter is a run of 3D models built for presenting. Arrow keys step through them; S walks the whole story full screen, M turns on sound, P shows speaker notes.</p>
        </div>
        <div className="cells">
          <Link className="cellcard comb" href="/honeycomb"><span className="k">Specimen I</span><h3>The comb</h3><p>A tower shaking in an earthquake, bees building hexagons without a plan, a honeycomb crushed in a testing machine, the sandwich panel, and cells that pull inward.</p><div className="tags"><span className="chip"><i />Hales 1999</span><span className="chip"><i />Wierzbicki crush</span><span className="chip"><i />sandwich theory</span></div></Link>
          <Link className="cellcard web" href="/spider-web"><span className="k">Specimen II</span><h3>The web</h3><p>A spider spinning an orb, a live web of two thousand silk threads catching insects, the silk gland&apos;s spinning duct, and four fibres pulled to breaking.</p><div className="tags"><span className="chip"><i />Cranford 2012</span><span className="chip"><i />Gosline 1999</span><span className="chip"><i />Agnarsson 2010</span></div></Link>
          <Link className="cellcard sum" href="/verdict"><span className="k">Verdict</span><h3>Crush or catch</h3><p>The comb gives up its shape; the web gives up a thread. Both, live and side by side, on one chart, and what comes next.</p><div className="tags"><span className="chip"><i />energy per gram</span><span className="chip"><i />future</span></div></Link>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">Labs · open any time</p><h2>Run your own <em>tests</em></h2></div>
          <p className="lede">Three playgrounds on the same mechanics as the chapters. Nothing is a video: every fold, thread and number is calculated as you watch.</p>
        </div>
        <div className="drawer">
          <Link href="/crush-lab"><span className="k">L1 · energy absorption</span><h3>Crush Lab</h3><p>Pick a real HexWeb honeycomb or design your own, size the block, and drop a phone, a tool, a car or a rock on it. The model is plotted against all 27 rows of Hexcel&apos;s data sheet.</p><span className="go">stop it with the lightest core →</span></Link>
          <Link href="/web-lab"><span className="k">L2 · nets</span><h3>Web Lab</h3><p>Choose the radii, spiral spacing and thread thickness, then throw a fruit fly, a honeybee or a dragonfly. Pull threads, cut them, and see what still holds.</p><span className="go">catch a bee with the least silk →</span></Link>
          <Link href="/facade-lab"><span className="k">L3 · the problem statement</span><h3>Facade Lab</h3><p>Design a storey-high honeycomb facade panel and check it for wind, stress, shear, wrinkling, earthquake and impact, against a 360 kg/m² concrete panel.</p><span className="go">pass all six checks →</span></Link>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">One idea, two animals</p><h2>Put material only where the <em>load</em> goes</h2></div>
          <p className="lede">Neither the comb nor the web is solid. Both are mostly empty, and both fail on purpose, in a way that protects the rest.</p>
        </div>
        <div className="chain">
          <div><b>Share every wall</b><p>Hexagonal cells share walls on all six sides and bases between two faces: the least wax for the space.</p></div>
          <div><b>Divide the jobs</b><p>Stiff radii carry the load, a stretchy spiral absorbs the hit, anchors pass it on.</p></div>
          <div><b>Fail gently</b><p>Honeycomb folds one lobe at a time at a steady force; a web sacrifices a thread and keeps working.</p></div>
          <div><b>Copy the design</b><p>Engineers don&apos;t need wax or silk: aluminium, Nomex, steel cables and printed polymers follow the same rules.</p></div>
        </div>
      </section>
    </main>
  );
}
