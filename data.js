// ARES-EVA Martian Datasets & Mission Presets
// Derived from NASA JPL Mars Trek, MSL Curiosity, Mars 2020 Perseverance, MRO HiRISE/CRISM, and USGS Astrogeology.

window.MARS_DATA = {
    missions: {
        "mount-sharp-boxwork": {
            id: "mount-sharp-boxwork",
            title: "Mount Sharp Boxwork Network (Gale Crater)",
            subtitle: "Curiosity Rover Extended Mission 2025-2026 Campaign",
            coordinates: { lat: "-4.728° S", lon: "137.382° E", elevation: "-4,120 m to -3,860 m" },
            targetFeature: "Mineralized Fracture Boxworks & Gediz Vallis Ridge",
            scienceFocus: "Aqueous geochemistry, habitability biosignatures in sulfate fractures, and post-depositional groundwater events.",
            overview: "Boxworks are complex 3D ridges formed when groundwater circulated through bedrock fractures, precipitating durable minerals (calcium sulfate/silica) before erosion stripped the softer surrounding matrix. Curiosity's 2025 campaign provided the first ground-truth imagery of Mars boxwork systems.",
            baseScaleMeters: 4500, // 4.5km across area
            elevationRange: { min: -4150, max: -3850, base: -4020 },
            telemetry: {
                airTemp: "-58°C",
                groundTemp: "-16°C",
                pressure: "7.42 hPa",
                windSpeed: "4.8 m/s ENE",
                dustTau: "0.48",
                radiation: "0.68 mSv/day",
                uvIndex: "11.2 (Extreme)",
                solarFlux: "542 W/m²"
            },
            waypoints: [
                {
                    id: "WP-01",
                    name: "Pressurized Rover Habitac-1 (Base)",
                    type: "base",
                    x: 180,
                    y: 420,
                    elev: -4110,
                    desc: "Expedition mobile habitat and recharge airlock. Primary life-support depot.",
                    scienceAction: "EVA Pre-breathe & Suit Diagnostic (Suit Pressure: 4.3 psi 100% O2)",
                    hazardLevel: "Low",
                    minTimeMin: 15,
                    o2Rate: 0.9, // L/min
                    image: "https://images-assets.nasa.gov/image/PIA16834/PIA16834~orig.jpg",
                    imageCaption: "MSL Curiosity rover landing site and lower Mount Sharp context."
                },
                {
                    id: "WP-02",
                    name: "Gediz Vallis Debris Flow Apron",
                    type: "transit",
                    x: 290,
                    y: 350,
                    elev: -4065,
                    desc: "Boulder-strewn ridge created by violent ancient mudflows carrying rocks from high on Mount Sharp.",
                    scienceAction: "Multispectral survey of dark exotic boulders and percussion drill candidate triage.",
                    hazardLevel: "Moderate (Loose Talus / 14° Slope)",
                    minTimeMin: 25,
                    o2Rate: 1.6,
                    image: "https://images-assets.nasa.gov/image/PIA26365/PIA26365~orig.jpg",
                    imageCaption: "Curiosity Navcam/Mastcam panorama of Gediz Vallis boulder fields."
                },
                {
                    id: "WP-03",
                    name: "Alpha Boxwork Ridge System",
                    type: "science",
                    x: 440,
                    y: 280,
                    elev: -3995,
                    desc: "Prominent 1-2 meter high crystalline web-like ridges. Hardened cementations resistant to eolian deflation.",
                    scienceAction: "APXS / ChemCam Raman spectroscopy of ridge veins; core drill sample MSL-BX-01 for organic preservation.",
                    hazardLevel: "High (Sharp crystalline edges, tripping hazard, 18° ascent)",
                    minTimeMin: 40,
                    o2Rate: 2.2,
                    image: "https://images-assets.nasa.gov/image/PIA26366/PIA26366~orig.jpg",
                    imageCaption: "High-resolution Mastcam mosaic of boxwork polygonal veins."
                },
                {
                    id: "WP-04",
                    name: "Sulfate-Bearing Valley Overlook",
                    type: "science",
                    x: 610,
                    y: 210,
                    elev: -3920,
                    desc: "Stratigraphic contact between clay-rich sediments and polyhydrated magnesium sulfates.",
                    scienceAction: "LiDAR structural mapping of rhythmic laminae; gas chromatography sample sealed in sample return cache.",
                    hazardLevel: "Moderate (Variable escarpment drop-off)",
                    minTimeMin: 30,
                    o2Rate: 1.7,
                    image: "https://images-assets.nasa.gov/image/PIA25428/PIA25428~orig.jpg",
                    imageCaption: "Curiosity ChemCam view of sulfate-bearing layered deposits on Mount Sharp."
                },
                {
                    id: "WP-05",
                    name: "Lava Tube / Subsurface Overhang Shelter",
                    type: "shelter",
                    x: 740,
                    y: 160,
                    elev: -3890,
                    desc: "Deep bedrock alcove providing ~75% GCR/SPE cosmic radiation shielding and dust storm shelter.",
                    scienceAction: "Thermal neutron sensing (DAN) for subsurface hydrogen/water equivalent; deploy passive radiation beacon.",
                    hazardLevel: "Low",
                    minTimeMin: 20,
                    o2Rate: 1.1,
                    image: "https://images-assets.nasa.gov/image/PIA19912/PIA19912~orig.jpg",
                    imageCaption: "Overhanging sandstone ledge with thermal inertia anomalies."
                }
            ],
            hazards: [
                { id: "HZ-01", type: "steep-slope", x: 380, y: 310, radius: 45, label: "Talus Escarpment (>22° Slope - No Rover Access)", severity: "critical" },
                { id: "HZ-02", type: "radiation-hotspot", x: 520, y: 150, radius: 60, label: "Exposed Ridge (Solar Proton Flux Unshielded)", severity: "warning" },
                { id: "HZ-03", type: "sand-trap", x: 230, y: 460, radius: 40, label: "Active Sand Ripple Field (Sinkage Depth: 18cm)", severity: "caution" },
                { id: "HZ-04", type: "rock-yard", x: 670, y: 270, radius: 55, label: "Jagged Basalt Block Field (Suit Puncture Risk)", severity: "warning" }
            ],
            geologicalUnits: [
                { name: "Fracture Boxwork Cementation", color: "#f59e0b", signature: "CaSO4 (Gypsum/Bassinite) + Opaline Silica", habitability: "Highest (Aqueous Vents)" },
                { name: "Layered Sulfate Bedrock", color: "#ec4899", signature: "Polyhydrated Mg-Sulfates (Epsomite/Kieserite)", habitability: "Moderate" },
                { name: "Gediz Vallis Debris Unit", color: "#3b82f6", signature: "Polymictic Basaltic Gravel & Smectite Clay", habitability: "Moderate" },
                { name: "Eolian Basaltic Sand Sheets", color: "#6b7280", signature: "Pyroxene + Plagioclase + Olivine", habitability: "Low" }
            ]
        },
        "jezero-crater-delta": {
            id: "jezero-crater-delta",
            title: "Jezero Crater Neretva Vallis Delta",
            subtitle: "Mars 2020 Perseverance Campaign",
            coordinates: { lat: "18.38° N", lon: "77.58° E", elevation: "-2,530 m to -2,380 m" },
            targetFeature: "Ancient Lacustrine Delta & Carbonate Margin Unit",
            scienceFocus: "Fossilized microbial life, biosignatures in carbonate concretions, deltaic bottomsets, and flood boulder hydrodynamics.",
            overview: "Jezero Crater once hosted an open-basin lake fed by Neretva Vallis river channel. The river delta preserves fine mudstones, clay minerals, and shoreline carbonates ideal for preserving organic carbon and microscopic structures.",
            baseScaleMeters: 5200,
            elevationRange: { min: -2550, max: -2350, base: -2480 },
            telemetry: {
                airTemp: "-62°C",
                groundTemp: "-21°C",
                pressure: "7.15 hPa",
                windSpeed: "6.2 m/s NNW",
                dustTau: "0.41",
                radiation: "0.64 mSv/day",
                uvIndex: "10.8 (Extreme)",
                solarFlux: "530 W/m²"
            },
            waypoints: [
                {
                    id: "JP-01",
                    name: "Octavia E. Butler Landing Site (Base)",
                    type: "base",
                    x: 160,
                    y: 430,
                    elev: -2520,
                    desc: "Safe flat plains floor of Jezero. Primary surface communications array.",
                    scienceAction: "Pre-EVA Navigation Alignment & SHERLOC Calibration Target verification.",
                    hazardLevel: "Low",
                    minTimeMin: 15,
                    o2Rate: 0.9,
                    image: "https://images-assets.nasa.gov/image/PIA24424/PIA24424~orig.jpg",
                    imageCaption: "First color 360-degree panorama from Perseverance Mastcam-Z at landing site."
                },
                {
                    id: "JP-02",
                    name: "Kodiak Mesa Delta Remnant",
                    type: "science",
                    x: 320,
                    y: 330,
                    elev: -2470,
                    desc: "Isolated butte showcasing textbook delta bottomsets, foresets, and topset beds.",
                    scienceAction: "High-magnification telephoto stratigraphy to calculate ancient river discharge rates.",
                    hazardLevel: "Moderate (Cliffs)",
                    minTimeMin: 35,
                    o2Rate: 1.8,
                    image: "https://images-assets.nasa.gov/image/PIA24836/PIA24836~orig.jpg",
                    imageCaption: "Perseverance Mastcam-Z view of Kodiak Butte's layered sedimentary facies."
                },
                {
                    id: "JP-03",
                    name: "Wildcat Ridge Siltstone Layer",
                    type: "science",
                    x: 480,
                    y: 260,
                    elev: -2430,
                    desc: "Fine-grained mudstone formed in calm water where aromatic hydrocarbons and sulfate minerals co-exist.",
                    scienceAction: "PIXL X-ray fluorescence mapping; core sample extraction for Earth Mars Sample Return.",
                    hazardLevel: "Moderate",
                    minTimeMin: 45,
                    o2Rate: 2.1,
                    image: "https://images-assets.nasa.gov/image/PIA25328/PIA25328~orig.jpg",
                    imageCaption: "Abraded patch at Wildcat Ridge revealing ring of organic-associated sulfate grains."
                },
                {
                    id: "JP-04",
                    name: "Crater Rim Carbonate Margin",
                    type: "science",
                    x: 690,
                    y: 190,
                    elev: -2375,
                    desc: "Magnesite and stromatolite-analog carbonate rocks precipitated along the ancient paleolake shoreline.",
                    scienceAction: "Deep UV Raman spectroscopy looking for bio-essential amino or carboxylic acid signatures.",
                    hazardLevel: "High (Boulder field & slope 19°)",
                    minTimeMin: 40,
                    o2Rate: 2.3,
                    image: "https://images-assets.nasa.gov/image/PIA25018/PIA25018~orig.jpg",
                    imageCaption: "Perseverance SuperCam mosaic of fractured ancient bedrock on delta front."
                },
                {
                    id: "JP-05",
                    name: "Neretva Inlet Trench (Natural Trench)",
                    type: "shelter",
                    x: 820,
                    y: 140,
                    elev: -2410,
                    desc: "Canyon walls provide wind and radiation attenuation. Designated Emergency EVA Fallback.",
                    scienceAction: "Subsurface GPR sounding (RIMFAX) for permafrost ice lenses.",
                    hazardLevel: "Low",
                    minTimeMin: 20,
                    o2Rate: 1.2,
                    image: "https://images-assets.nasa.gov/image/PIA24543/PIA24543~orig.jpg",
                    imageCaption: "Perseverance Navcam view inside shallow alluvial canyon inlet."
                }
            ],
            hazards: [
                { id: "JH-01", type: "steep-slope", x: 420, y: 310, radius: 50, label: "Delta Front Scarp (>24° Unconsolidated Silt)", severity: "critical" },
                { id: "JH-02", type: "sand-trap", x: 260, y: 400, radius: 45, label: "Séítah Transverse Aeolian Ridges (High Wheel Slip)", severity: "warning" },
                { id: "JH-03", type: "rock-yard", x: 610, y: 220, radius: 55, label: "High-Energy Megaboulder Conglomerate", severity: "caution" }
            ],
            geologicalUnits: [
                { name: "Lacustrine Siltstone & Clay", color: "#10b981", signature: "Fe/Mg Smectites & Organic Carbon", habitability: "Highest" },
                { name: "Marginal Lacustrine Carbonates", color: "#f59e0b", signature: "Magnesite (MgCO3) + Silica", habitability: "Highest (Biosignature preservation)" },
                { name: "Fluvial Conglomerates", color: "#6366f1", signature: "Pyroxene, Olivine, Andesitic basalt", habitability: "Moderate" },
                { name: "Crater Floor Mafic Floor", color: "#64748b", signature: "Crystalline Olivine-rich cumulate rock", habitability: "Low" }
            ]
        }
    },

    // Standard Astronaut EVA Physiological & Suit Physics parameters
    suitConfig: {
        totalOxygenLiters: 1200,      // Primary 100% O2 tanks at 4.3 psi
        coolingWaterLiters: 4.5,      // Sublimator / Water Ice membrane cooling
        batteryWattHours: 850,        // Suit power for heating, scrubbers, HUD
        maxSafeSlopeDeg: 18,          // Suit mobility tip-over hazard threshold
        unassistedAscentLimitDeg: 25, // Unclimbable without rope/anchor
        walkingSpeedKmh: 2.2,         // Average spacesuit walking pace on Mars 0.38g
        roverSpeedKmh: 9.5,           // Pressurized rover pace
        metabolicBaseWatt: 160,       // Resting in suit
        metabolicClimbMultiplier: 2.4 // Scaling for uphill gradient
    }
};
