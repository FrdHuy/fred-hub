import { createInteraction } from './experience.js?v=28';
import { mountModule } from './modules/index.js?v=28';
import { modules, getModule, createCover } from './catalog.js?v=28';
import { CollectionGallery } from './gallery.js?v=28';
import { readRoute, navigate } from './router.js';

const $ = selector => document.querySelector(selector);
// Focus rings are for keyboard users. Script-moved focus after a click or tap stays invisible.
document.documentElement.dataset.input = 'pointer';
addEventListener('pointerdown', () => { document.documentElement.dataset.input = 'pointer'; }, true);
addEventListener('keydown', e => { if (!e.metaKey && !e.ctrlKey) document.documentElement.dataset.input = 'keyboard'; }, true);
const home = $('#home-view'), detail = $('#detail-view');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let disposeModule = () => {};
let activeRoute = { type: 'home' }, routeSequence = 0, routeAnimations = [], flyingCover = null, pendingModule = null;

let interaction;
const gallery = new CollectionGallery({
  stage: $('.collection-stage'),
  onSelect(item, index) {
    interaction?.setItem(item);
    const title=$('.selection-title');
    if(title.textContent!==item.title){
      title.getAnimations().forEach(animation=>animation.cancel());
      if(!motion.matches) title.animate([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:150,easing:'ease-out'});
    }
    title.textContent = item.title;
  },
  onOpen(item) { interaction.activate(item); },
});
interaction = createInteraction(gallery, item => navigate(item.id));
interaction.setItem(gallery.current);
gallery.setLayout('rail');

