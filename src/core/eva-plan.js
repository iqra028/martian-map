/**
 * EVA planning: consumables over a real terrain profile, point-of-no-return at each stop,
 * environment effects, radiation dose, and the overall GO / CAUTION / NO-GO call.
 * Repository: martian-map
 *
 * Pure functions only (no DOM, no Leaflet) so they are unit-tested in tests/eva-plan.test.js.
 * Values marked ASSUMPTION are planning placeholders, not NASA figures.
 */

import {
  LIFE_SUPPORT_CONSTANTS as LS,
  calculateMetabolicPowerWatts,
  calculateOxygenRateLitersPerMin,
  calculateWaterLossRateKgPerHour,
  calculateBatteryPowerWatts,
  calculatePnrMargin
} from './resource-model.js';

export const EVA = {
  walkSpeedKmh: 2.0,      // nominal suited pace (0.56 m/s)
  abortSpeedKmh: 3.0,     // brisk unassisted return
  assistSpeedKmh: 1.0,    // ASSUMPTION: walking while supporting an injured partner
  roverSpeedKmh: 8.0,     // ASSUMPTION: unpressurised rover, rough-terrain average
  suitedMassKg: 210,
  stopDwellMin: 30        // ASSUMPTION: science time at each stop
};

/**
 * Curiosity RAD surface measurements at Gale Crater (Hassler et al., Science 2014):
 * dose equivalent 0.64 ± 0.12 mSv/day, absorbed dose 0.21 ± 0.04 mGy/day.
 * Career limit: NASA-STD-3001 Vol. 1 Rev. B (2022), 600 mSv effective dose.
 */
export const RADIATION = {
  doseEqMsvPerDay: 0.64,
  absorbedMgyPerDay: 0.21,
  careerLimitMsv: 600,
  source: 'Curiosity RAD, Hassler et al. 2014 (Science 343)'
};

/** Dust optical depth (τ) classes. Pace factors are ASSUMPTIONS (reduced visibility / footing). */
export const DUST_CLASSES = [
  { id: 'clear', label: 'Clear', maxTau: 0.65, paceFactor: 1.0, level: 'go' },
  { id: 'haze', label: 'Dust haze', maxTau: 1.4, paceFactor: 0.8, level: 'caution' },
  { id: 'storm', label: 'Dust storm', maxTau: Infinity, paceFactor: 0.5, level: 'nogo' }
];

export function dustClass(tau) {
  return DUST_CLASSES.find((d) => tau <= d.maxTau);
}

/**
 * Suit heater electrical load from ambient air temperature.
 * ASSUMPTION: 0 W at or above −20 °C, +1.5 W per °C colder, capped at 120 W.
 */
export function heaterPowerWatts(ambientC) {
  return Math.min(120, Math.max(0, (-20 - ambientC) * 1.5));
}

/**
 * Environment for an EVA on a given REMS sol under a dust τ.
 * EVAs are planned around midday, so ambient = mean of the sol's air min and max.
 */
export function environmentFor(sol, tau) {
  const ambientC = sol ? (sol.airMinC + sol.airMaxC) / 2 : -40;
  const dust = dustClass(tau);
  return {
    ambientC,
    heaterW: heaterPowerWatts(ambientC),
    tau,
    dust,
    paceFactor: dust.paceFactor,
    // Beer–Lambert noon flux at the surface, Mars mean top-of-atmosphere ≈ 590 W/m²
    solarWm2: Math.round(590 * Math.exp(-tau))
  };
}

export function evaDoseMicroSv(hours) {
  return (RADIATION.doseEqMsvPerDay * 1000 / 24) * hours;
}

/** Integrates consumables over profile samples (uphill grade raises metabolic cost). */
export function integrateWalk(samples, { speedKmh, heaterW, massKg = EVA.suitedMassKg }) {
  const v = speedKmh / 3.6;
  const batW = calculateBatteryPowerWatts(LS.SUIT_AVIONICS_BASELOAD_WATTS, heaterW);
  let hours = 0, o2L = 0, waterKg = 0, batWh = 0, metJ = 0, peakW = 0;
  for (let i = 1; i < samples.length; i++) {
    const km = samples[i].distKm - samples[i - 1].distKm;
    if (km <= 0) continue;
    const h = km / speedKmh;
    const w = calculateMetabolicPowerWatts(v, Math.max(0, samples[i].gradeDeg || 0), massKg);
    hours += h;
    metJ += w * h * 3600;
    peakW = Math.max(peakW, w);
    o2L += calculateOxygenRateLitersPerMin(w) * h * 60;
    waterKg += calculateWaterLossRateKgPerHour(w) * h;
    batWh += batW * h;
  }
  return { hours, o2L, waterKg, batWh, metJ, peakW };
}

function rest(hours, heaterW) {
  const w = calculateMetabolicPowerWatts(0);
  return {
    hours,
    o2L: calculateOxygenRateLitersPerMin(w) * hours * 60,
    waterKg: calculateWaterLossRateKgPerHour(w) * hours,
    batWh: calculateBatteryPowerWatts(LS.SUIT_AVIONICS_BASELOAD_WATTS, heaterW) * hours,
    metJ: w * hours * 3600,
    peakW: w
  };
}

const add = (a, b) => ({
  hours: a.hours + b.hours, o2L: a.o2L + b.o2L, waterKg: a.waterKg + b.waterKg,
  batWh: a.batWh + b.batWh, metJ: a.metJ + b.metJ, peakW: Math.max(a.peakW, b.peakW)
});
const ZERO = { hours: 0, o2L: 0, waterKg: 0, batWh: 0, metJ: 0, peakW: 0 };

