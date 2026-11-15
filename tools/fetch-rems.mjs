#!/usr/bin/env node
/**
 * Snapshot recent Curiosity REMS weather (Gale Crater) into data/rems-recent.json
 * so the app works offline. Re-run to refresh: `npm run data:rems`.
 *
 * Source: CAB/NASA MSL weather feed (REMS daily summaries).
 */
import { writeFileSync } from 'node:fs';
import { REMS_FEED, parseRems } from '../src/data/rems.js';

const resp = await fetch(REMS_FEED);
if (!resp.ok) throw new Error(`REMS feed HTTP ${resp.status}`);
const sols = parseRems(await resp.json());

writeFileSync(
  new URL('../data/rems-recent.json', import.meta.url),
  JSON.stringify({
    source: 'Curiosity REMS daily summaries (CAB / NASA JPL), Gale Crater',
    sourceUrl: REMS_FEED,
    note: 'Outreach-grade summaries; REMS science data is archived at PDS.',
    fetchedAt: new Date().toISOString(),
    sols
  }, null, 1) + '\n'
);
console.log(`Wrote ${sols.length} sols (latest sol ${sols[0]?.sol}, ${sols[0]?.earthDate}).`);
