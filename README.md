# 🪐 ARES-EVA: Interplanetary Survival Guide — Martian Map
### 2026 NASA Space Apps Challenge — Intermediate Software & Human Exploration Project

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA_Space_Apps-2026-blue.svg)](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Mission Target: Mars](https://img.shields.io/badge/Target-Gale_Crater_%26_Jezero_Crater-red.svg)]()

> **"Far from home, the first astronauts to set foot on Mars will want the best map possible, with details of their routes and destinations, updates on current conditions, and the data needed to complete their mission quickly and safely."**

---

## 🚀 Live Demo & Quick Start

**ARES-EVA** runs directly in any modern web browser without server installations or external dependencies:

1. Double-click or open **[`index.html`](index.html)** in Google Chrome, Microsoft Edge, Firefox, or Safari.
2. Switch between **🖥️ Habitat Console** (for mission route planning, GIS layering, and consumables budgeting) and **🪖 Visor HUD** (for astronaut 1st-person heads-up navigation).
3. Click anywhere on the map to place opportunistic science waypoints or test the **🚨 ENGAGE EMERGENCY ABORT ROUTE** system.

---

## 🎯 Addressing the Challenge Requirements

| NASA Space Apps Challenge Requirement | How ARES-EVA Solves It |
| :--- | :--- |
| **Layered Multi-Mission NASA Data (At least 3 types)** | Integrates **8 interactive layers**: Optical (HiRISE/CTX), Topographic Contours (MOLA/HRSC), Slope Hazard Heatmap, CRISM Hyperspectral Mineralogy (sulfates, smectites, boxworks), MSL RAD Space Weather (cosmic rays), Obstacle Buffers, MGRS Grid, and Planned Route. |
| **Hyperlocalized Marswalk Scale** | Focuses down to the tactical 10 m – 5 km human exploration scale, rather than global or regional maps. |
| **Astronaut Safety First** | Real-time **Slope Hazard Analysis** (suit tip-over warning at >18°), **Point of No Return (PNR)** calculation, and **One-Click Emergency Abort Vector** to Pressurized Rover/Habitat. |
| **Scientific Goals & Breakthrough Objectives** | Features the **Mount Sharp Boxwork Formations** (discovered by Curiosity in 2025/2026) and **Jezero Crater Neretva Vallis Delta** (Perseverance), including in-situ sampling protocols (APXS, Raman, PIXL). |
| **Point-of-View (POV) Raw Imagery** | Integrates authentic high-resolution NASA raw imagery from Mastcam, Hazcam, and ChemCam so astronauts know exactly what formations look like from suit level. |
| **Multiple Form Factors** | Includes both a **Habitat / Pressurized Rover Tactical Workstation** and an **Astronaut Visor Heads-Up Display (HUD)** with artificial horizon, 360° compass tape, and suit biometrics. |

---

## 🔬 Multi-Mission NASA Datasets Integrated

1. **Topography & Elevation**:
   - NASA Mars Global Surveyor (MGS) **MOLA** (Mars Orbiter Laser Altimeter)
   - ESA Mars Express **HRSC** (High Resolution Stereo Camera) Digital Elevation Models
2. **Visual & Optical Basemaps**:
   - NASA Mars Reconnaissance Orbiter (MRO) **HiRISE** (High Resolution Imaging Science Experiment, 25 cm/pixel)
   - MRO **CTX** (Context Camera) mosaics
3. **Hyperspectral Mineralogy**:
   - MRO **CRISM** (Compact Reconnaissance Imaging Spectrometer for Mars) mapping phyllosilicates (clays), polyhydrated sulfates (gypsum, kieserite), and crystalline boxwork veins.
4. **Surface In-Situ Weather & Space Weather Radiation**:
   - MSL Curiosity **RAD** (Radiation Assessment Detector) measuring galactic cosmic rays (GCR) and solar energetic particles (SEP).
   - MSL **REMS** (Rover Environmental Monitoring Station) & Mars 2020 **MEDA** (Mars Environmental Dynamics Analyzer) diurnal surface pressure, ambient temperature, and dust optical depth ($\tau$).
5. **Ground Truth Imagery**:
   - Curiosity **Mastcam** & **ChemCam** raw images of Mount Sharp boxworks and Gediz Vallis debris flow.
   - Perseverance **Mastcam-Z** & **SuperCam** raw images of Kodiak Butte and Wildcat Ridge mudstone.

---

## 🪖 Astronaut Safety & Life Support Systems

### 1. Metabolic & Oxygen Consumption Model
Astronaut oxygen burn rates depend dynamically on traverse slope and physical activity:
$$\text{Burn Rate} = \text{Base Rate} (160\,\text{W}) + \text{Incline Factor} \times \tan(\theta) \times 12\,\text{L/min}$$
The system alerts the crew if the planned traverse exceeds the **A7L-Mars** suit oxygen budget (1,200 L primary + emergency return reserve).

### 2. Point of No Return (PNR) Threshold
A dedicated countdown tracks the exact minute ($T+\text{mm}$) when the astronaut must turn back to avoid depleting the mandatory 25% return oxygen reserve and sublimator cooling water.

### 3. One-Click Emergency Abort Route
In the event of an incoming solar particle event (SPE) or suit pressure anomaly, the abort button immediately calculates the lowest-gradient valley descent directly back to the pressurized rover airlock.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Engine**: HTML5 Canvas, Vanilla JavaScript (ES6+), Web Audio API (synthesizer for authentic HUD chirps, geiger clicks, and hazard warnings).
- **Styling**: Tailwind CSS, responsive glassmorphism UI, Dark Mode tactical NASA/Ares color palette.
- **Portability**: Completely self-contained; zero build tools required (`npm`, `webpack` not needed) for maximum reliability in field conditions.
- **Export Formats**: Standardized JSON EVA Mission Plan ready for downlink to Earth Mission Control.

---

## 👥 Hackathon Team Presentation Tips

- **Slide 1**: The Problem — Why global maps like Google Mars or JPL Mars Trek aren't enough for a suited astronaut walking on the surface.
- **Slide 2**: The Solution — ARES-EVA hyperlocalized navigation and multi-mission layer fusion.
- **Slide 3**: The Science — Focusing on the 2025/2026 Curiosity Mount Sharp boxwork discovery.
- **Slide 4**: The Safety — Slope hazard detection, PNR threshold, and emergency abort vector.
- **Slide 5**: The Experience — Live demo of the Visor HUD and interactive terrain profile.
