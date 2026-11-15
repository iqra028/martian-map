import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DtmRaster, loadDtmRaster } from '../src/data/dtm-loader.js';
import { ElevationService } from '../src/data/elevation-service.js';
import {
  geodeticToTrueEnu,
  trueEnuToGeodetic,
  geodeticToEquirectangularTangent,
  equirectangularTangentToGeodetic,
  planetocentricToCartesian,
  cartesianToPlanetocentric,
  marsDistanceMeters
} from '../src/geo/coordinates.js';
import { createTerrainRenderSpec } from '../src/views/scene-3d/terrain-contract.js';

// Load test sample JSON fixtures
const synthPath = join(process.cwd(), 'data', 'samples', 'synthetic-grid-3x3.json');
const synthJson = JSON.parse(readFileSync(synthPath, 'utf-8'));

const galeSamplePath = join(process.cwd(), 'data', 'samples', 'gale-chasm-sample.json');
const galeSampleJson = JSON.parse(readFileSync(galeSamplePath, 'utf-8'));

// ==========================================
// A. Metadata & Validation Tests
// ==========================================

test('A1. Valid raster loads successfully and exposes normalized metadata', () => {
  const raster = loadDtmRaster(synthJson);

  assert.equal(raster.id, 'synthetic-test-3x3');
  assert.equal(raster.metadata.samples, 3);
  assert.equal(raster.metadata.lines, 3);
  assert.equal(raster.metadata.width, 3);
  assert.equal(raster.metadata.height, 3);
  assert.equal(raster.metadata.units, 'meters');
  assert.equal(raster.metadata.noDataValue, -9999.0);
  assert.equal(raster.bounds.west, 137.0);
  assert.equal(raster.bounds.east, 137.02);
  assert.equal(raster.bounds.south, -5.02);
  assert.equal(raster.bounds.north, -5.00);
  assert.equal(raster.elevation.min, 100.0);
  assert.equal(raster.elevation.max, 900.0);
});

test('A2. Rejects invalid or mismatched raster dimensions and lengths', () => {
  // Dimension <= 0
  assert.throws(
    () => new DtmRaster({ ...synthJson, metadata: { ...synthJson.metadata, lines: 0 } }),
    /Invalid raster dimensions/
  );

  // Data length mismatch: 3x3 expects 9 values, pass 8
  assert.throws(
    () => new DtmRaster({ ...synthJson, data: [1, 2, 3, 4, 5, 6, 7, 8] }),
    /Raster data length mismatch/
  );

  // Inverted latitude bounds (north <= south)
  assert.throws(
    () => new DtmRaster({ ...synthJson, bounds: { west: 137, east: 137.1, south: -5.0, north: -5.1 } }),
    /Invalid latitude bounds/
  );

  // Inverted longitude bounds (east <= west)
  assert.throws(
    () => new DtmRaster({ ...synthJson, bounds: { west: 137.2, east: 137.1, south: -5.1, north: -5.0 } }),
    /Invalid longitude bounds/
  );
});

// ==========================================
// B. Pixel-to-Geographic Georeferencing Tests
// ==========================================

test('B1. Pixel corner and center coordinates mapping', () => {
  const raster = loadDtmRaster(synthJson);

  // Top-left corner: line 0, sample 0 -> north, west (-5.00°, 137.00°)
  const nw = raster.pixelToGeographic(0, 0);
  assert.ok(Math.abs(nw.lat - (-5.00)) < 1e-6);
  assert.ok(Math.abs(nw.lon - 137.00) < 1e-6);

  // Bottom-right corner: line 2, sample 2 -> south, east (-5.02°, 137.02°)
  const se = raster.pixelToGeographic(2, 2);
  assert.ok(Math.abs(se.lat - (-5.02)) < 1e-6);
  assert.ok(Math.abs(se.lon - 137.02) < 1e-6);

  // Center pixel: line 1, sample 1 -> center (-5.01°, 137.01°)
  const center = raster.pixelToGeographic(1, 1);
  assert.ok(Math.abs(center.lat - (-5.01)) < 1e-6);
  assert.ok(Math.abs(center.lon - 137.01) < 1e-6);

  // Reverse mapping geographicToPixel
  const pxCenter = raster.geographicToPixel(-5.01, 137.01);
  assert.ok(Math.abs(pxCenter.line - 1.0) < 1e-5);
  assert.ok(Math.abs(pxCenter.sample - 1.0) < 1e-5);
});

// ==========================================
// C. Elevation Sampling Tests
// ==========================================

