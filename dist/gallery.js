import { modules, categories, createCover } from './catalog.js?v=56';

export class CollectionGallery {
  constructor({ stage, nav = document.createElement("nav"), dots = document.createElement("div"), previous = document.createElement("button"), next = document.createElement("button"), onSelect, onOpen }) {
    Object.assign(this, { stage, nav, dots, previous, next, onSelect, onOpen });
    this.items = modules.slice(); this.index = Math.max(0, this.items.findIndex(x => x.id === 'travel'));
    this.position = this.target = this.index; this.velocity = 0; this.frame = 0; this.lastTime = 0;
    this.layout = 'rail'; this.category = '全部'; this.drag = null; this.suppressUntil = 0; this.animations = []; this.exits = null;
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.nav.replaceChildren();
    categories.forEach(category => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = category;
      button.setAttribute('aria-pressed', String(category === this.category));
      button.addEventListener('click', () => this.filter(category)); this.nav.append(button);
    });
    this.render();
    this.previous.addEventListener('click', () => this.select(this.index - 1));
    this.next.addEventListener('click', () => this.select(this.index + 1));
    this.stage.addEventListener('dragstart', e => e.preventDefault());
    this.stage.addEventListener('pointerdown', e => this.pointerDown(e));
    this.stage.addEventListener('pointermove', e => this.pointerMove(e));
    this.stage.addEventListener('pointerup', e => this.pointerEnd(e));
    this.stage.addEventListener('pointercancel', e => this.pointerEnd(e, true));
    this.stage.addEventListener('lostpointercapture', e => { if (this.drag?.id === e.pointerId) this.pointerEnd(e, true); });
    this.stage.addEventListener('wheel', e => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!delta || this.layout === 'desk') return;
      e.preventDefault(); this.onMotionStart?.(); this.cancelTransitions(); this.stop(); this.velocity = 0;
      this.position = this.resist(this.position + delta / this.step); this.draw();
      clearTimeout(this.wheelTimer); this.wheelTimer = setTimeout(() => this.select(Math.round(this.position)), 120);
    }, { passive: false });
    this.resize = new ResizeObserver(() => { this.cancelTransitions(); this.draw(); }); this.resize.observe(stage);
    this.motion.addEventListener('change', () => { this.cancelTransitions(); this.select(this.index); });
  }
  get settled() { return !this.drag && !this.wheelTimer && Math.abs(this.position - this.target) < .001 && Math.abs(this.velocity) < .008; }
  get current() { return this.items[this.index]; }
  get currentElement() { return this.stage.children[this.index]; }
  clamp(value) { return Math.max(0, Math.min(this.items.length - 1, value)); }
  resist(value) { const bounded = this.clamp(value); return bounded + (value - bounded) * .2; }
  stop() { cancelAnimationFrame(this.frame); this.frame = 0; this.lastTime = 0; }
  freeze() {
    clearTimeout(this.wheelTimer); this.wheelTimer = null; this.cancelTransitions(); this.stop();
    const pointerId = this.drag?.id; this.drag = null;
    if (pointerId !== undefined && this.stage.hasPointerCapture(pointerId)) this.stage.releasePointerCapture(pointerId);
    this.stage.classList.remove('is-dragging'); this.position = this.target = this.index; this.velocity = 0; this.draw();
  }
  cancelTransitions() {
    this.animations.forEach(animation => animation.cancel()); this.animations = [];
    this.exits?.remove(); this.exits = null;
  }
  transition(element, frames, timing, cleanup) {
    const animation = element.animate(frames, timing); this.animations.push(animation);
    animation.onfinish = () => {
      animation.cancel(); cleanup?.(); this.animations = this.animations.filter(a => a !== animation);
      if (!this.animations.length) { this.exits?.remove(); this.exits = null; }
    };
  }
  draw() {
    if (this.layout === 'desk') {
      this.stage.style.removeProperty('--object-size');
      [...this.stage.children].forEach(button => { button.style.cssText = ''; button.inert = false; button.setAttribute('aria-hidden','false'); });
      return;
    }
    const width = this.stage.clientWidth;
    this.size = Math.min(410, Math.max(260, width * .3), Math.max(180, this.stage.clientHeight - 32)); this.step = this.size * (width < 700 ? 1.12 : 1.65);
    this.stage.style.setProperty('--object-size', `${this.size}px`);
    [...this.stage.children].forEach((button, i) => {
      const distance = i - this.position, scale = 1 - Math.min(Math.abs(distance), 1) * .17;
      const baseY=this.stage.clientHeight*.50;
      const selectedY=this.items[i].id==='cinema'?this.stage.clientHeight*.77:this.items[i].id==='travel'?this.stage.clientHeight*.32:baseY;
      const objectY=selectedY;
      button.style.top=`${objectY}px`;
      button.style.transform = `translate3d(${distance * this.step - this.size / 2}px,-50%,0) scale(${scale}) rotate(0deg)`;
      button.style.opacity = String(Math.max(.22, 1 - Math.abs(distance) * .68));
      button.style.zIndex = String(10 - Math.round(Math.abs(distance)));
      const offscreen = Math.abs(distance * this.step) > width / 2 + this.size / 2 - 12;
      button.inert = offscreen; button.setAttribute('aria-hidden', String(offscreen));
    });
    const nearest = this.clamp(Math.round(this.position));
    if (nearest !== this.index) { this.index = nearest; this.labels(); }
    this.onDraw?.();
  }
  tick = time => {
    const dt = Math.min((time - (this.lastTime || time)) / 1000, .03); this.lastTime = time;
    const omega = 18;
    this.velocity += (omega * omega * (this.target - this.position) - 2 * omega * .91 * this.velocity) * dt;
    this.position += this.velocity * dt; this.draw();
    if (Math.abs(this.target - this.position) < .0007 && Math.abs(this.velocity) < .008) {
      this.position = this.target; this.velocity = 0; this.draw(); this.frame = 0; this.lastTime = 0; return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };
  select(index, immediate = false) {
    this.onMotionStart?.(); this.cancelTransitions(); clearTimeout(this.wheelTimer); this.wheelTimer = null;
    this.target = this.clamp(index);
    if (this.motion.matches || immediate) { this.stop(); this.position = this.target; this.velocity = 0; this.draw(); }
    else if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }
  focusModule(id, immediate = false) {
    if (!this.items.some(item => item.id === id)) { this.category = '全部'; this.items = modules.slice(); this.index = 0; this.render(); }
    const index = this.items.findIndex(item => item.id === id); if (index >= 0) this.select(index, immediate);
  }
  setLayout(layout) { this.freeze(); this.layout = layout; this.stage.classList.toggle('desk-stage', layout === 'desk'); this.draw(); this.labels(); }
  labels() {
    [...this.stage.children].forEach((button, i) => {
      button.classList.toggle('is-selected', i === this.index);
      button.setAttribute('aria-label', `${this.items[i].title}，${this.layout === 'desk' || i === this.index ? '打开收藏' : '移到中间'}`);
    });
    if (this.items.length <= 10) [...this.dots.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === this.index)));
    else this.dots.textContent = `${String(this.index + 1).padStart(2, '0')} / ${String(this.items.length).padStart(2, '0')}`;
    this.previous.disabled = this.index === 0; this.next.disabled = this.index === this.items.length - 1;
    [...this.nav.children].forEach(button => button.setAttribute('aria-pressed', String(button.textContent === this.category)));
    this.onSelect(this.current, this.index, this.items.length);
  }
  render() {
    this.stop(); this.position = this.target = this.index; this.velocity = 0;
    this.stage.replaceChildren(); this.dots.replaceChildren(); this.dots.classList.toggle('is-many', this.items.length > 10);
    this.items.forEach((item, i) => {
      const button = document.createElement('button'); button.className = 'collection-slot'; button.type = 'button'; button.dataset.module = item.id;
      button.append(createCover(item));
      const caption = document.createElement('span'); caption.className = 'object-caption'; caption.textContent = item.title; button.append(caption);
      button.addEventListener('click', () => {
        if (performance.now() < this.suppressUntil) return;
        if (this.layout === 'desk' || (i === this.index && this.settled)) { this.select(i, true); this.freeze(); this.onOpen(item); } else this.select(i);
      });
      this.stage.append(button);
      if (this.items.length <= 10) {
        const dot = document.createElement('button'); dot.type = 'button'; dot.setAttribute('aria-label', `选择${item.title}`);
        dot.addEventListener('click', () => this.select(i)); this.dots.append(dot);
      }
    });
    this.draw(); this.labels();
  }
  filter(category) {
    if (category === this.category) return;
    const activeId = this.current.id;
    const previous = new Map([...this.stage.children].map((button, i) => {
      const style = getComputedStyle(button); return [this.items[i].id, { transform: style.transform, opacity: style.opacity, clone: button.cloneNode(true) }];
    }));
    this.freeze(); this.category = category;
    this.items = modules.filter(item => category === '全部' || item.category === category);
    this.index = Math.max(0, this.items.findIndex(item => item.id === activeId)); this.render();
    if (this.motion.matches || this.layout === 'desk') return;
    const exits = document.createElement('div'); exits.className = 'filter-exits'; exits.inert = true; exits.setAttribute('aria-hidden', 'true');
    Object.assign(exits.style, { top: `${this.stage.offsetTop}px`, height: `${this.stage.offsetHeight}px`, bottom: 'auto' });
    this.stage.parentElement.append(exits); this.exits = exits;
    previous.forEach((old, id) => {
      if (this.items.some(item => item.id === id)) return;
      old.clone.style.transform = old.transform; old.clone.style.opacity = old.opacity; old.clone.style.width = `${this.size}px`; old.clone.style.height = `${this.size}px`; exits.append(old.clone);
      this.transition(old.clone, [{ transform: old.transform, opacity: old.opacity }, { transform: `${old.transform} translateY(14px) scale(.95)`, opacity: 0 }], { duration: 210, easing: 'ease-out' }, () => old.clone.remove());
    });
    [...this.stage.children].forEach((button, i) => {
      const old = previous.get(this.items[i].id), end = button.style.transform;
      this.transition(button, [{ transform: old?.transform || `${end} translateY(18px) scale(.96)`, opacity: old?.opacity || 0 }, { transform: end, opacity: button.style.opacity }], { duration: 420, easing: 'cubic-bezier(.22,.75,.2,1)' });
    });
  }
  pointerDown(e) {
    if (e.button !== 0 || this.layout === 'desk') return;
    if (e.pointerType === 'mouse') e.preventDefault();
    this.cancelTransitions(); this.stop(); this.velocity = 0; clearTimeout(this.wheelTimer); this.wheelTimer = null;
    this.drag = { selected: e.target.closest('.collection-slot') === this.currentElement, id: e.pointerId, x: e.clientX, y: e.clientY, start: this.position, last: e.clientX, time: performance.now(), speed: 0, moved: false };
  }
  pointerMove(e) {
    const drag = this.drag; if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) < 7) return;
    if (!drag.moved && Math.abs(dy) > Math.abs(dx)) { this.drag = null; this.select(this.index); return; }
    if (!drag.moved) { this.onMotionStart?.(); drag.moved = true; this.stage.setPointerCapture(e.pointerId); this.stage.classList.add('is-dragging'); }
    const now = performance.now(); drag.speed = (e.clientX - drag.last) / Math.max(8, now - drag.time); drag.last = e.clientX; drag.time = now;
    this.position = this.resist(drag.start - dx / this.step); this.draw();
  }
  pointerEnd(e, cancelled = false) {
    const drag = this.drag; if (!drag || drag.id !== e.pointerId) return;
    this.drag = null; this.stage.classList.remove('is-dragging');
    if (this.stage.hasPointerCapture(e.pointerId)) this.stage.releasePointerCapture(e.pointerId);
    if (drag.moved) {
      this.suppressUntil = performance.now() + 350;
      const speed = performance.now() - drag.time < 100 ? drag.speed : 0;
      const projected = Math.max(-.28, Math.min(.28, speed * 90 / this.step));
      this.select(Math.round(this.position - (cancelled ? 0 : projected)));
    } else this.select(this.index);
  }
}
