/**
 * Space weather from NASA DONKI: solar energetic particle (SEP) events.
 * Repository: martian-map
 *
 * DONKI SEP events are observed from near-Earth spacecraft. They do not always reach Mars,
 * so a recent event is a CAUTION ("check Mars impact"), not an automatic abort.
 */

const DONKI_SEP = 'https://api.nasa.gov/DONKI/SEP';
export const LOOKBACK_DAYS = 7;
const day = (d) => d.toISOString().slice(0, 10);

/**
 * Space weather as it stood on `asOf`: any SEP event in the LOOKBACK_DAYS before it.
 * @param {Array<{eventTime:string}>} events @param {Date} asOf
 */
export function classifySpaceWeather(events, asOf = new Date()) {
  const end = asOf.getTime(), cutoff = end - LOOKBACK_DAYS * 864e5;
  const recent = (events || [])
    .filter((e) => { const t = Date.parse(e.eventTime); return t >= cutoff && t <= end; })
    .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime));
  if (!recent.length) {
    return { status: 'go', text: `No solar particle events in the ${LOOKBACK_DAYS} days before ${day(asOf)}`, events: [] };
  }
  return {
    status: 'caution',
    text: `Solar particle event ${recent[0].eventTime.slice(0, 10)}: confirm Mars impact before EVA`,
    events: recent
  };
}

/**
 * Fetches every SEP event between two dates in one request, so any sol in that span can be
 * classified locally. Resolves to {events} or {error} with a reason a person can act on.
 */
export async function fetchSepEvents(from, to, apiKey = 'DEMO_KEY') {
  const start = new Date(from.getTime() - LOOKBACK_DAYS * 864e5);
  const url = `${DONKI_SEP}?startDate=${day(start)}&endDate=${day(to)}&api_key=${encodeURIComponent(apiKey)}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (resp.status === 429) {
      return { error: apiKey === 'DEMO_KEY'
        ? 'NASA’s shared demo key is used up (10 checks an hour). Add your own free key below.'
        : 'Your NASA API key is over its hourly limit. Try again later.' };
    }
    if (resp.status === 403) return { error: 'NASA rejected the API key. Check it below.' };
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    // DONKI returns an empty body (not []) when there are no events
    const text = await resp.text();
    return { events: text.trim() ? JSON.parse(text) : [], checkedAt: new Date().toISOString() };
  } catch {
    return { error: navigator?.onLine === false ? 'Offline: connect to check DONKI.' : 'NASA DONKI did not respond.' };
  }
}
