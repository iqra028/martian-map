/**
 * Space weather from NASA DONKI: solar energetic particle (SEP) events.
 * Repository: martian-map
 *
 * DONKI SEP events are observed from near-Earth spacecraft. They do not always reach Mars,
 * so a recent event is a CAUTION ("check Mars impact"), not an automatic abort.
 */

const DONKI_SEP = 'https://api.nasa.gov/DONKI/SEP';
const LOOKBACK_DAYS = 7;

/** @param {Array<{eventTime:string}>} events @param {Date} now */
export function classifySpaceWeather(events, now = new Date()) {
  const cutoff = now.getTime() - LOOKBACK_DAYS * 864e5;
  const recent = (events || [])
    .filter((e) => Date.parse(e.eventTime) >= cutoff)
    .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime));
  if (!recent.length) {
    return { status: 'go', text: `No solar particle events in the last ${LOOKBACK_DAYS} days`, events: [] };
  }
  return {
    status: 'caution',
    text: `Solar particle event ${recent[0].eventTime.slice(0, 10)} — confirm Mars impact before EVA`,
    events: recent
  };
}

/** Fetches recent SEP events; resolves to a CAUTION result when offline or rate-limited. */
export async function fetchSpaceWeather(now = new Date(), apiKey = 'DEMO_KEY') {
  const day = (d) => d.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - LOOKBACK_DAYS * 864e5);
  const url = `${DONKI_SEP}?startDate=${day(start)}&endDate=${day(now)}&api_key=${apiKey}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return { ...classifySpaceWeather(await resp.json(), now), checkedAt: now.toISOString() };
  } catch (err) {
    return { status: 'caution', text: 'Space weather not checked (feed unavailable)', events: [], error: String(err) };
  }
}