const CAPACITY = {
  o2: { cap: LS.DEFAULT_O2_CAPACITY_LITERS, key: 'o2L', label: 'Oxygen', unit: 'L' },
  water: { cap: LS.DEFAULT_WATER_CAPACITY_KG, key: 'waterKg', label: 'Cooling water', unit: 'kg' },
  battery: { cap: LS.DEFAULT_BATTERY_CAPACITY_WH, key: 'batWh', label: 'Battery', unit: 'Wh' }
};

/**
 * Plans an out-and-back EVA loop.
 *
 * @param {{samples: Array, legs: Array}} profile - profileRoute() of the closed loop
 * @param {Array<Array|null>} returnSamples - per waypoint index (1..n-1): profile samples of the
 *   safe return path from that stop to base, or null when no safe return path exists
 * @param {ReturnType<typeof environmentFor>} env
 */
export function planEva(profile, returnSamples, env, opts = {}) {
  const speedKmh = (opts.walkSpeedKmh || EVA.walkSpeedKmh) * env.paceFactor;
  const dwellH = (opts.stopDwellMin ?? EVA.stopDwellMin) / 60;
  const heaterW = env.heaterW;

  let used = ZERO;
  const stops = [];
  const lastLeg = profile.legs.length - 1;

  profile.legs.forEach((leg, i) => {
    used = add(used, integrateWalk(profile.samples.filter((s) => s.legIdx === i), { speedKmh, heaterW }));
    if (i === lastLeg) return; // back at base
    const stopIdx = i + 1;
    const arriveH = used.hours;
    used = add(used, rest(dwellH, heaterW));

    const ret = returnSamples[stopIdx];
    const retCost = ret ? integrateWalk(ret, { speedKmh, heaterW }) : null;
    const pnr = {};
    for (const [id, c] of Object.entries(CAPACITY)) {
      pnr[id] = retCost
        ? calculatePnrMargin(c.cap - used[c.key], retCost[c.key], c.cap)
        : { marginPercent: -Infinity, status: 'CRITICAL_ABORT' };
    }
    const limitingId = Object.keys(pnr).sort((a, b) => pnr[a].marginPercent - pnr[b].marginPercent)[0];
    stops.push({
      idx: stopIdx,
      arriveH,
      departH: used.hours,
      returnKm: ret ? ret[ret.length - 1].distKm : null,
      returnH: retCost ? retCost.hours : null,
      remaining: Object.fromEntries(Object.entries(CAPACITY).map(([id, c]) => [id, c.cap - used[c.key]])),
      pnr,
      limiting: { id: limitingId, label: CAPACITY[limitingId].label, ...pnr[limitingId] }
    });
  });

  const consumables = {};
  for (const [id, c] of Object.entries(CAPACITY)) {
    const remaining = Math.max(0, c.cap - used[c.key]);
    consumables[id] = { label: c.label, unit: c.unit, cap: c.cap, used: used[c.key], remaining, pct: (remaining / c.cap) * 100 };
  }

  const worst = stops.reduce((w, s) => (!w || s.limiting.marginPercent < w.limiting.marginPercent ? s : w), null);

  return {
    speedKmh,
    hours: used.hours,
    dwellHours: dwellH * stops.length,
    meanMetabolicW: used.hours > 0 ? used.metJ / (used.hours * 3600) : 0,
    peakMetabolicW: used.peakW,
    heaterW,
    consumables,
    stops,
    worstStop: worst,
    doseMicroSv: evaDoseMicroSv(used.hours)
  };
}

const RANK = { go: 0, caution: 1, nogo: 2 };

/**
 * Single mission call with the reasons behind it, most severe first.
 *
 * @param {{routing: Array<{legIdx:number, safe:boolean}>, summary: Object, plan: ReturnType<typeof planEva>,
 *          env: ReturnType<typeof environmentFor>, spaceWeather?: {status:string, text:string}}} input
 */
export function evaluateGoNoGo({ routing, summary, plan, env, spaceWeather }) {
  const reasons = [];
  const push = (level, text) => reasons.push({ level, text });

  const unrouted = routing.filter((r) => !r.safe);
  if (unrouted.length) push('nogo', `No safe walking path for ${unrouted.length === 1 ? 'leg' : 'legs'} ${unrouted.map((r) => r.legIdx + 1).join(', ')}`);
  if (summary.impassable.length) push('nogo', `Route crosses ${summary.impassable.length} slope${summary.impassable.length > 1 ? 's' : ''} over 20°`);
  if (summary.noDataLegs.length) push('nogo', 'Part of the route is outside the HiRISE terrain model');

  if (plan.worstStop) {
    const l = plan.worstStop.limiting;
    if (l.status === 'CRITICAL_ABORT') push('nogo', `Past point of no return at stop ${plan.worstStop.idx} (${l.label})`);
    else if (l.status === 'CAUTION') push('caution', `Low ${l.label.toLowerCase()} margin at stop ${plan.worstStop.idx}: ${l.marginPercent.toFixed(0)}% above reserve`);
  }

  if (env.dust.level !== 'go') push(env.dust.level, `${env.dust.label} (τ ${env.tau.toFixed(2)})`);
  if (summary.steep.length) push('caution', `${summary.steep.length} steep stretch${summary.steep.length > 1 ? 'es' : ''} (15–20°)`);
  if (spaceWeather && spaceWeather.status !== 'go') push(spaceWeather.status === 'nogo' ? 'nogo' : 'caution', spaceWeather.text);

  reasons.sort((a, b) => RANK[b.level] - RANK[a.level]);
  const level = reasons.length ? reasons[0].level : 'go';
  return { level, reasons };
}
