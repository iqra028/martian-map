/**
 * Curiosity REMS daily weather summaries (Gale Crater) from the CAB / NASA JPL feed.
 * Shared by the app (live fetch) and tools/fetch-rems.mjs (offline snapshot).
 */

export const REMS_FEED = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';

const num = (v) => (v === '--' || v === '' || v == null ? null : Number(v));

/** Feed JSON → newest-first sols with temperatures (sols missing min/max are skipped). */
export function parseRems({ soles = [] }, keep = 30) {
  return soles
    .filter((s) => num(s.min_temp) !== null && num(s.max_temp) !== null)
    .slice(0, keep)
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
}
