// ARES-EVA Main Controller & Interactive Map Engine
// Integrated Multi-layer Martian Navigation & Astronaut HUD System

class MarsEVAEngine {
    constructor() {
        this.currentMissionKey = 'mount-sharp-boxwork';
        this.mission = window.MARS_DATA.missions[this.currentMissionKey];
        this.suit = window.MARS_DATA.suitConfig;

        // View Mode: 'workstation' | 'visor' | 'profile'
        this.activeMode = 'workstation';

        // Layer Visibility Toggles
        this.layers = {
            optical: true,
            topography: true,
            slopes: false,
            crism: true,
            radiation: false,
            hazards: true,
            grid: true,
            route: true
        };

        // Active Route Waypoints (cloned from mission)
        this.activeRoute = JSON.parse(JSON.stringify(this.mission.waypoints));
        this.selectedWaypoint = this.activeRoute[0];
        this.selectedHazard = null;

        // Astronaut HUD Simulation State
        this.hudState = {
            activeWpIndex: 1,
            distanceToTarget: 410, // meters
            bearingToTarget: 34,   // degrees
            pitch: -2,
            roll: 1,
            heartRate: 118,
            o2LevelPct: 88,
            batteryPct: 92,
            waterCoolingPct: 95,
            suitPressurePsi: 4.30,
            radiationDoseRate: 0.68,
            currentSlopeDeg: 12.4,
            isWalking: true,
            audioEnabled: true
        };

        // Map Canvas Setup
        this.canvas = document.getElementById('marsMapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Elevation Profile Canvas
        this.profileCanvas = document.getElementById('elevationProfileCanvas');
        this.profileCtx = this.profileCanvas ? this.profileCanvas.getContext('2d') : null;

        // Audio Synthesizer
        this.initAudio();

        // Bind events & start loop
        this.bindEvents();
        this.generateElevationNoise();
        this.updateCalculations();
        this.render();
        this.startHudSimulation();
    }

    // -------------------------------------------------------------
    // Audio Synthesis (Web Audio API - No external mp3 files required)
    // -------------------------------------------------------------
    initAudio() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } catch (e) {
            console.warn("Web Audio API not supported in this browser environment.");
        }
    }

    playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.05) {
        if (!this.hudState.audioEnabled || !this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (err) {
            // Audio policy fallback
        }
    }

    playAlertTone() {
        this.playTone(880, 'triangle', 0.15, 0.08);
        setTimeout(() => this.playTone(660, 'triangle', 0.2, 0.08), 120);
    }

    playGeigerClick() {
        if (!this.hudState.audioEnabled || !this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120 + Math.random() * 80, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.015, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.015);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.02);
        } catch (e) {}
    }

    // -------------------------------------------------------------
    // Procedural Martian Micro-Topography & Surface Simulation
    // -------------------------------------------------------------
    generateElevationNoise() {
        // Generates realistic topographic heightfield grid
        this.gridResolution = 100;
        this.elevationGrid = [];
        const base = this.mission.elevationRange.base;
        const spread = this.mission.elevationRange.max - this.mission.elevationRange.min;

        for (let gy = 0; gy < this.gridResolution; gy++) {
            this.elevationGrid[gy] = [];
            for (let gx = 0; gx < this.gridResolution; gx++) {
                const nx = gx / this.gridResolution;
                const ny = gy / this.gridResolution;
                
                // Mount Sharp gradient (sloping upwards towards top right) or Jezero fan
                let elev;
                if (this.currentMissionKey === 'mount-sharp-boxwork') {
                    // Slope upwards from SW (bottom-left) to NE (top-right)
                    const regionalSlope = (nx * 0.65 + (1 - ny) * 0.35) * spread;
                    // Boxwork ridges (cross-cutting sharp polygonal ridges)
                    const boxworkVeins = Math.sin(nx * 38) * Math.cos(ny * 32) * 22 +
                                         Math.cos(nx * 18 - ny * 14) * 18;
                    // Gediz vallis channel depression
                    const channelDist = Math.abs((ny - 0.5) - (nx - 0.4) * 0.7);
                    const channelDip = channelDist < 0.12 ? -35 * (1 - channelDist / 0.12) : 0;
                    elev = base + regionalSlope + boxworkVeins + channelDip;
                } else {
                    // Jezero crater delta fan: sloping down from NW to SE, with eroded delta fronts
                    const regionalSlope = ((1 - nx) * 0.6 + ny * 0.4) * spread;
                    const deltaLobe = Math.sin(nx * 14) * Math.sin(ny * 12) * 28;
                    const kodiakButte = (Math.hypot(nx - 0.35, ny - 0.35) < 0.08) ? 45 : 0;
                    elev = base + regionalSlope + deltaLobe + kodiakButte;
                }
                this.elevationGrid[gy][gx] = elev;
            }
        }
    }

    getElevationAt(x, y) {
        const gx = Math.max(0, Math.min(this.gridResolution - 1, Math.floor((x / this.width) * this.gridResolution)));
        const gy = Math.max(0, Math.min(this.gridResolution - 1, Math.floor((y / this.height) * this.gridResolution)));
        return Math.round(this.elevationGrid[gy][gx]);
    }

    getSlopeAt(x, y) {
        const delta = 10;
        const e0 = this.getElevationAt(x, y);
        const ex = this.getElevationAt(x + delta, y);
        const ey = this.getElevationAt(x, y + delta);
        const horizontalMeters = (delta / this.width) * this.mission.baseScaleMeters;
        const dz = Math.hypot(ex - e0, ey - e0);
        const slopeDeg = (Math.atan2(dz, horizontalMeters) * 180) / Math.PI;
        return parseFloat(slopeDeg.toFixed(1));
    }

    // -------------------------------------------------------------
    // Route Calculations, Consumables & Point of No Return (PNR)
    // -------------------------------------------------------------
    updateCalculations() {
        if (!this.activeRoute || this.activeRoute.length === 0) return;

        let totalDistMeters = 0;
        let totalClimbMeters = 0;
        let totalDescentMeters = 0;
        let totalDurationMin = 0;
        let totalO2Consumed = 0;
        let maxSlopeEncountered = 0;

        for (let i = 0; i < this.activeRoute.length - 1; i++) {
            const p1 = this.activeRoute[i];
            const p2 = this.activeRoute[i + 1];

            const pixelDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const legDistMeters = (pixelDist / this.width) * this.mission.baseScaleMeters;
            totalDistMeters += legDistMeters;

            const elevDelta = p2.elev - p1.elev;
            if (elevDelta > 0) totalClimbMeters += elevDelta;
            else totalDescentMeters += Math.abs(elevDelta);

            // Slope check
            const legSlope = (Math.atan2(Math.abs(elevDelta), legDistMeters) * 180) / Math.PI;
            if (legSlope > maxSlopeEncountered) maxSlopeEncountered = legSlope;

            // Travel Time = distance / speed adjusted for slope
            const speedKmh = Math.max(1.0, this.suit.walkingSpeedKmh - (legSlope * 0.07));
            const walkTimeHours = (legDistMeters / 1000) / speedKmh;
            const legTransitMin = walkTimeHours * 60;
            const scienceStayMin = p2.minTimeMin || 20;
            const legTotalMin = legTransitMin + scienceStayMin;
            totalDurationMin += legTotalMin;

            // Oxygen Burn rate (Liters)
            // Uphill walking consumes more O2: base + slope factor
            const walkO2Rate = this.suit.metabolicBaseWatt * 0.006 + (Math.max(0, elevDelta) / (legDistMeters || 1)) * 12;
            const walkO2 = legTransitMin * walkO2Rate;
            const scienceO2 = scienceStayMin * (p2.o2Rate || 1.4);
            totalO2Consumed += (walkO2 + scienceO2);
        }

        // Add return to base calculation
        const returnPixelDist = Math.hypot(
            this.activeRoute[this.activeRoute.length - 1].x - this.activeRoute[0].x,
            this.activeRoute[this.activeRoute.length - 1].y - this.activeRoute[0].y
        );
        const returnMeters = (returnPixelDist / this.width) * this.mission.baseScaleMeters;
        const returnTimeMin = (returnMeters / 1000 / this.suit.walkingSpeedKmh) * 60;
        const returnO2ReserveNeeded = returnTimeMin * 1.6;

        this.routeStats = {
            totalDistKm: (totalDistMeters / 1000).toFixed(2),
            totalClimbM: Math.round(totalClimbMeters),
            totalDescentM: Math.round(totalDescentMeters),
            totalDurationHours: (totalDurationMin / 60).toFixed(1),
            totalDurationMin: Math.round(totalDurationMin),
            o2ConsumedLiters: Math.round(totalO2Consumed),
            o2ReserveLiters: Math.round(this.suit.totalOxygenLiters - totalO2Consumed),
            o2MarginPercent: Math.round(((this.suit.totalOxygenLiters - totalO2Consumed) / this.suit.totalOxygenLiters) * 100),
            pnrThresholdMinutes: Math.round(totalDurationMin * 0.65), // Safe abort turnaround time
            returnO2Needed: Math.round(returnO2ReserveNeeded),
            maxSlope: maxSlopeEncountered.toFixed(1),
            slopeWarning: maxSlopeEncountered >= this.suit.maxSafeSlopeDeg,
            isFeasible: totalO2Consumed + returnO2ReserveNeeded <= this.suit.totalOxygenLiters
        };

        this.updateStatsUI();
        this.renderElevationProfile();
    }

    // -------------------------------------------------------------
    // UI Updating
    // -------------------------------------------------------------
    updateStatsUI() {
        const stats = this.routeStats;
        if (!stats) return;

        // Header and metrics
        document.getElementById('metricDistance').innerText = `${stats.totalDistKm} km`;
        document.getElementById('metricClimb').innerText = `+${stats.totalClimbM}m / -${stats.totalDescentM}m`;
        document.getElementById('metricDuration').innerText = `${stats.totalDurationHours} hrs`;
        
        const o2Elem = document.getElementById('metricOxygen');
        o2Elem.innerText = `${stats.o2MarginPercent}%`;
        o2Elem.className = stats.o2MarginPercent < 25 ? 'metric-val text-red-400 animate-pulse' : 'metric-val text-cyan-400';

        const pnrElem = document.getElementById('metricPNR');
        pnrElem.innerText = `T+${stats.pnrThresholdMinutes}m`;

        const slopeElem = document.getElementById('metricMaxSlope');
        slopeElem.innerText = `${stats.maxSlope}°`;
        slopeElem.className = stats.slopeWarning ? 'metric-val text-amber-400 font-bold' : 'metric-val text-emerald-400';

        // Feasibility banner
        const alertBanner = document.getElementById('routeStatusAlert');
        if (alertBanner) {
            if (!stats.isFeasible) {
                alertBanner.className = 'status-banner banner-danger';
                alertBanner.innerHTML = `<span class="icon">⚠️</span><strong>ABORT RISK:</strong> Insufficient O2 reserve for safe return! Required: ${stats.o2ConsumedLiters + stats.returnO2Needed}L / Available: ${this.suit.totalOxygenLiters}L.`;
            } else if (stats.slopeWarning) {
                alertBanner.className = 'status-banner banner-warning';
                alertBanner.innerHTML = `<span class="icon">⚠️</span><strong>SUIT MOBILITY ADVISORY:</strong> Max slope ${stats.maxSlope}° approaches suit stability envelope. Tether or alternate traverse advised.`;
            } else {
                alertBanner.className = 'status-banner banner-nominal';
                alertBanner.innerHTML = `<span class="icon">✓</span><strong>FLIGHT DYNAMICS NOMINAL:</strong> Route certified for single-day EVA. O2 safety margin: ${stats.o2MarginPercent}%.`;
            }
        }

        // Render Waypoint Sequencer list
        this.renderWaypointList();
    }

    renderWaypointList() {
        const container = document.getElementById('waypointSequenceList');
        if (!container) return;

        container.innerHTML = '';
        this.activeRoute.forEach((wp, idx) => {
            const isSelected = this.selectedWaypoint && this.selectedWaypoint.id === wp.id;
            const item = document.createElement('div');
            item.className = `wp-seq-item ${isSelected ? 'active' : ''}`;
            item.innerHTML = `
                <div class="wp-badge ${wp.type}">${idx + 1}</div>
                <div class="wp-info flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-gray-200">${wp.name}</span>
                        <span class="text-xs text-cyan-400 font-mono">${wp.elev} m</span>
                    </div>
                    <div class="text-xs text-gray-400 truncate">${wp.scienceAction}</div>
                </div>
                <button class="wp-remove-btn" title="Remove waypoint" data-idx="${idx}">✕</button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('wp-remove-btn')) {
                    this.removeWaypoint(idx);
                } else {
                    this.selectWaypoint(wp);
                }
            });
            container.appendChild(item);
        });
    }

    // -------------------------------------------------------------
    // Map Canvas Rendering Engine (Multispectral & Tactical Layers)
    // -------------------------------------------------------------
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. BASE OPTICAL LAYER (Simulated HiRISE/CTX terrain with craters and fractures)
        if (this.layers.optical) {
            this.renderOpticalLayer();
        } else {
            // Dark background fallback
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // 2. TOPOGRAPHY CONTOUR / ELEVATION GRADIENT LAYER
        if (this.layers.topography) {
            this.renderTopographyLayer();
        }

        // 3. SLOPE HAZARD HEATMAP LAYER
        if (this.layers.slopes) {
            this.renderSlopeLayer();
        }

        // 4. CRISM COMPOSITIONAL / MINERALOGY LAYER
        if (this.layers.crism) {
            this.renderCrismLayer();
        }

        // 5. RAD COSMIC & SOLAR RADIATION OVERLAY
        if (this.layers.radiation) {
            this.renderRadiationLayer();
        }

        // 6. TACTICAL GRID (UTM/MGRS coordinates)
        if (this.layers.grid) {
            this.renderGridLayer();
        }

        // 7. HAZARD BUFFER ZONES
        if (this.layers.hazards) {
            this.renderHazards();
        }

        // 8. PLANNED ROUTE TRAJECTORY & ELEVATION ARROWS
        if (this.layers.route) {
            this.renderRoute();
        }

        // 9. WAYPOINT MARKERS & ACTIVE TARGET PIN
        this.renderWaypoints();

        // 10. CURRENT ASTRONAUT POSITION
        this.renderAstronautPosition();

        // Schedule next frame if animations active
        requestAnimationFrame(() => this.render());
    }

    renderOpticalLayer() {
        // High-resolution Mars surface shader with craters, eolian ripples, and rock dunes
        const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        if (this.currentMissionKey === 'mount-sharp-boxwork') {
            grad.addColorStop(0, '#532918'); // Dark basaltic sulfate
            grad.addColorStop(0.5, '#7c3f25'); // Martian red ferric dust
            grad.addColorStop(1, '#9a502f'); // High-albedo boxwork sandstone
        } else {
            grad.addColorStop(0, '#422415');
            grad.addColorStop(0.5, '#68361e');
            grad.addColorStop(1, '#854224');
        }
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Procedural micro-dunes and boxwork fracture veins
        this.ctx.save();
        this.ctx.globalAlpha = 0.22;
        this.ctx.strokeStyle = '#f87171';
        this.ctx.lineWidth = 1.2;

        if (this.currentMissionKey === 'mount-sharp-boxwork') {
            // Draw prominent polygonal boxwork ridge pattern
            for (let bx = 300; bx < 600; bx += 40) {
                this.ctx.beginPath();
                this.ctx.moveTo(bx, 180);
                this.ctx.lineTo(bx + 40, 260);
                this.ctx.lineTo(bx + 20, 340);
                this.ctx.lineTo(bx - 30, 310);
                this.ctx.closePath();
                this.ctx.stroke();
            }
        } else {
            // Delta distributary channels
            this.ctx.beginPath();
            this.ctx.moveTo(100, 480);
            this.ctx.bezierCurveTo(350, 400, 450, 250, 850, 150);
            this.ctx.lineWidth = 8;
            this.ctx.strokeStyle = 'rgba(30, 20, 15, 0.4)';
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    renderTopographyLayer() {
        // Elevation Contours & Shaded Relief
        this.ctx.save();
        this.ctx.globalAlpha = 0.35;
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 0.75;

        const step = 20;
        for (let y = step; y < this.height; y += step) {
            this.ctx.beginPath();
            for (let x = 0; x < this.width; x += 15) {
                const elev = this.getElevationAt(x, y);
                const offset = (elev - this.mission.elevationRange.base) * 0.12;
                if (x === 0) this.ctx.moveTo(x, y + offset);
                else this.ctx.lineTo(x, y + offset);
            }
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    renderSlopeLayer() {
        // Heatmap indicating dangerous slopes (>15° yellow, >20° red)
        this.ctx.save();
        this.ctx.globalAlpha = 0.45;

        const sampleStep = 18;
        for (let y = sampleStep; y < this.height; y += sampleStep) {
            for (let x = sampleStep; x < this.width; x += sampleStep) {
                const slope = this.getSlopeAt(x, y);
                if (slope > 8) {
                    if (slope > 18) this.ctx.fillStyle = 'rgba(239, 68, 68, 0.7)'; // Severe
                    else if (slope > 14) this.ctx.fillStyle = 'rgba(245, 158, 11, 0.6)'; // Warning
                    else this.ctx.fillStyle = 'rgba(234, 179, 8, 0.35)'; // Moderate
                    this.ctx.fillRect(x - sampleStep / 2, y - sampleStep / 2, sampleStep, sampleStep);
                }
            }
        }
        this.ctx.restore();
    }

    renderCrismLayer() {
        // CRISM Spectral Hyperspectral overlays showing target minerals
        this.ctx.save();
        this.mission.geologicalUnits.forEach((unit, idx) => {
            this.ctx.fillStyle = unit.color;
            this.ctx.globalAlpha = 0.28;
            this.ctx.beginPath();
            const cx = 200 + (idx * 160);
            const cy = 200 + (idx % 2 === 0 ? 50 : -40);
            this.ctx.ellipse(cx, cy, 110, 75, (idx * 0.4), 0, Math.PI * 2);
            this.ctx.fill();

            // Unit tag
            this.ctx.globalAlpha = 0.85;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '9px "JetBrains Mono", monospace';
            this.ctx.fillText(`CRISM: ${unit.name.split(' ')[0]}`, cx - 35, cy);
        });
        this.ctx.restore();
    }

    renderRadiationLayer() {
        // MSL RAD Space Weather Dose Rate Overlay
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        const radGrad = this.ctx.createRadialGradient(this.width * 0.65, this.height * 0.3, 50, this.width * 0.65, this.height * 0.3, 400);
        radGrad.addColorStop(0, 'rgba(220, 38, 38, 0.75)'); // High ridge exposure
        radGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.3)');
        radGrad.addColorStop(1, 'rgba(16, 185, 129, 0.1)'); // Shielded depressions
        this.ctx.fillStyle = radGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }

    renderGridLayer() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 1;

        const gridSize = 100;
        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            this.ctx.font = '9px monospace';
            this.ctx.fillText(`${(x / this.width * (this.mission.baseScaleMeters / 1000)).toFixed(1)}kE`, x + 4, 12);
        }

        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            this.ctx.font = '9px monospace';
            this.ctx.fillText(`${((this.height - y) / this.height * (this.mission.baseScaleMeters / 1000)).toFixed(1)}kN`, 4, y - 4);
        }

        // Scale bar in bottom right
        const scaleLengthPx = 100;
        const scaleMeters = Math.round((scaleLengthPx / this.width) * this.mission.baseScaleMeters);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.width - 120, this.height - 20);
        this.ctx.lineTo(this.width - 20, this.height - 20);
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px "JetBrains Mono", monospace';
        this.ctx.fillText(`${scaleMeters} m`, this.width - 78, this.height - 25);
        this.ctx.restore();
    }

    renderHazards() {
        this.ctx.save();
        this.mission.hazards.forEach(hz => {
            const isSelected = this.selectedHazard && this.selectedHazard.id === hz.id;
            this.ctx.beginPath();
            this.ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);

            let strokeColor = '#f59e0b';
            let fillColor = 'rgba(245, 158, 11, 0.15)';
            if (hz.severity === 'critical') {
                strokeColor = '#ef4444';
                fillColor = 'rgba(239, 68, 68, 0.2)';
            }

            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = isSelected ? 2.5 : 1.2;
            this.ctx.setLineDash([4, 4]);
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Label
            this.ctx.fillStyle = strokeColor;
            this.ctx.font = '10px "JetBrains Mono", monospace';
            this.ctx.fillText(`⚠️ ${hz.id}`, hz.x - 18, hz.y + 4);
        });
        this.ctx.restore();
    }

    renderRoute() {
        if (this.activeRoute.length < 2) return;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(this.activeRoute[0].x, this.activeRoute[0].y);

        for (let i = 1; i < this.activeRoute.length; i++) {
            this.ctx.lineTo(this.activeRoute[i].x, this.activeRoute[i].y);
        }

        // Glowing tactical route path
        this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        this.ctx.lineWidth = 6;
        this.ctx.stroke();

        this.ctx.strokeStyle = '#06b6d4';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        // Directional arrows along route
        for (let i = 0; i < this.activeRoute.length - 1; i++) {
            const p1 = this.activeRoute[i];
            const p2 = this.activeRoute[i + 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            this.ctx.save();
            this.ctx.translate(midX, midY);
            this.ctx.rotate(angle);
            this.ctx.fillStyle = '#22d3ee';
            this.ctx.beginPath();
            this.ctx.moveTo(-6, -4);
            this.ctx.lineTo(6, 0);
            this.ctx.lineTo(-6, 4);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }

        // Abort route to base dashed line from last point
        const last = this.activeRoute[this.activeRoute.length - 1];
        const base = this.activeRoute[0];
        this.ctx.beginPath();
        this.ctx.moveTo(last.x, last.y);
        this.ctx.lineTo(base.x, base.y);
        this.ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        this.ctx.lineWidth = 1.8;
        this.ctx.setLineDash([6, 6]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.restore();
    }

    renderWaypoints() {
        this.activeRoute.forEach((wp, index) => {
            const isSelected = this.selectedWaypoint && this.selectedWaypoint.id === wp.id;
            const isTarget = index === this.hudState.activeWpIndex;

            this.ctx.save();
            // Outer pulse ring if selected or current target
            if (isSelected || isTarget) {
                const pulse = (Math.sin(Date.now() / 200) + 1) * 3;
                this.ctx.beginPath();
                this.ctx.arc(wp.x, wp.y, 16 + pulse, 0, Math.PI * 2);
                this.ctx.strokeStyle = isTarget ? '#06b6d4' : '#f59e0b';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            }

            // Pin badge
            this.ctx.beginPath();
            this.ctx.arc(wp.x, wp.y, 11, 0, Math.PI * 2);
            let fillColor = '#0284c7';
            if (wp.type === 'base') fillColor = '#10b981';
            else if (wp.type === 'science') fillColor = '#f59e0b';
            else if (wp.type === 'shelter') fillColor = '#8b5cf6';
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Waypoint Number
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${index + 1}`, wp.x, wp.y);

            // Waypoint Label
            this.ctx.font = '11px "JetBrains Mono", monospace';
            this.ctx.fillStyle = '#f1f5f9';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(wp.id, wp.x + 14, wp.y - 2);

            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '9px "JetBrains Mono", monospace';
            this.ctx.fillText(`${wp.elev}m`, wp.x + 14, wp.y + 10);

            this.ctx.restore();
        });
    }

    renderAstronautPosition() {
        // Astronaut EVA position marker between WP1 and WP2
        if (this.activeRoute.length < 2) return;
        const p1 = this.activeRoute[0];
        const p2 = this.activeRoute[1];
        const t = 0.42; // Currently 42% on the way
        const curX = p1.x + (p2.x - p1.x) * t;
        const curY = p1.y + (p2.y - p1.y) * t;

        this.ctx.save();
        // Radar sweep ring
        const sweepRad = (Date.now() / 25) % 35;
        this.ctx.beginPath();
        this.ctx.arc(curX, curY, sweepRad, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(34, 211, 238, ${1 - sweepRad / 35})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Astronaut symbol
        this.ctx.beginPath();
        this.ctx.arc(curX, curY, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.fillText("EVA-1 [ASTRONAUT]", curX + 10, curY + 4);
        this.ctx.restore();
    }

    // -------------------------------------------------------------
    // Elevation Profile Generator (Cross-Section Chart)
    // -------------------------------------------------------------
    renderElevationProfile() {
        if (!this.profileCtx || this.activeRoute.length < 2) return;
        const pCtx = this.profileCtx;
        const pW = this.profileCanvas.width;
        const pH = this.profileCanvas.height;

        pCtx.clearRect(0, 0, pW, pH);

        // Background
        pCtx.fillStyle = '#090d16';
        pCtx.fillRect(0, 0, pW, pH);

        const minElev = this.mission.elevationRange.min;
        const maxElev = this.mission.elevationRange.max;
        const elevRange = maxElev - minElev;

        // Grid lines
        pCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        pCtx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (pH - 30) - (i / 4) * (pH - 50);
            pCtx.beginPath();
            pCtx.moveTo(40, y);
            pCtx.lineTo(pW - 15, y);
            pCtx.stroke();

            const elevLabel = Math.round(minElev + (i / 4) * elevRange);
            pCtx.fillStyle = '#64748b';
            pCtx.font = '9px monospace';
            pCtx.fillText(`${elevLabel}m`, 5, y + 3);
        }

        // Plot Profile Polygon
        pCtx.beginPath();
        pCtx.moveTo(40, pH - 25);

        const totalPoints = 120;
        const points = [];

        for (let i = 0; i <= totalPoints; i++) {
            const progress = i / totalPoints;
            // Interpolate along route polyline
            const pt = this.getPointAtRouteProgress(progress);
            const elev = this.getElevationAt(pt.x, pt.y);
            const plotX = 40 + progress * (pW - 60);
            const plotY = (pH - 25) - ((elev - minElev) / elevRange) * (pH - 50);
            points.push({ x: plotX, y: plotY, elev });
            pCtx.lineTo(plotX, plotY);
        }

        pCtx.lineTo(pW - 20, pH - 25);
        pCtx.closePath();

        // Gradient Fill
        const grad = pCtx.createLinearGradient(0, 0, 0, pH);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
        pCtx.fillStyle = grad;
        pCtx.fill();

        // Outline Line
        pCtx.beginPath();
        pCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            pCtx.lineTo(points[i].x, points[i].y);
        }
        pCtx.strokeStyle = '#22d3ee';
        pCtx.lineWidth = 2.5;
        pCtx.stroke();

        // Mark Waypoints on profile
        this.activeRoute.forEach((wp, idx) => {
            const prog = this.getWaypointRouteProgress(idx);
            const plotX = 40 + prog * (pW - 60);
            const plotY = (pH - 25) - ((wp.elev - minElev) / elevRange) * (pH - 50);

            pCtx.beginPath();
            pCtx.arc(plotX, plotY, 4.5, 0, Math.PI * 2);
            pCtx.fillStyle = '#f59e0b';
            pCtx.fill();
            pCtx.strokeStyle = '#ffffff';
            pCtx.stroke();

            pCtx.fillStyle = '#ffffff';
            pCtx.font = 'bold 9px monospace';
            pCtx.fillText(`WP${idx + 1}`, plotX - 9, plotY - 8);
        });
    }

    getPointAtRouteProgress(progress) {
        if (this.activeRoute.length === 1) return this.activeRoute[0];
        const segCount = this.activeRoute.length - 1;
        const segIdx = Math.min(segCount - 1, Math.floor(progress * segCount));
        const segT = (progress * segCount) - segIdx;
        const p1 = this.activeRoute[segIdx];
        const p2 = this.activeRoute[segIdx + 1];
        return {
            x: p1.x + (p2.x - p1.x) * segT,
            y: p1.y + (p2.y - p1.y) * segT
        };
    }

    getWaypointRouteProgress(wpIndex) {
        if (this.activeRoute.length <= 1) return 0;
        return wpIndex / (this.activeRoute.length - 1);
    }

    // -------------------------------------------------------------
    // Astronaut Helmet Visor / HUD Simulation
    // -------------------------------------------------------------
    startHudSimulation() {
        setInterval(() => {
            if (this.hudState.isWalking) {
                // Heart rate fluctuation with slope
                const targetWp = this.activeRoute[this.hudState.activeWpIndex] || this.activeRoute[0];
                const baseHr = targetWp.hazardLevel.includes('High') ? 134 : 112;
                this.hudState.heartRate = Math.round(baseHr + (Math.random() * 6 - 3));

                // Micro countdown of oxygen
                this.hudState.o2LevelPct = Math.max(15, parseFloat((this.hudState.o2LevelPct - 0.015).toFixed(2)));
                this.hudState.batteryPct = Math.max(20, parseFloat((this.hudState.batteryPct - 0.01).toFixed(2)));

                // Slight synthetic pitch & roll head bounce
                this.hudState.pitch = -2 + Math.sin(Date.now() / 350) * 1.5;
                this.hudState.roll = Math.cos(Date.now() / 400) * 1.2;

                // Radiation dose rate fluctuation
                this.hudState.radiationDoseRate = parseFloat((0.65 + Math.sin(Date.now() / 8000) * 0.08).toFixed(2));
                if (Math.random() < 0.2) this.playGeigerClick();

                this.updateVisorHUDUI();
            }
        }, 500);
    }

    updateVisorHUDUI() {
        // Elements in the Visor HUD overlay
        const compassBearing = document.getElementById('hudCompassBearing');
        if (compassBearing) compassBearing.innerText = `${Math.round(this.hudState.bearingToTarget)}° NNE`;

        const hrElem = document.getElementById('hudHeartRate');
        if (hrElem) hrElem.innerText = `${this.hudState.heartRate} BPM`;

        const o2Elem = document.getElementById('hudO2Pct');
        if (o2Elem) o2Elem.innerText = `${Math.round(this.hudState.o2LevelPct)}%`;

        const distElem = document.getElementById('hudTargetDist');
        if (distElem) distElem.innerText = `${this.hudState.distanceToTarget} m`;

        const targetWp = this.activeRoute[this.hudState.activeWpIndex];
        const nameElem = document.getElementById('hudTargetName');
        if (nameElem && targetWp) nameElem.innerText = targetWp.name;

        const radElem = document.getElementById('hudRadiationRate');
        if (radElem) radElem.innerText = `${this.hudState.radiationDoseRate} mSv/d`;

        const slopeElem = document.getElementById('hudLiveSlope');
        if (slopeElem) {
            slopeElem.innerText = `${this.hudState.currentSlopeDeg}°`;
            if (this.hudState.currentSlopeDeg >= this.suit.maxSafeSlopeDeg) {
                slopeElem.className = 'hud-stat-val text-red-400 animate-pulse';
            } else {
                slopeElem.className = 'hud-stat-val text-cyan-300';
            }
        }
    }

    // -------------------------------------------------------------
    // User Interactions & Mode Handlers
    // -------------------------------------------------------------
    bindEvents() {
        // Canvas Click for Waypoint selection or adding custom waypoint
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            // Check if clicked an existing waypoint
            let clickedWp = null;
            for (const wp of this.activeRoute) {
                if (Math.hypot(wp.x - clickX, wp.y - clickY) < 18) {
                    clickedWp = wp;
                    break;
                }
            }

            if (clickedWp) {
                this.selectWaypoint(clickedWp);
                this.playTone(520, 'sine', 0.08);
            } else {
                // Check if clicked a hazard
                let clickedHz = null;
                for (const hz of this.mission.hazards) {
                    if (Math.hypot(hz.x - clickX, hz.y - clickY) < hz.radius) {
                        clickedHz = hz;
                        break;
                    }
                }

                if (clickedHz) {
                    this.selectHazard(clickedHz);
                    this.playAlertTone();
                } else {
                    // Add new custom exploration waypoint
                    this.addCustomWaypoint(clickX, clickY);
                }
            }
        });

        // Mission Preset Switcher
        document.getElementById('missionSelector').addEventListener('change', (e) => {
            this.switchMission(e.target.value);
            this.playTone(440, 'triangle', 0.12);
        });

        // Layer Checkboxes
        document.querySelectorAll('.layer-toggle').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const layerKey = e.target.getAttribute('data-layer');
                if (layerKey && this.layers.hasOwnProperty(layerKey)) {
                    this.layers[layerKey] = e.target.checked;
                    this.playTone(600, 'sine', 0.04);
                }
            });
        });

        // Mode Switch Buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.getAttribute('data-mode');
                this.switchMode(mode);
            });
        });

        // Emergency Abort Route Button
        const abortBtn = document.getElementById('btnEmergencyAbort');
        if (abortBtn) {
            abortBtn.addEventListener('click', () => {
                this.triggerEmergencyAbort();
            });
        }

        // Export Mission Plan Button
        const exportBtn = document.getElementById('btnExportPlan');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportMissionPlan();
            });
        }

        // Audio toggle
        const audioBtn = document.getElementById('btnToggleAudio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                this.hudState.audioEnabled = !this.hudState.audioEnabled;
                audioBtn.innerText = this.hudState.audioEnabled ? '🔊 AUDIO ON' : '🔇 AUDIO OFF';
                if (this.hudState.audioEnabled) this.playTone(660, 'sine', 0.1);
            });
        }
    }

    switchMission(missionKey) {
        this.currentMissionKey = missionKey;
        this.mission = window.MARS_DATA.missions[missionKey];
        this.activeRoute = JSON.parse(JSON.stringify(this.mission.waypoints));
        this.selectedWaypoint = this.activeRoute[0];
        this.selectedHazard = null;
        this.hudState.activeWpIndex = 1;

        // Update mission title in header
        document.getElementById('missionTitle').innerText = this.mission.title;
        document.getElementById('missionSubtitle').innerText = `${this.mission.coordinates.lat}, ${this.mission.coordinates.lon} • Elev: ${this.mission.coordinates.elevation}`;
        document.getElementById('missionOverviewText').innerText = this.mission.overview;

        // Telemetry strip
        const t = this.mission.telemetry;
        document.getElementById('envAirTemp').innerText = t.airTemp;
        document.getElementById('envPressure').innerText = t.pressure;
        document.getElementById('envWind').innerText = t.windSpeed;
        document.getElementById('envRadiation').innerText = t.radiation;
        document.getElementById('envDust').innerText = t.dustTau;

        this.generateElevationNoise();
        this.updateCalculations();
        this.selectWaypoint(this.activeRoute[0]);
    }

    switchMode(mode) {
        this.activeMode = mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        const visorOverlay = document.getElementById('visorHudOverlay');
        const workstationPanel = document.getElementById('workstationPanel');

        if (mode === 'visor') {
            visorOverlay.classList.remove('hidden');
            this.playAlertTone();
        } else {
            visorOverlay.classList.add('hidden');
            this.playTone(400, 'sine', 0.08);
        }
    }

    selectWaypoint(wp) {
        this.selectedWaypoint = wp;
        this.selectedHazard = null;
        this.renderWaypointList();

        // Update science inspection panel
        const detailPanel = document.getElementById('waypointDetailContent');
        if (detailPanel) {
            detailPanel.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between border-b border-gray-700 pb-2">
                        <div>
                            <span class="text-xs uppercase tracking-wider text-cyan-400 font-mono">${wp.id} [${wp.type}]</span>
                            <h3 class="text-lg font-bold text-white">${wp.name}</h3>
                        </div>
                        <span class="px-2 py-1 text-xs rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            Elev: ${wp.elev} m
                        </span>
                    </div>

                    <p class="text-xs text-gray-300 leading-relaxed">${wp.desc}</p>

                    <div class="p-2.5 rounded bg-slate-900 border border-slate-700">
                        <div class="text-[11px] font-semibold text-amber-400 uppercase tracking-wide">Primary Field Science Objective:</div>
                        <div class="text-xs text-gray-200 mt-1 font-mono">${wp.scienceAction}</div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span class="text-gray-400 block text-[10px]">TERRAIN HAZARD:</span>
                            <span class="font-medium text-amber-300">${wp.hazardLevel}</span>
                        </div>
                        <div class="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span class="text-gray-400 block text-[10px]">TIME AT STATION:</span>
                            <span class="font-medium text-cyan-300">${wp.minTimeMin} minutes</span>
                        </div>
                    </div>

                    ${wp.image ? `
                        <div class="mt-2 rounded overflow-hidden border border-slate-700">
                            <div class="relative">
                                <img src="${wp.image}" alt="${wp.name}" class="w-full h-36 object-cover bg-black" onerror="this.src='https://mars.nasa.gov/system/resources/detail_files/26366_1-PIA26366-web.jpg'">
                                <div class="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[10px] text-gray-300 backdrop-blur-sm">
                                    📷 NASA Raw Image Feed: ${wp.imageCaption || wp.name}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    selectHazard(hz) {
        this.selectedHazard = hz;
        const detailPanel = document.getElementById('waypointDetailContent');
        if (detailPanel) {
            detailPanel.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between border-b border-red-800 pb-2">
                        <div>
                            <span class="text-xs uppercase tracking-wider text-red-400 font-mono">ENVIRONMENTAL HAZARD</span>
                            <h3 class="text-base font-bold text-red-200">${hz.label}</h3>
                        </div>
                        <span class="px-2 py-1 text-xs rounded font-bold font-mono bg-red-950 text-red-300 border border-red-800">
                            SEVERITY: ${hz.severity.toUpperCase()}
                        </span>
                    </div>

                    <p class="text-xs text-gray-300">
                        This sector presents elevated physical and physiological risk to EVA astronauts. 
                        Safe perimeter buffer radius: <strong>${Math.round((hz.radius / this.width) * this.mission.baseScaleMeters)} meters</strong>.
                    </p>

                    <div class="p-2.5 rounded bg-red-950/40 border border-red-800 text-xs text-red-200">
                        <strong>Mission Rule:</strong> Direct rover or suited foot traverse through this zone is prohibited without flight director waiver.
                    </div>
                </div>
            `;
        }
    }

    addCustomWaypoint(x, y) {
        const nextId = `WP-${String(this.activeRoute.length + 1).padStart(2, '0')}`;
        const elev = this.getElevationAt(x, y);
        const slope = this.getSlopeAt(x, y);

        const newWp = {
            id: nextId,
            name: `Field Target ${nextId}`,
            type: "science",
            x: Math.round(x),
            y: Math.round(y),
            elev: elev,
            desc: `Opportunistic surface science target at ${slope}° slope gradient.`,
            scienceAction: `In-situ geochemical contact analysis & rock abrasion patch triage.`,
            hazardLevel: slope > 15 ? "High (Steep Grade)" : "Nominal",
            minTimeMin: 20,
            o2Rate: 1.4,
            image: "https://images-assets.nasa.gov/image/PIA26365/PIA26365~orig.jpg",
            imageCaption: "Martian bedrock and float boulder survey."
        };

        this.activeRoute.push(newWp);
        this.selectWaypoint(newWp);
        this.updateCalculations();
        this.playTone(720, 'sine', 0.1);
    }

    removeWaypoint(idx) {
        if (this.activeRoute.length <= 2) {
            alert("A valid Marswalk requires at least a starting Base and 1 target.");
            return;
        }
        this.activeRoute.splice(idx, 1);
        this.selectedWaypoint = this.activeRoute[0];
        this.updateCalculations();
        this.playTone(300, 'sawtooth', 0.1);
    }

    triggerEmergencyAbort() {
        this.playAlertTone();
        // Optimize active route to immediate direct backtrack to Base Habitat
        const baseWp = this.activeRoute[0];
        const currentWp = this.activeRoute[this.activeRoute.length - 1];

        // Replace route with immediate safe descent path
        const midX = (currentWp.x + baseWp.x) / 2;
        const midY = (currentWp.y + baseWp.y) / 2 + 20; // Detour around steep center ridge

        this.activeRoute = [
            currentWp,
            {
                id: "ABORT-NAV",
                name: "Emergency Low-Grade Valley Descent",
                type: "transit",
                x: midX,
                y: midY,
                elev: this.getElevationAt(midX, midY),
                desc: "Computer-calculated minimum resistance descent corridor avoiding 18° rock escarpment.",
                scienceAction: "FULL ABORT: Conserve metabolic energy, maintain max pace 3.2 km/h.",
                hazardLevel: "Low",
                minTimeMin: 0,
                o2Rate: 1.8
            },
            baseWp
        ];

        this.selectedWaypoint = this.activeRoute[0];
        this.updateCalculations();

        alert("⚠️ EMERGENCY ABORT VECTOR ENGAGED!\nRoute rerouted through minimum-slope valley corridor directly to Pressurized Rover Airlock.");
    }

    exportMissionPlan() {
        const stats = this.routeStats;
        const plan = {
            missionName: this.mission.title,
            challenge: "2026 NASA Space Apps Challenge: Martian Map",
            coordinates: this.mission.coordinates,
            flightRulesCertified: stats.isFeasible,
            estimatedDistanceKm: stats.totalDistKm,
            estimatedDurationHours: stats.totalDurationHours,
            totalElevationClimbM: stats.totalClimbM,
            maxSlopeDeg: stats.maxSlope,
            primaryLifeSupportOxygenLitersNeeded: stats.o2ConsumedLiters,
            contingencyReturnReserveLiters: stats.returnO2Needed,
            waypoints: this.activeRoute.map(w => ({
                id: w.id,
                name: w.name,
                type: w.type,
                elevationMeters: w.elev,
                scienceProtocol: w.scienceAction
            }))
        };

        const jsonStr = JSON.stringify(plan, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NASA_EVA_MISSION_PLAN_${this.currentMissionKey.toUpperCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.playTone(800, 'sine', 0.12);
    }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.marsApp = new MarsEVAEngine();
});
