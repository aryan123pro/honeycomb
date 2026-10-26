# Comb & Web: handoff

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · three 0.186 · @react-three/fiber 9 · drei 10 · postprocessing. No backend. The shell (story mode, presenter notes, Ctrl K palette, steps, Stage3D) is carried over from Silent Wake / Fogdrinker / Morpho Lab and restyled; the models, physics and design are new.

## Design
Taken from the deck: condensed poster headings (Anton), Archivo body, JetBrains Mono labels. Two moods switched by `body[data-cell]` (`CELLS` in `lib/site.ts`): **comb** = wax and honey on dark olive with a faint hexagon lattice in the walls; **web** = silk and dew-blue on charcoal with an orb web drawn in the corner (`body::after`). 3D stages are "specimens" with hexagon-cut corners; fader caps are hexagons; ✓/✗ checks have hexagon lights.

## Physics (all in `lib/`), and how each was checked
- `honeycomb.ts`
  - Wierzbicki (1983) crush σc = 16.56 σ0 (t/D)^(5/3) with ρ̄ = (8/3)t/D, σ0 = 215 MPa: matches **all 27 HexWeb CR III 5052 rows** within ±14% (mean 7.6%); the Crush Lab plots them.
  - Crush curve: elastic rise (E3 = 0.4 ρ̄ Es), bare peak 2.2× (Hexcel ratio) unless pre-crushed, fold-period ripple (H = 0.821 (tD²)^(1/3)), densification at ~70% (Hexcel). `dropTest` integrates an impact in time.
  - Foam: Gibson–Ashby 0.3 σy ρ̄^1.5. Same-mass comparison: honeycomb 12.8 J/g vs foam 3.6 J/g.
  - Sandwich (Allen/Zenkert): bending + core shear, face wrinkling. `sandwichVsSolid` reproduces Hexcel's 7× / 37× stiffness and 3.5× / 9.25× strength exactly.
  - In-plane Poisson's ratio (Gibson–Ashby); the auxetic animation hinges rigid walls, which gives exactly that ratio at small strain.
  - ASCE 7-16 eq. 13.3-1 for Fp; tilings for Hales.
- `silk.ts`: stress–strain laws. Calibrated toughness: Kevlar 49, steel 168, garden-spider dragline 161 (Gosline: 160), Darwin's bark 358 (Agnarsson: 354 ± 93), capture spiral 159 MJ/m³.
- `sim/web.ts`: the live orb web. Real units, nonlinear silk springs, Gosline's 65% hysteresis (unloading never steeper than the initial modulus), Lamb low-Re air drag on threads, sticky prey with thread-level capture, explicit 5 µs steps with selective mass scaling (≥ 1 µg per junction; this is the one non-physical choice, stated on the page). Checks run during the build:
  - prey ladder: fruit fly, house fly, blowfly, honeybee caught; dragonfly breaks through (5–7 radials, ~15 spiral segments) with ~99% of the web still attached;
  - energy split for a honeybee: radials 45%, frame & anchors 35%, air 8%, spiral 2% (Sensenig 2012: radials dominate; they treated frames as rigid);
  - defects: still catches a blowfly at 10% missing threads, fails around 20–30%;
  - Cranford pull test: elastic–plastic threads hold ~1/4 of the force and break more radials. Real silk vs linear did **not** separate clearly in this simpler web; the page says so instead of claiming it.
  - default web uses 0.36 mg of silk (real Araneus orbs 0.1–0.5 mg).
- `sim/comb.ts`: Voronoi + Lloyd relaxation (local rule) → hexagons; wall per cell falls from ~2.06 to ~1.88 (hexagon optimum 1.861). Rounded-cell "melt" after Pirk/Karihaloo.
- `sim/duct.ts`: Jeffery rods in extensional flow down a hyperbolic taper; pH and water gradients (Andersson 2014). The alignment → fibre property link is illustrative and labelled so.

Quick numeric checks: `npx tsx` on a scratch script importing these modules.

## 3D building blocks (`components/three/`)
`Stage3D`, `Label3D`, `Floor` (from the earlier projects, relit), `Bee`, `Spider`, `CombSlab` (double-sided comb, rhombic bases, 13° tilt, honey and caps, cutaway), `HoneyBlock` (+ `Press`; walls fold in a vertex shader), `Tower` (seismic facade), `WebView` (renders and steps a `WebSim`, pluck/snap sound, `Insect`, `PREY`).

## Gotchas
1. A hidden or minimised Chrome window stops requestAnimationFrame; for checks use headless Chrome with GPU (`puppeteer-core`, `--use-angle=metal --enable-gpu`).
2. The web solver has a ~7 ms per-frame budget; slow-motion factor in the tag adapts to the machine.
3. Story mode and presenter mode persist in localStorage (`combweb.*`).
4. Never `smoothstep(a, b, x)` with a > b in shaders; keep shader outputs NaN-free (bloom smears one bad pixel).
5. Step titles in `STORY` (`lib/site.ts`) must match the `<Step title>` props.

## Not yet done
- Not deployed; no git repo yet.
- Phone-width layout only checked through the CSS breakpoints.
- The team tab uses monogram badges; drop photos in `public/team/` and wire them in `app/references/References.tsx` if you have them.
