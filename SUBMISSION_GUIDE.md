# NASA Space Apps Challenge 2026 Submission Document
## Challenge: Interplanetary Survival Guide: Martian Map
### Project Title: ARES-EVA (Autonomous Route & Environmental Safety for Extravehicular Activity)

---

### 1. High-Level Project Summary
**What does our project do?**
ARES-EVA is a next-generation Martian tactical navigation and surface survival system designed for human explorers embarking on extravehicular activities (Marswalks). While existing portals like JPL Mars Trek provide regional views, ARES-EVA operates at the human scale (10m to 5km). It fuses optical (HiRISE/CTX), topographic (MOLA/HRSC), spectral (CRISM), environmental (REMS/MEDA), and radiation dosimetry (RAD) data into an interactive route planner and heads-up display (HUD). ARES-EVA allows astronauts and habitat planners to design science traverses, calculate oxygen burn rates and Point-of-No-Return (PNR) thresholds, detect treacherous slope obstacles, and preview authentic NASA point-of-view raw rover imagery before stepping foot onto the Martian regolith.

---

### 2. Detailed Project Description
When astronauts set foot on Mars, every footstep will be constrained by spacesuit mobility, metabolic oxygen budgets, and extreme surface hazards. Current global maps are inadequate for planning safe foot traverses through boulder fields, sand ripple traps, and steep escarpments.

**ARES-EVA addresses this challenge through three core innovations:**

1. **Hyperlocalized Multispectral Layer Fusion:**
   - **Optical Base (HiRISE/CTX)**: High-resolution imagery of bedrock fractures, ripples, and craters.
   - **Topography & Elevation Profiles (MOLA/HRSC)**: Contour lines and real-time cross-sectional elevation graphs that quantify the physical climb and descent of an expedition.
   - **Slope Hazard Heatmap**: Classifies surface gradients into safe (<8°), caution (8–15°), and critical (>18° tip-over risk).
   - **Mineralogy & Astrobiology (CRISM)**: Maps high-priority scientific targets including boxwork vein minerals (calcium sulfate/silica), clays, and lake carbonates.
   - **Space Weather & Radiation (MSL RAD)**: Real-time dosimetry indicating unshielded ridges versus natural radiation alcoves/shelters.

2. **Astronaut Safety & Point of No Return (PNR):**
   - Implements a dynamic metabolic rate equation based on traverse incline and walking speed.
   - Computes a strict **Point of No Return (PNR)** threshold, ensuring the crew turns back before depleting return life support reserves.
   - Includes a one-click **Emergency Abort Vector Generator** that instantly routes the astronaut along the safest, lowest-slope descent corridor back to the pressurized rover airlock.

3. **Dual Form-Factor Experience:**
   - **Habitat / Rover Planning Console**: Full GIS capability with draggable waypoints, customizable layers, and JSON mission plan exports.
   - **Astronaut Visor HUD**: An augmented-reality helmet simulation featuring an artificial horizon, 360° compass tape, live target bearing, vital telemetry (heart rate, suit pressure, O2 level), and synthetic audio alerts.

---

### 3. Space Agency Data & Tools Used
- **NASA Jet Propulsion Laboratory (JPL) Mars Trek**: Topographic datasets, crater catalogs, and high-resolution landing site coordinates.
- **NASA Planetary Data System (PDS) & MRO HiRISE**: Sub-meter resolution surface visual imagery.
- **USGS-NASA Planetary Geologic Mapping Program**: Geologic stratigraphy and mineral unit classifications.
- **MSL Curiosity Science Archive (2025-2026 Extended Mission)**:
  - Mastcam and ChemCam raw images of Mount Sharp boxwork structures and Gediz Vallis debris apron.
  - RAD (Radiation Assessment Detector) cosmic ray dose rates.
  - REMS (Rover Environmental Monitoring Station) diurnal pressure and temperature curves.
- **Mars 2020 Perseverance Science Archive**:
  - Mastcam-Z and SuperCam imagery of Jezero Crater delta and Kodiak Butte remnant.
  - MEDA atmospheric data and RIMFAX ground-penetrating radar references.

---

### 4. Target Science Campaigns Featured
- **Campaign 1: Mount Sharp Boxwork Network (Gale Crater)**
  Focuses on Curiosity's breakthrough discovery of 3D mineral boxwork ridges formed by ancient subterranean groundwater networks. Astronauts sample polyhydrated sulfates and drill silica veins to evaluate past habitability.
- **Campaign 2: Jezero Crater Neretva Vallis Delta**
  Focuses on the ancient river delta where fine mudstones (Wildcat Ridge) and marginal carbonates preserve biosignature candidates.

---

### 5. How to Run & Experience the App
- No installations required. Open `index.html` in any browser.
- Switch between Habitat Console and Visor HUD.
- Click on any waypoint to inspect the scientific protocol and NASA raw photograph.
- Click on the map to add custom exploration targets and watch the elevation profile and oxygen budget recalculate in real time.
