import { mount as travel } from './travel/index.js?v=59';
import { mount as cinema } from './cinema/index.js?v=59';
import { mount as stories } from './stories/index.js?v=59';
import { mount as bucketlist } from './bucketlist/index.js?v=59';
import { mount as gacha } from './gacha/index.js?v=59';
const renderers = { travel, cinema, stories, bucketlist, gacha };
export function mountModule(context) {
  const mount = renderers[context.item.id];
  if (!mount) throw new Error(`Missing module renderer: ${context.item.id}`);
  const cleanup = mount(context);
  return typeof cleanup === 'function' ? cleanup : () => {};
}
export const moduleIds = Object.keys(renderers);
