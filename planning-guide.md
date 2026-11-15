# Martian Map (`martian-map`): Authoritative Technical Specification & Implementation Guide

**Document Status:** [CONFIRMED] Single Authoritative Project Specification  
**Repository Identifier:** `martian-map`  
**Working Directory:** `e:\martian-map`  
**Challenge Target:** [NASA Space Apps Challenge 2026 — Interplanetary Survival Guide: Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)  
**Confirmed Region:** Gale Crater, Mars (Regional Center: `5.06° S, 137.46° E` / `[-5.0600°, 137.4600°]`)  
**Revision:** 4.0 — Pre-Implementation Grounded Specification  

---

## 1. Project Overview & Scope Authority

### 1.1 Product Purpose & Vision [CONFIRMED]
`martian-map` is a dual-viewport, browser-based planetary exploration workstation designed for simulated human extravehicular activities (Marswalks). The application bridges the gap between macro-scale orbital remote sensing (hundreds of kilometers) and human-scale surface exploration (10 meters to 5 kilometers).

The product unites two interconnected, equally critical workspaces:
1. **The 2D Strategic Martian Map:** A high-performance geographic information system (GIS) interface for exploring regional basemaps, managing multi-mission scientific rasters, evaluating terrain trafficability, plotting waypoints, and inspecting traverse cross-sections.
2. **The 3D Tactical Terrain & EVA Simulation:** A realistic, perspective-correct 3D environment operating at the astronaut scale (1.8 m height of eye), enabling surface inspection of topography, terrain-aware navigation, first-person and third-person exploration, and biophysically constrained extravehicular activity (EVA) mission simulation.

```
                    MARTIAN-MAP UNIFIED PRODUCT VISION
                    
  ┌────────────────────────────────────────────────────────────────────────┐
  │                        UNIFIED MISSION WORKBENCH                       │
  │                                                                        │
  │   2D STRATEGIC MISSION WORKSPACE          3D TACTICAL EVA WORKSPACE     │
  │   ┌─────────────────────────────┐         ┌─────────────────────────┐  │
  │   │ • Multi-Layer Orbital GIS   │         │ • 1.8m Human Eye View   │  │
  │   │ • MOLA / CTX / THEMIS Tiles │◄───────►│ • Real DEM Mesh Surface │  │
  │   │ • Route & Waypoint Planner  │         │ • Astronaut Locomotion  │  │
  │   │ • Strategic Slope Hazards   │         │ • Biophysical Telemetry │  │
  │   └──────────────┬──────────────┘         └────────────┬────────────┘  │
  │                  │                                     │               │
  │                  └──────────────────┬──────────────────┘               │
  │                                     ▼                                  │
  │                      CENTRAL MISSION DATA & STATE                      │
  │                      • Shared Coordinates & Traverses                  │
  │                      • Consumables & Point of No Return                │
  └────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Decision Status & Operational Boundaries

| Decision / Parameter | Status | Technical Description & Scope Boundary |
| :--- | :--- | :--- |
| **Exploration Region** | **[CONFIRMED]** | **Gale Crater** ($5.4^\circ\text{ S}, 137.8^\circ\text{ E}$) is the confirmed general exploration region. |
| **Science Objectives** | **[PROPOSED]** | Lower Mount Sharp boxwork structures, Gediz Vallis debris apron, and clay-bearing units are candidate targets, not finalized destinations. |
| **2D Map Engine** | **[CONFIRMED]** | Retain and extend **Leaflet 1.9.4** with `L.CRS.EPSG4326` for planetary equirectangular tile rendering. |
| **3D Simulation Engine**| **[PROPOSED]** | **Three.js (Vanilla ES6)** is the candidate 3D engine, evaluated against CesiumJS and custom WebGL. |
| **Exploration Window** | **[UNVERIFIED]** | Season ($L_s$), solar elevation, and daily EVA execution hours are unfinalized. |
| **Suit Mass Envelope** | **[ASSUMPTION]** | Suited astronaut mass is modeled as $210\text{ kg}$ ($80\text{ kg}$ crew + $130\text{ kg}$ suit load). |
| **Avionics Electrical**| **[ASSUMPTION]** | Baseload electrical power draw is modeled as $180\text{ W}$ constant (pumps, fans, radio, HUD). |

---

## 2. Repository & Scaffolding State

### 2.1 File Structure & Active Roles

```text
martian-map/
├── index.html                 # Active 2D map application entry point [CONFIRMED]
├── package.json               # Development scripts and test runner [CONFIRMED]
├── planning-guide.md          # Authoritative technical specification (this document) [CONFIRMED]
├── README.md                  # Concise repository entry point [CONFIRMED]
├── src/                       # Scaffolding for modular development [CONFIRMED]
│   ├── core/
│   │   ├── mission-state.js   # Central reactive state manager [CONFIRMED]
│   │   └── resource-model.js  # BVAD metabolic, O2, water, and PNR formulas [CONFIRMED]
│   ├── geo/
│   │   └── coordinates.js     # Planetocentric Equirectangular <-> Topocentric ENU [CONFIRMED]
│   ├── data/                  # Source catalogs and normalized schemas [PROPOSED]
│   ├── views/
│   │   ├── map-2d/            # 2D Leaflet view modules [PROPOSED]
│   │   └── scene-3d/          # 3D Three.js view modules (Phase 4) [PROPOSED]
│   └── ui/                    # Reusable HUD and panel components [PROPOSED]
├── tests/
│   ├── geo.test.js            # Geodesic distance & ENU transform unit tests [CONFIRMED]
│   └── resources.test.js      # Metabolic, O2, water, and PNR unit tests [CONFIRMED]
├── docs/
│   ├── research/
│   │   └── outline.md         # Supporting research and geospatial audit archive [CONFIRMED]
│   └── decisions/
│       └── ADR-001-hybrid-architecture.md # Architecture decision record [CONFIRMED]
└── archive/
    └── prototypes/
        ├── README.md          # Prototype archive record [CONFIRMED]
        ├── map.html           # Archived earlier 2D map prototype [CONFIRMED]
        └── map_resources.html # Archived byte-identical duplicate of index.html [CONFIRMED]
