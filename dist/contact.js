// Geometry-driven states. Pointer speed never decides whether a scan succeeds.
export function ticketContact(state, {x, gap, width}) {
  if(state.success) return 'success';
  if(state.inserted) {
    if(gap < -55 || gap > 85 || Math.abs(x)>width*.95) {
      state.inserted=false; state.started=false; return 'error';
    }
  } else if(gap>=-24 && gap<=42 && Math.abs(x)<width*.8) {
    state.inserted=true; state.started=x < -width*.18;
  }
  if(state.inserted) {
    if(x < -width*.18) state.started=true;
    if(state.started && x>width*.34) {state.success=true;return 'success';}
    return 'reading';
  }
  return 'ready';
}
export function discContact({x,gap,diameter,inserted}) {
  return Math.abs(x)<(inserted?58:38) && gap<(inserted?48:22) && gap>-diameter*.82;
}