test('C1. Exact pixel-center elevation sampling', () => {
  const raster = loadDtmRaster(synthJson);

  // Grid values:
  // [ 100, 200, 300 ] (line 0)
  // [ 400, 500, 600 ] (line 1)
  // [ 700, 800, 900 ] (line 2)

  // Sample center pixel (-5.01°, 137.01°)
  const resCenter = raster.sampleElevation(-5.01, 137.01, { method: 'nearest' });
  assert.equal(resCenter.valid, true);
  assert.equal(resCenter.status, 'VALID');
  assert.equal(resCenter.elevation, 500.0);

  // Sample top-left pixel (-5.00°, 137.00°)
  const resNw = raster.sampleElevation(-5.00, 137.00, { method: 'nearest' });
  assert.equal(resNw.elevation, 100.0);

  // Sample bottom-right pixel (-5.02°, 137.02°)
  const resSe = raster.sampleElevation(-5.02, 137.02, { method: 'nearest' });
  assert.equal(resSe.elevation, 900.0);
});

test('C2. Bilinear interpolation between grid nodes', () => {
  const raster = loadDtmRaster(synthJson);

  // Midpoint between top-left (100) and top-mid (200) at sample 0.5, line 0
  // lon = 137.005, lat = -5.00
  const resMidX = raster.sampleElevation(-5.00, 137.005, { method: 'bilinear' });
  assert.equal(resMidX.valid, true);
  assert.ok(Math.abs(resMidX.elevation - 150.0) < 1e-4, `Expected 150.0, got ${resMidX.elevation}`);

  // Midpoint between top-left (100) and mid-left (400) at sample 0, line 0.5
  // lon = 137.00, lat = -5.005
  const resMidY = raster.sampleElevation(-5.005, 137.00, { method: 'bilinear' });
  assert.equal(resMidY.valid, true);
  assert.ok(Math.abs(resMidY.elevation - 250.0) < 1e-4, `Expected 250.0, got ${resMidY.elevation}`);

  // Center of cell (sample 0.5, line 0.5):
  // Average of 100, 200, 400, 500 = 1200 / 4 = 300.0
  const resCellCenter = raster.sampleElevation(-5.005, 137.005, { method: 'bilinear' });
  assert.equal(resCellCenter.valid, true);
  assert.ok(Math.abs(resCellCenter.elevation - 300.0) < 1e-4, `Expected 300.0, got ${resCellCenter.elevation}`);
});

test('C3. Out of bounds and invalid inputs handling', () => {
  const raster = loadDtmRaster(synthJson);

  // Outside north
  const outNorth = raster.sampleElevation(-4.99, 137.01);
  assert.equal(outNorth.valid, false);
  assert.equal(outNorth.status, 'OUT_OF_BOUNDS');
  assert.equal(outNorth.elevation, null);

  // Outside west
  const outWest = raster.sampleElevation(-5.01, 136.99);
  assert.equal(outWest.valid, false);
  assert.equal(outWest.status, 'OUT_OF_BOUNDS');

  // Invalid inputs (NaN, null, strings)
  const invalidLat = raster.sampleElevation(NaN, 137.01);
  assert.equal(invalidLat.valid, false);
  assert.equal(invalidLat.status, 'INVALID_INPUT');

  const invalidType = raster.sampleElevation("invalid", 137.01);
  assert.equal(invalidType.valid, false);
  assert.equal(invalidType.status, 'INVALID_INPUT');
});

test('C4. No-data handling and refusal to interpolate through missing data', () => {
  // Create a grid where one corner is noData (-9999.0)
  const noDataGrid = {
    ...synthJson,
    data: [
      100.0, -9999.0, 300.0, // node (0,1) is noData
      400.0, 500.0, 600.0,
      700.0, 800.0, 900.0
    ]
  };
  const raster = loadDtmRaster(noDataGrid);

  // Sampling exactly on the no-data node with nearest neighbor
  const resNearest = raster.sampleElevation(-5.00, 137.01, { method: 'nearest' });
  assert.equal(resNearest.valid, false);
  assert.equal(resNearest.status, 'NO_DATA');
  assert.equal(resNearest.elevation, null);

  // Sampling in the cell touching the no-data node with bilinear interpolation
  // (must NOT interpolate through noData)
  const resBilinear = raster.sampleElevation(-5.005, 137.005, { method: 'bilinear' });
  assert.equal(resBilinear.valid, false);
  assert.equal(resBilinear.status, 'NO_DATA');
  assert.equal(resBilinear.elevation, null);
});

// ==========================================
// D. Mars Geodesy & Coordinate Transformations
// ==========================================