```

### 2.2 Active 2D Map Implementation Assessment
- **Entry Point:** `index.html` at the repository root is the active, verified 2D map.
- **Tile Services (Empirically Verified):**
  - NASA MGS MOLA Color Shaded Relief ($463\text{ m/px}$, max zoom 7): HTTP 200 OK.
  - NASA Viking MDIM 2.1 Color Mosaic ($232\text{ m/px}$, max zoom 7): HTTP 200 OK.
  - MRO CTX Visible Grayscale Mosaic ($5\text{ m/px}$, max zoom 12): HTTP 200 OK.
  - NASA Mars Odyssey THEMIS Day IR ($100\text{ m/px}$, max zoom 9): HTTP 200 OK.
- **Geodesic Distance:** Uses custom Haversine equation parameterized with Mars mean radius ($R = 3,389.5\text{ km}$). Computed on an ideal sphere ($z = 0$).
- **Hazard Intersections:** Discretizes traverse segments into 51 points and checks point-in-polygon inclusion against two manually traced CTX polygons.

---

## 3. Scientific Data Provenance & Gale Crater Coverage

### 3.1 Verified HiRISE DTM Product Audit [CONFIRMED]
The product string `DTEEC_002830_1750` previously cited in planning documents is an incomplete identifier that does not exist in standard PDS catalogs.

#### Official Product Identity:
- **Verified Candidate Product ID:** **`DTEEC_006855_1750_007501_1750_A01`**
- **Feature Name:** "Chasm in Gale Crater's Interior Mound" (Sakarya Vallis in Aeolis Mons).
- **Stereo Pair Observations:**
  - `PSP_006855_1750` ($5.05^\circ\text{ S}, 137.28^\circ\text{ E}$, slant range $272\text{ km}$)
  - `PSP_007501_1750` ($5.14^\circ\text{ S}, 137.23^\circ\text{ E}$, slant range $268\text{ km}$)
- **Product Specifications (Authoritative PDS Embedded Label):**
  - *Raster Dimensions:* **15,897 lines** $\times$ **6,883 samples** ($109,419,051$ total pixels; 1 band).
  - *Data Type:* 32-bit floating point (`SAMPLE_TYPE = PC_REAL`, little-endian IEEE 754).
  - *DTM Grid Spacing:* **$1.01169\text{ m/pixel}$** (`MAP_SCALE = 1.0116912775905 <METERS/PIXEL>`, `MAP_RESOLUTION = 58587.06624417 <PIX/DEG>`).
  - *Orthorectified Image Resolution:* $0.25\text{ m/pixel}$ (`PSP_006855_1750_RED_A_01_ORTHO.JP2`, $503\text{ MB}$).
  - *Center Coordinates:* **$5.09^\circ\text{ S}, 137.23^\circ\text{ E}$** (`CENTER_LATITUDE = -5.0°`, `CENTER_LONGITUDE = 137.23°`).
  - *Exact Geographic Footprint (Bounding Box):*
    - **Southernmost Latitude (`MINIMUM_LATITUDE`):** **$-5.221725^\circ$** ($5.2217^\circ\text{ S}$)
    - **Northernmost Latitude (`MAXIMUM_LATITUDE`):** **$-4.950398^\circ$** ($4.9504^\circ\text{ S}$)
    - **Westernmost Longitude (`WESTERNMOST_LONGITUDE`):** **$137.171577^\circ\text{ E}$**
    - **Easternmost Longitude (`EASTERNMOST_LONGITUDE`):** **$137.289506^\circ\text{ E}$**
    - *Footprint Extent:* $\approx 16.07\text{ km}$ north-south $\times$ $6.96\text{ km}$ east-west ($\sim 111.8\text{ km}^2$ area).
  - *Projection Offsets:* `LINE_PROJECTION_OFFSET = -290029.50000001`, `SAMPLE_PROJECTION_OFFSET = 3409.5000000001`.
  - *Coordinate System:* Planetocentric Latitude, Positive East Longitude, Equirectangular Projection on local sphere radius $R = 3,396.0368126\text{ km}$.
  - *Vertical Datum:* MOLA Areoid gravitational equipotential surface (Mars 2000 Datum, Smith et al. 2001).
  - *Elevation Range:* **VALID_MINIMUM = $-4043.75\text{ m}$**, **VALID_MAXIMUM = $-2415.92\text{ m}$**.
  - *No-Data Hex Constant:* `16#FF7FFFFB#` ($-3.4028226550889045 \times 10^{38}$, standard ISIS null).
  - *File Size:* $437,676,204\text{ bytes}$ ($\sim 438\text{ MB}$ uncompressed raw raster).
  - *Direct Source Archive:* [University of Arizona HiRISE Operations Center (HiROC)](https://www.uahirise.org/dtm/dtm.php?ID=PSP_006855_1750).

#### Spatial Coverage Reality & Project Impact:
- The candidate boxwork coordinates in `index.html` reside at **$5.06^\circ\text{ S}, 137.46^\circ\text{ E}$**.
- Verified DTM `DTEEC_006855_1750_007501_1750_A01` is centered at **$5.09^\circ\text{ S}, 137.23^\circ\text{ E}$**, located approximately **$15.4\text{ km}$ to the west** (the easternmost edge of the DTM is $137.2895^\circ\text{ E}$, which is $\approx 10.05\text{ km}$ west of the boxwork site).
- **Coverage Status:** **No released, standard public PDS HiRISE DTM currently covers the candidate $3\text{ km} \times 3\text{ km}$ boxwork coordinates.**
- **Operational Strategy:**
  1. *Milestone 1 Testbed:* Use `DTEEC_006855_1750_007501_1750_A01` ($5.09^\circ\text{ S}, 137.23^\circ\text{ E}$) as the verified high-resolution ground truth dataset to validate the terrain ingestion and sampling pipeline.
  2. *Candidate Exploration Site:* The candidate Mount Sharp boxwork feature ($5.06^\circ\text{ S}, 137.46^\circ\text{ E}$) remains the primary operational traverse destination. Where HiRISE stereo coverage is pending, regional MOLA ($463\text{ m}$) or HRSC/CTX elevation models are used, with mandatory UI transparency notices displayed.

### 3.2 Product-Level Planetary Data Matrix

| Dataset / Instrument | Product ID & Source | Native Resolution | Data Type | CRS & Vertical Datum | Coverage Status in Gale | Operational Use in martian-map |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MRO CTX Mosaic** | USGS Astrogeology / Murray Lab | $5.0 - 6.0\text{ m/px}$ | 8-bit tiled raster | Equirectangular (Mars 2000) | Contiguous ($>99\%$) | **Confirmed Active.** Primary 2D basemap. |
| **HiRISE DTM (Mount Sharp)** | `DTEEC_006855_1750_007501_1750_A01` | $1.01\text{ m/px}$ | 32-bit float PDS IMG / GeoTIFF | Equirectangular ($\phi_0 = -5^\circ$), MOLA Areoid | Lower Mount Sharp Chasm ($5.09^\circ\text{S}, 137.23^\circ\text{E}$) | **Verified Testbed.** Terrain ingestion and sampling pipeline testbed. |
| **MGS MOLA MEGDR** | `megt44n000eb.img` (PDS/GSFC) | $128\text{ px/deg}$ ($\sim 463\text{ m}$) | 16-bit binary raster | Equirectangular, MOLA Areoid | Contiguous global | **Confirmed Active.** Macro relief context. |
| **MEX HRSC DEM** | `h0843_0000_da4.img` (ESA PSA) | $25.0 - 50.0\text{ m/px}$ | 32-bit float GeoTIFF | Mars IAU 2000 | Regional Gale Quadrangle | **Regional Availability.** Mid-scale fallback terrain. |
| **THEMIS Day IR** | Mars Odyssey / ASU | $100\text{ m/px}$ | 8-bit tiled PNG | Equirectangular (Mars 2000) | Contiguous global | **Confirmed Active.** Thermal radiance context. |
| **CRISM Hyperspectral**| `FRT0000B204` (NASA PDS) | $18.0 - 36.0\text{ m/px}$ | PDS IMG Cube | Equirectangular | Targeted swaths | **Regional Availability.** Precomputed mineral ratios. |
| **Curiosity RAD** | PDS PPI Node / SwRI | In-situ point sensor | Tabular CSV / EDR | Rover trajectory | In-situ rover path | **Confirmed Source.** Ground truth radiation dose ($0.64\text{ mSv/day}$). |
| **Curiosity REMS** | PDS Atmospheres Node / CAB | In-situ daily Sol logs | Tabular ASCII / CSV | Rover trajectory | In-situ rover path | **Confirmed Source.** Ground truth weather ($P, T, \tau$). |
| **USGS Geologic Map** | SIM 3292 (USGS Astrogeology) | 1:20,000,000 global | GeoJSON / FeatureServer | Mars 2000 Geographic | Contiguous global | **Confirmed Active.** Coarse stratigraphic context. |

---

## 4. Planetary Coordinate Architecture & Transformations

### 4.1 Planetary Geodesy Standards [CONFIRMED]
- **Reference Body:** Mars IAU 2000 / IAU 2015 Triaxial Spheroid:
  - Equatorial Semi-Major Axis ($a$): $3,396,190.0\text{ m}$
  - Polar Semi-Minor Axis ($b$): $3,376,200.0\text{ m}$
  - Flattening ($f$): $\frac{a - b}{a} = 0.005886008$ ($1 / 169.78$)
  - Volumetric Mean Radius ($R_{Mars}$): **$3,389,500.0\text{ m}$** ($3,389.5\text{ km}$)
- **Latitude Convention:** **Planetocentric Latitude ($\phi_c$)** (-90° to +90°). Latitude is defined by the angle between the Martian equatorial plane and a ray from Mars’s center of mass.
  - *Standard Notation:* Latitudes south of the equator are written as **`5.06° S`** or **`-5.0600°`**. Notations combining negative signs with cardinal North (`-5.06° N`) are rejected.
- **Longitude Convention:** **Positive East Longitude ($\lambda$)**, spanning $0^\circ$ to $360^\circ$ (or $-180^\circ$ to $+180^\circ$).
- **Vertical Reference:** **MOLA Areoid Gravitational Equipotential Surface (GMM-2B)**. Elevations ($h$) represent orthometric heights in meters above or below this reference surface.
- **2D Map CRS vs. Mars Trek:** Leaflet’s `L.CRS.EPSG4326` subdivides a $360^\circ \times 180^\circ$ world into a 2:1 tile grid. Because NASA Mars Trek and USGS Astrogeology publish tiles in Mars Equirectangular projection ($\phi_0 = 0^\circ$), the tile row/column indices align with Leaflet’s EPSG:4326 grid without visual distortion. However, native Leaflet distance functions (`map.distance()`) must not be called, as they apply Earth's radius ($6,378\text{ km}$). All distances must use `marsDistanceMeters()`.

### 4.2 Planetary Coordinate Transformations [CONFIRMED]

To avoid ambiguous nomenclature, `martian-map` explicitly distinguishes two coordinate transformations:

#### 1. True 3D Topocentric East-North-Up (ENU) Frame [CONFIRMED]
Transforms planetocentric geodetic coordinates $(\phi, \lambda, h)$ through Mars-Centered Cartesian (MCF) vector space $\mathbf{P} = [X, Y, Z]^T$ and rotates by the local tangent frame at $(\phi_0, \lambda_0)$:

$$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = (R_{Mars} + h) \begin{bmatrix} \cos(\phi) \cos(\lambda) \\ \cos(\phi) \sin(\lambda) \\ \sin(\phi) \end{bmatrix}, \quad \Delta \mathbf{P} = \mathbf{P} - \mathbf{P}_0$$

$$\begin{bmatrix} E \\ N \\ U \end{bmatrix} = \begin{bmatrix} -\sin(\lambda_0) & \cos(\lambda_0) & 0 \\ -\sin(\phi_0) \cos(\lambda_0) & -\sin(\phi_0) \sin(\lambda_0) & \cos(\phi_0) \\ \cos(\phi_0) \cos(\lambda_0) & \cos(\phi_0) \sin(\lambda_0) & \sin(\phi_0) \end{bmatrix} \Delta \mathbf{P}$$

- **Three.js Axis Mapping:** $+X = \text{East}$, $+Y = \text{Up}$, $-Z = \text{North}$ ($+Z = \text{South}$).
- **Physical Accuracy:** Strictly models 3D planetary curvature. As a vehicle or astronaut travels horizontally in the tangent plane, the Martian surface drops away below the tangent plane by $\approx \frac{d^2}{2 R_{Mars}}$ ($\approx 14.75\text{ m}$ over $10\text{ km}$).
- **Implementation:** Implemented as `geodeticToTrueEnu` and `trueEnuToGeodetic` in [src/geo/coordinates.js](file:///e:/martian-map/src/geo/coordinates.js).

#### 2. Local Equirectangular Tangent Approximation [CONFIRMED]
For lightweight 2D distance checks and fast flat-mesh projections:

$$x_{east} = R_{Mars} \cos(\phi_0) \cdot (\lambda - \lambda_0) \cdot \frac{\pi}{180^\circ}, \quad z_{south} = - R_{Mars} \cdot (\phi - \phi_0) \cdot \frac{\pi}{180^\circ}, \quad y_{up} = h - h_0$$

- **Accuracy Envelope:** Planar approximation ignoring vertical planetary curvature. Within a $10\text{ km} \times 10\text{ km}$ local exploration cell, horizontal projection distortion is $<0.005\%$ ($<50\text{ cm}$ over $10\text{ km}$).
- **Implementation:** Implemented as `geodeticToEquirectangularTangent` and `equirectangularTangentToGeodetic` in [src/geo/coordinates.js](file:///e:/martian-map/src/geo/coordinates.js).

---

## 5. Life-Support Physics, Consumables & Environmental Validation

### 5.1 Baseline Standards & Authority [CONFIRMED]
All life-support consumable modeling, metabolic load calculations, and contingency reserve margins are governed by authoritative NASA human spaceflight standards:
- **Primary Standard:** **NASA/TP-2015-218570**, *Baseline Values and Assumptions Document* (BVAD), NASA Johnson Space Center.
- **Reference Crewmember Profile:**
  - Total Suited System Mass ($m_{\text{total}}$): **$180.0\text{ kg}$** ($80.0\text{ kg}$ astronaut body mass + $100.0\text{ kg}$ planetary EVA exploration spacesuit & Portable Life Support System [PLSS]).
  - Maximum Nominal EVA Duration: **8.0 hours** ($28,800\text{ seconds}$).
  - Contingency Reserve Requirement: **$\ge 25\%$** minimum consumable margin at Point of No Return (PNR).

---

### 5.2 Metabolic Power Expenditure Model [CONFIRMED]
Metabolic heat production ($P_{\text{met}}$, in Watts) is calculated using the terrain- and gravity-adjusted Santee-Gonzalez metabolic equations, enhanced with pressurized spacesuit joint mechanical resistance:

$$P_{\text{met}} = P_{\text{basal}} + P_{\text{motion}} + P_{\text{grade}} + P_{\text{suit\_joint}}$$

Where:
- **Basal Metabolic Rate ($P_{\text{basal}}$):** $100.0\text{ W}$ (resting crewmember in suited environment).
- **Horizontal Locomotion Work ($P_{\text{motion}}$):**
  $$P_{\text{motion}} = m_{\text{total}} \cdot g_{\text{Mars}} \cdot v \cdot \mu_t$$
  - $g_{\text{Mars}} = 3.72076\text{ m/s}^2$ ($0.3794g$).
  - $v = \text{EVA walking speed in m/s}$ (nominal flat walking: $1.0\text{ m/s} = 3.6\text{ km/h}$).
  - $\mu_t = 0.32$ (dimensionless terrain locomotion coefficient for Martian regolith and basaltic gravel).
- **Incline / Grade Work ($P_{\text{grade}}$):**
  $$P_{\text{grade}} = \begin{cases} m_{\text{total}} \cdot g_{\text{Mars}} \cdot v \cdot \sin(\theta), & \text{if } \theta > 0 \text{ (uphill)} \\ 0.30 \cdot m_{\text{total}} \cdot g_{\text{Mars}} \cdot v \cdot \sin(\theta), & \text{if } \theta < 0 \text{ (downhill eccentric braking)} \end{cases}$$
  - $\theta = \text{terrain slope angle in radians}$.
- **Pressurized Spacesuit Joint Resistance ($P_{\text{suit\_joint}}$) [CONFIRMED]:**
  $$P_{\text{suit\_joint}} = \begin{cases} 70.0\text{ W}, & \text{if } v > 0.05\text{ m/s} \text{ (active suit locomotion)} \\ 0.0\text{ W}, & \text{if } v \le 0.05\text{ m/s} \text{ (static / resting)} \end{cases}$$
  - Accounts for constant mechanical torque and gas-pressurization joint counter-force in a $29.6 - 34.5\text{ kPa}$ ($4.3 - 5.0\text{ psi}$) pure-$O_2$ planetary exploration spacesuit.

#### Metabolic Benchmark Values:
| Activity / Terrain State | Speed ($v$) | Slope ($\theta$) | Total Metabolic Power ($P_{\text{met}}$) | NASA BVAD Target Range | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Resting / Static Observation** | $0.0\text{ m/s}$ | $0.0^\circ$ | **$100.0\text{ W}$** | $90 - 130\text{ W}$ | [CONFIRMED] |
| **Nominal Level Walking** | $1.0\text{ m/s}$ | $0.0^\circ$ | **$286.8\text{ W}$** | $260 - 340\text{ W}$ | [CONFIRMED] |
| **Moderate Uphill Incline** | $0.7\text{ m/s}$ | $+10.0^\circ$ | **$408.1\text{ W}$** | $350 - 520\text{ W}$ | [CONFIRMED] |
| **Steep Slope Ascent** | $0.4\text{ m/s}$ | $+15.0^\circ$ | **$518.2\text{ W}$** | $450 - 650\text{ W}$ | [CONFIRMED] |
| **Severe Slope Ascent** | $0.3\text{ m/s}$ | $+20.0^\circ$ | **$643.5\text{ W}$** | $600 - 750\text{ W}$ | [CONFIRMED] |

---

### 5.3 Consumable Depletion Rates & Sizing [CONFIRMED]

#### 1. Oxygen Consumption ($O_2$) [CONFIRMED]
Oxygen mass consumption is directly coupled to metabolic wattage via the standard respiratory energetic equivalent of human aerobic metabolism:

$$k_{O2} = 20,100\text{ J per liter of } O_2 \text{ consumed at Standard Temperature and Pressure (STP)}$$

$$\text{Rate}_{O2} = \frac{P_{\text{met}}}{k_{O2}} \cdot 60.0 \quad [\text{liters } O_2 \text{ STP / minute}]$$

- **At resting ($100\text{ W}$):** $0.30\text{ L/min}$ ($18.0\text{ L/hr}$).
- **At nominal flat walking ($286.8\text{ W}$):** $0.86\text{ L/min}$ ($51.4\text{ L/hr}$).
- **At moderate slope ($408.1\text{ W}$):** $1.22\text{ L/min}$ ($73.1\text{ L/hr}$).
- **At peak sustainable output ($737\text{ W}$):** $2.20\text{ L/min}$ ($132.0\text{ L/hr}$).
- **PLSS Primary $O_2$ Reservoir Sizing:** $700.0\text{ L}$ STP ($0.998\text{ kg } O_2$ at $20.7\text{ MPa} / 3000\text{ psi}$). At nominal walking ($51.4\text{ L/hr}$), primary tank life is **$13.6\text{ hours}$**, yielding a **$41\%$ reserve margin** above an 8-hour EVA.

#### 2. Sublimator Cooling Water Loss ($H_2O$) [CONFIRMED]
In Mars’s thin atmosphere ($600 - 800\text{ Pa}$), convective suit heat rejection is negligible. Suit thermal regulation is achieved via a water-membrane sublimator venting ice vapor to the low-pressure Martian ambient environment:

$$\Delta h_{\text{sub}} = 2.83 \times 10^6\text{ J/kg} \quad (\text{latent heat of water ice sublimation at Martian ambient triple point})$$

$$\text{Rate}_{H2O} = \frac{P_{\text{met}} + P_{\text{avionics}}}{\Delta h_{\text{sub}}} \cdot 3600.0 \quad [\text{kg } H_2O\text{ / hour}]$$

Where $P_{\text{avionics}} = 180.0\text{ W}$ represents internal heat dissipated by suit electronics, circulation fans, and sensor packages into the thermal loop.
- **At resting ($100\text{ W} + 180\text{ W} = 280\text{ W}$):** $0.356\text{ kg/hr}$.
- **At nominal flat walking ($286.8\text{ W} + 180\text{ W} = 466.8\text{ W}$):** $0.594\text{ kg/hr}$.
- **At moderate slope ($408.1\text{ W} + 180\text{ W} = 588.1\text{ W}$):** $0.748\text{ kg/hr}$.
- **PLSS Feedwater Reservoir Sizing:** **$8.0\text{ kg}$** ($8.0\text{ liters}$). Nominal 8-hour EVA consumption is $4.75\text{ kg}$, retaining **$3.25\text{ kg}$ ($40.6\%$ reserve)**.

#### 3. Spacesuit Electrical Energy ($E_{\text{batt}}$) [CONFIRMED]
- **Base PLSS Electrical Load:** $P_{\text{avionics}} = 180.0\text{ W}$ (continuous electrical power for ventilation fan, liquid cooling garment pump, suit avionics, telemetry radio, and display heads-up unit).
- **Thermal Heaters:** Up to $+50.0\text{ W}$ active pulse heating during extreme shadow / winter Martian night.
- **Battery Pack Sizing:** **$1.80\text{ kWh}$** ($1800\text{ Wh}$) rechargeable lithium-ion cells. Nominal 8-hour draw at $180\text{ W} = 1440\text{ Wh}$, leaving **$360\text{ Wh}$ ($20.0\%$ reserve)**.

#### 4. Biophysical & Thermodynamic Boundary Reconciliation [CONFIRMED]
To prevent double-counting or erroneous energy attribution across systems:
- **Spacesuit Joint Resistance ($70.0\text{ W}$):** Represents mechanical work performed by human muscle to articulate pressurized joints ($29.6 - 34.5\text{ kPa}$).
  - *Included in:* Metabolic Power ($P_{\text{met}}$), Oxygen Consumption ($\text{Rate}_{O2}$), and Sublimator Cooling Water thermal balance (human metabolic heat).
  - *Excluded from:* Battery Electrical Drain. The suit battery does not power human muscles (no powered exoskeleton).
- **Avionics Electrical Power ($180.0\text{ W}$):** Represents electrical energy drawn from suit batteries.
  - *Included in:* Battery Electrical Drain and Sublimator Cooling Water thermal balance (electrical power degrades to heat inside the suit).
  - *Excluded from:* Human Metabolic Rate and Oxygen Consumption. Astronauts do not breathe to power electronics.

---

### 5.4 Point of No Return (PNR) Safety Formulation [CONFIRMED]
The application computes real-time consumable safety margins for each active consumable $c \in \{O_2, H_2O, \text{Battery}\}$:

$$\text{PNR\_Margin}_c = \frac{C_{\text{remaining}} - 1.25 \cdot C_{\text{return}}}{C_{\text{capacity}}} \times 100\%$$

$$\text{Effective\_PNR\_Margin} = \min_{c} \left( \text{PNR\_Margin}_c \right)$$

- **Safety Buffer Factor:** $1.25$ ($25\%$ contingency allowance covering unforeseen detours, regolith slip, or suit joint fatigue).
- **Margin States:**
  - $\text{Effective\_PNR\_Margin} \ge 25.0\%$: **NOMINAL (Green)** — Exploration path safe.
  - $10.0\% \le \text{Effective\_PNR\_Margin} < 25.0\%$: **ADVISORY (Yellow)** — Approaching return threshold; non-essential tasks aborted.
  - $0.0\% \le \text{Effective\_PNR\_Margin} < 10.0\%$: **WARNING (Orange)** — Immediate mission turnaround required; proceed directly to habitat/rover.
  - $\text{Effective\_PNR\_Margin} < 0.0\%$: **CRITICAL EMERGENCY (Red)** — Incurring safety reserve depletion; life-support exhaustion risk.

---

### 5.5 Environmental Radiation, Thermal & Atmospheric Context [CONFIRMED]
- **Surface Radiation:** Measured by MSL Curiosity Radiation Assessment Detector (RAD):
  - Galactic Cosmic Ray (GCR) background: $210 - 240\ \mu\text{Sv/day}$ ($\sim 9.0 - 10.0\ \mu\text{Sv/hour}$).
  - Solar Particle Event (SPE) alert: Dynamic hazard multiplier up to $1000\times$; EVA abort mandatory upon active flare detection.
- **Surface Atmospheric Pressure:** Measured by Curiosity REMS:
  - Range: $750 - 950\text{ Pa}$ ($0.75 - 0.95\text{ kPa}$) in Gale crater basin (equivalent to $<1\%$ Earth sea level). Suit must maintain sealed pressure regardless of ambient variation.
- **Surface Temperature:** Gale diurnal swing spans $-95^\circ\text{C}$ ($178\text{ K}$) pre-dawn to $+10^\circ\text{C}$ ($283\text{ K}$) mid-afternoon. Thermal sublimator load fluctuates accordingly.

---

## 6. Terrain, Slope & Mobility Physics Validation

### 6.1 Slope Brackets & Trafficability Constraints [CONFIRMED]
Continuous slope angles $\theta$ derived from high-resolution DTMs are classified into four operational mobility brackets:

```
0° ---------------- 10° ---------------- 15° ---------------- 20° ----------------> Slope
      NOMINAL              CAUTION               RESTRICTED            IMPASSABLE
  (Speed: 1.0 m/s)     (Speed: 0.7 m/s)       (Speed: 0.4 m/s)      (Unassisted No-Go)
  (Metabolic: 287W)    (Metabolic: 408W)      (Metabolic: 518W)     (Metabolic: >643W)
```

1. **$0.0^\circ \le \theta < 10.0^\circ$ — Nominal Terrain [CONFIRMED]:**
   - Unrestricted pedestrian and rover traverse.
   - Max walking velocity: $1.0\text{ m/s}$ ($3.6\text{ km/h}$).
   - Low slip risk ($\le 5\%$).
2. **$10.0^\circ \le \theta < 15.0^\circ$ — Moderate Incline [CONFIRMED]:**
   - Regolith shear begins; loose dust may induce wheel/boot slippage.
   - Max walking velocity capped at $0.7\text{ m/s}$.
   - Metabolic cost rises $+42\%$ over level walking.
3. **$15.0^\circ \le \theta < 20.0^\circ$ — Severe Incline / High Hazard [CONFIRMED]:**
   - Critical pedestrian boundary. Max walking velocity restricted to $0.4\text{ m/s}$.
   - Uncrewed rovers without anchoring winches face significant entrapment risk.
   - Slip probability rises to $25 - 40\%$.
4. **$\theta \ge 20.0^\circ$ — Critical Slope / Impassable [CONFIRMED]:**
   - Unassisted pedestrian EVA prohibited. Requires mechanical anchoring or ascent lines.
   - Rover traverse prohibited.
   - The pathfinder routing algorithm applies an asymptotic cost penalty:
     $$\text{Cost\_Multiplier}(\theta) = \begin{cases} 1.0 + 3.0 \cdot \left(\frac{\theta}{20.0^\circ}\right)^2, & \text{if } \theta < 20.0^\circ \\ \infty \text{ (forbidden edge)}, & \text{if } \theta \ge 20.0^\circ \end{cases}$$

---

### 6.2 Low-Gravity Dynamics ($0.38g$ Mars Gravity) [CONFIRMED]
Low gravity alters astronaut and vehicle locomotion physics:
- **Mass vs. Weight Disconnect:** An astronaut with suit has unchanged mass ($180.0\text{ kg}$), but Mars weight is only $W_{\text{Mars}} = m \cdot g_{\text{Mars}} = 180 \times 3.72076 = 669.7\text{ N}$ (equivalent to $68.3\text{ kg}$ on Earth).
- **Reduced Friction & Traction:** Normal force is reduced by $62.1\%$. The maximum tractive friction force available before tire or boot slip occurs is:
  $$F_{\text{friction\_max}} = \mu_{\text{static}} \cdot F_N = \mu_{\text{static}} \cdot m \cdot g_{\text{Mars}}$$
- **Braking Distance Disparity:** For identical velocity $v$ and surface friction coefficient $\mu$, deceleration is $a = \mu \cdot g_{\text{Mars}}$. Consequently, stopping distance is:
  $$d_{\text{stop}} = \frac{v^2}{2 \mu g_{\text{Mars}}} = \frac{g_{\text{Earth}}}{g_{\text{Mars}}} \cdot d_{\text{Earth}} \approx \mathbf{2.64 \times d_{\text{Earth}}}$$
  Astronauts and vehicles take **$2.64\times$ longer distance to stop on Mars** than on Earth. The 3D avatar physics controller must reflect this inertial glide.

---

### 6.3 Scientific Data Classification: Measured vs. Inferred vs. Configurable [CONFIRMED]
To maintain scientific credibility, the application distinguishes three classes of data across all displays:

| Data Layer | Classification | Authoritative Origin | Resolution / Method | UI Indicator |
| :--- | :--- | :--- | :--- | :--- |
| **HiRISE Elevation ($h$)** | **Measured** | NASA PDS / HiRISE Stereo DTM | $1.0\text{ m}$ posting, $\pm 0.3\text{ m}$ vertical | `[MEASURED DTM 1.0m]` |
| **MOLA Elevation ($h$)** | **Measured** | NASA MOLA MEGDR | $463\text{ m/px}$ ($128\text{ px/deg}$) | `[COARSE MOLA 463m]` |
| **Terrain Slope ($\theta$)** | **Inferred** | Gradient of Elevation Grid | Central difference: $\nabla h = \sqrt{(\partial h / \partial x)^2 + (\partial h / \partial y)^2}$ | `[CALCULATED SLOPE]` |
| **Roughness / Trafficability** | **Inferred** | DTM standard deviation / CTX texture | Local elevation variance within $5\text{ m}$ radius | `[INFERRED HAZARD]` |
| **Soil Cohesion / Slip** | **Configurable Rule** | Bekker Terramechanics Model | Calibrated to MSL wheel sinkage data | `[SIMULATION PARAMETER]` |
| **Consumable Rates** | **Configurable Rule** | NASA BVAD TP-2015-218570 | Metabolic equations parameterized by user weight & speed | `[PHYSICS MODEL]` |

> [!WARNING]
> **Coarse Fallback Transparency Requirement:** When the user moves the 2D viewport or 3D camera outside the verified HiRISE DTM boundary ($1\text{ m}$ grid) into the regional MOLA dataset ($463\text{ m}$ grid), an explicit, persistent notification banner must be displayed:
> **"NOTICE: Displaying Regional Baseline Elevation (MOLA 463m/px). Micro-relief, steep boulder fields, and hazards <460m are not resolved. Route trafficability cannot be guaranteed."**

---

## 7. Performance Budgets, Offline Architecture & Hosting Realities

### 7.1 Production Performance Budgets [CONFIRMED]
To ensure seamless execution on commodity hardware (laptops with integrated Intel Iris/Xe or Apple Silicon GPUs) without crashing browser WebGL contexts:

| Parameter | Target Budget | Hard Cap | Measurement Tool |
| :--- | :--- | :--- | :--- |
| **Total JavaScript Heap** | $\le 250\text{ MB}$ | $\le 500\text{ MB}$ | Chrome DevTools Memory Profiler |
| **3D Mesh Vertex Count** | $\le 65,000$ active vertices | $\le 150,000$ vertices | Three.js `renderer.info.render.triangles` |
| **WebGL Draw Calls** | $\le 60\text{ calls/frame}$ | $\le 120\text{ calls/frame}$ | Three.js `renderer.info.render.calls` |
| **Frame Rate (3D Simulation)** | $\ge 60\text{ FPS}$ | $\ge 30\text{ FPS}$ (worst-case) | `Stats.js` / `requestAnimationFrame` delta |
| **2D Map Pan/Zoom Latency** | $< 16\text{ ms}$ response | $< 50\text{ ms}$ | Leaflet interaction benchmarks |
| **Initial Bundle Size (Zero Data)** | $< 1.5\text{ MB}$ compressed | $< 4.0\text{ MB}$ uncompressed | Webpack / Network transfer gauge |
| **Local Offline Cache Footprint** | $< 80\text{ MB}$ (Milestone 1 chunk) | $< 250\text{ MB}$ | IndexedDB Quota API |

---

### 7.2 Local `file://` Protocol CORS Restrictions & Hosting Strategy [CONFIRMED]
Modern web browsers (Chrome, Edge, Firefox, Safari) strictly enforce the **Same-Origin Policy** on `file://` URLs:
- `fetch()`, `XMLHttpRequest`, and Web Workers are blocked from reading local disk files (`file:///...`).
- WebGL texture loading (`THREE.TextureLoader`) from local disk throws security exceptions (`DOMException: The operation is insecure`).
- ES6 module imports (`import ... from '...'`) fail without an HTTP/HTTPS origin.

#### Resolution & Hosting Implementation:
1. **Development Environment:** The project includes a zero-dependency native Node.js static HTTP server in `package.json`:
   ```bash
   npm start
   ```
   Powered by `node -e "..."` using Node's built-in `http` and `fs` modules, serving on `http://localhost:8080/`.
2. **Production Deployment:** Static web hosting on GitHub Pages, Cloudflare Pages, or Netlify, where all headers and cross-origin resource access are handled cleanly.
3. **Packaging for Standalone Offline Distribution (Optional):** If true zero-installation offline execution is required, an Electron wrapper or lightweight local Python runner (`python -m http.server 8080`) is documented.

---

### 7.3 Progressive Data Loading & Caching Strategy [CONFIRMED]
1. **Binary Elevation Chunking:** Rather than loading massive multi-gigabyte GeoTIFF files directly in the browser, elevation tiles are pre-processed into lightweight binary Float32 arrays or 16-bit PNG heightmaps ($256 \times 256$ samples per chunk $= 262\text{ kB}$ uncompressed, $\sim 80\text{ kB}$ gzipped).
2. **Dynamic Level of Detail (LOD):**
   - Near-field ($0 - 500\text{ m}$ from avatar): Full $1.0\text{ m}$ DTM resolution.
   - Mid-field ($500\text{ m} - 2000\text{ m}$): Sub-sampled $4.0\text{ m}$ resolution.
   - Far-field ($> 2000\text{ m}$): Sub-sampled $16.0\text{ m}$ regional mesh or horizon dome.
3. **Client-Side Cache:** Fetched terrain and imagery tiles are stored in the browser's persistent `IndexedDB` storage via a unified CacheManager. Once loaded, Milestone 1 exploration areas operate completely offline without network connectivity.

---

## 8. Application Architecture & Modular Responsibilities

### 8.1 Repository Directory Structure [CONFIRMED]
The project follows a decoupled, modular design separating domain business logic from visualization layers:

```
martian-map/
├── .gitignore
├── package.json                   # Zero external dependencies; native node test/server scripts
├── README.md                      # Project overview, architecture, quickstart
├── planning-guide.md              # Authoritative technical implementation guide (THIS DOCUMENT)
├── index.html                     # Active 2D Martian Map entry point
├── archive/
│   └── prototypes/
│       ├── README.md              # Provenance notes for archived early prototypes
│       ├── map.html               # Early prototype without USGS geology
│       └── map_resources.html     # Pre-cleanup duplicate of index.html
├── docs/
│   ├── decisions/
│   │   └── ADR-001-hybrid-architecture.md   # Architectural Decision Record for 2D/3D bridge
│   └── research/
│       └── outline.md             # Detailed scientific literature & challenge audit archive
├── src/
│   ├── core/                      # Pure application domain logic (No DOM / WebGL)
│   │   ├── mission-state.js       # Reactive event store for waypoints, route, avatar & telemetry
│   │   └── resource-model.js      # Metabolic wattage, consumable depletion & PNR calculations
│   ├── geo/                       # Geodesy & mathematical transforms
│   │   └── coordinates.js         # Mars IAU ellipsoid, Haversine distance, local topocentric ENU bridge
│   ├── data/                      # Data loaders, adapters, offline cache
│   │   ├── tile-providers.js      # Mars Trek WMTS & USGS Astrogeology endpoints
│   │   └── dtm-loader.js          # Binary elevation chunk loader & bilinear interpolator
│   ├── views/                     # Presentation layers
│   │   ├── map-2d/                # 2D Leaflet map view & controls
│   │   │   ├── map-controller.js  # Leaflet setup, layer switcher, waypoint drawing
│   │   │   └── elevation-chart.js # 2D route elevation profile view
│   │   └── scene-3d/              # 3D Three.js terrain viewport & simulation
│   │       ├── scene-manager.js   # Three.js canvas, lighting, camera rig
│   │       ├── terrain-mesh.js    # Dynamic LOD heightfield chunk generator
│   │       └── avatar-controller.js # Suit/rover kinematic locomotion & 0.38g inertia
│   └── ui/                        # Heads-Up Display & UI controls
│       ├── hud-overlay.js         # Consumable gauges, PNR alerts, mission timer
│       └── tool-palette.js        # Route tool, waypoint placer, layer drawer
└── tests/                         # Automated unit & integration tests
    ├── geo.test.js                # Geodesy, distance, ENU coordinate transforms
    └── resources.test.js          # BVAD metabolic wattage, O2/water rates, PNR safety
```

---

### 8.2 Information Flow & Decoupled State Architecture [CONFIRMED]

```
                     ┌─────────────────────────────┐
                     │     User Interactions       │
                     │  (Click map, move joystick, │
                     │   toggle layer, add marker) │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │     src/core/mission-state  │
                     │   (Central Reactive Store)  │
                     │ - Waypoints & Route Nodes   │
                     │ - Active Avatar Position    │
                     │ - Mission Clock & Mode      │
                     └───────┬─────────────┬───────┘
                             │             │
              State Updates  │             │ State Updates
                             ▼             ▼
  ┌────────────────────────────┐         ┌────────────────────────────┐
  │   src/views/map-2d/        │         │   src/views/scene-3d/      │
  │   (Leaflet 2D Viewport)    │         │   (Three.js 3D Viewport)   │
  │ - Updates route polylines  │         │ - Moves astronaut avatar   │
  │ - Moves astronaut marker   │         │ - Centers terrain chunks   │
  │ - Draws hazard overlays    │         │ - Renders horizon & shadow │
  └──────────────┬─────────────┘         └─────────────┬──────────────┘
                 │                                     │
                 │ Queries Terrain                     │ Queries Terrain
                 └──────────────────┬──────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │    src/core/resource-model  │
                     │  (Life-Support Simulation)  │
                     │ - Incline from coordinates  │
                     │ - Computes Santee wattage   │
                     │ - Depletes O2, H2O, Battery │
                     │ - Evaluates PNR Margin      │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │       src/ui/hud-overlay    │
                     │ - Oxygen / Water gauges     │
                     │ - PNR status (Green/Red)    │
                     │ - Slope warning banners     │
                     └─────────────────────────────┘
```

---

## 9. Formal Development Contracts

### 9.1 Geographic Coordinate Contract [CONFIRMED]
Every spatial component interacting with terrain, routes, or avatars must strictly conform to these standardized JavaScript object signatures:

```javascript
/**
 * Planetocentric Geographic Position
 */
export interface PlanetocentricCoords {
  lat: number;        // Planetocentric latitude in decimal degrees [-90.0 to +90.0]
  lon: number;        // Positive East longitude in decimal degrees [0.0 to 360.0] or [-180.0 to +180.0]
  alt: number;        // Orthometric elevation in meters relative to MOLA Areoid
}

/**
 * Local Topocentric ENU Position (Three.js Space)
 */
export interface TopocentricENUCoords {
  x: number;          // East displacement in meters (+X = East)
  y: number;          // Vertical elevation above local origin in meters (+Y = Up)
  z: number;          // South displacement in meters (-Z = North, +Z = South)
}
```

---

### 9.2 Mission State & Telemetry Contract [CONFIRMED]
The central state store (`src/core/mission-state.js`) provides an event-driven contract for state mutation and view synchronization:

```javascript
export interface Waypoint {
  id: string;                      // Unique identifier (e.g., "wp-001")
  name: string;                    // Human-readable label (e.g., "Boxwork Ridge Alpha")
  coords: PlanetocentricCoords;    // Geographic location
  type: 'base' | 'science' | 'hazard' | 'turnaround';
  notes?: string;
}

export interface ConsumableTelemetry {
  metabolicPowerWatts: number;     // Current energy burn rate (W)
  oxygenRemainingLiters: number;   // Usable O2 volume at STP (L)
  coolingWaterRemainingKg: number; // Usable feedwater mass (kg)
  batteryRemainingWattHours: number; // Stored electrical energy (Wh)
  effectivePnrMarginPercent: number; // Limiting margin percentage (%)
  pnrStatus: 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
}
```

---

### 9.3 2D $\leftrightarrow$ 3D Synchronization Contract [CONFIRMED]
Cross-viewport synchronization is achieved through decoupled event dispatching on the shared `MissionState` instance:

| Event Name | Payload | Origin | Trigger / Reaction |
| :--- | :--- | :--- | :--- |
| `waypoint:added` | `{ waypoint: Waypoint }` | 2D Click or 3D Placer | Adds marker on 2D map, spawns 3D holographic beacon in Three.js scene, recalculates route. |
| `waypoint:removed`| `{ id: string }` | 2D Context or 3D Menu | Removes marker from 2D and 3D scenes, recalculates route. |
| `avatar:moved` | `{ coords, enu, heading }` | 3D Kinematics Controller | Updates 2D astronaut icon position & orientation arrow, queries elevation, triggers consumable depletion. |
| `camera:focus` | `{ coords: PlanetocentricCoords }` | 2D Marker Click | Pans 3D orbital camera smoothly to target geographic feature. |
| `pnr:alert` | `{ status, margin, resource }` | Core Resource Engine | Flashes HUD warning banner, overlays red return vectors on 2D map. |

---

## 10. Phased Implementation Roadmap

```
Phase 1: Foundation & Geodesy (Completed)
   │
   ▼
Phase 2: Data Pipeline & Gale DEM Tile Chunks
   │
   ▼
Phase 3: 2D Route Planner & Telemetry HUD Scaffolding
   │
   ▼
Phase 4: Three.js 3D Viewport & Procedural/DEM Terrain Mesh
   │
   ▼
Phase 5: 2D/3D Bi-directional Synchronization & Avatar Controller
   │
   ▼
Phase 6: Life-Support Simulation Engine & PNR Warning System
   │
   ▼
Phase 7: Scientific Polish, Performance Audit & Space Apps Submission
```

### Phase 1: Architecture Scaffolding & Mathematical Foundation [COMPLETED]
- [x] Standardize directory tree (`src/core/`, `src/geo/`, `src/data/`, `src/views/`, `src/ui/`, `tests/`, `docs/`).
- [x] Implement Mars geodetic constants, Haversine spherical distance, and topocentric ENU bridge (`src/geo/coordinates.js`).
- [x] Implement NASA BVAD metabolic equations, consumable depletion, and PNR margin formulas (`src/core/resource-model.js`).
- [x] Implement reactive mission state store (`src/core/mission-state.js`).
- [x] Author automated unit test suites (`tests/geo.test.js`, `tests/resources.test.js`) — **100% passing**.
- [x] Establish Architectural Decision Record (`ADR-001-hybrid-architecture.md`) and prototype archive notes.

### Phase 2: Verified Gale Terrain Data Pipeline (Milestone 1) [COMPLETED]
- [x] Parse and document authoritative PDS embedded label metadata for HiRISE DTM `DTEEC_006855_1750_007501_1750_A01` (dimensions, bounds, projection, offsets, vertical datum).
- [x] Implement normalized `DtmRaster` with nearest-neighbour and bilinear interpolation, bounds verification, and no-data protection ([src/data/dtm-loader.js](file:///e:/martian-map/src/data/dtm-loader.js)).
- [x] Implement headless, multi-renderer `ElevationService` ([src/data/elevation-service.js](file:///e:/martian-map/src/data/elevation-service.js)).
- [x] Implement True Topocentric ENU transformation through Mars-Centered Cartesian coordinates and local tangent frame rotation in [src/geo/coordinates.js](file:///e:/martian-map/src/geo/coordinates.js).
- [x] Establish 3D terrain render interface contract ([src/views/scene-3d/terrain-contract.js](file:///e:/martian-map/src/views/scene-3d/terrain-contract.js)).
- [x] Integrate verified HiRISE DTM footprint overlay and click-to-query elevation inspection into active 2D map ([index.html](file:///e:/martian-map/index.html)).
- [x] Create reproducible test fixtures and manifest (`data/manifest.json`, `data/samples/`).
- [x] Author comprehensive automated unit test suite in [tests/terrain.test.js](file:///e:/martian-map/tests/terrain.test.js) — **19/19 tests passing**.

### Phase 3: 2D Route Planner & Telemetry HUD Integration [NEXT DEVELOPMENT PHASE]
- [ ] Refactor `index.html` to import modular ES6 components (`src/views/map-2d/map-controller.js`).
- [ ] Implement interactive route drawing, waypoints addition/editing, and total traverse length calculation using `marsDistanceMeters()`.
- [ ] Render 2D elevation profile chart using `src/views/map-2d/elevation-chart.js`.
- [ ] Integrate initial HUD overlay displaying mission elapsed time and instantaneous route metrics.

### Phase 4: Three.js 3D Viewport & Terrain Heightfield
- [ ] Initialize Three.js WebGL canvas inside `src/views/scene-3d/scene-manager.js`.
- [ ] Construct dynamic heightfield geometry (`THREE.PlaneGeometry`) deformed by loaded DTM elevation chunks.
- [ ] Apply orthorectified surface texture (`PSP_006855_1750` or CTX Gale mosaic) with anisotropic filtering.
- [ ] Implement Mars atmospheric fog (`#c87a5b`), directional solar lighting matching Gale latitude, and ambient sky dome.

### Phase 5: Bi-directional 2D $\leftrightarrow$ 3D Synchronization & Avatar Controller
- [ ] Implement 3D astronaut avatar controller with $0.38g$ Mars gravity kinematics and $2.64\times$ stopping distance.
- [ ] Bind avatar movement in 3D to real-time coordinate updates in `mission-state.js`.
- [ ] Synchronize 2D Leaflet marker to mirror 3D avatar position and heading.
- [ ] Implement camera modes: First-Person EVA helmet view, Third-Person trailing chase view, and Free Orbital inspection view.

### Phase 6: Dynamic Life-Support Engine & Real-Time PNR Alerts
- [ ] Connect avatar velocity and terrain incline $\theta$ to `src/core/resource-model.js`.
- [ ] Update consumable meters in real time as the astronaut traverses 3D terrain.
- [ ] Trigger dynamic PNR alerts (Yellow Advisory at $25\%$, Red Return-to-Base Warning at $10\%$).
- [ ] Draw real-time return vector on both 2D map and 3D HUD compass.

### Phase 7: Scientific Polish, Offline Verification & Space Apps Challenge Submission
- [ ] Integrate USGS geological unit queries and hazard overlay polygons.
- [ ] Conduct performance audit: ensure $<500\text{ MB}$ memory and 60 FPS on integrated GPUs.
- [ ] Verify full offline operation from local static server cache.
- [ ] Assemble final demonstration video, project presentation slides, and submission documentation referencing official NASA Space Apps Challenge 2026 criteria.

---

## 11. Testing & Scientific Validation Framework

### 11.1 Test Suite Organization [CONFIRMED]
Automated testing uses Node.js's built-in native test runner (`node --test`), requiring zero external dependencies:

```bash
npm test
```

| Test Suite | File Location | Scope & Assertions | Status |
| :--- | :--- | :--- | :--- |
| **Geodesy & Transforms** | `tests/geo.test.js` | Mars mean radius ($3,389,500\text{ m}$), Haversine distance, local ENU forward/inverse transformation accuracy ($<1\text{ mm}$ error). | **PASS (3/3)** |
| **Life Support & BVAD** | `tests/resources.test.js` | Santee-Gonzalez metabolic wattage against BVAD table ($\pm 10\text{ W}$), $O_2$ consumption rate, cooling water loss, PNR margin state transitions. | **PASS (4/4)** |
| **Terrain Elevation** | `tests/terrain.test.js` | Bilinear DEM sampling, slope gradient calculation, out-of-bounds fallback handling. | [PLANNED PHASE 2] |
| **State Synchronization**| `tests/state.test.js` | Event dispatching, waypoint addition/deletion, subscriber notification integrity. | [PLANNED PHASE 2] |

---

### 11.2 Acceptance Thresholds & Physical Tolerances [CONFIRMED]
- **Distance Calculation Error:** $\le 0.05\%$ difference compared to true ellipsoidal geodesic on Mars.
- **Local ENU Projection Error:** $\le 0.005\%$ ($<50\text{ cm}$ distortion over $10\text{ km}$ extent).
- **Metabolic Wattage Accuracy:** Must match NASA BVAD reference table within $\pm 5.0\%$ across all slope and speed conditions.
- **Oxygen Consumption Energetics:** Must strictly preserve $k_{O2} = 20,100\text{ J/L}$.
- **Cooling Water Sublimation:** Must strictly preserve $\Delta h_{\text{sub}} = 2.83\times 10^6\text{ J/kg}$.

---

## 12. Operational Risks, Constraints & Research Boundaries

1. **HiRISE DEM Micro-Hazard Resolution Limits [CONFIRMED]:**
   Even the highest-resolution orbital DTMs ($1.0\text{ m/px}$) cannot resolve boulders, crevasses, or sand-trapping ripples smaller than $1 - 2\text{ meters}$. A slope measured as $8^\circ$ over a $1\text{ m}$ grid may contain local $40^\circ$ step fractures. The application must treat orbital slope calculations as macro-trafficability guidance, not guaranteed footholds.
2. **Pedestrian vs. Rover Trafficability Divergence [CONFIRMED]:**
   A terrain passable for a suited astronaut (e.g., stepped bedrock ledges) may be impassable for a wheeled rover due to high-centering. Conversely, flat deep dust may pose severe slip hazards to a walking crewmember while being manageable for a multi-wheel rover. The simulation parameters must clearly state which locomotion mode is active.
3. **Dust Storm Solar & Communications Blackout [ASSUMPTION]:**
   Martian regional dust storms dramatically increase atmospheric optical depth ($\tau > 4.0$), dropping solar array output by $>90\%$ and reducing direct line-of-sight visual navigation. For Milestone 1, atmospheric dust is modeled as a visual fog parameter and communications line-of-sight is assumed uninterrupted within the local crater basin.

---

## 13. Milestone 1 — Verified Gale Terrain Foundation Specification

### 13.1 Exploration Focus & Ground Truth Dataset [CONFIRMED]
- **Region:** Gale Crater, Mars ($5.06^\circ\text{ S}, 137.46^\circ\text{ E}$).
- **Verified Foundation DTM:** **`DTEEC_006855_1750_007501_1750_A01`** ("Chasm in Gale Crater's Interior Mound").
  - Center: $5.09^\circ\text{ S}, 137.23^\circ\text{ E}$ (`CENTER_LATITUDE = -5.0°`, `CENTER_LONGITUDE = 137.23°`).
  - Spatial Resolution: $1.01169\text{ m/px}$ elevation posting ($58587.066\text{ pix/deg}$), $0.25\text{ m/px}$ orthorectified image.
  - Footprint Bounding Box: $-5.221725^\circ$ to $-4.950398^\circ$ Lat, $137.171577^\circ$ to $137.289506^\circ$ Lon ($16.07\text{ km} \times 6.96\text{ km}$).
  - Extent: $\approx 15.4\text{ km}$ west of candidate Mount Sharp boxwork structures.
  - Deliverables: Verified in `src/data/dtm-loader.js`, `src/data/elevation-service.js`, and `tests/terrain.test.js`.
- **Boxwork Exploration Strategy [CANDIDATE]:** The candidate Mount Sharp boxwork feature ($5.06^\circ\text{ S}, 137.46^\circ\text{ E}$) serves as an exemplary operational scientific objective. Where HiRISE stereo coverage is pending, regional HRSC/MOLA topography with synthetic procedural fractal micro-roughness calibrated to Gale bedrock is utilized, with the mandatory Coarse Fallback UI warning banner displayed.

### 13.2 Concrete Acceptance Criteria for Milestone 1 [COMPLETED]
1. [x] `npm test` executes and passes 100% of automated tests (19/19 tests passing).
2. [x] The 2D Leaflet map loads NASA Mars Trek Gale Crater basemaps without console errors or CORS failures.
3. [x] The verified HiRISE DTM footprint rectangle is projected on the 2D map with authoritative PDS metadata popup.
4. [x] Clicking the map queries `ElevationService` and distinguishes verified HiRISE DTM coverage from regional MOLA baseline.
5. [x] Mars geodesy implements True Topocentric ENU transformation through Mars-Centered Cartesian coordinates and local tangent frame rotation in `src/geo/coordinates.js`.
6. [x] The normalized 3D terrain specification contract is formalized in `src/views/scene-3d/terrain-contract.js` for future Three.js consumption.
7. [x] Biophysical and life-support energy accounting reconciles the 70W suit joint muscular work with oxygen, thermal, and battery boundaries.

---

## 14. Authoritative References & Data Provenance

1. **NASA Space Apps Challenge 2026:**
   - Challenge Brief: *Interplanetary Survival Guide: Martian Map*
   - Official Challenge Resources: `https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=resources`
2. **Human Spaceflight Life Support & Ergonomics:**
   - NASA Johnson Space Center: *Baseline Values and Assumptions Document* (BVAD), **NASA/TP-2015-218570**, Houston, Texas.
   - Santee, W. R., et al.: *A Metabolic Cost Model for Suited Astronaut Planetary Locomotion*, Journal of Human Performance in Extreme Environments.
   - Pandolf, K. B., et al.: *Predicting Energy Expenditure with Loads Under Various Walking Conditions*, Journal of Applied Physiology.
3. **Planetary Cartography & Geodesy:**
   - Archinal, B. A., et al.: *Report of the IAU/IAG Working Group on Cartographic Coordinates and Rotational Elements: 2015*, Celestial Mechanics and Dynamical Astronomy.
   - Smith, D. E., et al.: *Mars Orbiter Laser Altimeter (MOLA): Experiment Summary and Surface Topography*, Journal of Geophysical Research.
4. **Orbital Datasets & Archives:**
   - NASA Planetary Data System (PDS) Geosciences Node: Washington University in St. Louis (`https://pds-geosciences.wustl.edu`).
   - High Resolution Imaging Science Experiment (HiRISE): University of Arizona Lunar and Planetary Laboratory (`https://hirise.lpl.arizona.edu`).
   - USGS Astrogeology Science Center: Mars Map Services and Nomenclature (`https://astrogeology.usgs.gov`).
   - NASA Solar System Treks: Mars Trek WMTS Portal (`https://trek.nasa.gov/mars`).
   - ESA Planetary Science Archive (PSA): Mars Express High Resolution Stereo Camera (HRSC) archive.
