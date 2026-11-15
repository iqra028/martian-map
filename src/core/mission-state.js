/**
 * Central Reactive Mission State Store
 * Repository: martian-map
 * 
 * Provides decoupled state management between the 2D Leaflet view
 * and the 3D surface simulation without framework dependencies.
 */

export class MissionStore {
  constructor(initialConfig = {}) {
    this._state = {
      // Confirmed exploration region: Gale Crater
      site: {
        name: initialConfig.siteName || "Gale Crater — Mount Sharp Flank",
        center: initialConfig.center || [-5.0600, 137.4600],
        datum: "MOLA_AREOID",
        walkSpeedKmh: initialConfig.walkSpeedKmh || 2.0
      },
      // Active Waypoints
      waypoints: initialConfig.waypoints || [],
      // Active Traverse Segments
      route: {
        segments: [],
        totalDistanceMeters: 0,
        estimatedDurationMinutes: 0
      },
      // Active Astronaut / Camera Position
      astronaut: {
        lat: initialConfig.center ? initialConfig.center[0] : -5.0600,
        lon: initialConfig.center ? initialConfig.center[1] : 137.4600,
        elevationMeters: initialConfig.elevationMeters || -4050.0,
        headingDegrees: 0,
        slopeDegrees: 0,
        mode: 'first_person' // 'first_person' | 'third_person'
      },
      // Consumables State
      consumables: {
        o2Liters: 1200.0,
        waterKg: 8.0,
        batteryWh: 1000.0,
        metabolicWatts: 160.0,
        pnrMarginPercent: 100.0,
        pnrStatus: 'NOMINAL'
      },
      // Viewport State
      activeView: '2d' // '2d' | '3d' | 'split'
    };

    this._listeners = new Set();
  }

  getState() {
    return this._state;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify(changedKeys = []) {
    for (const listener of this._listeners) {
      listener(this._state, changedKeys);
    }
  }

  setAstronautPosition(lat, lon, elevationMeters, slopeDegrees = 0, headingDegrees = 0) {
    this._state.astronaut.lat = lat;
    this._state.astronaut.lon = lon;
    this._state.astronaut.elevationMeters = elevationMeters;
    this._state.astronaut.slopeDegrees = slopeDegrees;
    this._state.astronaut.headingDegrees = headingDegrees;
    this._notify(['astronaut']);
  }

  addWaypoint(waypoint) {
    this._state.waypoints.push(waypoint);
    this._notify(['waypoints', 'route']);
  }

  updateWaypoint(index, updatedFields) {
    if (this._state.waypoints[index]) {
      Object.assign(this._state.waypoints[index], updatedFields);
      this._notify(['waypoints', 'route']);
    }
  }

  setWaypoints(waypoints) {
    this._state.waypoints = waypoints;
    this._notify(['waypoints', 'route']);
  }

  removeWaypoint(index) {
    if (index >= 0 && index < this._state.waypoints.length) {
      this._state.waypoints.splice(index, 1);
      this._notify(['waypoints', 'route']);
    }
  }

  setActiveView(view) {
    if (['2d', '3d', 'split'].includes(view)) {
      this._state.activeView = view;
      this._notify(['activeView']);
    }
  }

  updateConsumables(consumablesUpdate) {
    Object.assign(this._state.consumables, consumablesUpdate);
    this._notify(['consumables']);
  }
}
