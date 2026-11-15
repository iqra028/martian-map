#!/usr/bin/env node
/**
 * Snapshot recent Curiosity REMS weather (Gale Crater) into data/rems-recent.json
 * so the app works offline. Re-run to refresh: `npm run data:rems`.
 *
 * Source: CAB/NASA MSL weather feed (REMS daily summaries).
 */
import { writeFileSync } from 'node:fs';

const FEED = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';
const KEEP_SOLS = 30;

const num = (v) => (v === '--' || v === '' || v == null ? null : Number(v));

const resp = await fetch(FEED);
if (!resp.ok) throw new Error(`REMS feed HTTP ${resp.status}`);
const { soles } = await resp.json();

const sols = soles
  .filter((s) => num(s.min_temp) !== null && num(s.max_temp) !== null)
  .slice(0, KEEP_SOLS)
  .map((s) => ({
    sol: Number(s.sol),
    earthDate: s.terrestrial_date,
    ls: num(s.ls),
    airMinC: num(s.min_temp),
    airMaxC: num(s.max_temp),
    groundMinC: num(s.min_gts_temp),
    groundMaxC: num(s.max_gts_temp),
    pressurePa: num(s.pressure),
    uv: s.local_uv_irradiance_index,
    opacity: s.atmo_opacity,
    sunrise: s.sunrise,
    sunset: s.sunset
  }));

writeFileSync(
  new URL('../data/rems-recent.json', import.meta.url),
  JSON.stringify({
    source: 'Curiosity REMS daily summaries (CAB / NASA JPL), Gale Crater',
    sourceUrl: FEED,
    note: 'Outreach-grade summaries; REMS science data is archived at PDS.',
    fetchedAt: new Date().toISOString(),
    sols
  }, null, 1) + '\n'
);
console.log(`Wrote ${sols.length} sols (latest sol ${sols[0]?.sol}, ${sols[0]?.earthDate}).`);
