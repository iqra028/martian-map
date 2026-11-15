import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { ElevationService } from '../src/data/elevation-service.js';
import { profileRoute, findSafePath } from '../src/data/terrain-analysis.js';
import { heaterPowerWatts, dustClass, environmentFor, planEva, evaluateGoNoGo } from '../src/core/eva-plan.js';
import { classifySpaceWeather } from '../src/data/space-weather.js';
import { DEFAULT_ROUTE } from '../src/config/mission.js';

test('heater model: off at -20 °C and warmer, 1.5 W/°C below, capped at 120 W', () => {
  assert.equal(heaterPowerWatts(-10), 0);
  assert.equal(heaterPowerWatts(-40), 30);
  assert.equal(heaterPowerWatts(-200), 120);
});

test('dust classes by optical depth', () => {
  assert.equal(dustClass(0.4).id, 'clear');
  assert.equal(dustClass(1.0).id, 'haze');
  assert.equal(dustClass(2.0).id, 'storm');
});

async function defaultPlan(tau) {
  const raster = await new ElevationService().load(join(process.cwd(), 'data/terrain/sakarya-10m.json'));
  const pts = DEFAULT_ROUTE.map((w) => w.pos);
  const legPaths = pts.map((p, i) => findSafePath(raster, p, pts[(i + 1) % pts.length]).path);
  const profile = profileRoute(raster, pts, { legPaths });
  const returnSamples = pts.map((p, i) => (i === 0 ? null
    : profileRoute(raster, [p, pts[0]], { closeLoop: false, legPaths: [findSafePath(raster, p, pts[0]).path] }).samples));
  const env = environmentFor({ airMinC: -71, airMaxC: -5 }, tau);
  return { profile, env, plan: planEva(profile, returnSamples, env) };
}

test('planEva: PNR status matches the margin thresholds and resources only go down', async () => {
  const { plan } = await defaultPlan(0.4);
  assert.equal(plan.stops.length, DEFAULT_ROUTE.length - 1);
  for (const s of plan.stops) {
    for (const p of Object.values(s.pnr)) {
      const expected = p.marginPercent <= 0 ? 'CRITICAL_ABORT' : p.marginPercent <= 15 ? 'CAUTION' : 'NOMINAL';
      assert.equal(p.status, expected);
    }
  }
  const o2 = plan.stops.map((s) => s.remaining.o2);
  assert.ok(o2.every((v, i) => i === 0 || v < o2[i - 1]), 'oxygen left must fall stop by stop');
  for (const c of Object.values(plan.consumables)) assert.ok(c.pct > 0 && c.pct < 100);
});

test('a dust storm slows the walk and turns the plan NO-GO', async () => {
  const clear = await defaultPlan(0.4);
  const storm = await defaultPlan(2.2);
  assert.ok(storm.plan.hours > clear.plan.hours);
  const verdict = evaluateGoNoGo({ routing: [], summary: storm.profile.summary, plan: storm.plan, env: storm.env, spaceWeather: null });
  assert.equal(verdict.level, 'nogo');
});

test('evaluateGoNoGo levels: clean → go, steep → caution, unrouted leg → nogo', () => {
  const summary = { impassable: [], steep: [], noDataLegs: [] };
  const env = environmentFor(null, 0.4);
  const plan = { worstStop: null };
  assert.equal(evaluateGoNoGo({ routing: [{ legIdx: 0, safe: true }], summary, plan, env }).level, 'go');
  assert.equal(evaluateGoNoGo({ routing: [], summary: { ...summary, steep: [{}] }, plan, env }).level, 'caution');
  const nogo = evaluateGoNoGo({ routing: [{ legIdx: 1, safe: false }], summary, plan, env });
  assert.equal(nogo.level, 'nogo');
  assert.match(nogo.reasons[0].text, /leg 2/);
  const rough = evaluateGoNoGo({ routing: [], summary: { ...summary, rough: [{ maxRoughM: 0.7 }] }, plan, env });
  assert.equal(rough.level, 'caution');
  assert.match(rough.reasons[0].text, /rough-ground.*0\.7 m/);
});

test('space weather: recent SEP event → caution, old event → go', () => {
  const now = new Date('2026-11-15T00:00:00Z');
  assert.equal(classifySpaceWeather([{ eventTime: '2026-11-12T10:00Z' }], now).status, 'caution');
  assert.equal(classifySpaceWeather([{ eventTime: '2026-10-01T10:00Z' }], now).status, 'go');
  assert.equal(classifySpaceWeather([], now).status, 'go');
});
