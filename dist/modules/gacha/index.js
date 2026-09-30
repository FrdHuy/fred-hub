import { machineMarkup } from './machine.js?v=41';

// 扭蛋机 room (docs/design/gashapon.md): the machine on the left, a clean desk on the right (on phones: above / below).
// Step 1 of 4: the room is laid out; turning the crank, opening capsules and the slips come in step 2.
export function mount({ container }) {
  const room = document.createElement('section'); room.className = 'gcr'; room.lang = 'zh-CN';
  room.innerHTML = `<h1 class="gcr-sr">扭蛋机</h1><div class="gcr-machine">${machineMarkup({ seed: Date.now() })}</div><div class="gcr-desk" aria-hidden="true"></div>`;
  container.append(room);
  return () => {};
}
