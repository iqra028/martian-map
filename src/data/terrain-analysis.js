/**
 * Terrain analysis on a DtmRaster: slope, route profiles and slope hazards.
 * Repository: martian-map
 *
 * Two slope figures matter for a suited walker and they are kept separate:
 * - terrain slope: steepest gradient of the ground at a point (fall-line). Drives hazard/no-go,
 *   because cross-slope and loose footing matter even when walking along a contour.
 * - grade: slope along the direction of travel (signed). Drives metabolic cost.
 */

import { marsDistanceMeters } from '../geo/coordinates.js';

const RAD2DEG = 180 / Math.PI;

/**
 * Slope classes for suited EVA. Thresholds follow the existing app's brackets
 * (10/15/20°); 20° is treated as the unassisted suited-walking limit.
 */
export const SLOPE_CLASSES = [
  // Safe ground stays neutral so only hazards carry colour (amber caution, red warning)
  { id: 'nominal', label: 'Nominal', maxDeg: 10, color: '#eef1f4' },
  { id: 'moderate', label: 'Moderate', maxDeg: 15, color: '#e8cf8a' },
  { id: 'steep', label: 'Steep', maxDeg: 20, color: '#e3a33b' },
  { id: 'impassable', label: 'No-go', maxDeg: Infinity, color: '#e5534b' }
];

export function classifySlope(deg) {
  return SLOPE_CLASSES.find((c) => deg < c.maxDeg);
}

/**
 * Ground roughness thresholds (m RMS about a plane fitted to each 10 m cell of the 1 m DTM).
 * Site median is ~0.14 m; ≥0.5 m (top ~2%) means ledges and blocks underfoot, ≥1 m boulder fields.
 */
export const ROUGHNESS = { roughM: 0.5, blockyM: 1.0 };

/** Roughness (m) at a coordinate, or null when the raster has no roughness grid / no data there. */
export function roughnessAt(raster, lat, lon) {
  if (!raster.roughness || !raster.isWithinBounds(lat, lon)) return null;
  const { line, sample } = raster.geographicToPixel(lat, lon);
  const W = raster.metadata.samples, H = raster.metadata.lines;
  const x = Math.min(W - 1, Math.max(0, Math.round(sample))), y = Math.min(H - 1, Math.max(0, Math.round(line)));
  const v = raster.roughness[y * W + x];
  return Number.isNaN(v) ? null : v;
}

/**
 * Slope at grid cell (x, y) from central differences (one-sided at edges / next to no-data).
 * @param {(x:number, y:number) => number} at - elevation accessor, NaN for no-data/out of grid
 * @param {number} cellM - cell size in metres (square cells)
 * @returns {{dzdx:number, dzdy:number, slopeDeg:number}|null} dzdx east-positive, dzdy north-positive
 */
export function slopeFromGrid(at, x, y, cellM) {
  const c = at(x, y);
  if (Number.isNaN(c)) return null;
  const d = (a, b, span) => (Number.isNaN(a) || Number.isNaN(b) ? NaN : (a - b) / (span * cellM));
  const e = at(x + 1, y), w = at(x - 1, y), n = at(x, y - 1), s = at(x, y + 1); // rows run north→south
  let dzdx = d(e, w, 2);
  if (Number.isNaN(dzdx)) dzdx = Number.isNaN(e) ? d(c, w, 1) : d(e, c, 1);
  let dzdy = d(n, s, 2);
  if (Number.isNaN(dzdy)) dzdy = Number.isNaN(n) ? d(c, s, 1) : d(n, c, 1);
  if (Number.isNaN(dzdx) || Number.isNaN(dzdy)) return null;
  return { dzdx, dzdy, slopeDeg: Math.atan(Math.hypot(dzdx, dzdy)) * RAD2DEG };
}

function rasterAccessor(raster) {
  return (x, y) => {
    const v = raster.getPixelValue(x, y);
    return v === null ? NaN : v;
  };
}

/** Terrain slope (degrees) at a coordinate, or null outside data. */
export function terrainSlopeAt(raster, lat, lon) {
  if (!raster.isWithinBounds(lat, lon)) return null;
  const { line, sample } = raster.geographicToPixel(lat, lon);
  const s = slopeFromGrid(rasterAccessor(raster), Math.round(sample), Math.round(line), raster.metadata.resolutionX);
  return s ? s.slopeDeg : null;
}

