import { loadEntries, saveEntries } from './storage.js';

export function mount({container}) {
  const events = new AbortController(), {signal} = events;
  let entries = [], storage, writable = true, removed = null;
  const paper = document.createElement('section'); paper.className = 'life-paper'; paper.lang = 'zh-CN';
  paper.innerHTML = `<header class="life-heading"><span class="life-owner">想做的事 · 慢慢完成</span><h1>人生清单<span aria-hidden="true">.</span></h1><span class="life-doodle" aria-hidden="true">✳</span></header><ol class="life-list" aria-label="人生清单"></ol><p class="life-empty">写下这辈子想完成的第一件事。</p><form class="life-form"><span aria-hidden="true">＋</span><input aria-label="想做的事" placeholder="再记下一件想做的事…" maxlength="200" autocomplete="off" required><button type="submit" aria-label="添加到人生清单">↵</button></form><footer class="life-footer"><span class="life-count"></span><span class="life-signature" aria-hidden="true">不赶时间，一件一件来。</span></footer><div class="life-notice"><p role="status"></p><button type="button" hidden>撤销</button></div>`;
  container.append(paper);
  const list = paper.querySelector('ol'), empty = paper.querySelector('.life-empty'), input = paper.querySelector('input'), form = paper.querySelector('form'), count = paper.querySelector('.life-count'), notice = paper.querySelector('[role=status]'), undo = paper.querySelector('.life-notice button');
  try { storage = localStorage; entries = loadEntries(storage); }
  catch { writable = false; notice.textContent = '暂时无法读取清单，原有记录会保留。'; }
  function persist() {
    if (!writable) return;
    try { saveEntries(storage,entries); }
    catch { notice.textContent = '暂时无法保存，请保留此页面。'; }
  }
  function summary() {
    empty.hidden = entries.length > 0;
    [...list.children].forEach((li,index)=>li.querySelector('.life-number').textContent=String(index+1).padStart(2,'0'));
    count.textContent = entries.length ? `${entries.filter(x=>x.done).length} / ${entries.length} 已完成` : '';
  }
  function row(entry) {
    const li = document.createElement('li'); li.className = 'life-row'; li.dataset.id = entry.id;
    const label = document.createElement('label'), checkbox = document.createElement('input'), box = document.createElement('span'), text = document.createElement('span');
    checkbox.type = 'checkbox'; checkbox.checked = entry.done;
    box.className = 'life-checkbox'; box.setAttribute('aria-hidden','true'); box.textContent = '✓';
    text.className = 'life-text'; text.textContent = entry.text;
    label.append(checkbox,box,text);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'life-remove'; remove.textContent = '×'; remove.setAttribute('aria-label',`移除：${entry.text}`);
    checkbox.addEventListener('change',()=>{ entry.done = checkbox.checked; persist(); summary(); },{signal});
    remove.addEventListener('click',()=>{
      const index = entries.indexOf(entry); removed = {entry,index}; entries.splice(index,1); li.remove();
      notice.textContent = `已移除「${entry.text}」`; undo.hidden = false; undo.focus(); persist(); summary();
    },{signal});
    const number=document.createElement('span');number.className='life-number';number.setAttribute('aria-hidden','true');
    li.append(number,label,remove); return li;
  }
  entries.forEach(entry=>list.append(row(entry))); summary();
  form.addEventListener('submit', e=>{
    e.preventDefault(); const text = input.value.trim(); if (!text) {input.focus(); return;}
    const entry = {id:crypto.randomUUID(),text,done:false}; entries.push(entry);list.append(row(entry));
    input.value = ''; input.focus(); persist(); summary();
  },{signal});
  undo.addEventListener('click',()=>{
    if(!removed)return;
    const {entry,index} = removed; entries.splice(index,0,entry); const element = row(entry);list.insertBefore(element,list.children[index]||null);
    removed = null;undo.hidden = true;notice.textContent = '已恢复';element.querySelector('input').focus();persist();summary();
  },{signal});
  return ()=>events.abort();
}
