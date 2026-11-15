# ADR 001: Hybrid 2D Map & 3D Simulation Architecture

**Status:** Accepted  
**Date:** November 2026  
**Context:** NASA Space Apps Challenge 2026 — Interplanetary Survival Guide: Martian Map  
**Project:** `martian-map`  

## Context & Problem Statement
Astronauts planning and executing a Marswalk require both a macroscopic strategic geographic overview (traverses, multi-layer orbital rasters, regional geological units) and a ground-level tactical perspective (1.8 m eye height, slope obstacles, boulder shadows, landmark line-of-sight). A 2D-only map is blind to microtopography; an isolated 3D demo loses connection to regional planetary data.

## Decision
We adopt a **Decoupled Hybrid Architecture** sharing a single underlying mission data and state model:
1. **2D Strategic Viewport:** Retain and extend **Leaflet 1.9.4** using `L.CRS.EPSG4326` for planetary equirectangular tile rendering (NASA Mars Trek and USGS Astrogeology services).
2. **3D Tactical Surface Viewport:** Adopt **Three.js (Vanilla ES6)** for human-scale surface visualization. Terrain geometry is displaced vertically via heightfields.
3. **Topocentric Coordinate Bridge:** Transform Mars planetocentric coordinates $(\phi, \lambda, h)$ into a local East-North-Up (ENU) metric tangent plane centered at the base camp, preventing 32-bit floating-point GPU vertex jitter.
4. **Shared Reactive Mission Store:** Maintain a single state manager (`MissionStore`) that synchronizes waypoints, active traverse polyline, astronaut position, and life-support telemetry between 2D and 3D views.

## Consequences & Trade-Offs
- **Pros:**
  - Preserves the existing, working Leaflet codebase and live NASA tile integrations.
  - Keeps runtime bundle lightweight (~600 KB for Three.js vs. ~30 MB for CesiumJS).
  - Enables 60 FPS responsive character collision physics and custom GLSL atmospheric dust shaders.
  - Zero mandatory backend server requirements; runs entirely in standard web browsers.
- **Cons / Limitations:**
  - Three.js does not natively understand planetary spheroids; the application must maintain and validate the local topocentric ENU coordinate bridge.
  - Local exploration cell is constrained to a local metric tangent area ($\le 10\text{ km} \times 10\text{ km}$) to maintain planar approximation validity ($<0.01\%$ distortion).