/**
 * Samples a route at roughly the raster's cell size so no cell along a leg is skipped.
 *
 * @param {import('./dtm-loader.js').DtmRaster} raster
 * @param {Array<[number, number]>} points - [lat, lon] waypoints in order
 * @param {{closeLoop?: boolean, spacingM?: number, legPaths?: Array<Array<[number, number]>|null>}} [opts]
 *   legPaths[i] - optional polyline for leg i (e.g. from findSafePath); straight line otherwise
 * @returns {{samples: Array, legs: Array, summary: Object}}
 */
export function profileRoute(raster, points, opts = {}) {
  const closeLoop = opts.closeLoop !== false;
  const spacingM = opts.spacingM || raster.metadata.resolutionX;
  const path = closeLoop && points.length > 1 ? points.concat([points[0]]) : points.slice();
  const legPaths = opts.legPaths || [];

  const samples = [];
  const legs = [];
  let distM = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const line = legPaths[i] || [path[i], path[i + 1]];
    const leg = { idx: i, fromKm: distM / 1000, lengthKm: 0, maxSlopeDeg: 0, climbM: 0, noData: false, hazards: [], path: line };

    for (let v = 0; v < line.length - 1; v++) {
      const [lat0, lon0] = line[v];
      const [lat1, lon1] = line[v + 1];
      const segM = marsDistanceMeters(lat0, lon0, lat1, lon1);
      const steps = Math.max(1, Math.ceil(segM / spacingM));

      for (let k = samples.length === 0 ? 0 : 1; k <= steps; k++) {
        const f = k / steps;
        const lat = lat0 + (lat1 - lat0) * f;
        const lon = lon0 + (lon1 - lon0) * f;
        const r = raster.sampleElevation(lat, lon, { allowNearestFallbackOnNoData: true });
        const slope = r.valid ? terrainSlopeAt(raster, lat, lon) : null;
        const s = {
          lat, lon, legIdx: i,
          distKm: (distM + segM * f) / 1000,
          elevM: r.valid ? r.elevation : null,
          terrainSlopeDeg: slope,
          roughnessM: roughnessAt(raster, lat, lon),
          gradeDeg: 0
        };
        const prev = samples[samples.length - 1];
        if (prev && prev.elevM !== null && s.elevM !== null) {
          const run = (s.distKm - prev.distKm) * 1000;
          if (run > 0) s.gradeDeg = Math.atan((s.elevM - prev.elevM) / run) * RAD2DEG;
          if (s.elevM > prev.elevM) leg.climbM += s.elevM - prev.elevM;
        }
        if (s.elevM === null || slope === null) leg.noData = true;
        if (slope !== null) leg.maxSlopeDeg = Math.max(leg.maxSlopeDeg, slope);
        samples.push(s);
      }
      distM += segM;
    }

    leg.lengthKm = distM / 1000 - leg.fromKm;
    const legSamples = samples.filter((s) => s.legIdx === i);
    leg.hazards = hazardRuns(legSamples);
    leg.rough = roughRuns(legSamples);
    legs.push(leg);
  }

  return { samples, legs, summary: summarize(samples, legs, distM) };
}

/** Contiguous runs of steep / impassable terrain along one leg. */
function hazardRuns(legSamples) {
  const runs = [];
  let cur = null;
  for (const s of legSamples) {
    const cls = s.terrainSlopeDeg === null ? null : classifySlope(s.terrainSlopeDeg).id;
    const bad = cls === 'steep' || cls === 'impassable' ? cls : null;
    if (bad && cur && (cur.cls === bad || bad === 'impassable')) {
      cur.cls = bad === 'impassable' ? 'impassable' : cur.cls;
      cur.toKm = s.distKm; cur.maxSlopeDeg = Math.max(cur.maxSlopeDeg, s.terrainSlopeDeg);
    } else if (bad) {
      cur = { cls: bad, fromKm: s.distKm, toKm: s.distKm, maxSlopeDeg: s.terrainSlopeDeg, lat: s.lat, lon: s.lon };
      runs.push(cur);
    } else {
      cur = null;
    }
  }
  return runs;
}

/** Contiguous runs of rough (≥ROUGHNESS.roughM) ground along one leg. */
function roughRuns(legSamples) {
  const runs = [];
  let cur = null;
  for (const s of legSamples) {
    if (s.roughnessM !== null && s.roughnessM >= ROUGHNESS.roughM) {
      if (!cur) runs.push((cur = { fromKm: s.distKm, toKm: s.distKm, maxRoughM: 0, lat: s.lat, lon: s.lon }));
      cur.toKm = s.distKm; cur.maxRoughM = Math.max(cur.maxRoughM, s.roughnessM);
    } else {
      cur = null;
    }
  }
  return runs;
}