function cancelRouteAnimation() {
  routeAnimations.forEach(animation => animation.cancel()); routeAnimations = [];
  flyingCover?.remove(); flyingCover = null;
  document.querySelectorAll('[data-transition-hidden]').forEach(element => { element.style.visibility = ''; delete element.dataset.transitionHidden; });
}
function animate(element, frames, options) {
  const animation = element.animate(frames, options); routeAnimations.push(animation);
  return animation.finished.catch(() => {});
}
function renderCollection(item) {
  disposeModule();
  detail.replaceChildren(); detail.dataset.module = item.id;
  // A module may bring its own page theme; the shared header follows it.
  document.documentElement.dataset.theme = item.theme || '';
  const toolbar = document.createElement('div'); toolbar.className = 'detail-toolbar';
  const back = document.createElement('a'); back.className = 'back-link'; back.href = '#/'; back.textContent = '← 放回收藏';
  toolbar.append(back); detail.append(toolbar);
  const container = document.createElement('div'); container.className = 'module-content'; detail.append(container);
  disposeModule = mountModule({ container, item, navigate, createCover });
}
function renderMissing() {
  disposeModule(); disposeModule = () => {}; document.documentElement.dataset.theme = '';
  detail.innerHTML = '<section class="not-found"><p class="eyebrow">NOT IN THE COLLECTION</p><h1>这件收藏还不在这里</h1><p>链接可能已经改变，回到收藏室看看吧。</p><a class="back-link" href="#/">← 返回收藏室</a></section>';
}
async function showRoute(initial = false) {
  const sequence = ++routeSequence, nextRoute = readRoute(), item = nextRoute.type === 'collection' ? getModule(nextRoute.id) : null;
  const previousRoute = activeRoute; let origin = null, transitionItem = null;
  const openingList = !initial && previousRoute.type==='home' && item?.id==='bucketlist';
  // The Life List opens out of the powered-up panel on the home page.
  const listOrigin = openingList ? gallery.currentElement?.querySelector('.panel')?.getBoundingClientRect() : null;
  interaction.reset(); cancelRouteAnimation();
  if (!initial && nextRoute.type === 'home' && previousRoute.type === 'collection') {
    origin = $('.detail-cover')?.getBoundingClientRect(); transitionItem = getModule(previousRoute.id);
  }
  closeMenu(false);
  gallery.freeze(); activeRoute = item ? nextRoute : nextRoute.type === 'home' ? nextRoute : { type: 'missing' };
  if (activeRoute.type === 'home') {
    disposeModule(); disposeModule = () => {}; document.documentElement.dataset.theme = '';
    home.hidden = false; detail.hidden = true; document.title = 'Fred’s Hub — 生活收藏室';
    if (pendingModule) { gallery.focusModule(pendingModule); pendingModule = null; origin = null; }
    else if (transitionItem) gallery.focusModule(transitionItem.id); else gallery.draw();
  } else {
    home.hidden = true; detail.hidden = false;
    if (item) { renderCollection(item); document.title = `${item.title} — Fred’s Hub`; }
    else { renderMissing(); document.title = '未找到收藏 — Fred'; }
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  if(openingList && listOrigin && !motion.matches){
    const paper=detail.querySelector('.deck'), end=paper.getBoundingClientRect();
    // The small panel grows into the full deck; the module lights its own lamps.
    paper.getAnimations().forEach(animation=>animation.cancel());
    paper.style.transformOrigin='0 0';
    const from=`translate(${listOrigin.left-end.left}px,${listOrigin.top-end.top}px) scale(${listOrigin.width/end.width},${listOrigin.height/end.height})`;
    await Promise.all([
      animate(paper,[{transform:from},{transform:'none'}],{duration:520,easing:'cubic-bezier(.22,.75,.2,1)'}),
    ]);
    paper.style.removeProperty('transform-origin');
  }else if(!initial&&!motion.matches){
    const curtain=document.createElement('div');curtain.className='fred-curtain';curtain.setAttribute('aria-hidden','true');curtain.innerHTML='<strong>FRED<span>.</span></strong>';document.body.append(curtain);
    flyingCover=curtain;
    await animate(curtain,[{opacity:1,offset:0},{opacity:1,offset:.3},{opacity:0,offset:1}],{duration:440,easing:'cubic-bezier(.4,0,.2,1)'});
  }
  if (sequence !== routeSequence) return;
  cancelRouteAnimation();
  if (!initial) {
    if (activeRoute.type === 'home') gallery.currentElement.focus({ preventScroll: true });
    else $('.back-link')?.focus({ preventScroll: true });
  }
}
addEventListener('hashchange', () => showRoute());
addEventListener('resize', () => cancelRouteAnimation());
motion.addEventListener('change', () => cancelRouteAnimation());

const menu = $('#module-menu'), menuToggle = $('.module-menu-toggle');
function closeMenu(restoreFocus = true) {
  menu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menuToggle.focus({ preventScroll: true });
}
for (const item of modules) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'module-thumbnail';
  const thumb = document.createElement('span'); thumb.className = 'module-thumbnail-image'; thumb.dataset.module = item.id; thumb.setAttribute('aria-hidden', 'true'); thumb.append(createCover(item));
  const title = document.createElement('span'); title.textContent = item.title;
  button.append(thumb, title); button.addEventListener('click', () => {
    interaction.reset(); closeMenu(false);
    if (activeRoute.type === 'home') { gallery.focusModule(item.id); gallery.stage.querySelector(`[data-module="${item.id}"]`).focus({preventScroll:true}); }
    else { pendingModule = item.id; navigate(); }
  }); menu.append(button);
}
menuToggle.addEventListener('click', () => {
  if (!menu.hidden) { closeMenu(); return; }
  interaction.reset(); gallery.select(Math.round(gallery.position)); menu.hidden = false; menuToggle.setAttribute('aria-expanded','true');
  if (!motion.matches) menu.animate([{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],{duration:240,easing:'ease-out'});
  menu.querySelector('button').focus({preventScroll:true});
});
document.addEventListener('pointerdown', e => {
  if (!menu.hidden && !menu.contains(e.target) && !menuToggle.contains(e.target)) closeMenu(false);
});
menu.addEventListener('focusout', e => { if (!menu.contains(e.relatedTarget) && e.relatedTarget !== menuToggle) closeMenu(false); });
document.addEventListener('keydown', e => {
  if (!menu.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } return; }
  if (e.target.matches('input,textarea,select')) return;
  if (activeRoute.type === 'home') {
    if (e.key === 'ArrowLeft') { e.preventDefault(); gallery.select(gallery.target - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); gallery.select(gallery.target + 1); }
  } else if (e.key === 'Escape') navigate();
});
$('.skip-link').addEventListener('click', e => {
  e.preventDefault();
  (activeRoute.type === 'home' ? gallery.currentElement : $('.back-link'))?.focus({ preventScroll: true });
});
const asset = new Image(); asset.src = new URL('./assets/collection-atlas.png', import.meta.url).href;
asset.onerror = () => { document.documentElement.classList.add('asset-error'); };
showRoute(true);
document.documentElement.dataset.ready = 'true';

if (!motion.matches) {
  const entrance = document.createElement('div'); entrance.className = 'hub-entrance'; entrance.setAttribute('aria-hidden','true'); entrance.innerHTML = '<strong>Fred<span>.</span></strong>'; document.body.append(entrance);
  entrance.animate([{opacity:1,transform:'translateY(0)',offset:0},{opacity:1,transform:'translateY(0)',offset:.3},{opacity:0,transform:'translateY(-24px)',offset:1}],{duration:950,easing:'cubic-bezier(.76,0,.24,1)'}).finished.then(()=>entrance.remove()).catch(()=>entrance.remove());
}
