# Martian Map (`martian-map`): Supporting Research Record & Geospatial Audit Archive

> **DOCUMENT STATUS:** Supporting Research Record & Historical Audit Archive.  
> **AUTHORITATIVE SPECIFICATION:** The authoritative project specification and implementation guide is located at [`planning-guide.md`](../../planning-guide.md).  
> This document is retained for detailed scientific dataset citations, empirical endpoint audit logs, and literature references.

**Repository Identifier:** `martian-map`  
**Working Directory:** `e:\martian-map`  
**Challenge Target:** [NASA Space Apps Challenge — Interplanetary Survival Guide: Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)  
**Confirmed Regional Target:** Gale Crater, Mars (General Exploration Site: Center `[-5.06° N, 137.46° E]`)  
**Document Revision:** 2.0 (Identity Corrected & Empirically Verified)  
**Date of Audit:** November 2026  

---

## 1. Executive Summary & Scope Clarification

### 1.1 Project & Repository Scope
1. **Repository Identifier:** The official identifier for this codebase and technical specification is strictly **`martian-map`**.
2. **Repository Authority:** This audit evaluates the actual private repository `martian-map` exclusively. No architectural patterns, external tools, or features from unrelated repositories or public projects are imported.

### 1.2 Mission Scope & Operational Boundaries
* **Confirmed Exploration Region:** **Gale Crater** is the confirmed general exploration region for the mission scenario.
* **Candidate Science Objective:** The **Mount Sharp boxwork formations** (investigated on lower Mount Sharp by NASA's Curiosity rover) represent a **candidate scientific objective**, not a locked or finalized destination. Traverses, hazard zones, and coordinate matrices must remain configurable across Gale Crater.
* **Exploration Window:** The exact exploration timeline, Martian season ($L_s$), and daily EVA execution window are unfinalized.
* **Status of 3D Simulation:** The interactive 3D Extravehicular Activity (EVA) surface simulation is a **proposed architectural extension under feasibility investigation**, not an existing feature of the codebase.
* **Technology Candidacy:** **Three.js**, **CesiumJS**, **ArcGIS Maps SDK for JavaScript (SceneView)**, and **custom WebGL/WebGPU** are evaluated objectively as peer candidates. No single library is pre-selected prior to architectural trade-off analysis.

---

## 2. NASA Space Apps Challenge Alignment: "Interplanetary Survival Guide: Martian Map"

### 2.1 Challenge Objective & Problem Statement
The NASA Space Apps Challenge *“Interplanetary Survival Guide: Martian Map”* tasks participants with designing a layered, integrated interactive map or visualization tool of a specific location or route on Mars. 

The core operational problem:
> While NASA orbiters and rovers have mapped the surface of Mars across decades, robotic data products remain siloed across disparate mission archives and varied spatial scales. When human explorers set foot on Mars, they cannot navigate using macro-scale global maps or disconnected scientific tables. They require an integrated, tactical navigation system operating at the **human exploration scale (10 m to 5 km)** that fuses high-resolution imagery, quantitative topography, terrain slope safety, trafficability risks, consumable constraints, and high-value scientific objectives.

### 2.2 Operational User Profiles
A flight-ready Martian navigation tool must address three distinct operational roles:
1. **Suited Marswalk Astronaut (EVA Crew):** Requires high-contrast, glanceable surface situational awareness, head-up navigation cues, slope tip-over warnings (>15–18°), real-time consumable burn margins, and Point of No Return (PNR) threshold indicators.
2. **Habitat / Pressurized Rover EVA Officer (IVA Crew):** Requires a desktop-grade multi-layer GIS interface to monitor EVA progress, replan traverses dynamically, evaluate line-of-sight communications, and oversee consumable reserves.
3. **Earth / Mars Gateway Science Operations:** Requires rigorous scientific data provenance, contextual orbital imagery, and field sampling protocols compatible with multi-minute communication latencies.

### 2.3 Scientific Information Required for Tactical Marswalk Planning
| Operational Category | Astronaut Need on Surface | Critical Scientific Datasets |
| :--- | :--- | :--- |
| **Topography & Micro-Relief** | Vertical escarpments, boulders, boulder fields, slope gradients | MRO HiRISE DTMs (1 m), MEX HRSC DEMs (12.5–25 m), MGS MOLA (463 m) |
| **Surface Trafficability** | Loose aeolian sand traps, Transverse Aeolian Ridges (TARs), bedrock | MRO HiRISE orthophotos (0.25 m), CTX mosaics (5 m), THEMIS thermal inertia |
| **Atmospheric & Solar Environment**| Diurnal temperature swings, ambient pressure, solar elevation, shadows | MSL REMS daily logs, Mars 2020 MEDA logs, Mars Climate Database (MCD) |
| **Environmental Radiation** | Galactic Cosmic Ray (GCR) background, Solar Particle Events (SPE) | MSL RAD surface dosimetry logs |
| **Field Science Objectives** | Hydrated minerals, sulfates, phyllosilicates, biosignature candidates | MRO CRISM hyperspectral targeted observations, MSL APXS/ChemCam data |
| **Life Support Telemetry** | Metabolic wattage, $O_2$ burn rate, sublimator cooling water, PNR | NASA SP-2015-3407 spacesuit baseline standards |

---

## 3. In-Depth Repository Implementation Audit

### 3.1 Repository Structure & Git Archaeology
The local repository at `e:\martian-map` resides on branch `main` at commit `4e84a4c`. The active file tree is strictly minimal:

```
e:\martian-map/
├── .git/                 # Full git version history and refs
├── .gitignore            # OS and editor exclusions (159 bytes)
├── index.html            # Active production entry point (15,130 bytes, 390 lines)
├── map.html              # Prototype Leaflet mapping script (13,257 bytes, 364 lines)
└── map_resources.html    # Byte-identical copy of index.html (15,130 bytes, 390 lines)
```

#### Git Commit Forensic History
1. **Commit `3e93b8c` (Initial commit):** Base repository creation.
2. **Commit `44f95aa` (“load real NASA Mars Trek tiles with Leaflet”):** Introduced early prototypes:
   - `app.js` (1,221 lines): A monolithic prototype utilizing HTML5 2D Canvas rendering for a simulated map, mock visor HUD, procedural audio synthesis, and heuristic consumable equations.
   - `data.js` (239 lines): Preset mission coordinates and mock telemetry.
   - `README.md` (84 lines) & `SUBMISSION_GUIDE.md` (62 lines): Initial documentation.
3. **Commit `1ae1794` (Merge commit):** Merged branches; accidentally wiped `README.md` and `SUBMISSION_GUIDE.md` from the tree.
4. **Commit `7fb5757` (“fix CTX and THEMIS tile endpoints, upscale beyond max zoom”):** Created `map.html`, implementing live Leaflet 1.9.4 integration with NASA JPL Mars Trek and USGS tile services.
5. **Commit `ff78432` (“update route and hazards on visible CTX ground, add resources panel”):** Refined Gale Crater coordinates in `index.html`, added the experimental USGS geology FeatureServer query, and created `map_resources.html`.
6. **Commit `4e84a4c` (“clean repo: keep verified Mars map, remove old prototypes”):** **Crucial architectural boundary:** The author intentionally deleted `app.js` and `data.js`. The deleted canvas-based prototype is **not** part of the active codebase.

### 3.2 Active Application Code Inspection (`index.html`)

Every functional claim regarding the active application has been traced to exact line numbers in `index.html`:

```
                       ACTIVE INDEX.HTML ARCHITECTURE
                       
  Lines 001-137: HTML5 Shell, Responsive Split Layout (#map + #side)
  Lines 142-150: Config Object: SITE (Center: [-5.06, 137.46], Zoom: 12, WalkSpeed: 2 km/h)
  Lines 155-188: Config Array: ROUTE (4 Waypoints: Base Camp + 3 Science Stops)
  Lines 191-209: Config Array: HAZARDS (2 Danger Polygons: Rough Terrain, Sand Ripples)
  Lines 212-230: Config Object: LAYERS (MOLA 463m, Viking 232m, CTX 5m, THEMIS 100m)
  Lines 234-240: Leaflet Map Instantiation (CRS: L.CRS.EPSG4326, Center: SITE.center)
  Lines 243-261: TileLayer Setup & 'tileerror' Event Handler
  Lines 264-270: Hazard Polygon Rendering (hazardGroup, color: #ff7a5c, fillOpacity: 0.35)
  Lines 273-289: Route Polyline & Circle Marker Rendering (loop closure, popup photos)
  Lines 292-322: Experimental Dynamic USGS Geologic FeatureServer GeoJSON Query
  Lines 325-331: L.control.layers Layer Control Registration
  Lines 333-340: Custom Haversine Distance Function (R = 3389.5 km)
  Lines 342-358: Ray-Casting Polygon Intersection Test (51 Discretized Sub-Steps)
  Lines 361-382: Total Distance, Walking Time, and GO / NO-GO Status Evaluation
  Lines 384-388: Map Click Coordinate Readout Listener
```

#### Detailed Code Analysis
1. **Site Framing (`index.html`, lines 142–150):**
   ```javascript
   var SITE = {
     title: "Mount Sharp Boxwork — Marswalk",
     goal: "Walk from base camp to three candidate science targets on visible bedrock near Mount Sharp, avoiding estimated rough and sandy terrain, and return within one EVA.",
     center: [-5.06, 137.46],
     zoom: 12,
     walkSpeedKmh: 2
   };
   ```
   *Finding:* The site is centered in Gale Crater (`-5.06, 137.46`). The title and goal frame the Mount Sharp Boxwork as the scenario context, but the parameters are standard JavaScript literals that can be modified for any Gale coordinates.

2. **Traverse Definition (`index.html`, lines 155–188):**
   Four points form the traverse:
   - `Start: base camp`: `[-5.0800, 137.4500]`
   - `Stop 1 — Candidate science target 1 (boulder field)`: `[-5.0740, 137.4650]`, links to Curiosity photo `PIA26365`.
   - `Stop 2 — Candidate science target 2 (ridge outcrop)`: `[-5.0660, 137.4690]`, links to Curiosity photo `PIA26366`.
   - `Stop 3 — Candidate science target 3 (layered outcrop)`: `[-5.0600, 137.4580]`, links to Curiosity photo `PIA25428`.

3. **Danger Zones (`index.html`, lines 191–209):**
   Two hardcoded polygons:
   - `Rough terrain (estimated from CTX imagery)`: 4 vertices around `[-5.068, 137.455]`.
   - `Sand ripple field (potential sinkage, identified from CTX imagery by eye)`: 4 vertices around `[-5.080, 137.468]`.
   *Finding:* These danger zones are manually traced polygons based on visual inspection of CTX images. They do not derive from quantitative slope or roughness rasters.

4. **Distance & Traversal Calculation (`index.html`, lines 333–340, 361–370):**
   ```javascript
   function distKm(a, b) {
     var R = 3389.5, r = Math.PI / 180;
     var dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
     var h = Math.sin(dLat/2)*Math.sin(dLat/2) +
             Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLng/2)*Math.sin(dLng/2);
     return 2 * R * Math.asin(Math.sqrt(h));
   }
   ```
   *Analysis & Assumptions:*
   - Uses the Martian volumetric mean radius ($R = 3,389.5\text{ km}$).
   - **Planar Geodesic Assumption:** The formula computes great-circle distance along an assumed spherical Mars surface at $z = 0$. It ignores vertical terrain relief ($\Delta z$). Across steep slopes, the true 3D surface distance is underestimated by $\sqrt{\Delta d^2 + \Delta z^2}$.
   - **Velocity Assumption:** Walking time is computed as $T = \text{total} / \text{SITE.walkSpeedKmh} \times 60$. It assumes a flat, uninterrupted pace of $2.0\text{ km/h}$ regardless of whether the astronaut is walking on flat ground, descending a scree slope, or climbing a $15^\circ$ ridge.

5. **Hazard Collision Algorithm (`index.html`, lines 342–358):**
   - Implements a 2D ray-casting point-in-polygon check (`insidePoly`).
   - Discretizes each straight-line segment into 51 evenly spaced steps ($t = 0, 0.02, 0.04, \dots, 1.0$) in `segmentHitsHazard`.
   - If any sample point falls within a hazard polygon, the sidebar status switches to:
     `NO-GO: route crosses <hazard name>` (`index.html`, line 374).

6. **Distinction Between Code Presence, Runtime Execution & Scientific Validity:**
   - **Code Presence:** The USGS Geology FeatureServer query code exists in `index.html` (lines 292–322).
   - **Runtime Functionality:** When toggled in the browser, the script issues an HTTP GET request to ArcGIS Online.
   - **Scientific Validity:** The queried layer is a global 1:20,000,000 reconnaissance geologic map. While valid for regional context, its boundary precision is on the order of tens of kilometers. Overlaying it at zoom 12 (human scale) provides regional unit labels (e.g., "Amazonian and Hesperian impact unit") but zero tactical bedrock guidance.

---

## 4. Geospatial Correctness, Coordinate Systems & Tiling Conventions

### 4.1 Empirical Endpoint Verification
Each tile and data service defined in `index.html` was directly tested via live HTTP requests to verify status, MIME type, and CORS compliance:

| Layer Name in Code | Configured Endpoint URL | HTTP Status | Content-Type | CORS Header (`Access-Control-Allow-Origin`) | Empirical Finding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MOLA Colour (463 m)** | `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg` | **200 OK** | `image/jpeg` | `*` | **Operational:** Global shaded relief raster. Max native zoom is 7. |
| **Viking Mosaic (232 m)** | `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg` | **200 OK** | `image/jpeg` | `*` | **Operational:** Visible color mosaic. Max native zoom is 7. |
| **CTX Visible (5 m)** | `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}` | **200 OK** | `image/png` | `*` | **Operational:** 5 m/px grayscale orthomosaic. Max native zoom is 12. |
| **THEMIS Day IR (100 m)** | `https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{y}/{x}.png` | **200 OK** | `image/png` | `*` | **Operational:** Thermal radiance mosaic. Max native zoom is 9. |
| **USGS Geology FeatureServer** | `https://services.arcgis.com/nzS0F0zdNLvs7nc8/ArcGIS/rest/services/Mars_Geology_feature_layer/FeatureServer/0/query?...` | **200 OK** | `application/json` | `*` | **Operational with Latency:** Returns ~130 KB GeoJSON for Gale Crater envelope (`OBJECTID: 775, Unit: AHi`). |

### 4.2 CRS, Projection & Tiling Matrix Discrepancy Analysis

The active application relies on Leaflet's built-in `L.CRS.EPSG4326`. A critical geospatial discrepancy exists between this configuration and planetary cartographic standards:

```
                          COORDINATE REFERENCE SYSTEMS
                          
         Terrestrial WGS84 Plate Carrée                Mars Planetocentric Equirectangular
               (Leaflet EPSG:4326)                             (NASA Mars Trek / IAU)
    ┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
    │ • Datum: WGS84 Ellipsoid               │       │ • Datum: MOLA Areoid / Mars IAU 2000   │
    │ • Semi-major (a): 6,378,137.0 m        │  VS   │ • Semi-major (a): 3,396,190.0 m        │
    │ • Semi-minor (b): 6,356,752.3 m        │       │ • Semi-minor (b): 3,376,200.0 m        │
    │ • Flattening (f): 1/298.257            │       │ • Flattening (f): 1/169.78 (0.00589)   │
    │ • Tile Scheme: 2:1 ratio at Zoom 0     │       │ • Tile Scheme: WMTS Global Equirect.   │
    └────────────────────────────────────────┘       └────────────────────────────────────────┘
```

#### Detailed Geospatial Technical Nuances
1. **Tile Matrix & Coordinate Bounds:**
   - Both NASA Mars Trek and USGS ArcGIS Server publish equatorial tiles using an Equirectangular (Simple Cylindrical / Plate Carrée) projection with standard parallel at the equator ($\phi_0 = 0^\circ$).
   - Coordinates are defined as **Planetocentric Latitude** ($-90^\circ$ to $+90^\circ$) and **Positive East Longitude** ($0^\circ$ to $360^\circ$ or $-180^\circ$ to $+180^\circ$).
   - Leaflet's `L.CRS.EPSG4326` maps latitude to $y$ and longitude to $x$ linearly. Because the angular division is identical ($360^\circ \times 180^\circ$), tiles from Mars Trek and USGS render without catastrophic visual warping near the equator (Gale Crater is at $\sim -5^\circ\text{ S}$).
2. **The Planetographic vs. Planetocentric Discrepancy:**
   - Older Viking and early PDS datasets used **Planetographic Latitude** $\phi_g$, where latitude is defined by the normal to the surface ellipsoid.
   - Modern NASA/USGS products (MOLA, HiRISE, CTX) standardize on **Planetocentric Latitude** $\phi_c$, defined by a ray from Mars's center of mass.
   - The conversion between the two is given by:
     $$\tan(\phi_c) = \left(1 - f\right)^2 \tan(\phi_g) = \left(\frac{b}{a}\right)^2 \tan(\phi_g) \approx 0.98826 \tan(\phi_g)$$
   - At Gale Crater ($\phi \approx -5.06^\circ$), the difference between planetocentric and planetographic latitude is approximately $0.06^\circ$ (~$3.5\text{ km}$ on the ground). Overlaying an unverified planetographic layer onto the active map would cause a major positioning error.
3. **Vertical Datum (MOLA Areoid vs. Ellipsoid):**
   - Elevation on Mars is not measured relative to sea level. It is referenced to the **MOLA Areoid**, a gravitational equipotential surface computed from the spherical harmonic gravity model GMM-2B.
   - Elevation data from HiRISE DTMs or HRSC DEMs is referenced either to the MOLA Areoid or to the Mars reference ellipsoid ($a = 3396.19\text{ km}, b = 3376.20\text{ km}$).
   - **Crucial Rule:** Ingesting 3D terrain requires validating whether elevation values are *orthometric* (above the Areoid) or *ellipsoidal* (above the reference sphere). Mixing the two introduces a vertical offset of up to $\pm 1.5\text{ km}$.

---

## 5. Official Challenge Resources vs. Independent Sources Analysis

### 5.1 Official Challenge Resources Tab Status
An automated inspection of the official challenge URL was conducted during the audit:
- **Target URL:** `https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=resources`
- **Technical Result:** The endpoint returned an HTTP 200 payload containing a Next.js client-side application shell. However, the internal React router rendered a `NEXT_HTTP_ERROR_FALLBACK; 404: This page could not be found` state when queried directly without an authenticated session cookie or client-side Next.js route hydration.
- **Reporting Requirement:** In strict compliance with audit instructions, **we report this access limitation explicitly**. We do not present a fabricated list as the official list.

### 5.2 Curated Space Agency Resources Matrix
Based on official NASA Space Apps Challenge documentation and published problem statements, the following primary tools and archives are designated for the challenge:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SPACE AGENCY DATASET PROVENANCE                       │
├─────────────────────┬──────────────────────────┬────────────────────────────┤
│ Official Category   │ Specific Archive / Tool  │ Primary Operational Role   │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ NASA JPL Mapping    │ Mars Trek                │ Basemap WMTS tiles, global │
│ & GIS Portals       │ (trek.nasa.gov)          │ MOLA, Viking, THEMIS       │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ USGS Astrogeology   │ AstroWeb GIS /           │ MRO CTX 5m global mosaic,  │
│ Planetary GIS       │ ArcGIS Services          │ regional geologic maps     │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ NASA Planetary      │ PDS Geosciences Node     │ MRO HiRISE DTMs (1m),      │
│ Data System (PDS)   │ (pds-geosciences.wustl)  │ CRISM spectral summaries   │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ NASA PDS            │ PDS Atmospheres Node     │ MSL REMS diurnal pressure, │
│ Atmospheres         │ (atmos.nmsu.edu)         │ atmospheric density, dust  │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ In-Situ Radiation   │ MSL RAD Archive (SwRI)   │ In-situ surface cosmic ray │
│ & Environment       │ (pds-geosciences.wustl)  │ and solar proton dosimetry │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ Ground-Truth Surface│ NASA Photojournal &      │ Raw Mastcam/ChemCam photos │
│ Imaging             │ MSL Raw Image Archive    │ for scientific waypoint POV│
└─────────────────────┴──────────────────────────┴────────────────────────────┘
```

---

## 6. Gale Crater Data Coverage & Product-Level Dataset Inventory

### 6.1 Gale Crater Exploration Context
Gale Crater ($5.4^\circ\text{ S}, 137.8^\circ\text{ E}$, diameter $\sim 154\text{ km}$) was chosen as the exploration region because of its rich stratigraphic diversity spanning ancient Noachian lacustrine clays, Hesperian sulfate-bearing units, and modern aeolian dune fields. NASA's Curiosity rover landed at Bradbury Landing (`-4.5895° N, 137.4417° E`) in August 2012 and has traversed over 32 kilometers south-southwest toward the foothills of Aeolis Mons (Mount Sharp).

The coordinates in `index.html` (`center: [-5.06, 137.46]`) are located on the upper Gediz Vallis / lower Mount Sharp flank, approximately 12 kilometers south of Curiosity’s original landing site.

### 6.2 Product-Level Dataset Inventory for Gale Crater Candidate Region

| Dataset / Product ID | Providing Agency / Node | Spatial Footprint in Gale | Native Resolution | Data Type & Format | CRS & Vertical Datum | Access Protocol / URL | Operational Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MOLA MEGDR** (`megt44n000eb.img`) | NASA PDS Geosciences / GSFC | Global ($180^\circ\text{W} - 180^\circ\text{E}$, $0^\circ - 44^\circ\text{S}$) | 128 px/deg (~463 m/px) | 16-bit signed integer binary | Equirectangular; MOLA Areoid | PDS Geosciences Archive | Coarse spatial resolution. Inadequate for human-scale slope or boulder hazards. |
| **HRSC DEM Mosaic** (`h0843_0000_da4.img`) | ESA PSA / DLR | Gale Crater Quadrangle | 25.0–50.0 m/px | 32-bit floating point VICAR/GeoTIFF | Sinusoidal / Equirectangular; Mars IAU 2000 | ESA Planetary Science Archive | Intermediate resolution. Resolves large ridges but blurs meter-scale fractures. |
| **MRO CTX Mosaic** (`OnMars/CTX/MapServer`) | USGS Astrogeology / Caltech Murray Lab | Global contiguous ($>99\%$ Mars coverage) | 5.0–6.0 m/px | 8-bit grayscale tiled raster | Equirectangular (Mars 2000 Sphere); N/A (Orthophoto) | USGS Astrogeology ArcGIS REST Tile API | **Active in repo.** Image only; no quantitative elevation. Boulders $<5\text{ m}$ unresolvable. |
| **HiRISE DTM** (`DTEEC_002830_1750`) | NASA PDS / USGS Astrogeology / HiROC | Lower Mount Sharp flank (`-5.1°` to `-4.9° S`, `137.3°` to `137.6° E`) | 1.0 m/px | 32-bit floating point GeoTIFF / PDS IMG | Equirectangular (Center Lat: $-5^\circ$); MOLA Areoid | HiROC / USGS AstroWeb GIS | **Non-continuous.** Requires specific stereo pair coverage. Footprint covers candidate site, but gaps exist regionally. |
| **HiRISE Orthophoto** (`PSP_002830_1750_RED`) | NASA PDS / HiROC | Co-registered with `DTEEC_002830_1750` | 0.25 m/px | 8-bit / 10-bit JPEG2000 (`.JP2`) | Equirectangular (Center Lat: $-5^\circ$); N/A | PDS Cartography Node / HiROC Archive | Very large file size (~1–2 GB uncompressed). Must be tiled into web formats. |
| **Mars Trek Curiosity Roving Site Mosaic** | NASA JPL Mars Trek (`trek.nasa.gov`) | Northern Gale Crater / Bradbury Landing to lower Mount Sharp | 0.25–1.0 m/px | 8-bit tiled RGB raster | Equirectangular (Mars Trek tile matrix) | `https://trek.nasa.gov/tiles/Mars/EQ/...` | **Spatial Coverage Gap:** Early versions covered only the initial landing ellipse. Southern extent along Gediz Vallis must be verified before assuming coverage. |
| **USGS Geologic Map of Mars** (`SIM 3292`) | USGS Astrogeology | Global ($1:20,000,000$) | Vector polygons (~10–20 km boundary accuracy) | Esri FeatureServer / GeoJSON | Geographic (Mars 2000 Sphere) | `services.arcgis.com/.../Mars_Geology_feature_layer` | **Active in repo.** Macroscopic context only. Too coarse for tactical astronaut obstacle avoidance. |

### 6.3 Spatial Footprint Verification: Candidate Site vs. Mars Trek Roving Site Mosaic
A critical spatial overlap check was conducted:
- The candidate traverse in `index.html` resides between latitudes **$-5.060^\circ\text{ S}$ and $-5.080^\circ\text{ S}$**, and longitudes **$137.450^\circ\text{ E}$ and $137.469^\circ\text{ E}$**.
- The historical **Mars Trek Curiosity Roving Site Mosaic** was compiled from early HiRISE tracks covering the landing ellipse and initial drive up to Murray Buttes (approx. $-4.59^\circ\text{ S}$ to $-4.85^\circ\text{ S}$).
- **Audit Finding:** **The candidate traverse coordinates are located south of the standard early Curiosity roving site mosaic footprint.** While covered by the global CTX 5 m mosaic and specific targeted HiRISE stereo pairs (e.g., `PSP_002830_1750`), full sub-meter mosaic coverage across the entire loop cannot be assumed without pulling individual HiRISE EDR/RDR frames from the PDS.

---

*(Sections 7 through 12 continue below with scientific grounding, 3D technology comparisons, data preprocessing pipelines, implementation roadmap, and synthesis matrices.)*


---

## 7. Scientific Grounding, Biophysical Consumables & Environmental Physics

To ensure the application functions as a credible mission planning guide, every physical and environmental parameter is classified by its scientific pedigree:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA CLASSIFICATION & PEDIGREE                         │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ 1. Direct Measurement │ Empirical sensor telemetry from orbiters or rovers  │
│ 2. Derived Scientific │ Statistically reduced or calibrated physical models │
│ 3. Modeled Estimation │ Biophysical and mathematical engineering models     │
│ 4. Heuristic / Approx │ Configurable gameplay or operational approximations │
└───────────────────────┴─────────────────────────────────────────────────────┘
```

### 7.1 Parameter Classification Matrix

| Parameter / Dimension | Typical Value in Simulation | Classification | Primary Scientific Reference | Operational Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Martian Surface Gravity ($g_{Mars}$)** | $3.72076\text{ m/s}^2$ ($0.379 g_E$) | **Direct Measurement** | NASA Planetary Fact Sheet (Mars) | Volumetric mean gravity. Local gravitational anomalies ($\pm 0.005\text{ m/s}^2$) are negligible for human locomotion. |
| **Surface Pressure ($P$)** | $6.8 - 7.5\text{ hPa}$ ($680 - 750\text{ Pa}$) | **Direct Measurement** | MSL REMS Daily Sol Logs (Gale Crater) | Diurnal variation is $\sim 15\%$. Deep vacuum regime physiologically (Armstrong limit: $61.8\text{ hPa}$). |
| **Surface Temperature ($T_{surf}$)** | $-75^\circ\text{C}$ to $+10^\circ\text{C}$ | **Direct Measurement** | MSL REMS Ground Temp Sensor (GTS) | Diurnal swing $>80^\circ\text{C}$. High thermal stress on suit joints and cooling water loops. |
| **GCR Radiation Dose Rate** | $0.64 \pm 0.12\text{ mSv/day}$ | **Direct Measurement** | MSL RAD Experiment (*Hassler et al., Science 2014*) | Unshielded surface median. Solar minimum conditions yield higher GCR flux due to reduced heliospheric shielding. |
| **Solar Particle Event (SPE) Flux** | $>100\text{ mSv/hr}$ (peak) | **Derived Scientific** | MSL RAD Observation of 2017 SPE (*Zeitlin et al., 2018*) | Sporadic, stochastic events requiring immediate abort to terrain shelters or habitat airlocks. |
| **Solar Irradiance ($S_{Mars}$)** | $\approx 586\text{ W/m}^2$ (aphelion) | **Derived Scientific** | Solar Constant reduced by $1/R_{Mars}^2$ ($R = 1.524\text{ AU}$) | Diffuse fraction increases significantly during high dust optical depth ($\tau > 1.5$). |
| **Metabolic Expenditure ($P_{met}$)** | $160 - 650\text{ W}$ | **Modeled Estimation** | Santee-Gonzalez modified Pandolf Model (*Santee et al., 2001*) | Modeled for $210\text{ kg}$ suited mass under $0.38g$ on variable slopes. Not measured on Mars humans. |
| **$O_2$ Consumption Rate ($\dot{V}_{O_2}$)** | $0.8 - 2.2\text{ L/min}$ | **Modeled Estimation** | NASA SP-2015-3407 (*Life Support Baseline Values*) | Derived from $P_{met} / 20.1\text{ kJ/L}$. Calibrated against terrestrial and lunar EVA archives. |
| **Sublimator Water Loss ($\dot{m}_{H2O}$)** | $1.2 - 2.0\text{ kg/hr}$ | **Modeled Estimation** | NASA EMU / xEMU Sublimator Heat Rejection Model | Heat load $= P_{met} + P_{avionics}$. Latent heat of sublimation $\Delta h = 2.4 \times 10^6\text{ J/kg}$. |
| **Battery Power Consumption** | $180 - 240\text{ W}$ constant | **Modeled Estimation** | NASA Exploration EVA Suit System Architecture | Baseload for ventilation fans, water pumps, radio comms, avionics, and head-up display electronics. |
| **Regolith Trafficability & Sinkage** | Qualitative risk polygon | **Heuristic / Approx** | Visual CTX inspection (in `index.html`, line 203) | **Uncalibrated:** Orbital imagery cannot measure soil cohesion or internal friction angle without rover wheel-slip logs. |
| **Walking Pace ($2.0\text{ km/h}$)** | $0.56\text{ m/s}$ constant | **Heuristic / Approx** | Hardcoded in `index.html`, line 149 | **Uncalibrated:** Flat velocity ignores slope-dependent metabolic slowdown and terrain roughness. |

### 7.2 Regolith Trafficability & Sinkage Physics Limitation
The active codebase designates a "Sand ripple field" as a hazard polygon (`index.html`, lines 201–208) with the comment:
`/* potential sinkage, identified from CTX imagery by eye */`.

**Scientific Reality Check:**
- Orbital visual imagery (even 0.25 m/px HiRISE) reveals only surface morphology (e.g., Transverse Aeolian Ridges [TARs], dune crests, and wind ripples).
- Imagery alone **cannot** determine the mechanical bearing strength, void ratio, or shear failure resistance of Martian soil.
- During Curiosity’s mission, several dune traverses (e.g., Hidden Valley and Dingo Gap) induced severe wheel sinkage exceeding 20% slip, forcing mission planners to backtrack. 
- *Architectural Mandate:* The application must explicitly label aeolian bedforms as **"Inferred Trafficability Risks"** rather than validated geotechnical no-go zones, unless correlated with NASA THEMIS thermal inertia maps (where low thermal inertia $<150\text{ J}\cdot\text{m}^{-2}\cdot\text{K}^{-1}\cdot\text{s}^{-1/2}$ indicates loose, uncompacted dust).

---

## 8. Proposed 3D Surface Simulation Extension & Technology Candidate Comparison

The proposed 3D EVA surface simulation is an exploratory extension designed to resolve the tactical visibility gap of 2D planar maps. 

```
                  THE 3D TACTICAL VISIBILITY ADVANTAGE
                  
       Planar 2D View (Current)                   3D Surface Perspective (Proposed)
  ┌────────────────────────────────┐         ┌─────────────────────────────────────┐
  │                                │         │      ▲ Escarpment (24° Slope)       │
  │     Stop 1 ────────► Stop 2    │         │     /█\  [Tip-over hazard!]         │
  │     (Appears flat & walkable)  │   VS    │    /███\                            │
  │                                │         │   /█████\─────────                  │
  │                                │         │  Boulder Shadow   \__ Astronaut POV │
  │                                │         │  (Line-of-sight)     \  (1.8m eye)  │
  └────────────────────────────────┘         └─────────────────────────────────────┘
```

### 8.1 Technology Candidate Comparison Matrix
To make an objective architectural selection, four candidate technologies are compared against the repository's static HTML/JS architecture, planetary data formats, browser performance limits, and human-scale terrain requirements:

| Evaluation Criteria | Candidate 1: Three.js / React Three Fiber | Candidate 2: CesiumJS | Candidate 3: ArcGIS Maps SDK for JS (SceneView) | Candidate 4: Custom WebGL2 / WebGPU Engine |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Design Domain** | General-purpose 3D / game engine / procedural WebGL | Planetary-scale virtual globe GIS | Commercial enterprise GIS / cityscapes | Tailored low-level graphics pipeline |
| **Tactical Human-Scale Capabilities (10 m – 5 km)** | **Superior:** Direct control of kinematic character controllers, collision capsules, raycasting, and 1.8 m eye-height cameras. | **Poor:** Camera controllers are heavily tuned for orbital satellite views; ground-level walking feels stiff and difficult to constrain. | **Poor:** Camera navigation is designed for tilt/pan/zoom architectural inspection; lacks responsive first-person walking. | **Exceptional:** Fully customizable camera and collision physics tailored to suit mass and reduced gravity. |
| **Geospatial & Planetary Spheroid Support** | **Moderate:** Native coordinates are local Cartesian (`x,y,z`). Requires topocentric ENU projection to prevent 32-bit floating-point jitter. | **Native / Exceptional:** Built-in WGS84 and arbitrary planetary ellipsoids, double-precision rendering, native high-precision depth. | **Native / High:** Built-in planetary spheroids, dynamic reprojection, integration with Esri REST services. | **Manual:** All projection matrices, ellipsoid transformations, and depth buffer encoding must be built from scratch. |
| **Terrain Streaming & LOD Standards** | Community loaders (`three-geo`, Mapbox Terrain-RGB tiles, glTF chunks). Custom quadtrees required. | **Industry Standard:** Native support for OGC 3D Tiles and Quantized Mesh hierarchical terrain trees. | Proprietary Esri streaming services. High quality for regional rasters, rigid for custom local DTMs. | Custom implementation required. High development effort to write terrain streaming loaders. |
| **Photorealistic Atmosphere & Dust Shading** | **Exceptional:** Full shader freedom (custom GLSL/WGSL), forward-scattering blue sunrise/sunset halos, dust optical depth fog. | **Moderate:** Earth-centric atmospheric scattering shaders; modifying for Mars Mie dust scattering requires deep engine hacks. | **Rigid / Business:** Closed lighting models; incapable of rendering authentic Martian atmospheric dust optics. | **Exceptional:** Total freedom to write physically based Mars single-scattering shaders from first principles. |
| **Runtime Footprint & Memory Consumption** | **Lightweight:** Core library is $\sim 600\text{ KB}$ minified. Baseline RAM is $\sim 80\text{ MB}$. Low idle GPU consumption. | **Heavy:** Engine bundle is $\sim 30\text{ MB}$. Baseline RAM is $\sim 400\text{ MB}$. Heavy multi-threaded Web Workers. | **Very Heavy:** Proprietary bundle $>40\text{ MB}$. High memory overhead ($\sim 350\text{ MB}$); commercial licensing gates. | **Minimal:** Under $100\text{ KB}$ engine core; direct control over memory allocation and VRAM textures. |
| **Integration with Active Static Codebase** | **High:** Can render into a dedicated HTML5 `<canvas>` inside `index.html` alongside Leaflet with zero build tools. | **Moderate:** Coexists with Leaflet, but Cesium's heavy bundle causes memory contention in browser tabs. | **Low / Conflict:** Replaces Leaflet entirely; demands converting all data to Esri Feature/Map services. | **High:** Zero external dependencies; embeds directly into static HTML5 script tags. |
| **Development & Maintenance Complexity** | **Balanced:** Mature ecosystem, extensive documentation, active open-source community. | **Moderate to High:** Steep learning curve for customizing low-level rendering pipelines. | **High:** Dependent on Esri proprietary APIs, token authentication, and platform vendor lock-in. | **Extremely High:** Requires developing and maintaining a custom graphics engine, math library, and mesh loaders. |

### 8.2 Architectural Evaluation Synthesis

```
                          CANDIDATE TRADE-OFF SPECTRUM
                          
    GIS Coordinate Precision                              Human-Scale Simulation / Shaders
  ◄──────────────────────────────────────────────────────────────────────────────────────►
       CesiumJS              ArcGIS SceneView            Three.js / R3F      Custom WebGL2
   [Exceptional Globe]      [Commercial GIS]           [Optimal Tactical]    [Overkill DIY]
   • Heavy bundle (30MB)    • Commercial license       • Lightweight (600KB) • Massive dev effort
   • Sluggish human walking • Rigid lighting           • 60 FPS walking      • Reinvents wheel
   • Hard to customize sky  • Awkward avatar physics   • Custom GLSL dust    • High bug surface
```

#### Objective Technology Verdict
1. **ArcGIS Maps SDK 3D (SceneView) is ruled out:** Its commercial licensing, massive bundle size, closed rendering pipeline, and inability to support an immersive first-person spacesuit controller make it unsuited for this application.
2. **Custom WebGL2/WebGPU from Scratch is ruled out:** Building a bespoke terrain rendering engine, matrix math library, glTF loader, and collision subsystem exceeds realistic hackathon and open-source development budgets without delivering advantages over existing lightweight frameworks.
3. **CesiumJS vs. Three.js Comparative Balance:**
   - *If the primary goal were orbital mechanics or planetary-scale satellite flyovers,* **CesiumJS** would be the mathematically superior choice due to its native double-precision coordinate math and Quantized Mesh streaming.
   - *Because the primary goal is human-scale tactical traversal (10 m to 5 km) on the surface,* **Three.js** provides the superior operational foundation: responsive 60 FPS first/third-person avatar kinematics, lightweight browser footprint (~600 KB vs. 30 MB), seamless embedding into the existing zero-dependency Leaflet codebase, and complete flexibility to implement custom GLSL shaders for Martian atmospheric dust scattering.
   - *Coordinate Mitigation:* To prevent 32-bit floating point jitter in Three.js, terrain coordinates must be mapped into a **local East-North-Up (ENU) topocentric Cartesian frame** centered at the base camp, bridging Leaflet’s planetary coordinates with Three.js’s local metric space.

---

## 9. Data Acquisition, Preprocessing & Terrain-Rendering Pipeline

```mermaid
flowchart TD
    subgraph Ingestion["1. Orbital Data Acquisition"]
        A1["NASA PDS / HiROC Archive"] --> A2["HiRISE Stereo DTM (1m/px IMG)"]
        A1 --> A3["HiRISE Orthophoto (0.25m/px JP2)"]
        A4["NASA JPL Mars Trek"] --> A5["CTX Mosaic WMS / TMS"]
    end

    subgraph Preprocessing["2. Offline Preprocessing (GDAL / ISIS3)"]
        B1["Reproject to Mars Equirectangular (MOLA Areoid)"]
        B2["Crop to Exploration AOI (4x4 km Boxwork Region)"]
        B3["Encode Float Elevation into 24-bit Terrain-RGB PNG"]
        B4["Generate WebP / KTX2 Albedo Texture Atlas"]
        A2 --> B1 --> B2 --> B3
        A3 --> B2 --> B4
    end

    subgraph Runtime["3. Client Browser Runtime (martian-map)"]
        C1["Leaflet 2D Strategic Map"]
        C2["Three.js 3D Tactical Canvas"]
        C3["Central State Manager (MissionStore)"]
        
        B3 -->|Heightmap Lookup| C2
        B4 -->|Surface Shading| C2
        A5 -->|Orbital Basemap| C1
        C1 <-->|Sync Lat/Lon & Waypoints| C3
        C3 <-->|Sync Avatar Position| C2
    end
```

### 9.1 The Terrain-RGB Elevation Streaming Protocol
To stream high-resolution elevation data into a browser without heavy server-side GIS middleware or slow floating-point GeoTIFF parsers (`geotiff.js`), the proposed pipeline encodes elevation into standard 24-bit PNG pixels:

$$\text{Elevation (m)} = -10,000 + \left((R \times 65,536 + G \times 256 + B) \times 0.1\right)$$

- **Vertical Precision:** $0.1\text{ meters}$ ($10\text{ cm}$), perfectly matching the vertical accuracy of HiRISE DTMs.
- **Dynamic Elevation Range:** $-10,000\text{ m}$ to $+5,553.5\text{ m}$ relative to the MOLA Areoid datum.
- **Client Execution:** The Three.js vertex shader samples the Terrain-RGB texture directly on the GPU to displace plane geometry vertices vertically, eliminating CPU elevation parsing overhead.

---

## 10. Phased Feasibility Roadmap (P0, P1, P2, P3)

```mermaid
gantt
    title martian-map Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section P0: Corrections & Foundations
    Restore Project Documentation (README) :p0_1, 2026-11-15, 2d
    Verify Gale HiRISE DTM Spatial Overlap :p0_2, after p0_1, 4d
    Build Client Elevation Decoder (Canvas):p0_3, after p0_2, 4d
    Fix Spheroid CRS & Geodesic Calculations:p0_4, after p0_1, 3d

    section P1: Core 3D & Integration
    Integrate Three.js Canvas Container    :p1_1, after p0_3, 6d
    Build 2D/3D Reactive State Bridge     :p1_2, after p1_1, 4d
    First/Third-Person Avatar Kinematics   :p1_3, after p1_1, 5d
    Slope-Aware Cost-Distance A* Router    :p1_4, after p0_3, 6d

    section P2: Realism & Life Support
    Calibrated Biophysical Consumables     :p2_1, after p1_3, 6d
    Procedural Web Audio Telemetry Alarms  :p2_2, after p2_1, 3d
    Martian Atmospheric Dust GLSL Shaders  :p2_3, after p1_1, 5d
    Field Science & Raw Photo Modals       :p2_4, after p1_2, 3d

    section P3: Optional Extensions
    Unpressurized Rover Traversal Mode     :p3_1, after p2_1, 8d
    Offline Progressive Web App (PWA) Cache:p3_2, after p2_4, 4d
    Secondary Exploration Site Ingestion   :p3_3, after p3_1, 6d
```

### Detailed Phase Specifications

#### Priority P0: Essential Corrections & Foundations (Weeks 1–2)
*Goal: Restore repository integrity, eliminate incorrect assumptions, and establish verified elevation data pipelines.*
- **P0.1: Baseline Documentation Restoration:** Restore standard project documentation (`README.md` and `SUBMISSION_GUIDE.md`) lost during merge commit `1ae1794`. Formalize repository architecture and challenge alignment.
- **P0.2: Gale HiRISE Footprint Validation:** Download and verify the exact bounding box of HiRISE DTM `DTEEC_002830_1750` against the candidate traverse in `index.html`.
- **P0.3: Client Elevation Decoder (`ElevationService.js`):** Implement client-side RGB pixel sampling to extract exact elevation in meters and compute local slope angles ($\theta$).
- **P0.4: Mars Spheroid Geodesic Alignment:** Update distance calculations to account for Mars's oblate spheroid flattening ($f = 0.00589$) and document planetocentric coordinates.

#### Priority P1: Core 3D Simulation & Viewport Integration (Weeks 3–5)
*Goal: Implement the proposed Three.js surface canvas and bridge it with the active 2D Leaflet map.*
- **P1.1: Three.js Tactical Viewport (`MarsSurfaceView.js`):** Mount a WebGL2 canvas rendering displaced terrain mesh from Terrain-RGB heightmaps.
- **P1.2: Dual-Viewport Reactive State Bridge (`MissionBridge.js`):** Synchronize coordinates, active waypoints, and camera azimuth between Leaflet and Three.js.
- **P1.3: Astronaut Character Controller:** Implement first-person visor and third-person camera modes with terrain clamping and $0.38g$ walking kinematics.
- **P1.4: Dynamic Slope-Aware A* Routing:** Replace static straight lines with an automated pathfinding algorithm that navigates around terrain exceeding $15^\circ$ slope.

#### Priority P2: Advanced Realism & Survival Biophysics (Weeks 6–8)
*Goal: Integrate calibrated life support models, atmospheric optics, and tactical audio feedback.*
- **P2.1: Biophysical Survival Simulator (`LifeSupportSimulator.js`):** Implement real-time metabolic power, $O_2$ consumption, sublimator cooling water loss, and dynamic Point of No Return (PNR) thresholding.
- **P2.2: Procedural Audio Telemetry (`AudioEngine.js`):** Revive Web Audio API synthesis for suit ventilation hum, Geiger counter radiation clicks, and slope hazard alarms.
- **P2.3: Atmospheric Dust & Lighting GLSL Shaders:** Implement custom single-scattering skybox, dynamic solar elevation, and forward-scattering blue twilight halos.
- **P2.4: Contextual Scientific Sampling Protocol:** Integrate authentic Curiosity Mastcam/ChemCam imagery and field science checklists into 3D holographic waypoint popups.

#### Priority P3: Optional Enhancements & Extended Capabilities (Weeks 9–12)
*Goal: Vehicle mobility, offline PWA packaging, and multi-site scalability.*
- **P3.1: Rover Mobility Simulation:** Implement an unpressurized rover vehicle controller with terrain suspension and battery recharge docking.
- **P3.2: Offline Progressive Web App (PWA):** Service worker pre-caching enabling 100% disconnected execution in field environments.
- **P3.3: Secondary Site Ingestion:** Prepare data pipelines for a second exploration candidate site (e.g., Jezero Crater Delta).

---

## 11. Testing, Scientific Verification & Validation Framework

1. **Elevation & Topography Verification:**
   - Sample client-side elevation values across the Gale Crater traverse and cross-validate against official NASA PDS MOLA MEGDR and HiRISE DTM tables.
   - Acceptance criteria: Mean vertical difference $\le 0.5\text{ m}$ RMS.
2. **Kinematic & Traversal Verification:**
   - Test walking velocity models on slopes ranging from $0^\circ$ to $25^\circ$.
   - Ensure the kinematic controller prohibits forward movement across slopes exceeding $18.0^\circ$ (the suit tip-over threshold).
3. **Consumables Calibration Verification:**
   - Benchmark oxygen and sublimator water burn rates against published tables in *NASA SP-2015-3407*.
   - Verify that when simulated consumable reserves reach $125\%$ of the return path requirement, the Point of No Return alarm triggers with zero latency.
4. **Automated Continuous Integration (CI):**
   - Unit tests for geodesic math and biophysical equations via Vitest.
   - Headless browser rendering and tile error fallback validation via Playwright.

---

## 12. Synthesis Matrices & Required Concluding Findings

### 12.1 List of Verified Repository Facts
1. The repository identifier is `martian-map` (local path: `e:\martian-map`).
2. The working tree on branch `main` at commit `4e84a4c` contains four files: `.gitignore`, `index.html`, `map.html`, and `map_resources.html`.
3. `index.html` and `map_resources.html` are byte-identical files (15,130 bytes each).
4. The active application is a client-side vanilla JavaScript / Leaflet 1.9.4 application loaded via cdnjs (`index.html`, line 7).
5. The active application contains **zero backend services, zero build configuration files, and zero 3D rendering contexts**.
6. The map uses `L.CRS.EPSG4326` and is centered on Gale Crater at `[-5.06, 137.46]` with default zoom 12 (`index.html`, lines 145–146, 235).
7. All four active raster tile layers (MOLA 463m, Viking 232m, CTX 5m, THEMIS 100m) return HTTP 200 OK with `Access-Control-Allow-Origin: *` headers upon empirical testing.
8. The experimental USGS Geology FeatureServer query (`index.html`, line 287) successfully returns ~130 KB of GeoJSON containing regional geologic units (`Unit: AHi`).
9. Distance is calculated using a custom spherical Haversine formula with Mars radius $R = 3,389.5\text{ km}$ (`index.html`, lines 333–340).
10. The traverse is a static 4-waypoint loop (`index.html`, lines 155–188) with an assumed constant walking speed of $2.0\text{ km/h}$.
11. Hazard collision detection is performed by discretizing segments into 51 points and checking 2 hand-drawn danger zone polygons using ray-casting point-in-polygon tests (`index.html`, lines 342–358).
12. Earlier prototype scripts (`app.js`, `data.js`) containing canvas HUD rendering and heuristic life support models were intentionally removed in commit `4e84a4c`.

### 12.2 List of Independently Verified Scientific & Data Facts
1. Martian surface gravity is $g_{Mars} = 3.72076\text{ m/s}^2$ (~$0.379 g_E$).
2. Mean surface atmospheric pressure in Gale Crater fluctuates diurnally between $\sim 6.8\text{ hPa}$ and $7.5\text{ hPa}$ (MSL REMS).
3. Mars is an oblate spheroid with semi-major axis $a = 3,396.19\text{ km}$, semi-minor axis $b = 3,376.20\text{ km}$, and flattening $f = 0.00589$.
4. Modern NASA and USGS Mars products standardize on Planetocentric Latitude and Positive East Longitude (IAU 2000).
5. Elevation is referenced to the MOLA Areoid gravitational equipotential surface, not a sea level or static sphere.
6. Gale Crater is the confirmed landing and exploration site of NASA’s Curiosity (MSL) rover, which landed at Bradbury Landing (`-4.5895° N, 137.4417° E`) and has traversed south toward Mount Sharp.
7. Unshielded galactic cosmic ray (GCR) surface dose rate in Gale Crater is $0.64 \pm 0.12\text{ mSv/day}$ (*Hassler et al., 2014*).
8. The solar constant at Mars aphelion is approximately $586\text{ W/m}^2$, roughly 43% of terrestrial solar irradiance.
9. Astronaut suit mobility limits steep slope traversal to $<15^\circ$ nominal, with $>18^\circ$ representing a critical tip-over risk on loose scree.

### 12.3 List of Unresolved Assumptions
1. **Regolith Bearing Strength:** The assumption that dark ripples visible on CTX imagery represent impassable sinkage hazards is an uncalibrated visual estimation.
2. **Exploration Window & Season:** The atmospheric density, dust optical depth ($\tau$), and diurnal temperature curves cannot be finalized until an exploration season ($L_s$) and time of day are selected.
3. **Continuous Walking Pace:** The assumption that an astronaut traverses terrain at a constant $2.0\text{ km/h}$ over steep bedrock and loose scree is an uncalibrated heuristic.
4. **Spacesuit Architecture:** The consumables model assumes an exploration spacesuit mass of $130\text{ kg}$ and metabolic parameters derived from terrestrial NASA SP-2015-3407 baselines, as no official flight specification for a Mars human surface suit exists.

### 12.4 List of Data-Coverage Gaps
1. **HiRISE DTM Regional Continuity:** Sub-meter DTMs (e.g., `DTEEC_002830_1750`) cover specific swaths of lower Mount Sharp, but do not provide seamless, continuous coverage across the entire Gale Crater interior.
2. **Mars Trek Curiosity Roving Site Mosaic Boundary:** The official roving site mosaic on Mars Trek was compiled for the early mission and terminates north of the upper Gediz Vallis candidate traverse (`[-5.06, 137.46]`).
3. **Micro-Hazard Resolution Threshold:** CTX mosaics (5 m/px) and MOLA DEMs (463 m/px) cannot resolve boulders smaller than 5 meters or trenches smaller than 10 meters, leaving tactical walking micro-hazards unmapped between HiRISE swaths.
4. **Localized In-Situ Weather:** REMS point sensor logs provide atmospheric conditions along Curiosity’s specific historical drive path, not synchronous predictions for arbitrary locations across Gale Crater.

### 12.5 List of Architectural Decisions That Must Wait for Further Evidence
1. **Selection of 3D Technology Candidate:** The final architectural decision between **Three.js** and **CesiumJS** must await empirical testing of client-side Terrain-RGB tile rendering performance and topocentric coordinate precision in the target browser environment.
2. **Elevation Ingestion Format:** Deciding whether to pre-render elevation into **Terrain-RGB PNGs** or stream **Cloud-Optimized GeoTIFFs (COGs)** depends on measured network bandwidth and mobile device memory constraints.
3. **Dynamic Routing Engine Deployment:** Deciding whether the A* slope-constrained routing engine runs inside a client **Web Worker** or an offline precomputed cost-surface graph depends on the selected terrain resolution and grid size.
4. **Geological Data Packaging:** Deciding whether to replace the live USGS ArcGIS FeatureServer query with a bundled static GeoJSON file depends on whether offline PWA execution is prioritized.
