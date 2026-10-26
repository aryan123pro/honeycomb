"use client";
/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { store } from "@/lib/site";

const TABS = [["sources", "Sources"], ["slides", "Presentation"], ["team", "Team"]] as const;
type Tab = (typeof TABS)[number][0];
const N_SLIDES = 36;

type Src = { cite: string; used: string; url: string };
const SOURCES: { group: string; items: Src[] }[] = [
  { group: "I · Honeycomb", items: [
    { cite: "Hales, T. C. (2001). The Honeycomb Conjecture. Discrete & Computational Geometry 25, 1–22 (proof announced 1999).", used: "Hexagons use the least wall of any equal-area tiling (Bees without blueprints, level 3)", url: "https://doi.org/10.1007/s004540010071" },
    { cite: "Narumi, T., Uemichi, K., Honda, H. & Osaki, K. (2018). Self-organization at the first stage of honeycomb construction. PLOS ONE 13(10), e0205353.", used: "Comb building as self-organisation, attach and excavate (level 2)", url: "https://doi.org/10.1371/journal.pone.0205353" },
    { cite: "Sub-cell scale features govern the placement of new cells by honeybees during comb construction. PMC10465656.", used: "Biological phenomenon (deck slide 5)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10465656/" },
    { cite: "Pirk, C. W. W., Hepburn, H. R., Radloff, S. E. & Tautz, J. (2004). Honeybee combs: construction through a liquid equilibrium process? Naturwissenschaften 91, 350–353; Karihaloo, B. L., Zhang, K. & Wang, J. (2013). J. R. Soc. Interface 10, 20130299.", used: "Round cells becoming hexagons as warm wax flows (melt slider)", url: "https://doi.org/10.1098/rsif.2013.0299" },
    { cite: "Tóth, L. F. (1964). What the bees know and what they do not know. Bull. Amer. Math. Soc. 70, 468–481.", used: "The three-rhombus base, and the slightly better base bees don't use", url: "https://doi.org/10.1090/S0002-9904-1964-11155-3" },
    { cite: "Wierzbicki, T. (1983). Crushing analysis of metal honeycombs. Int. J. Impact Engineering 1, 157–174.", used: "Mean crush stress 16.56 σ0 (t/D)^(5/3) and fold half-wavelength 0.821 (tD²)^(1/3) (Crush, Crush Lab)", url: "https://doi.org/10.1016/0734-743X(83)90004-0" },
    { cite: "Hexcel. HexWeb Honeycomb Attributes and Properties (data sheet).", used: "All 27 HexWeb CR III 5052 rows (crush, bare compressive, shear); 1/4\" core properties in the Facade Lab; sandwich table 7× / 37× stiffness, 3.5× / 9.25× strength, +3% / +6% weight; crush stroke ≈ 70%", url: "https://www.hexcel.com/wp-content/uploads/2026/01/HexWebHoneycombAttributesandProperties.pdf" },
    { cite: "Gibson, L. J. & Ashby, M. F. (1997). Cellular Solids: Structure and Properties, 2nd ed. Cambridge University Press.", used: "Foam plateau 0.3 σy ρ̄^1.5, densification, in-plane Poisson's ratio of regular and re-entrant honeycombs", url: "https://doi.org/10.1017/CBO9781139878326" },
    { cite: "Allen, H. G. (1969). Analysis and Design of Structural Sandwich Panels; Zenkert, D. (1995). An Introduction to Sandwich Construction.", used: "Bending and core-shear deflection, face wrinkling (The sandwich, Facade Lab)", url: "https://www.google.com/search?q=Zenkert+An+Introduction+to+Sandwich+Construction" },
    { cite: "ASCE/SEI 7-16. Minimum Design Loads for Buildings, eq. 13.3-1 (seismic force on nonstructural components).", used: "Fp on facade panels and their fixings (The heavy facade, Facade Lab)", url: "https://doi.org/10.1061/9780784414248" },
    { cite: "Kalubadanage, D. et al. (2021). Close-in blast resistance of large-scale auxetic re-entrant honeycomb sandwich panels. J. Sandwich Struct. Mater. 23(8).", used: "Auxetic cladding as a projectile in very close blasts (deck con 02)", url: "https://doi.org/10.1177/1099636220905532" },
    { cite: "Blast resistance of re-entrant auxetic cored sandwich panels with tunable stiffness. Scientific Reports (2025).", used: "85% of blast energy dissipated by core and rear panel (deck slide 13)", url: "https://www.nature.com/srep/" },
    { cite: "Development of a new hexagonal honeycomb steel damper. Archives of Civil and Mechanical Engineering; Effect of aircraft fluids on Nomex honeycomb core. J. Sandwich Struct. Mater. (2019); Di Giovanni, G. PhD thesis on facade mass dampers, Sapienza.", used: "Pros and cons (deck slides 14–15)", url: "#slides" },
    { cite: "Penn Engineering; CU Boulder NSF bee-comb research; Tao, K. et al. (2021) Nano-Micro Letters 13, 123; Frontiers in Built Environment (2026); MIT Media Lab MoonBRICCS.", used: "Future possibilities (deck slide 16)", url: "https://doi.org/10.1007/s40820-021-00644-0" },
  ] },
  { group: "II · Spider webs and silk", items: [
    { cite: "Cranford, S. W., Tarakanova, A., Pugno, N. M. & Buehler, M. J. (2012). Nonlinear material behaviour of spider silk yields robust webs. Nature 482, 72–76.", used: "Stiff–soft–stiffening silk law; linear and elastic–plastic controls; localised damage (Hit the web)", url: "https://doi.org/10.1038/nature10739" },
    { cite: "Gosline, J. M., Guerette, P. A., Ortlepp, C. S. & Savage, K. N. (1999). The mechanical design of spider silks. J. Exp. Biol. 202, 3295–3303.", used: "Dragline and viscid silk stiffness, strength, extensibility, toughness (160 MJ/m³); 65% hysteresis", url: "https://doi.org/10.1242/jeb.202.23.3295" },
    { cite: "Agnarsson, I., Kuntner, M. & Blackledge, T. A. (2010). Bioprospecting finds the toughest biological material: extraordinary silk from a giant riverine orb spider. PLoS ONE 5, e11234.", used: "Darwin's bark spider: 354 ± 93 (max 520) MJ/m³, 1.65 GPa, 52%, 11.5 GPa; 25 m bridge lines (Silk vs steel)", url: "https://doi.org/10.1371/journal.pone.0011234" },
    { cite: "Sensenig, A. T., Lorentz, K. A., Kelly, S. P. & Blackledge, T. A. (2012). Spider orb webs rely on radial threads to absorb prey kinetic energy. J. R. Soc. Interface 9, 1880–1891.", used: "Radials do most of the work; spiral ≤ ~30%, air ≤ ~10% (energy panel)", url: "https://doi.org/10.1098/rsif.2011.0851" },
    { cite: "Zaera, R., Soler, A. & Teus, J. (2014). Uncovering changes in spider orb-web topology owing to aerodynamic effects. J. R. Soc. Interface 11, 20140484.", used: "Aerodynamic damping in prey impact", url: "https://doi.org/10.1098/rsif.2014.0484" },
    { cite: "Lamb, H. (1911). On the uniform motion of a sphere through a viscous fluid. Phil. Mag. 21, 112–121.", used: "Low-Reynolds drag on a thin cylinder, used for air drag on threads", url: "https://doi.org/10.1080/14786440108637010" },
    { cite: "Zschokke, S. (1999). Nomenclature of the orb-web. J. Arachnology 27, 542–546; Eberhard, W. G. (1990). Function and phylogeny of spider webs. Annu. Rev. Ecol. Syst. 21, 341–372.", used: "Build order: bridge, frame, radii, auxiliary spiral, capture spiral, hub (Spinning an orb)", url: "https://doi.org/10.1146/annurev.es.21.110190.002013" },
    { cite: "Mortimer, B. et al. (2016). Tuning the instrument: sonic properties in the spider's web. J. R. Soc. Interface 13, 20160341.", used: "Spiders read prey from web vibrations; thread pitch f = (1/2L)√(σ/ρ) (pluck)", url: "https://doi.org/10.1098/rsif.2016.0341" },
    { cite: "Vollrath, F. & Knight, D. P. (2001). Liquid crystalline spinning of spider silk. Nature 410, 541–548.", used: "Liquid-crystal dope, tapering duct, internal and external draw-down (Making silk)", url: "https://doi.org/10.1038/35069000" },
    { cite: "Andersson, M. et al. (2014). Carbonic anhydrase generates CO2 and H+ that drive spider silk formation via opposite effects on the terminal domains. PLoS Biol. 12, e1001921.", used: "pH falling from 7.6 to 5.7 along the duct", url: "https://doi.org/10.1371/journal.pbio.1001921" },
    { cite: "Vollrath, F., Madsen, B. & Shao, Z. (2001). The effect of spinning conditions on the mechanics of a spider's dragline silk. Proc. R. Soc. B 268, 2339–2346.", used: "Faster reeling: stiffer, stronger, less stretchy silk (trend only)", url: "https://doi.org/10.1098/rspb.2001.1590" },
    { cite: "Jeffery, G. B. (1922). The motion of ellipsoidal particles immersed in a viscous fluid. Proc. R. Soc. A 102, 161–179.", used: "Rods aligning in a stretching flow (duct model)", url: "https://doi.org/10.1098/rspa.1922.0078" },
    { cite: "Su, I., Narayanan, N. et al. (2021) In situ three-dimensional spider web construction and mechanics. PNAS 118; Zou (2020) spiderweb-inspired transparent impact-absorbing composite; Yavuz, K. (2025) energy absorber inspired by spiderwebs; Frontiers in Bioengineering and Biotechnology (2022).", used: "Future possibilities (deck slides 34–35)", url: "https://doi.org/10.1073/pnas.2101296118" },
  ] },
  { group: "Sound and method", items: [
    { cite: "Karplus, K. & Strong, A. (1983). Digital synthesis of plucked-string and drum timbres. Computer Music Journal 7(2), 43–55.", used: "The plucked-thread sound", url: "https://doi.org/10.2307/3680062" },
    { cite: "Deck slides 1–36 (team research).", used: "Problem statements, applications, timelines, statistics, pros and cons, future possibilities", url: "#slides" },
  ] },
];

