# Martian Map (`martian-map`)

**NASA Space Apps Challenge 2026** — *Interplanetary Survival Guide: Martian Map*
**EVA site:** Sakarya Vallis, a chasm cut into Mount Sharp (Aeolis Mons), Gale Crater — `5.08° S, 137.26° E`

A browser-based Marswalk planner. Crew pick or drag stops on real HiRISE terrain; the app routes each
leg around ground that is too steep to walk, then runs a mission-control style **go / no-go poll**: terrain,
consumables (incl. point of no return), dust, radiation and space weather each answer go, caution or no-go
with the evidence, and the worst answer is the call.

---

## 1. What it does

| Area | How |
| :--- | :--- |
| **Real terrain** | HiRISE stereo DTM `DTEEC_006855_1750_007501_1750_A01` (1 m/px) block-averaged to a 10 m grid. Elevation, slope, hillshade and the slope overlay all come from it. |
| **Hazards from data** | Slope per 10 m cell: <10° nominal, 10–15° moderate, 15–20° steep (caution), ≥20° no-go. The whole route is sampled every cell, not just at stops. |
| **Rough ground** | Each 10 m cell also stores the RMS of the 1 m heights about a fitted plane, which catches blocks and ledges the averaging smooths away. ≥0.5 m (top ~2% of the site) is rough → CAUTION; ≥1 m is a boulder field. Shown on the map as a violet overlay and per stop as "Footing". |
| **Safe-path routing** | A* on the slope grid: ≥20° cells are walls, steeper ground and climbing cost more, rough ground costs ×2 and boulder fields ×6, no corner cutting past walls. A leg with no safe path is drawn dashed red and makes the plan NO-GO. |
| **EVA plan** | Metabolic cost per sample from grade and speed (existing `resource-model.js`), 30 min science time per stop, O₂ / cooling water / battery at return, and point-of-no-return margin at every stop using its own safe return path. |
| **Weather** | Latest 30 sols of Curiosity REMS, fetched live from the feed; falls back to the bundled snapshot (`data/rems-recent.json`) offline. Midday air temperature drives suit heater load. |
| **Ground photos** | Each stop shows a Curiosity image from Mount Sharp, the same mountain ~15–25 km away (no rover has been in Sakarya Vallis). |
| **Dust what-if** | Optical depth τ slider: haze slows the walk ×0.8 (caution), storm ×0.5 (no-go); noon sunlight shown. |
| **Radiation** | Curiosity RAD surface dose (0.64 mSv/day, Hassler et al. 2014) → dose for this EVA vs. the NASA 600 mSv career limit. |
| **Space weather** | NASA DONKI solar particle events in the 7 days before the selected sol's date, fetched once for the whole sol range and cached for an hour. Changing the sol re-checks locally. Offline, failed or rate-limited → CAUTION, never silently GO. |
| **Crew ops** | Emergency return from the selected (or farthest) stop for a solo walker, a buddy pair supporting an injured partner, or a rover pickup — time home and whether O₂ and battery cover it. |
| **Offline** | Service worker precaches the app, terrain and imagery; orbital tiles are cached as you view them. |

### UI principles
Built for someone glancing at it in a suit: the call written out in plain words above the poll, big tabular numbers, four tabs
(Plan · Stop · Environment · Layers) instead of one long page, 44 px touch targets, colour always paired with
text and shape (● GO, ▲ CAUTION, ■ NO-GO), a quiet document-style dark theme (Notion-like neutral greys,
tinted callouts, property rows), full keyboard use (arrow keys on tabs,
Esc closes dialogs / cancels add mode), and an elevation profile you can scrub that tracks a marker on the map.

---

## 2. Run

```bash
npm start        # http://localhost:8000  (ES modules need a server, not file://)
npm test         # node:test, no dependencies
```

### Rebuild the data (optional, the outputs are committed)
```bash
npm run data:rems                                   # refresh REMS weather snapshot
curl -O https://hirise-pds.lpl.arizona.edu/PDS/DTM/PSP/ORB_006800_006899/PSP_006855_1750_PSP_007501_1750/DTEEC_006855_1750_007501_1750_A01.IMG
npm run data:terrain -- DTEEC_006855_1750_007501_1750_A01.IMG   # 438 MB in → 2.2 MB grid + roughness grid + PNG overlays
```
The orthoimage is the PDS EXTRAS browse JPEG `PSP_006855_1750_RED_C_01_ORTHO.br.jpg`, which shares the DTM's projection.

---

## 3. Choosing the route
Candidate base, rim and canyon-floor points were limited to flat (<6°) cells, then every loop was routed with the
same A* the app uses. The default loop (5.7 km, ~266 m climb, −3108 to −2853 m) was the one that reaches the
canyon floor at the foot of the layered wall with **zero** cells over 20° and the fewest steep stretches.
`tests/terrain-analysis.test.js` re-checks this against the real DTM.

---

## 4. Assumptions and limits (read before trusting a number)
- **Suit capacities** (1200 L O₂, 8 kg water, 1000 Wh) and the 25 % return reserve come from `resource-model.js`; they are planning values, not a real suit spec.
- **Assumed:** 30 min per stop; heater 0 W at ≥ −20 °C, +1.5 W/°C colder, max 120 W; dust pace factors; buddy-assist pace 1 km/h; rover 8 km/h.
- **10 m grid**: the 20° limit is for this grid, not the ground under a boot. Roughness flags metre-scale blocks, but HiRISE stereo cannot resolve rocks under ~1–2 m.
- **REMS** values are the public outreach summaries, not calibrated PDS data. The dust τ is a what-if, not measured.
- **DONKI** events are seen from near Earth and may not reach Mars, so they give CAUTION, not NO-GO.
- **Stop photos** are Curiosity views of the same rock units elsewhere on Mount Sharp, not the stop itself; the HiRISE image is the real ground.
- **Data use:** all data is public NASA / USGS / university mission data, used under their media guidelines with credit
  (images: NASA/JPL-Caltech/MSSS, NASA/JPL/UArizona; weather: CAB CSIC-INTA). CTX tiles are Esri's hosted service.
  No NASA logo is used and the app does not claim NASA endorsement. DONKI uses NASA's shared `DEMO_KEY` (10 requests an hour per IP); paste a free key from api.nasa.gov under Environment → Space weather. It is stored only in that browser.
- 3D view is not built yet (`src/views/scene-3d/terrain-contract.js` is the planned contract).

---

## 5. Layout
```text
index.html, sw.js            app shell, offline cache
src/app.js                   UI controller (map, profile, panel)
src/ui/app.css               design tokens and layout
src/config/mission.js        site, default route, basemaps, sources
src/core/eva-plan.js         consumables, PNR, environment, GO/NO-GO
src/core/resource-model.js   metabolic / O₂ / water / battery formulas
src/data/terrain-analysis.js slope, hazards, profile, A* safe path
src/data/elevation-service.js, dtm-loader.js   DTM loading and sampling
src/data/space-weather.js    DONKI SEP check
tools/                       data build scripts (REMS, terrain)
data/terrain/                10 m grid, hillshade, slope, orthoimage
tests/                       node:test suites
```

See [`planning-guide.md`](planning-guide.md) for the original specification and roadmap.