function summarize(samples, legs, distM) {
  const elevs = samples.map((s) => s.elevM).filter((v) => v !== null);
  const hazards = legs.flatMap((l) => l.hazards.map((h) => ({ ...h, legIdx: l.idx })));
  return {
    totalKm: distM / 1000,
    minElevM: elevs.length ? Math.min(...elevs) : null,
    maxElevM: elevs.length ? Math.max(...elevs) : null,
    climbM: legs.reduce((a, l) => a + l.climbM, 0),
    maxTerrainSlopeDeg: legs.reduce((a, l) => Math.max(a, l.maxSlopeDeg), 0),
    impassable: hazards.filter((h) => h.cls === 'impassable'),
    steep: hazards.filter((h) => h.cls === 'steep'),
    rough: legs.flatMap((l) => l.rough.map((r) => ({ ...r, legIdx: l.idx }))),
    noDataLegs: legs.filter((l) => l.noData).map((l) => l.idx)
  };
}

/* ------------------------------------------------------------------ */
/* Safe-path routing                                                   */
/* ------------------------------------------------------------------ */

const slopeGridCache = new WeakMap();

/** Terrain slope for every cell (NaN where no data), computed once per raster. */
export function slopeGrid(raster) {
  let g = slopeGridCache.get(raster);
  if (g) return g;
  const W = raster.metadata.samples, H = raster.metadata.lines, cell = raster.metadata.resolutionX;
  const at = rasterAccessor(raster);
  g = new Float32Array(W * H).fill(NaN);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = slopeFromGrid(at, x, y, cell);
      if (s) g[y * W + x] = s.slopeDeg;
    }
  }
  slopeGridCache.set(raster, g);
  return g;
}

/** Cost multiplier per slope class; Infinity = never step there. */
export const ROUTING_COST = { nominal: 1, moderate: 1.6, steep: 4, impassable: Infinity };
// Naismith-style climb penalty: 1 m of ascent costs like 8 m of level walking
const CLIMB_PENALTY = 8;
/** Extra cost multiplier on rough / blocky ground (on top of the slope cost). */
export const ROUGH_COST = { rough: 2, blocky: 6 };

/**
 * Least-effort walking path between two points that never enters terrain ≥ 20° slope.
 * A* over 8-connected grid cells, searched inside a window around the two points.
 *
 * @param {import('./dtm-loader.js').DtmRaster} raster
 * @param {[number, number]} from - [lat, lon]
 * @param {[number, number]} to - [lat, lon]
 * @param {{marginM?: number}} [opts] - search window margin around the endpoints
 * @returns {{path: Array<[number, number]>, lengthM: number}|null} null when no safe path exists
 */