const TEAM = [
  { roll: "C174", name: "Nishtha Patel" },
  { roll: "C175", name: "Soham Rane" },
  { roll: "C176", name: "Gayatri" },
];
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2);

export default function References() {
  const [tab, setTab] = useState<Tab>("sources");
  const [lb, setLb] = useState<number | null>(null);
  useEffect(() => {
    const read = () => { const h = location.hash.replace("#", "") as Tab; if (TABS.some(([k]) => k === h)) setTab(h); };
    read();
    if (!location.hash && store<boolean>("story")) setTab("team");
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (lb === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLb(null);
      if (e.key === "ArrowRight") { e.stopPropagation(); setLb((i) => (i === null ? null : Math.min(N_SLIDES, i + 1))); }
      if (e.key === "ArrowLeft") { e.stopPropagation(); setLb((i) => (i === null ? null : Math.max(1, i - 1))); }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [lb]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <main className="wrap" style={{ paddingBottom: 40 }}>
      <nav className="reftabs" aria-label="Reference sections">
        {TABS.map(([k, l]) => <a key={k} href={"#" + k} aria-current={tab === k} onClick={() => setTab(k)}>{l}</a>)}
      </nav>
      {tab === "sources" && (
        <div className="srcs">
          <p className="lede">Every number on this site traces back to one of these, or to the team&apos;s own deck. Where a model makes a choice that is not from a paper (a calibration, a teaching simplification, an illustrative link), the page says so next to it.</p>
          {SOURCES.map((g) => (
            <section key={g.group}>
              <h3>{g.group}</h3>
              {g.items.map((s) => (
                <div className="src" key={s.url + s.cite}>
                  <cite>{s.cite}</cite>
                  <span>{s.used}</span>
                  <a href={s.url} target={s.url.startsWith("#") ? undefined : "_blank"} rel="noreferrer" onClick={s.url === "#slides" ? () => setTab("slides") : undefined}>{s.url.startsWith("#") ? "see the Presentation tab" : s.url}</a>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      {tab === "slides" && (
        <>
          <p className="lede" style={{ marginBottom: 18 }}>The original deck, <i>Bio-inspired structural engineering: honeycomb structures and spider-web-inspired structures</i>, 36 slides. Click any slide to read it full size; arrow keys page through.</p>
          <div className="slides">
            {Array.from({ length: N_SLIDES }, (_, i) => (
              <button key={i} onClick={() => setLb(i + 1)}><img src={`/slides/slide-${pad(i + 1)}.jpg`} alt={`Slide ${i + 1}`} loading="lazy" /><span>slide {i + 1}</span></button>
            ))}
          </div>
        </>
      )}
      {tab === "team" && (
        <>
          <p className="lede" style={{ marginBottom: 24 }}>Three people, two animals, one question: how can a structure be light and still survive a blow?</p>
          <div className="team">
            {TEAM.map((m, i) => (
              <figure key={m.roll} className="member" style={{ ["--c" as string]: ["var(--honey)", "var(--wax)", "var(--dew)"][i] }}>
                <div className="mono-badge"><span>{initials(m.name)}</span></div>
                <figcaption><span className="tm-roll">{m.roll}</span><b>{m.name}</b></figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      {lb !== null && (
        <div className="lightbox" role="dialog" aria-label={`Slide ${lb}`} onClick={(e) => { if (e.target === e.currentTarget) setLb(null); }}>
          <img src={`/slides/slide-${pad(lb)}.jpg`} alt={`Slide ${lb}`} />
          <div className="row">
            <button className="btn sm" disabled={lb <= 1} onClick={() => setLb(lb - 1)}><ChevronLeft size={14} /> Prev</button>
            <span className="mono" style={{ color: "var(--ink)" }}>{lb} / {N_SLIDES}</span>
            <button className="btn sm" disabled={lb >= N_SLIDES} onClick={() => setLb(lb + 1)}>Next <ChevronRight size={14} /></button>
            <button className="btn sm" onClick={() => setLb(null)}><X size={14} /> Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
