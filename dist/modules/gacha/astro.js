// Where the Sun, Moon and planets are, as seen from Earth, on a given day (ecliptic longitude, degrees 0–360).
// Paul Schlyter's "How to compute planetary positions" (low precision: well under a degree, plenty to know the sign).
// Checked against NASA JPL Horizons in scripts/check-gacha.mjs.
const rad = Math.PI / 180, deg = 180 / Math.PI;
const rev = x => ((x % 360) + 360) % 360;
const sind = x => Math.sin(x * rad), cosd = x => Math.cos(x * rad), atan2d = (y, x) => Math.atan2(y, x) * deg;

// Schlyter's day number: 0.0 at 2000 Jan 0.0 UT (= 1999-12-31 00:00 UT).
export const dayNumber = date => (Date.UTC(date.y, date.m - 1, date.d, date.h ?? 12) - Date.UTC(1999, 11, 31)) / 864e5;

// Orbital elements at day d (N node, i inclination, w perihelion, a distance, e eccentricity, M mean anomaly).
const ELEMENTS = {
  sun: d => ({ N: 0, i: 0, w: 282.9404 + 4.70935e-5 * d, a: 1, e: 0.016709 - 1.151e-9 * d, M: 356.047 + 0.9856002585 * d }),
  moon: d => ({ N: 125.1228 - 0.0529538083 * d, i: 5.1454, w: 318.0634 + 0.1643573223 * d, a: 60.2666, e: 0.0549, M: 115.3654 + 13.0649929509 * d }),
  mercury: d => ({ N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d }),
  venus: d => ({ N: 76.6799 + 2.4659e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.891 + 1.38374e-5 * d, a: 0.72333, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d }),
  mars: d => ({ N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d }),
  jupiter: d => ({ N: 100.4542 + 2.76854e-5 * d, i: 1.303 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.895 + 0.0830853001 * d }),
  saturn: d => ({ N: 113.6634 + 2.3898e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.967 + 0.0334442282 * d }),
};

// Solve Kepler's equation and give the position in the orbit's own ecliptic frame.
function orbit({ N, i, w, a, e, M }) {
  M = rev(M);
  let E = M + deg * e * sind(M) * (1 + e * cosd(M));
  for (let k = 0; k < 8; k++) E = E - (E - deg * e * sind(E) - M) / (1 - e * cosd(E));
  const xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E), v = atan2d(yv, xv), r = Math.hypot(xv, yv);
  const x = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i));
  const y = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i));
  const z = r * sind(v + w) * sind(i);
  return { x, y, z, r, v, lon: rev(atan2d(y, x)), lat: atan2d(z, Math.hypot(x, y)) };
}

export function sunLongitude(d) { const s = ELEMENTS.sun(d), o = orbit(s); return rev(o.v + s.w); }

// Geocentric ecliptic longitude of each body at day d.
export function positions(date) {
  const d = dayNumber(date), sun = ELEMENTS.sun(d), so = orbit(sun);
  const sunLon = rev(so.v + sun.w), xs = so.r * cosd(sunLon), ys = so.r * sind(sunLon);
  const out = { sun: sunLon };
  // The Moon, with the largest perturbations in longitude.
  {
    const m = ELEMENTS.moon(d), o = orbit(m), Ms = rev(sun.M), Mm = rev(m.M), Ls = rev(sun.w + Ms), Lm = rev(m.N + m.w + Mm), D = rev(Lm - Ls), F = rev(Lm - m.N);
    out.moon = rev(o.lon - 1.274 * sind(Mm - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms) - 0.059 * sind(2 * Mm - 2 * D) - 0.057 * sind(Mm - 2 * D + Ms) + 0.053 * sind(Mm + 2 * D) + 0.046 * sind(2 * D - Ms) + 0.041 * sind(Mm - Ms) - 0.035 * sind(D) - 0.031 * sind(Mm + Ms) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(Mm - 4 * D));
  }
  const Mj = rev(ELEMENTS.jupiter(d).M), Msat = rev(ELEMENTS.saturn(d).M);
  for (const body of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
    const o = orbit(ELEMENTS[body](d));
    let lon = o.lon;
    if (body === 'jupiter') lon += -0.332 * sind(2 * Mj - 5 * Msat - 67.6) - 0.056 * sind(2 * Mj - 2 * Msat + 21) + 0.042 * sind(3 * Mj - 5 * Msat + 21) - 0.036 * sind(Mj - 2 * Msat) + 0.022 * cosd(Mj - Msat) + 0.023 * sind(2 * Mj - 3 * Msat + 52) - 0.016 * sind(Mj - 5 * Msat - 69);
    if (body === 'saturn') lon += 0.812 * sind(2 * Mj - 5 * Msat - 67.6) - 0.229 * cosd(2 * Mj - 4 * Msat - 2) + 0.119 * sind(Mj - 2 * Msat - 3) + 0.046 * sind(2 * Mj - 6 * Msat - 69) + 0.014 * sind(Mj - 3 * Msat + 32);
    // heliocentric → geocentric: add the Sun's position (Earth is the opposite of the Sun seen from Earth)
    const x = o.r * cosd(lon) * cosd(o.lat) + xs, y = o.r * sind(lon) * cosd(o.lat) + ys;
    out[body] = rev(atan2d(y, x));
  }
  return out;
}
// 0 = Aries … 11 = Pisces.
export const signOf = lon => Math.floor(rev(lon) / 30);
