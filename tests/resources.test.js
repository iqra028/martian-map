import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIFE_SUPPORT_CONSTANTS,
  calculateMetabolicPowerWatts,
  calculateOxygenRateLitersPerMin,
  calculateWaterLossRateKgPerHour,
  calculateBatteryPowerWatts,
  calculatePnrMargin
} from '../src/core/resource-model.js';

test('Metabolic power calculation', () => {
  // Standing rest
  const pRest = calculateMetabolicPowerWatts(0, 0, 210);
  assert.equal(pRest, 160.0);

  // Nominal walking (2 km/h = 0.56 m/s) on flat ground
  const pWalkFlat = calculateMetabolicPowerWatts(0.56, 0, 210);
  assert.ok(pWalkFlat >= 260 && pWalkFlat <= 340, `Expected nominal ~300W, got ${pWalkFlat}`);

  // Moderate uphill (10 deg slope)
  const pWalkSlope = calculateMetabolicPowerWatts(0.56, 10, 210);
  assert.ok(pWalkSlope > pWalkFlat, `Uphill wattage should exceed flat wattage: ${pWalkSlope} vs ${pWalkFlat}`);
  assert.ok(pWalkSlope >= 350 && pWalkSlope <= 520, `Expected uphill ~400-500W, got ${pWalkSlope}`);
});

test('Oxygen consumption rate reconciliation', () => {
  // Formula: (Pmet * 60) / 20,100 J/L
  // At 160 W (standing rest): (160 * 60) / 20100 = 0.4776 L/min
  const o2Rest = calculateOxygenRateLitersPerMin(160);
  assert.ok(Math.abs(o2Rest - 0.4776) < 0.01, `Expected ~0.48 L/min, got ${o2Rest}`);

  // At 300 W (nominal walking): (300 * 60) / 20100 = 0.8955 L/min
  const o2Walk = calculateOxygenRateLitersPerMin(300);
  assert.ok(Math.abs(o2Walk - 0.8955) < 0.01, `Expected ~0.90 L/min, got ${o2Walk}`);

  // At 650 W (steep climb): (650 * 60) / 20100 = 1.940 L/min
  const o2Climb = calculateOxygenRateLitersPerMin(650);
  assert.ok(Math.abs(o2Climb - 1.940) < 0.01, `Expected ~1.94 L/min, got ${o2Climb}`);

  // At 737 W (peak aerobic limit): (737 * 60) / 20100 = 2.20 L/min
  const o2Peak = calculateOxygenRateLitersPerMin(737);
  assert.ok(Math.abs(o2Peak - 2.20) < 0.01, `Expected ~2.20 L/min, got ${o2Peak}`);
});

test('Sublimator cooling water loss rate', () => {
  // Latent heat: 2.83 MJ / kg
  // Heat load = Pmet + 180W avionics
  // At 300 W metabolic: 480 W heat load
  // Loss = (480 * 3600) / 2.83e6 = 0.6106 kg/hr
  const waterRateNominal = calculateWaterLossRateKgPerHour(300, 180);
  assert.ok(Math.abs(waterRateNominal - 0.6106) < 0.01, `Expected ~0.61 kg/hr, got ${waterRateNominal}`);

  // Total duration arithmetic verification:
  // 8 kg capacity / 0.6106 kg/hr = ~13.1 hours total capacity
  const hoursNominal = 8.0 / waterRateNominal;
  assert.ok(hoursNominal > 12.5 && hoursNominal < 13.5, `Expected ~13.1 hours, got ${hoursNominal}`);
});

test('Point of No Return (PNR) margin normalization', () => {
  const capacity = 1200; // Liters O2
  const reserveFactor = 0.25; // 25% safety reserve

  // Scenario 1: Abundant resources (Remaining = 1000L, Return Cost = 200L)
  // Required with reserve = 1.25 * 200 = 250L
  // Margin = (1000 - 250) / 1200 = 750 / 1200 = +62.5% -> NOMINAL
  const res1 = calculatePnrMargin(1000, 200, capacity, reserveFactor);
  assert.equal(res1.status, 'NOMINAL');
  assert.equal(res1.marginPercent, 62.5);

  // Scenario 2: Caution zone (Remaining = 300L, Return Cost = 200L)
  // Required with reserve = 250L
  // Margin = (300 - 250) / 1200 = 50 / 1200 = +4.16% -> CAUTION
  const res2 = calculatePnrMargin(300, 200, capacity, reserveFactor);
  assert.equal(res2.status, 'CAUTION');
  assert.ok(res2.marginPercent > 0 && res2.marginPercent <= 15.0);

  // Scenario 3: Breach / Abort (Remaining = 240L, Return Cost = 200L)
  // Required with reserve = 250L
  // Margin = (240 - 250) / 1200 = -10 / 1200 = -0.83% -> CRITICAL_ABORT
  const res3 = calculatePnrMargin(240, 200, capacity, reserveFactor);
  assert.equal(res3.status, 'CRITICAL_ABORT');
  assert.ok(res3.marginPercent < 0);
});

test('Battery power draw and metabolic independence', () => {
  // Test baseline avionics load
  const battBase = calculateBatteryPowerWatts(180, 0);
  assert.equal(battBase, 180.0, 'Battery baseline must be 180W');

  // Test pulse heaters active
  const battHeaters = calculateBatteryPowerWatts(180, 50);
  assert.equal(battHeaters, 230.0, 'Battery with heaters must be 230W');

  // Verify that suit joint resistance is constant 70W and is documented
  assert.equal(LIFE_SUPPORT_CONSTANTS.SUIT_JOINT_RESISTANCE_WATTS, 70.0);
  assert.equal(LIFE_SUPPORT_CONSTANTS.SUIT_AVIONICS_BASELOAD_WATTS, 180.0);
});
