import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { DtmRaster, decodeElevationGrid } from '../src/data/dtm-loader.js';
import { ElevationService } from '../src/data/elevation-service.js';
import { classifySlope, slopeFromGrid, profileRoute, findSafePath } from '../src/data/terrain-analysis.js';
import { DEFAULT_ROUTE } from '../src/config/mission.js';

// n×n raster of 10 m cells straddling the equator; elev(row, col) gives metres
const CELL_DEG = 10 / ((Math.PI / 180) * 3389500);
function grid(n, elev) {
  const data = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) data.push(elev(r, c));
  const half = ((n - 1) * CELL_DEG) / 2;
  return new DtmRaster({
    id: 'synthetic',
    metadata: { lines: n, samples: n, resolutionX: 10, resolutionY: 10, noDataValue: -9999 },
    bounds: { west: 137 - half, east: 137 + half, south: -half, north: half },
    elevation: { min: Math.min(...data), max: Math.max(...data) },
    data
  });
}
const at = (raster, r, c) => {
  const p = raster.pixelToGeographic(r, c);
  return [p.lat, p.lon];
};
// 40×40 flat floor split by a 100 m wall in column 20; `gap` leaves the bottom rows open
const walled = (gap) => grid(40, (r, c) => (c === 20 && (!gap || r < 35) ? 100 : 0));

test('classifySlope uses the 10/15/20° safety thresholds', () => {
  assert.equal(classifySlope(5).id, 'nominal');
  assert.equal(classifySlope(12).id, 'moderate');
  assert.equal(classifySlope(17).id, 'steep');
  assert.equal(classifySlope(25).id, 'impassable');
});

test('slopeFromGrid: a plane rising 1 m per 10 m cell is atan(0.1) ≈ 5.71°', () => {
  const s = slopeFromGrid((x) => x * 1, 5, 5, 10);
  assert.ok(Math.abs(s.slopeDeg - 5.71) < 0.01, `got ${s.slopeDeg}`);
});

test('findSafePath detours through the gap instead of crossing a wall', () => {
  const raster = walled(true);
  const from = at(raster, 5, 5), to = at(raster, 5, 35);
  const r = findSafePath(raster, from, to);
  assert.ok(r, 'expected a path');
  assert.ok(r.lengthM > 300 * 1.5, `path should detour, got ${r.lengthM} m`);
  const profile = profileRoute(raster, [from, to], { closeLoop: false, legPaths: [r.path] });
  assert.equal(profile.summary.impassable.length, 0);
});

test('findSafePath returns null when the wall is unbroken', () => {
  const raster = walled(false);
  assert.equal(findSafePath(raster, at(raster, 5, 5), at(raster, 5, 35)), null);
});

test('profileRoute flags the impassable crossing on a straight leg', () => {
  const raster = walled(true);
  const profile = profileRoute(raster, [at(raster, 5, 5), at(raster, 5, 35)], { closeLoop: false });
  assert.ok(profile.summary.impassable.length >= 1);
  assert.ok(profile.summary.maxTerrainSlopeDeg >= 20);
});

test('decodeElevationGrid: int16 decimetres with offset, no-data → NaN', () => {
  const buf = new ArrayBuffer(6);
  const v = new DataView(buf);
  v.setInt16(0, 0, true); v.setInt16(2, 100, true); v.setInt16(4, -32768, true);
  const out = decodeElevationGrid({ type: 'int16-le', scale: 0.1, offset: -4100, noData: -32768 }, buf);
  assert.deepEqual([...out.slice(0, 2)], [-4100, -4090]);
  assert.ok(Number.isNaN(out[2]));
  assert.throws(() => decodeElevationGrid({ type: 'float32' }, buf));
});

test('real Sakarya DTM: default route has safe legs that never exceed 20°', async () => {
  const raster = await new ElevationService().load(join(process.cwd(), 'data/terrain/sakarya-10m.json'));
  assert.equal(raster.metadata.samples, 689);
  assert.equal(raster.metadata.lines, 1590);
  const pts = DEFAULT_ROUTE.map((w) => w.pos);
  const legPaths = pts.map((p, i) => {
    const r = findSafePath(raster, p, pts[(i + 1) % pts.length]);
    assert.ok(r, `leg ${i + 1} has no safe path`);
    return r.path;
  });
  const { summary } = profileRoute(raster, pts, { legPaths });
  assert.equal(summary.impassable.length, 0);
  assert.equal(summary.noDataLegs.length, 0);
  assert.ok(summary.minElevM > -4100 && summary.maxElevM < -2400);
});
