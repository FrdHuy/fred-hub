// A manuscript handed over by another room for this visit only (never in data.js, gone on reload):
// the gacha machine's letter. { id, title, date, type, html, minutes, back } — `back` is where the arrow returns to.
let guest = null;
export const setGuest = note => { guest = note; };
export const getGuest = () => guest;