test('D1. Mars True Topocentric ENU vs Equirectangular Tangent Comparison', () => {
  const originLat = -5.0900;
  const originLon = 137.2300;
  const originAlt = -3500.0;

  const targetLat = -5.0800;
  const targetLon = 137.2400;
  const targetAlt = -3450.0;

  // True ENU
  const trueEnu = geodeticToTrueEnu(targetLat, targetLon, targetAlt, originLat, originLon, originAlt);
  assert.ok(trueEnu.east > 585 && trueEnu.east < 592);
  assert.ok(trueEnu.north > 585 && trueEnu.north < 595);
  // Planetary curvature causes Up to be slightly below flat 50.0m
  assert.ok(trueEnu.up < 50.0 && trueEnu.up > 49.5);

  // True ENU roundtrip
  const roundtrip = trueEnuToGeodetic(trueEnu.east, trueEnu.north, trueEnu.up, originLat, originLon, originAlt);
  assert.ok(Math.abs(roundtrip.lat - targetLat) < 1e-9);
  assert.ok(Math.abs(roundtrip.lon - targetLon) < 1e-9);
  assert.ok(Math.abs(roundtrip.alt - targetAlt) < 1e-6);

  // Equirectangular Tangent Approximation
  const approx = geodeticToEquirectangularTangent(targetLat, targetLon, targetAlt, originLat, originLon, originAlt);
  assert.equal(approx.up, 50.0); // Does not account for curvature

  // Verify that difference is small (<1m over 800m) but real
  const dEast = Math.abs(trueEnu.east - approx.east);
  const dNorth = Math.abs(trueEnu.north - approx.north);
  assert.ok(dEast < 1.0 && dEast > 0.1);
  assert.ok(dNorth < 1.0 && dNorth > 0.1);
});

test('D2. Mars-Centered Cartesian (MCF) vector consistency', () => {
  // Test point on equator at 0 deg longitude
  const pEq = planetocentricToCartesian(0, 0, 0);
  assert.ok(Math.abs(pEq.x - 3389500.0) < 1e-3);
  assert.ok(Math.abs(pEq.y - 0.0) < 1e-3);
  assert.ok(Math.abs(pEq.z - 0.0) < 1e-3);

  // Test North Pole (lat = 90 deg)
  const pPole = planetocentricToCartesian(90, 0, 0);
  assert.ok(Math.abs(pPole.x - 0.0) < 1e-3);
  assert.ok(Math.abs(pPole.z - 3389500.0) < 1e-3);

  // Roundtrip
  const geoPole = cartesianToPlanetocentric(pPole.x, pPole.y, pPole.z);
  assert.ok(Math.abs(geoPole.lat - 90.0) < 1e-6);
});

// ==========================================
// E. ElevationService Lifecycle & Multi-Renderer Contract
// ==========================================

test('E1. ElevationService lifecycle and sampling', async () => {
  const service = new ElevationService();
  assert.equal(service.getStatus(), 'UNINITIALIZED');
  assert.equal(service.isReady(), false);

  // Sampling before load returns uninitialized
  const preSample = service.sampleElevation(-5.01, 137.01);
  assert.equal(preSample.valid, false);
  assert.equal(preSample.status, 'UNINITIALIZED');

  // Load verified Gale Chasm sample
  await service.load(galeSampleJson);
  assert.equal(service.getStatus(), 'READY');
  assert.equal(service.isReady(), true);

  const bounds = service.getBounds();
  assert.equal(bounds.west, 137.225);
  assert.equal(bounds.east, 137.235);

  // Sample inside the chasm
  const sample = service.sampleElevation(-5.090, 137.230);
  assert.equal(sample.valid, true);
  assert.equal(sample.status, 'VALID');
  assert.ok(sample.elevation < -3400 && sample.elevation > -3480);

  // Sample outside with regional fallback
  service.regionalFallback = (lat, lon) => -4200.0;
  const outsideFallback = service.sampleElevation(-5.50, 137.50);
  assert.equal(outsideFallback.valid, true);
  assert.equal(outsideFallback.quality, 'REGIONAL_COARSE_FALLBACK_463M');
  assert.equal(outsideFallback.elevation, -4200.0);
});

test('E2. 3D Terrain Render Specification contract generation', async () => {
  const service = new ElevationService();
  await service.load(galeSampleJson);

  const spec = createTerrainRenderSpec(service);
  assert.equal(spec.isPlaceholderContract, true);
  assert.equal(spec.datasetId, 'DTEEC_006855_1750_007501_1750_SAMPLE');
  assert.equal(spec.gridDimensions.columns, 10);
  assert.equal(spec.gridDimensions.rows, 10);
  assert.equal(spec.gridDimensions.totalVertices, 100);
  assert.ok(spec.metricBounds.widthMeters > 500);
  assert.ok(spec.metricBounds.heightMeters > 500);
  assert.ok(spec.elevationBuffer instanceof Float32Array);
  assert.equal(spec.elevationBuffer.length, 100);
});
