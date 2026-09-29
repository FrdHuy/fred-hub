// City → English name, country and the nearest airport, for the travel recorder.
// Airports: the public-domain OurAirports table (downloaded once, then cached). Cities: OpenStreetMap Nominatim.
const COUNTRY_ZH = new Intl.DisplayNames(['zh-CN'], { type: 'region' });

// A small CSV reader (quoted fields, doubled quotes).
export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; continue; }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Only airports with scheduled flights and an IATA code: large and medium ones.
export function airportsFromCsv(text) {
  const [head, ...rows] = parseCsv(text), at = name => head.indexOf(name);
  const [type, name, lat, lon, country, city, scheduled, iata] = ['type', 'name', 'latitude_deg', 'longitude_deg', 'iso_country', 'municipality', 'scheduled_service', 'iata_code'].map(at);
  return rows.filter(r => r[iata] && /^[A-Z]{3}$/.test(r[iata]) && (r[type] === 'large_airport' || r[type] === 'medium_airport') && r[scheduled] === 'yes')
    .map(r => ({ iata: r[iata], name: r[name], city: r[city], country: r[country], lat: Number(r[lat]), lon: Number(r[lon]), large: r[type] === 'large_airport' }));
}

const km = (a, b) => {
  const rad = x => x * Math.PI / 180, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2));
};
// The airports a traveller would fly into, best first: large international ones within 150 km, then other large ones,
// then — only if there is no large airport near — the closest medium ones.
export function airportChoices(airports, place, count = 3) {
  const near = airports.map(airport => ({ ...airport, km: Math.round(km(place, airport)) }));
  const large = near.filter(a => a.large && a.km <= 150).sort((a, b) => (/international/i.test(b.name) - /international/i.test(a.name)) || a.km - b.km);
  const rest = near.filter(a => !large.includes(a)).sort((a, b) => a.km * (a.large ? 1 : 1.8) - b.km * (b.large ? 1 : 1.8));
  return [...large, ...rest].slice(0, count);
}
export const nearestAirport = (airports, place) => airportChoices(airports, place, 1)[0] ?? null;

// One Nominatim result → a place the recorder can use. `flap` is the English name as the board shows it.
export function placeFrom(result) {
  const a = result.address ?? {}, code = (a.country_code ?? '').toUpperCase();
  const name = result.name || a.city || a.town || a.village || a.state || result.display_name.split(',')[0];
  let country = a.country ?? '';
  try { if (code) country = COUNTRY_ZH.of(code); } catch {}
  return { name, country, countryCode: code, lat: Number(result.lat), lon: Number(result.lon), label: result.display_name };
}
