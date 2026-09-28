// Coordinates are relative to the sensor. No speed gate: direction and coverage matter.
export function createSwipe(range = 55, tolerance = 52) {
  return {range,tolerance,armed:false,crossed:false,complete:false,invalid:false,lastX:null};
}
export function sampleSwipe(s,x,y) {
  const aligned=Math.abs(y)<=s.tolerance;
  if (!s.armed && aligned && x<=-s.range) s.armed=true;
  if(s.armed) {
    if(!aligned || (s.lastX!==null && x<s.lastX-16)) s.invalid=true;
    if(aligned && x>=0) s.crossed=true;
    if(aligned && s.crossed && x>=s.range) s.complete=true;
  }
  s.lastX=x;
  return s.complete && !s.invalid;
}
export function swipeSucceeded(s) { return s.armed && s.complete && !s.invalid; }
