import { ticketContact, discContact } from './contact.js';
import { createPanel } from './modules/bucketlist/panel-home.js?v=42';
import { createTypewriter } from './modules/stories/typewriter-home.js?v=42';
import { createGacha } from './modules/gacha/machine-home.js?v=42';
import { play as sound } from './sound.js?v=42';

export function createInteraction(gallery, enter) {
  const shell=document.querySelector('.gallery-shell'), hint=shell.querySelector('.interaction-hint');
  const receivers=new Map();
  shell.querySelector('.stage-receiver').remove();
  for(const id of ['travel','cinema']){
    const node=document.createElement('div');node.className='stage-receiver';node.dataset.module=id;node.dataset.state='ready';node.setAttribute('aria-hidden','true');
    node.innerHTML=id==='travel'?'<div class="gate-reader"><div class="gate-back"></div><div class="gate-slot"></div><div class="gate-front"><div class="gate-vents"></div><span class="gate-display">READY</span><i class="gate-light"></i></div></div>':'<div class="optical-drive"><div class="drive-casing"><span class="drive-display">NO DISC</span><span class="drive-eject" title="EJECT"></span><i class="drive-light"></i></div><div class="reader-slot"></div></div>';
    receivers.set(id,node);shell.append(node);
  }
  let receiver=document.createElement('div');
  // Receiver and collectible share the same rail position on every frame.
  function drawReceivers(){
    for(const [id,node] of receivers){
      const i=gallery.items.findIndex(entry=>entry.id===id),distance=i-gallery.position;
      const scale=1-Math.min(Math.abs(distance),1)*.17;
      node.style.transform=`translateX(calc(-50% + ${distance*gallery.step}px)) scale(${scale})`;
      node.style.opacity=String(Math.max(0,1-Math.abs(distance)*.68));
      node.style.visibility=i<0||Math.abs(distance*gallery.step)>gallery.stage.clientWidth/2+gallery.size/2?'hidden':'visible';
    }
  }
  gallery.onDraw=drawReceivers;
  gallery.onMotionStart=reset;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let item,source,drag,frame=0,last=0,x=0,y=0,tx=0,ty=0,vx=0,vy=0,busy=false,sequence=0;
  let idleTimer,errorTimer,returning=false,animations=[],ticket={},inserted=false,pending=null;
  // Life List control panel on the current cover (lever, self-test, lamps).
  let panel=null;
  // Number of films in the cinema list, shown by the drive after reading.
  let titles=0;
  import('./modules/cinema/data.js?t='+Date.now()).then(module=>{titles=Array.isArray(module.default)?module.default.filter(entry=>entry&&entry.title).length:0;},()=>{});
  // EJECT: with a disc in the slot it pushes it back out; otherwise the light just blinks.
  receivers.get('cinema').querySelector('.drive-eject').addEventListener('click',e=>{
    e.stopPropagation();const drive=receivers.get('cinema');
    if(item?.id==='cinema'&&(inserted||busy||drive.dataset.state!=='ready')){reset();const display=drive.querySelector('.drive-display');display.textContent='EJECT';setTimeout(()=>{if(drive.dataset.state==='ready')display.textContent='NO DISC';},700);}
    if(!reduced.matches)drive.querySelector('.drive-light').animate([{opacity:1},{opacity:.2},{opacity:1},{opacity:.2},{opacity:1}],{duration:500});
  });
  const prompts={travel:'将机票下缘插入槽口，再从左向右刷过。Enter 可完成刷卡。',cinema:'按住光盘可推进或抽回；插入后松手读取。',stories:'按下打字机的红色回车键，纸会卷出来',gacha:'抓住扭蛋机，绕着扭把画一圈，扭出一颗蛋。回车可直接扭。',bucketlist:'把人生清单面板的拨杆往上拨到 ON，面板通电后进入。回车可直接开机。'};
  function status(value) {
    // Each reader has its voice: the gate beeps, the drive takes the disc and spins up.
    if(receiver.dataset.state!==value){const drive=receiver.dataset.module==='cinema';sound(value==='reading'?(drive?'drive':'reading'):value==='success'?(drive?'tick':'ok'):value==='error'?'error':'');}
    receiver.dataset.state=value;
    if(item) hint.textContent = value==='reading'?'READING':value==='error'?'ERROR，重新插入可重试':value==='success'?'SUCCESS':prompts[item.id];
    const display=receiver.querySelector('.gate-display');if(display)display.textContent={ready:'READY',reading:'READING',error:'ERROR',success:'SUCCESS'}[value]||'READY';
    // The optical drive has its own little readout: it knows how many titles are on the disc.
    const drive=receiver.querySelector('.drive-display');if(drive)drive.textContent={ready:'NO DISC',reading:'READING',success:`${String(titles).padStart(2,'0')} TITLES`}[value]||'NO DISC';
    shell.dataset.contact=value;
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  function reset(){
    sequence++;clearTimeout(idleTimer);clearTimeout(errorTimer);stop();animations.forEach(a=>a.cancel());animations=[];
    const id=drag?.id;drag=null;if(id!==undefined&&gallery.stage.hasPointerCapture(id))gallery.stage.releasePointerCapture(id);
    busy=false;returning=false;inserted=false;ticket={};x=y=tx=ty=vx=vy=0;
    if(source){source.style.transform='';source.style.opacity='';source.classList.remove('checklist-opening');source.style.removeProperty('--seated');}
    shell.classList.remove('is-handling');status('ready');if(item)hint.textContent=prompts[item.id];
    panel?.reset();
  }
  function setItem(next){
    if(item?.id===next.id&&source===gallery.currentElement?.firstElementChild)return;
    reset();item=next;source=gallery.currentElement.firstElementChild;shell.dataset.object=item.id;
    receiver=receivers.get(item.id)||document.createElement('div');status('ready');drawReceivers();
    hint.textContent=prompts[item.id];
    // The Life List panel, the typewriter and the gacha machine share one controller shape: hold / release / auto / reset.
    const controllers={bucketlist:['.panel',createPanel],stories:['.tw',createTypewriter],gacha:['.gc',createGacha]},control=controllers[item.id];
    panel=control&&source.querySelector(control[0])?control[1](source,{reduced:()=>reduced.matches}):null;
  }
  function geometry(px=x,py=y){
    const base=gallery.currentElement.getBoundingClientRect(),slot=receiver.querySelector(item.id==='travel'?'.gate-slot':'.reader-slot').getBoundingClientRect();
    const size=base.width, height=item.id==='travel'?size*.47:Math.min(size*.68,190);
    const cx=base.left+base.width/2,cy=base.top+base.height/2;
    return {slot,height,cx,cy,relativeX:cx+px-(slot.left+slot.width/2),gap:item.id==='travel'?cy+py+height/2-slot.top:cy+py-height/2-slot.top};
  }
  function paint(){source.style.transform=`translate3d(${x}px,${y}px,0) rotate(${inserted||ticket.inserted?0:Math.max(-3,Math.min(3,vx*.008))}deg)`;source.style.setProperty('--seated',ticket.inserted?'1':'0');}
  function tick(time){
    const dt=Math.min((time-(last||time))/1000,.024);last=time;
    const k=returning?42:650,damping=returning?13:43;
    vx+=(k*(tx-x)-damping*vx)*dt;vy+=(k*(ty-y)-damping*vy)*dt;x+=vx*dt;y+=vy*dt;paint();
    if(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(vx)+Math.abs(vy)<.12){x=tx;y=ty;paint();stop();return;}
    frame=requestAnimationFrame(tick);
  }
  function follow(){if(reduced.matches){x=tx;y=ty;paint();}else if(!frame)frame=requestAnimationFrame(tick);}
  function park(){
    clearTimeout(idleTimer);shell.classList.remove('is-handling');
    idleTimer=setTimeout(()=>{returning=true;tx=ty=0;follow();},2600);
  }
  async function tween(nx,ny,duration){
    stop();const animation=source.animate([{transform:`translate(${x}px,${y}px)`},{transform:`translate(${nx}px,${ny}px)`}],{duration:reduced.matches?1:duration,easing:'cubic-bezier(.22,.7,.25,1)',fill:'forwards'});animations.push(animation);
    await animation.finished.catch(()=>{});if(animation.playState==='finished'){x=nx;y=ny;paint();animation.cancel();}
  }
  async function complete(){
    if(busy)return;busy=true;const token=++sequence;clearTimeout(idleTimer);stop();status('success');
    const delay=source.animate([{opacity:1},{opacity:1}],{duration:reduced.matches?1:260});animations.push(delay);await delay.finished.catch(()=>{});
    if(token===sequence)enter(item);
  }
  async function ingest(){
    if(busy)return;busy=true;const token=++sequence;clearTimeout(idleTimer);status('reading');
    const g=geometry();
    await tween(x-g.relativeX,y-g.gap-24,180);
    if(token!==sequence)return;
    // Casing is a real foreground occluder, also while the disc is held.
    await tween(x,g.slot.top-g.cy-g.height/2-5,1300);
    if(token!==sequence)return;source.style.opacity='0';busy=false;await complete();
  }
  async function activate(next=item){
    if(busy)return;setItem(next);
    if(item.id==='bucketlist'||item.id==='stories'||item.id==='gacha'){
      // The panel powers up (lever thrown for you) / the typewriter's RETURN is pressed for you, then the page opens.
      if(!panel||panel.on){enter(item);return;}
      busy=true;const token=++sequence;const ok=await panel.auto();if(token!==sequence)return;busy=false;if(ok)enter(item);return;
    }
    // Keyboard and click access follows the same geometry as direct manipulation.
    const token=++sequence;busy=true;
    const g=geometry();
    if(item.id==='travel'){
      const left=-g.slot.width*.25-g.relativeX+x,seat=g.slot.top-g.cy-g.height/2+16;
      await tween(left,seat,380);if(token!==sequence)return;
      ticket={inserted:true,started:true};status('reading');paint();
      await tween(left+g.slot.width*.66,seat,650);if(token!==sequence)return;
      ticket.success=true;busy=false;complete();
    }else{
      await tween(x-g.relativeX,y-g.gap-16,320);if(token!==sequence)return;inserted=true;busy=false;ingest();
    }
  }
  function move(e){
    if(!drag||drag.id!==e.pointerId)return;e.stopImmediatePropagation();
    if(drag.lever){panel?.hold(e.clientY-drag.py,e);return;}
    let px=drag.ox+e.clientX-drag.px,py=drag.oy+e.clientY-drag.py;
    drag.moved ||= Math.hypot(e.clientX-drag.px,e.clientY-drag.py)>4;
    const g=geometry(px,py);
    if(item.id==='travel'){
      const state=ticketContact(ticket,{x:g.relativeX,gap:g.gap,width:g.slot.width});if(state!=='ready'||receiver.dataset.state!=='error')status(state);
      if(state==='error'){
        hint.textContent='ERROR，重新插入可重试';clearTimeout(errorTimer);errorTimer=setTimeout(()=>{if(!ticket.inserted)status('ready');},1400);
      }
      if(ticket.inserted)py=g.slot.top-g.cy-g.height/2+16;
    }else{
      inserted=discContact({x:g.relativeX,gap:g.gap,diameter:g.height,inserted});
      if(inserted){px-=g.relativeX*.82;py=Math.max(g.slot.top-g.cy-g.height*.25,py-12);}
      status(inserted?'reading':'ready');
    }
    tx=px;ty=py;follow();
  }
  // A press on the object. With a mouse it is never ambiguous: the object under the pointer is grabbed (the rail is dragged on the
  // empty stage, or moved with the arrows / menu). With touch the first ~7px decide: mostly sideways → the rail swipes;
  // mostly up/down (disc into the drive, ticket into the slot, lever, RETURN key) → the object is picked up.
  gallery.stage.addEventListener('pointerdown',e=>{
    pending=null;
    if(!e.target.closest('.ticket-paper,.silver-disc,.panel,.tw,.gc')||!gallery.settled||e.button!==0||!['travel','cinema','bucketlist','stories','gacha'].includes(item?.id)||e.target.closest('.collection-slot')!==gallery.currentElement)return;
    e.preventDefault();if(busy){e.stopImmediatePropagation();return;}
    pending={id:e.pointerId,x:e.clientX,y:e.clientY,mouse:e.pointerType==='mouse'};
    if(pending.mouse)e.stopImmediatePropagation();
  },true);
  function pickUp(e){
    gallery.freeze();clearTimeout(idleTimer);returning=false;
    drag={id:e.pointerId,px:pending.x,py:pending.y,ox:x,oy:y,moved:true,lever:item.id==='bucketlist'||item.id==='stories'||item.id==='gacha'};pending=null;
    gallery.stage.setPointerCapture(e.pointerId);shell.classList.add('is-handling');
  }
  gallery.stage.addEventListener('pointermove',e=>{
    if(pending?.id===e.pointerId){
      const dx=e.clientX-pending.x,dy=e.clientY-pending.y;
      if(Math.hypot(dx,dy)<(pending.mouse?3:7)){e.stopImmediatePropagation();return;}
      if(!pending.mouse&&Math.abs(dx)>Math.abs(dy)){pending=null;return;}
      e.stopImmediatePropagation();pickUp(e);
    }
    move(e);
  },true);
  function release(e,cancelled=false){
    // A tap without movement: the disc still opens on click, nothing else changes.
    if(pending?.id===e.pointerId){
      pending=null;if(cancelled)return;
      e.stopImmediatePropagation();gallery.freeze();gallery.suppressUntil=performance.now()+450;
      if(item.id==='cinema'||item.id==='bucketlist'||item.id==='stories'||item.id==='gacha')activate();
      return;
    }
    if(drag?.lever&&drag.id===e.pointerId){
      drag=null;e.stopImmediatePropagation();gallery.suppressUntil=performance.now()+450;
      if(gallery.stage.hasPointerCapture(e.pointerId))gallery.stage.releasePointerCapture(e.pointerId);
      shell.classList.remove('is-handling');
      if(cancelled){panel?.reset();return;}
      busy=true;const token=++sequence;
      panel?.release().then(ok=>{if(token!==sequence)return;busy=false;if(ok)enter(item);});
      return;
    }
    if(!drag||drag.id!==e.pointerId)return;
    if(!cancelled)move(e);e.stopImmediatePropagation();const moved=drag.moved;drag=null;gallery.suppressUntil=performance.now()+450;
    if(gallery.stage.hasPointerCapture(e.pointerId))gallery.stage.releasePointerCapture(e.pointerId);
    if(cancelled){inserted=false;ticket={};status('ready');park();return;}
    if(item.id==='travel'){
      if(ticket.success){complete();return;}
      if(ticket.inserted){shell.classList.remove('is-handling');return;}
    }else if(inserted){ingest();return;}
    if(!moved&&item.id==='cinema'){activate();return;}
    park();
  }
  gallery.stage.addEventListener('pointerup',e=>release(e),true);
  gallery.stage.addEventListener('pointercancel',e=>release(e,true),true);
  gallery.stage.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)release(e,true);},true);
  addEventListener('resize',reset);reduced.addEventListener('change',reset);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')reset();});
  return {setItem,activate,reset};
}
