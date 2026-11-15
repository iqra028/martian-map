import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARS,
  marsDistanceMeters,
  geodeticToEnu,
  enuToGeodetic,
  normalizeLatitude
} from '../src/geo/coordinates.js';

test('Mars geodesic distance calculation', () => {
  // Test 1 degree of latitude along meridian:
  // Circumference = 2 * PI * R_MARS = 2 * PI * 3389500 = 21,296,807.9 m
  // 1 degree = 21,296,807.9 / 360 = 59,157.8 m
  const dist1Deg = marsDistanceMeters(0, 0, 1, 0);
  assert.ok(Math.abs(dist1Deg - 59157.8) < 1.0, `Expected ~59157.8m, got ${dist1Deg}`);

  // Test zero distance
  assert.equal(marsDistanceMeters(-5.06, 137.46, -5.06, 137.46), 0);

  // Test Gale Crater traverse point distance:
  // [-5.08, 137.45] to [-5.074, 137.465]
  const legDist = marsDistanceMeters(-5.0800, 137.4500, -5.0740, 137.4650);
  assert.ok(legDist > 900 && legDist < 1200, `Expected ~1000m leg distance, got ${legDist}`);
});

test('Topocentric ENU forward and inverse round-trip', () => {
  const originLat = -5.0600;
  const originLon = 137.4600;
  const originAlt = -4000.0;

  const targetLat = -5.0700;
  const targetLon = 137.4700;
  const targetAlt = -3950.0;

  // Forward conversion
  const enu = geodeticToEnu(targetLat, targetLon, targetAlt, originLat, originLon, originAlt);

  assert.ok(enu.east > 580 && enu.east < 600, `Expected east ~589m, got ${enu.east}`);
  assert.ok(enu.north < -580 && enu.north > -600, `Expected north ~-591m, got ${enu.north}`);
  assert.equal(enu.up, 50.0);
  assert.equal(enu.x, enu.east);
  assert.equal(enu.y, enu.up);
  assert.equal(enu.z, -enu.north);

  // Inverse conversion
  const geo = enuToGeodetic(enu.x, enu.y, enu.z, originLat, originLon, originAlt);

  assert.ok(Math.abs(geo.lat - targetLat) < 1e-7, `Latitude mismatch: ${geo.lat}`);
  assert.ok(Math.abs(geo.lon - targetLon) < 1e-7, `Longitude mismatch: ${geo.lon}`);
  assert.ok(Math.abs(geo.alt - targetAlt) < 1e-4, `Altitude mismatch: ${geo.alt}`);
});

test('Latitude normalization', () => {
  assert.equal(normalizeLatitude(-5.06), -5.06);
  assert.equal(normalizeLatitude("5.06 S"), -5.06);
  assert.equal(normalizeLatitude("12.5 N"), 12.5);
  assert.throws(() => normalizeLatitude("invalid"), RangeError);
  assert.throws(() => normalizeLatitude("-5.06 N"), Error);
});
