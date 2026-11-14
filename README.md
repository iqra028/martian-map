# Martian Map (`martian-map`)

**NASA Space Apps Challenge 2026** — *Interplanetary Survival Guide: Martian Map*  
**Exploration Target:** Gale Crater, Mars (`5.06° S, 137.46° E`)  
**Development Milestone:** Milestone 1 — Verified Gale Terrain Foundation  

---

## 1. Project Overview
`martian-map` is a browser-based planetary exploration workstation designed to assist astronauts and mission controllers in planning and executing simulated extravehicular activities (Marswalks) on Mars. The application combines two complementary viewports:

1. **2D Strategic Mission Workspace:** An interactive GIS map for regional basemap inspection (MOLA, Viking, CTX, THEMIS), slope hazard analysis, waypoint sequencing, and traverse planning.
2. **3D Tactical EVA Workspace:** A perspective-correct 3D surface simulation (1.8 m astronaut height of eye) providing terrain-aware navigation, first/third-person exploration, and biophysically constrained life-support simulation.

Both workspaces share a common geographic coordinate bridge, mission store, and life-support model.

---

## 2. Current Implementation Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **2D Map Viewer** | **Operational** | Standalone Leaflet 1.9.4 application in `index.html` loading real NASA Mars Trek (MOLA, Viking, THEMIS) and USGS Astrogeology (CTX 5m) tiles with verified HiRISE DTM footprint and click-to-query elevation inspection. |
| **Candidate Traverse** | **Operational** | Static 4-waypoint loop in Gale Crater with geodesic distance (Mars Haversine) and hazard collision detection. |
| **Shared Core Modules** | **Operational** | `src/geo/coordinates.js` (Mars geodetic & True Topocentric ENU math), `src/core/resource-model.js` (metabolic, thermal, and battery models), `src/core/mission-state.js` (reactive store). |
| **Terrain Data Pipeline** | **Operational** | `src/data/dtm-loader.js` (normalized raster ingestion, nearest/bilinear interpolation) & `src/data/elevation-service.js` (headless multi-renderer service). |
| **Automated Tests** | **Operational** | Built-in test suite in `tests/` passing 100% (19/19 tests) via `npm test` (`node:test`). |
| **3D Simulation View** | **Planned (Phase 4)** | Architectural design and normalized terrain specification contract (`src/views/scene-3d/terrain-contract.js`) established. |

---

## 3. Repository Structure

```text
martian-map/
├── index.html                 # Active 2D map application entry point
├── package.json               # Development scripts and test commands
├── planning-guide.md          # Authoritative technical specification & roadmap
├── README.md                  # Repository overview and entry point
├── src/                       # Modular application source
│   ├── core/                  # Shared mission state & biophysical models
│   │   ├── mission-state.js   # Central reactive state manager
│   │   └── resource-model.js  # BVAD metabolic, O2, water, and PNR formulas
│   ├── geo/                   # Planetary geodesy & coordinate bridges
│   │   └── coordinates.js     # Planetocentric Equirectangular <-> Topocentric ENU
│   ├── data/                  # Data source registries & schema models
│   ├── views/                 # Viewport presentation layers
│   │   ├── map-2d/            # 2D Leaflet map components
│   │   └── scene-3d/          # 3D Three.js scene components (Phase 4)
│   └── ui/                    # Reusable HUD and panel components
├── tests/                     # Automated unit and consistency tests
│   ├── geo.test.js            # Geodesic distance & ENU transform tests
│   └── resources.test.js      # Metabolic, O2, water, and PNR tests
├── docs/                      # Supporting documentation
│   ├── research/              # Research records (outline.md archive)
│   └── decisions/             # Architecture Decision Records (ADRs)
└── archive/                   # Archived prototypes & duplicate files
    └── prototypes/            # Earlier map.html & map_resources.html
```

---

## 4. Setup & Run Instructions

The project runs completely client-side with zero mandatory external build tools or backend databases:

### Option A: Local Static Server (Recommended)
Because modern browser security policies (CORS) restrict ES6 module imports and `fetch()` over `file://` URLs, run a lightweight local static server:

```bash
# Using Node.js built-in server script:
npm start

# Or using Python:
python -m http.server 8000
```
Then open `http://localhost:8000` in Google Chrome, Firefox, or Edge.

### Option B: Run Automated Tests
Execute the native unit test suite (requires Node.js 18+):
```bash
npm test
```

---

## 5. Documentation Entry Points
- **Authoritative Specification & Implementation Guide:** [`planning-guide.md`](planning-guide.md)
- **Supporting Research & Geospatial Audit Archive:** [`docs/research/outline.md`](docs/research/outline.md)
- **Architecture Decision Records:** [`docs/decisions/ADR-001-hybrid-architecture.md`](docs/decisions/ADR-001-hybrid-architecture.md)
- **Prototype Archive Record:** [`archive/prototypes/README.md`](archive/prototypes/README.md)

---

## 6. Development Status & Next Milestone
- **Milestone 1 — Verified Gale Terrain Pipeline [COMPLETED]:**
  - Authoritative PDS metadata for HiRISE DTM `DTEEC_006855_1750_007501_1750_A01` verified and cataloged in `data/manifest.json`.
  - Headless `ElevationService` and `DtmRaster` implemented with bilinear and nearest-neighbor elevation sampling.
  - Mars True Topocentric ENU transformation implemented and verified against equirectangular tangent approximation.
  - 3D Terrain Render Specification contract established for future Three.js consumption.
  - Verified DTM footprint and elevation inspection integrated into active 2D Leaflet application (`index.html`).
  - Automated test suite expanded to 19 unit tests (100% passing).
- **Next Milestone — Phase 3: 2D Route Planner & Telemetry HUD Integration:**
  - Modularize 2D Leaflet controllers into `src/views/map-2d/map-controller.js`.
  - Connect interactive waypoint creation and route elevation profile chart to `ElevationService`.
  - Display real-time metabolic and consumable HUD metrics.
