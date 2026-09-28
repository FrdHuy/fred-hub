const colors = ['#d5a382','#ece0b9','#899b87','#bccac8','#cbbdd0','#dabbb1','#acb8cd','#d3ccad'];
let remembered = '去散步\n看一部电影\n读几页书\n听听音乐';
export function createWheelVisual(labels = ['散步','电影','阅读','音乐']) {
  const wheel = document.createElement('div'); wheel.className = 'choice-wheel';
  const pointer = document.createElement('span'); pointer.className = 'wheel-pointer'; pointer.setAttribute('aria-hidden','true');
  const face = document.createElement('div'); face.className = 'wheel-face';
  face.style.background = `conic-gradient(${labels.map((_, i) => `${colors[i % colors.length]} ${i * 360 / labels.length}deg ${(i + 1) * 360 / labels.length}deg`).join(',')})`;
  labels.forEach((label, i) => {
    const tag = document.createElement('span'); tag.className = 'compass-caption'; tag.textContent = label;
    const angle = ((i + .5) * 360 / labels.length - 90) * Math.PI / 180;
    tag.style.left = `${50 + 48 * Math.cos(angle)}%`; tag.style.top = `${50 + 48 * Math.sin(angle)}%`; wheel.append(tag);
  });
  const hub = document.createElement('span'); hub.className = 'wheel-hub'; hub.textContent = '✳'; face.append(hub); wheel.append(face,pointer); return wheel;
}
export function mountWheel(container) {
  const panel = document.createElement('section'); panel.className = 'wheel-workbench';
  const preview = document.createElement('div'); preview.className = 'wheel-preview';
  const form = document.createElement('form'); form.className = 'wheel-form';
  const label = document.createElement('label'); label.htmlFor = 'wheel-options'; label.textContent = '今天，想做点什么？';
  const input = document.createElement('textarea'); input.id = 'wheel-options'; input.rows = 5; input.maxLength = 250; input.value = remembered;
  const help = document.createElement('p'); help.className = 'wheel-help'; help.id = 'wheel-help'; help.textContent = '每行一个选项，2–8 个，每个不超过 12 字。'; input.setAttribute('aria-describedby','wheel-help');
  const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'spin-button'; submit.textContent = '交给一点随机 ↗';
  const result = document.createElement('p'); result.className = 'wheel-result'; result.setAttribute('role','status'); result.textContent = '改成你正在纠结的事情，再转一下。';
  form.append(label,input,help,submit,result); panel.append(preview,form); container.append(panel);
  let busy = false, animation = null, disposed = false, choices = [], rotation = 0;
  const update = () => {
    choices = input.value.split('\n').map(x=>x.trim()).filter(Boolean);
    const valid = choices.length >= 2 && choices.length <= 8 && choices.every(x=>Array.from(x).length<=12);
    submit.disabled = !valid || busy; input.setAttribute('aria-invalid',String(!valid));
    preview.replaceChildren(createWheelVisual(valid ? choices : ['选项一','选项二'])); rotation = 0;
    result.textContent = valid ? '准备好了，就试试手气。' : '请填写 2–8 个选项，每项不超过 12 字。'; remembered = input.value;
  };
  input.addEventListener('input',update); update();
  form.addEventListener('submit',async e => {
    e.preventDefault(); if (busy || submit.disabled) return;
    busy = true; submit.disabled = true; input.disabled = true; submit.textContent = '转动中…'; result.textContent = '让指针慢慢停下来。';
    const selected = Math.floor(Math.random()*choices.length), offset = (selected+.5)*360/choices.length;
    const end = rotation + 360*5 + ((offset - rotation%360 + 360)%360);
    const face = preview.querySelector('.wheel-face');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation = face.animate([{transform:`rotate(${rotation}deg)`},{transform:`rotate(${end}deg)`}],{duration:3400,easing:'cubic-bezier(.12,.67,.12,1)',fill:'forwards'});
      await animation.finished.catch(()=>{});
    }
    if(disposed) return;
    face.style.transform = `rotate(${end}deg)`; animation?.cancel(); animation = null; rotation = end;
    result.textContent = `这次是：${choices[selected]}`; submit.textContent = '再转一次 ↻'; busy = false; submit.disabled = false; input.disabled = false;
  });
  return () => { disposed=true; animation?.cancel(); };
}
