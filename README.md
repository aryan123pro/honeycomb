# Comb & Web

An interactive 3D lab that goes with the presentation **"Bio-Inspired Structural Engineering: Honeycomb Structures and Spider Web-Inspired Structures"** (Nishtha Patel C174, Soham Rane C175, Gayatri C176). Every model is 3D and runs published mechanics live in the browser.

```
npm install
npm run dev      # http://localhost:3000
npm run build    # all routes prerender as static pages
```

| Route | What it is |
|---|---|
| `/` | The bench: comb and orb web (switch to the honeycomb panel and cable net they inspired), both problem statements, chapters and labs |
| `/honeycomb` | Ch I (6 steps): a tower's facade in an earthquake (ASCE 7 Fp), bees building hexagons without a plan (comb, self-organisation, Hales), a HexWeb cube in a testing machine, the sandwich panel (Hexcel 7× / 37×), auxetic cells, the deck's numbers |
| `/spider-web` | Ch II (5 steps): a spider spinning an orb (pluck threads), a live web solver (throw insects, pull a thread, cut it), the spinning duct, four fibres pulled to breaking, the deck's numbers |
| `/verdict` | Ch III (2 steps): crush vs catch, live and on one chart; future possibilities |
| `/crush-lab` | L1: design a honeycomb core and drop a phone, tool, car or rock on it; model vs all 27 Hexcel rows |
| `/web-lab` | L2: design an orb (radii, spacing, thread thickness) and test it |
| `/facade-lab` | L3: the problem statement as a design job: six checks for wind, earthquake and impact |
| `/references` | Sources (`#sources`), the deck (`#slides`), the team (`#team`) |

Keys: arrows move between steps, `S` story mode (full screen, 20-minute clock), `M` sound, `P` presenter notes, `F` full screen, `Ctrl K` jump anywhere.

See `HANDOFF.md` for the physics, the checks against published data, and the gotchas.
