// Light encryption for password notes: the text is only readable with the password (AES-GCM, key from PBKDF2).
// Not a vault — the aim is that nobody reads these notes by just opening the site. Works in the browser and in Node.
const ITERATIONS = 120000;
const toBase64 = bytes => { let text = ''; for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(text); };
const fromBase64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
// Passwords are typed on the typewriter: case and surrounding spaces don't matter.
export const normalise = password => String(password).trim().toLowerCase();

async function key(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalise(password)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(value, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(password, salt), new TextEncoder().encode(JSON.stringify(value)));
  return { salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

// Resolves to the sealed value, or null for a wrong password.
export async function unseal(sealed, password) {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(sealed.iv) }, await key(password, fromBase64(sealed.salt)), fromBase64(sealed.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch { return null; }
}
