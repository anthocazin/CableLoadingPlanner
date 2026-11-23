# Cable Loading Planner

Plan and show **how much cable fits on a turntable (carousel), a static tank or a cable drum**, and **where each cable section starts and ends** once loaded.

Enter the carrier (rings / cerces, flanges, bays), the cable types and the cable sections in loading order: the tool simulates the loading turn by turn and gives you the fill, the weight, the remaining capacity and the exact position (layer, turn, radius, height) of each section end, with a drawing.

**▶ Open the app: <https://anthocazin.github.io/CableLoadingPlanner/>**

**No installation**: a single HTML file that also works **offline** (on board, on site).

> ⚠️ Planning aid only. Results assume regular winding / coiling with the stacking and gaps set in *Settings*. Always check against the carrier drawings, the cable data sheets and the loading procedure.

---

## Getting started

| Use | How |
|---|---|
| **Offline (recommended)** | Download [`dist/CableLoadingPlanner.html`](dist/CableLoadingPlanner.html) and open it in Chrome or Edge (double-click). |
| Local (development) | `python3 -m http.server 8080` in the repository root, then open <http://localhost:8080> |
| **Online** | <https://anthocazin.github.io/CableLoadingPlanner/> (published by `.github/workflows/pages.yml` on every push to `main`). |

The project is saved automatically in the browser. **Save** produces a `.cableplan.json` file you can archive or send; **Open** reloads it. **Report / PDF** prints an A4 portrait loading report with drawings, fill, section positions, geometry, capacity and a signature block (choose *Save as PDF* in the print dialog).

Three examples are built in (*Examples…* menu): export cable on a 5 000 t turntable, inter-array cables in a 2-compartment static tank, a split drum with 2 bays.

## What you enter

1. **Type** (dimensions in metres, wall / flange thickness in mm — comma or dot accepted)
   - *Turntable* or *Static tank*: any number of **rings / cerces** from the core outwards — inner Ø, wall thickness, height. Each space between two rings is a **compartment**. Max. cable load (SWL) and empty weight.
   - *Cable drum*: barrel Ø, flange Ø, flange thickness, and one or several **bays** (intermediate flanges / joues). Empty drum weight → total drum weight (drum + cable).
   - **Freeboard** = clearance kept between the top of the cable and the top of the walls (tank / turntable) or the flange rim (drum). The cable is never loaded above *wall height − freeboard* / *flange radius − freeboard*.
   - Dimensions and section lengths can also be **edited directly on the drawing** (click a value ✎), and walls, flanges and the barrel can be **dragged with the mouse** to resize them.
2. **Cables** — library of cable types: OD (mm), weight (kg/m), minimum bend radius (m), optional crush limit (max. layers on top).
3. **Loading plan** — the cable sections, in loading order: name, cable type, length, compartment / bay. The **Max** button sets a section to the largest length that still fits after the sections loaded before it.
4. **Settings** — square or nested stacking, gaps between turns and between layers **in % of the cable OD** (the equivalent in mm is shown), side where the first layer starts, report information. Standard values are applied by default: 0 % between layers (layer pitch 1.0 × OD square / 0.866 × OD nested), 5 % of OD between turns when coiling in a tank / on a turntable, 0 % on a drum; working capacity ≈ 80 % of theoretical.

## What you get

- **Status**: overflow, bend radius vs MBR, crush limit, weight vs SWL.
- **Drawings** (hover any turn for details: section, layer, turn, radius, height, section KP):
  - turntable / tank: *cross-section* through the centre (full diameter, with dimensions) and *plan view* of the top layers;
  - drum: *cross-section* along the axis and *side view* (one ring per layer).
  - Start and end of every section are flagged.
- **Fill gauges** per compartment: length of each section, spare capacity, stack height used.
- **Sections table**: loaded length, weight, inner end and outer end position (layer / turn / % of the turn, radius, height or distance from the flange, coiling direction), off-load order.
- **Compartments table**: layers, turns per layer, stack used, cable VCG above the floor (for stability), spare capacity.
- **Capacity matrix**: maximum length of every cable type in every empty compartment, limited by volume and by SWL.

## Calculation model

The engine (`js/engine.js`) places the cable **turn by turn**:

- a layer is filled across the compartment (radially in a tank / turntable, axially on a drum), with a pitch of *OD + turn gap*; layers alternate direction;
- the length of a turn is `2π × radius of the cable centre line` (tank: radius of the turn; drum: radius of the layer);
- *square* stacking puts each layer one OD above the previous one; *nested* stacking puts it `OD × √3/2` higher and shifts every other layer by half a pitch;
- a compartment is full when the next turn would go above the usable height (wall height − freeboard) or beyond the flange radius − freeboard;
- consecutive sections in the same compartment continue on the same turn when they have the same OD.

Real loading adds crossovers, transitions and irregular coiling: use the turn / layer gaps and the freeboard to keep a margin.

## Development

```
npm test        # calculation engine tests (node:test)
npm run build   # builds dist/CableLoadingPlanner.html (single file)
```

```
index.html          page
css/app.css         styles (screen + print report)
js/engine.js        calculation engine (no DOM, also runs in Node)
js/app.js           user interface and drawings (canvas)
tools/build.mjs     single-file build
test/               engine tests
```