export function findSafePath(raster, from, to, opts = {}) {
  if (!raster.isWithinBounds(from[0], from[1]) || !raster.isWithinBounds(to[0], to[1])) return null;
  const W = raster.metadata.samples, H = raster.metadata.lines, cell = raster.metadata.resolutionX;
  const slopes = slopeGrid(raster);
  const px = (p) => {
    const { line, sample } = raster.geographicToPixel(p[0], p[1]);
    return [Math.min(W - 1, Math.max(0, Math.round(sample))), Math.min(H - 1, Math.max(0, Math.round(line)))];
  };
  const [sx, sy] = px(from), [gx, gy] = px(to);
  const directCells = Math.hypot(gx - sx, gy - sy);
  const margin = Math.ceil(Math.max(opts.marginM || 1000, directCells * cell * 0.75) / cell);
  const x0 = Math.max(0, Math.min(sx, gx) - margin), x1 = Math.min(W - 1, Math.max(sx, gx) + margin);
  const y0 = Math.max(0, Math.min(sy, gy) - margin), y1 = Math.min(H - 1, Math.max(sy, gy) + margin);
  const ww = x1 - x0 + 1, wh = y1 - y0 + 1;

  const start = (sy - y0) * ww + (sx - x0), goal = (gy - y0) * ww + (gx - x0);
  const gCost = new Float64Array(ww * wh).fill(Infinity);
  const parent = new Int32Array(ww * wh).fill(-1);
  const closed = new Uint8Array(ww * wh);
  const heap = new MinHeap();
  gCost[start] = 0;
  heap.push(start, 0);

  const elev = (x, y) => { const v = raster.getPixelValue(x, y); return v === null ? NaN : v; };
  const rough = raster.roughness;
  const costAt = (x, y) => {
    const sl = slopes[y * W + x];
    if (Number.isNaN(sl)) return Infinity;
    const r = rough ? rough[y * W + x] : NaN;
    const rf = r >= ROUGHNESS.blockyM ? ROUGH_COST.blocky : r >= ROUGHNESS.roughM ? ROUGH_COST.rough : 1;
    return ROUTING_COST[classifySlope(sl).id] * rf;
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  while (heap.size) {
    const cur = heap.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = (cur % ww) + x0, cy = ((cur / ww) | 0) + y0;
    const ce = elev(cx, cy);
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
      const ni = (ny - y0) * ww + (nx - x0);
      if (closed[ni]) continue;
      // The goal cell itself may sit on a ledge; everything else must be walkable
      const factor = ni === goal ? Math.min(costAt(nx, ny), ROUTING_COST.steep) : costAt(nx, ny);
      if (factor === Infinity) continue;
      // No squeezing diagonally between two no-go cells
      if (dx && dy && (costAt(cx + dx, cy) === Infinity || costAt(cx, cy + dy) === Infinity)) continue;
      const stepM = (dx && dy ? Math.SQRT2 : 1) * cell;
      const ne = elev(nx, ny);
      const climb = Number.isNaN(ne) || Number.isNaN(ce) ? 0 : Math.max(0, ne - ce);
      const g = gCost[cur] + stepM * factor + climb * CLIMB_PENALTY;
      if (g < gCost[ni]) {
        gCost[ni] = g;
        parent[ni] = cur;
        heap.push(ni, g + Math.hypot(nx - gx, ny - gy) * cell);
      }
    }
  }

  if (gCost[goal] === Infinity) return null;

  const cells = [];
  for (let c = goal; c !== -1; c = parent[c]) cells.push(c);
  cells.reverse();
  const path = cells.map((c) => {
    const g = raster.pixelToGeographic(((c / ww) | 0) + y0, (c % ww) + x0);
    return [g.lat, g.lon];
  });
  path[0] = [from[0], from[1]];
  path[path.length - 1] = [to[0], to[1]];
  // Tight tolerance: only merge steps that are (nearly) collinear so the line never cuts across a no-go cell
  const simplified = simplifyPath(path, cell * 0.05);
  let lengthM = 0;
  for (let i = 1; i < simplified.length; i++) {
    lengthM += marsDistanceMeters(simplified[i - 1][0], simplified[i - 1][1], simplified[i][0], simplified[i][1]);
  }
  return { path: simplified, lengthM };
}

/** Drops collinear grid steps (keeps vertices that deviate more than toleranceM). */
function simplifyPath(path, toleranceM) {
  if (path.length < 3) return path;
  const degPerM = 1 / 59000; // ~1° ≈ 59 km on Mars; only used for a tolerance check
  const tol = toleranceM * degPerM;
  const keep = new Uint8Array(path.length);
  keep[0] = keep[path.length - 1] = 1;
  const stack = [[0, path.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0, idx = -1;
    const [ay, ax] = path[a], [by, bx] = path[b];
    const len = Math.hypot(bx - ax, by - ay) || 1e-12;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - path[i][0]) - (ax - path[i][1]) * (by - ay)) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return path.filter((_, i) => keep[i]);
}

class MinHeap {
  constructor() { this.items = []; this.prio = []; }
  get size() { return this.items.length; }
  push(item, p) {
    const it = this.items, pr = this.prio;
    let i = it.length;
    it.push(item); pr.push(p);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (pr[up] <= p) break;
      it[i] = it[up]; pr[i] = pr[up]; i = up;
    }
    it[i] = item; pr[i] = p;
  }
  pop() {
    const it = this.items, pr = this.prio;
    const top = it[0];
    const lastI = it.pop(), lastP = pr.pop();
    if (it.length) {
      let i = 0;
      const n = it.length;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && pr[c + 1] < pr[c]) c++;
        if (pr[c] >= lastP) break;
        it[i] = it[c]; pr[i] = pr[c]; i = c;
      }
      it[i] = lastI; pr[i] = lastP;
    }
    return top;
  }
}
