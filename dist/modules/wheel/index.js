import { mountWheel } from '../../wheel.js';
export function mount({ container, item }) {
  const title = document.createElement('h1'); title.className = 'tool-intro'; title.textContent = item.title; container.append(title);
  return mountWheel(container);
}
